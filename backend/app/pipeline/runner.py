"""
Orchestrates the full pipeline for one sample, stage by stage, and writes
results to the database. This is what the background task in
app/api/samples.py calls after a POST /samples/{id}/run request.

Flow (matches the corrected architecture discussed in planning):
  QC -> Reference Search -> split(confident / unassigned)
     -> [unassigned only] Artifact Filter -> Embedding -> Clustering
                                            -> Taxonomic Placement -> Novelty Score
     -> merge -> Biodiversity Metrics
"""
import datetime
from collections import defaultdict
from sqlalchemy.orm import Session

from app import models
from app.config import settings
from app.pipeline.qc import run_qc
from app.pipeline.reference_search import search_reference
from app.pipeline.artifact_filter import filter_artifacts
from app.pipeline.embedding import embed_batch, embed_sequence
from app.pipeline.clustering import cluster_embeddings
from app.pipeline.taxonomic_placement import place_cluster
from app.pipeline.novelty_score import score_clusters
from app.pipeline.biodiversity import compute_biodiversity


def _get_blank_sequences(db: Session, exclude_sample_id: str) -> set[str]:
    """Pulls ASV sequences from any sample marked as a lab blank/control,
    so real samples can have contamination subtracted out."""
    blanks = (
        db.query(models.ASV)
        .join(models.Sample)
        .filter(models.Sample.sample_type == "blank", models.Sample.id != exclude_sample_id)
        .all()
    )
    return {b.sequence for b in blanks}


def run_pipeline(db: Session, sample_id: str, job_id: str) -> None:
    job = db.get(models.Job, job_id)
    sample = db.get(models.Sample, sample_id)

    try:
        job.status = "running"
        sample.status = "running"
        db.commit()

        # ---- Stage 1: QC & ASV generation ----
        asv_records = run_qc(sample.upload_path)
        if not asv_records:
            raise ValueError("No reads survived QC — check input FASTQ quality/format.")

        asv_rows = []
        for rec in asv_records:
            row = models.ASV(sample_id=sample.id, sequence=rec.sequence, count=rec.count)
            db.add(row)
            asv_rows.append(row)
        db.flush()  # get IDs without committing yet

        # ---- Stage 2: Reference Search (split confident / unassigned) ----
        # Marker-gene-specific reference set — 18S and COI are never mixed.
        reference_fasta = settings.reference_fasta_for(sample.marker_gene)
        blank_sequences = _get_blank_sequences(db, exclude_sample_id=sample.id)
        unassigned_rows = []

        for row in asv_rows:
            match = search_reference(row.sequence, reference_fasta)
            if match.identity_score >= settings.confident_match_threshold:
                db.add(models.TaxaMatch(
                    asv_id=row.id, status="confident_match",
                    matched_taxon=match.matched_taxon,
                    identity_score=match.identity_score,
                    database_source=match.database_source,
                ))
            else:
                unassigned_rows.append(row)

        # ---- Stage 3: Artifact & Contamination Filter (unassigned only) ----
        survivors = []
        for row in unassigned_rows:
            result = filter_artifacts(row.sequence, blank_sequences, reference_fasta)
            if result.passes:
                survivors.append(row)
            else:
                reason = "contamination" if result.is_contamination else "chimera"
                db.add(models.TaxaMatch(asv_id=row.id, status=f"filtered_{reason}"))

        # ---- Stage 4: Embedding (survivors only — never the full read set) ----
        cluster_labels = []
        if survivors:
            embeddings = embed_batch([r.sequence for r in survivors])

            # ---- Stage 5: Clustering ----
            cluster_labels = cluster_embeddings(embeddings)

            # Group survivors by cluster label
            grouped = defaultdict(list)
            for row, label in zip(survivors, cluster_labels):
                grouped[int(label)].append(row)

            # ---- Stage 6: Taxonomic Placement (one representative per cluster) ----
            # ---- Stage 7: Novelty Score ----
            cluster_best_sim = {}
            placements = {}
            for label, members in grouped.items():
                if label == -1:
                    continue  # noise — not enough evidence to call this a cluster
                representative = max(members, key=lambda r: r.count).sequence
                placement = place_cluster(representative, reference_fasta)
                placements[label] = placement
                # crude similarity proxy for novelty scoring: parse it back out
                sim_str = placement.rank_prediction.split("sim=")[-1].rstrip(")")
                try:
                    cluster_best_sim[label] = float(sim_str)
                except ValueError:
                    cluster_best_sim[label] = 0.0

            novelty_results = score_clusters(cluster_best_sim)

            for label, members in grouped.items():
                if label == -1:
                    for row in members:
                        db.add(models.TaxaMatch(asv_id=row.id, status="unassigned_noise"))
                    continue

                placement = placements[label]
                novelty = novelty_results[label]
                total_reads = sum(m.count for m in members)

                cluster_row = models.Cluster(
                    sample_id=sample.id,
                    placeholder_id=novelty.placeholder_id,
                    rank_prediction=placement.rank_prediction,
                    nearest_reference=placement.nearest_reference,
                    novelty_score=novelty.novelty_score,
                    member_count=len(members),
                    total_reads=total_reads,
                )
                db.add(cluster_row)
                db.flush()

                for row in members:
                    db.add(models.TaxaMatch(asv_id=row.id, status="candidate_novel", cluster_id=cluster_row.id))

        # ---- Stage 8: Biodiversity Metrics ----
        # Build the abundance list from BOTH confident-match ASVs and
        # candidate-novel clusters — this is the "unified taxa + abundance
        # table" merge point from the architecture.
        db.flush()
        confident_counts = [
            m.asv.count for m in db.query(models.TaxaMatch)
            .join(models.ASV).filter(models.ASV.sample_id == sample.id, models.TaxaMatch.status == "confident_match")
        ]
        cluster_counts = [c.total_reads for c in db.query(models.Cluster).filter(models.Cluster.sample_id == sample.id)]
        all_counts = confident_counts + cluster_counts

        bio = compute_biodiversity(all_counts)
        db.add(models.BiodiversityMetric(
            sample_id=sample.id,
            shannon=bio.shannon, simpson=bio.simpson,
            richness=bio.richness, rarefaction_curve=bio.rarefaction_curve,
        ))

        sample.status = "done"
        job.status = "done"
        job.finished_at = datetime.datetime.utcnow()
        db.commit()

    except Exception as exc:  # noqa: BLE001 — we want to record ANY failure, then re-raise-free so the API can report it
        db.rollback()
        job = db.get(models.Job, job_id)
        sample = db.get(models.Sample, sample_id)
        job.status = "failed"
        job.error_log = str(exc)
        sample.status = "failed"
        db.commit()
