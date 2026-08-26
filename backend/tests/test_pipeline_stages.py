import numpy as np
from app.pipeline.embedding import embed_sequence, embed_batch
from app.pipeline.clustering import cluster_embeddings
from app.pipeline.biodiversity import compute_biodiversity, shannon_index, simpson_index
from app.pipeline.reference_search import search_reference
from app.config import settings


def test_embed_sequence_shape_and_normalization():
    vec = embed_sequence("ACGTACGTACGT")
    assert vec.shape[0] == 4 ** settings.kmer_size
    assert abs(vec.sum() - 1.0) < 1e-6


def test_similar_sequences_cluster_together():
    base = "ACGTTGCAAGCTGGATCCAATCGTTAGCCATGGCTAACGTTAGGCATCG" * 2
    variants = [base] * 5
    different = ["TTTTAAAACCCCGGGGTTTTAAAACCCCGGGGTTTTAAAACCCCGGGG"] * 5
    embeddings = embed_batch(variants + different)
    labels = cluster_embeddings(embeddings, min_cluster_size=3)
    # the two groups should not all be lumped into a single cluster
    assert len(set(labels)) >= 2


def test_biodiversity_metrics_reasonable():
    result = compute_biodiversity([10, 10, 10, 10])
    assert result.richness == 4
    assert result.shannon > 0
    assert 0 <= result.simpson <= 1
    assert len(result.rarefaction_curve["depths"]) > 0


def test_shannon_zero_for_single_taxon():
    assert shannon_index([50]) == 0.0


def test_simpson_zero_for_single_read():
    assert simpson_index([1]) == 0.0


def test_reference_search_finds_exact_match():
    match = search_reference(
        "GGCTACCACATCTAAGGAAGGCAGCAGGCGCGCAAATTACCCAATCCTGACACAGGGAGGTAGTGACAATAAATAACGATACAGGGCCCATTCGGGTCTTGTAATTGGAATGAGTACAATGTAAATACCTTAACGAGGATCCATTGGAGGGCAAGT"
    )
    assert match.identity_score > 0.9
    assert "Anthozoa" in match.matched_taxon


def test_reference_fasta_selection_is_marker_specific():
    """18S and COI must never resolve to the same reference file (unless
    neither real per-marker file has been built yet, in which case both
    fall back to the same toy demo file — see config.reference_fasta_for)."""
    path_18s = settings.reference_fasta_for("18S")
    path_coi = settings.reference_fasta_for("COI")
    import os
    real_18s_exists = os.path.exists(settings.reference_fasta_18s)
    real_coi_exists = os.path.exists(settings.reference_fasta_coi)
    if real_18s_exists or real_coi_exists:
        assert path_18s != path_coi
    # Case-insensitive marker gene should resolve the same as uppercase.
    assert settings.reference_fasta_for("coi") == settings.reference_fasta_for("COI")


def test_reference_search_cache_handles_multiple_fasta_paths():
    """Regression test: _load_reference used to be @lru_cache(maxsize=1),
    which silently returned stale/wrong results when the pipeline switched
    between the 18S and COI reference files within one process."""
    from app.pipeline.reference_search import _load_reference
    a = _load_reference(settings.reference_fasta_18s if __import__("os").path.exists(settings.reference_fasta_18s) else settings.reference_fasta)
    b = _load_reference(settings.reference_fasta_coi if __import__("os").path.exists(settings.reference_fasta_coi) else settings.reference_fasta)
    # Re-fetching the first path should still return correct (non-empty) data,
    # not a cache collision with the second path.
    a_again = _load_reference(settings.reference_fasta_18s if __import__("os").path.exists(settings.reference_fasta_18s) else settings.reference_fasta)
    assert len(a_again) == len(a)
