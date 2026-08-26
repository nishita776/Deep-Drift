"""
Stage 7: Novelty Score & Cluster ID.

Produces a calibrated confidence score and a placeholder ID for each
cluster — never an invented species name (see models.py: Cluster has no
species_name field on purpose). The score is 1 minus the cluster's best
similarity to anything in the reference set, min-max normalized across
this sample's clusters so the numbers are comparable within one run.

Being explicit about what "calibrated" means here: this is a relative
ranking within a single sample/run, not an absolute, cross-study
probability of true novelty. Don't quote these scores as p-values or
statistical confidence intervals without a proper calibration study
against known held-out taxa (see the validation strategy discussed
earlier — hold out known taxa and check whether they land where
expected).
"""
from dataclasses import dataclass


@dataclass
class NoveltyResult:
    placeholder_id: str
    novelty_score: float


def score_clusters(cluster_best_similarities: dict[int, float]) -> dict[int, NoveltyResult]:
    """
    cluster_best_similarities: {cluster_label: best_cosine_similarity_to_reference}
    Returns: {cluster_label: NoveltyResult}
    """
    if not cluster_best_similarities:
        return {}

    raw_novelty = {label: 1.0 - sim for label, sim in cluster_best_similarities.items()}
    values = list(raw_novelty.values())
    lo, hi = min(values), max(values)
    spread = (hi - lo) or 1.0  # avoid divide-by-zero when every cluster scores identically

    results = {}
    for i, (label, raw) in enumerate(sorted(raw_novelty.items())):
        calibrated = (raw - lo) / spread
        results[label] = NoveltyResult(
            placeholder_id=f"Cluster_{i + 1:03d}",
            novelty_score=round(calibrated, 4),
        )
    return results
