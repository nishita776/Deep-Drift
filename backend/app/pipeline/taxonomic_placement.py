"""
Stage 6: Taxonomic Placement.

Deliberately NOT true phylogenetic placement (that requires building and
querying a real phylogenetic tree — e.g. via EPA-ng — which is infeasible
to stand up correctly in a hackathon timeframe). Instead this does what
the corrected architecture calls for: a nearest-reference-neighborhood
search in embedding space, plus a hierarchical rank guess that reports
how far up the taxonomy the model is actually confident, rather than
forcing a guess all the way down to species.

Reference "taxonomy" here is parsed from the demo FASTA headers
(format: id|phylum|class|label). Swap in real SILVA/PR2/BOLD taxonomy
strings when you swap the reference database.
"""
from dataclasses import dataclass
import numpy as np
from Bio import SeqIO
from functools import lru_cache
from app.pipeline.embedding import embed_sequence
from app.config import settings


@dataclass
class PlacementResult:
    rank_prediction: str
    nearest_reference: str | None


@lru_cache(maxsize=8)
def _reference_embeddings(reference_fasta: str) -> list[tuple[str, np.ndarray]]:
    out = []
    for record in SeqIO.parse(reference_fasta, "fasta"):
        out.append((record.description, embed_sequence(str(record.seq))))
    return out


def _cosine_sim(a: np.ndarray, b: np.ndarray) -> float:
    denom = (np.linalg.norm(a) * np.linalg.norm(b))
    return float(np.dot(a, b) / denom) if denom > 0 else 0.0


def place_cluster(representative_sequence: str, reference_fasta: str | None = None) -> PlacementResult:
    reference_fasta = reference_fasta or settings.reference_fasta
    query_emb = embed_sequence(representative_sequence)

    best_label, best_sim = None, -1.0
    for label, ref_emb in _reference_embeddings(reference_fasta):
        sim = _cosine_sim(query_emb, ref_emb)
        if sim > best_sim:
            best_label, best_sim = label, sim

    if best_label is None:
        return PlacementResult(rank_prediction="Unresolved (no reference embeddings available)", nearest_reference=None)

    # header format: id|phylum|class|label
    parts = best_label.split("|")
    phylum = parts[1] if len(parts) > 1 else "unknown"

    # Report confidence-scoped rank: only commit to phylum-level if
    # similarity clears a reasonable bar; otherwise say so honestly.
    if best_sim >= 0.6:
        rank_prediction = f"Phylum: {phylum} (moderate-high confidence, sim={best_sim:.2f})"
    elif best_sim >= 0.35:
        rank_prediction = f"Phylum: {phylum} (low confidence, sim={best_sim:.2f})"
    else:
        rank_prediction = f"Unresolved beyond domain Eukaryota (sim={best_sim:.2f})"

    return PlacementResult(rank_prediction=rank_prediction, nearest_reference=best_label)
