"""
Stage 3: Artifact & Contamination Filter.

This is the stage that stops "unassigned" from being wrongly treated as
"novel" — the single most important correction from the original design.
Two independent checks, both applied before anything reaches clustering:

1. Chimera detection: a simplified de-novo check. Split the candidate
   sequence in half; if the first half's best reference match and the
   second half's best reference match point to two DIFFERENT taxa (both
   with reasonable identity), the sequence is very likely a PCR chimera,
   not a real organism. Production systems should use UCHIME or DADA2's
   built-in chimera removal — this heuristic exists to keep the pipeline
   runnable end-to-end without those binaries.

2. Blank/control subtraction: any sequence that also appears in a "blank"
   control sample almost certainly came from reagents/lab contamination,
   not the ocean — it's removed from the real sample regardless of how
   novel it looks.
"""
from dataclasses import dataclass
from app.pipeline.reference_search import search_reference


@dataclass
class FilterResult:
    is_chimera: bool
    is_contamination: bool
    passes: bool


def _is_chimera(sequence: str, reference_fasta: str, min_half_identity: float = 0.3) -> bool:
    mid = len(sequence) // 2
    first_half, second_half = sequence[:mid], sequence[mid:]
    if len(first_half) < 20 or len(second_half) < 20:
        return False  # too short to meaningfully split

    match1 = search_reference(first_half, reference_fasta)
    match2 = search_reference(second_half, reference_fasta)

    both_confident = match1.identity_score >= min_half_identity and match2.identity_score >= min_half_identity
    different_taxa = match1.matched_taxon != match2.matched_taxon
    return both_confident and different_taxa and match1.matched_taxon is not None


def filter_artifacts(sequence: str, blank_sequences: set[str], reference_fasta: str) -> FilterResult:
    is_contamination = sequence in blank_sequences
    is_chimera = False if is_contamination else _is_chimera(sequence, reference_fasta)

    return FilterResult(
        is_chimera=is_chimera,
        is_contamination=is_contamination,
        passes=not (is_chimera or is_contamination),
    )
