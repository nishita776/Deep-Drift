"""
Stage 5: Unsupervised Novel-Taxa Clustering.

Runs ONLY on reads that survived the artifact filter and didn't get a
confident reference match — never on the full read set. This is one of
the two places (the other being embedding) where the corrected design
saves real compute versus running AI on every single read.

Uses scikit-learn's native HDBSCAN (sklearn.cluster.HDBSCAN, available
since 1.3) rather than the standalone `hdbscan` package — same
algorithm, one fewer compiled dependency to manage. Chosen specifically
because it doesn't require a preset number of clusters, which fits an
open-ended "how many undocumented species are in here" problem far
better than k-means would.
"""
import numpy as np
from sklearn.cluster import HDBSCAN
from app.config import settings


def cluster_embeddings(embeddings: np.ndarray, min_cluster_size: int | None = None) -> np.ndarray:
    """
    Returns an array of cluster labels, one per input row.
    Label -1 means "noise" (HDBSCAN's term for a point that didn't fit
    any cluster confidently) — these are single/rare unassigned reads
    that shouldn't be reported as a "candidate novel taxon" on their own,
    since one read alone isn't enough evidence of a distinct species.
    """
    if len(embeddings) == 0:
        return np.array([], dtype=int)

    min_cluster_size = min_cluster_size or settings.min_cluster_size
    # HDBSCAN needs at least min_cluster_size points to find anything;
    # with fewer points than that, everything is correctly labeled noise.
    if len(embeddings) < min_cluster_size:
        return np.full(len(embeddings), -1, dtype=int)

    clusterer = HDBSCAN(min_cluster_size=min_cluster_size, metric="euclidean")
    labels = clusterer.fit_predict(embeddings)
    return labels
