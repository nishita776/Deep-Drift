"""
Stage 2: Reference Search.

Real deployment should call VSEARCH or BLAST+ against local copies of
SILVA / PR2 / BOLD (downloaded once, kept on disk — never query a live
external API mid-pipeline). This module keeps that exact same interface
(sequence in, best match + identity score out) but implements the search
with a k-mer Jaccard similarity so the whole pipeline is runnable with
zero external bioinformatics binaries installed.

IMPORTANT: run this separately per marker gene (18S vs COI) with the
matching reference set — they are not interchangeable inputs, per the
corrected architecture. Pass a different `reference_fasta` per marker.
"""
from dataclasses import dataclass
from functools import lru_cache
from Bio import SeqIO
from app.config import settings


@dataclass
class ReferenceMatch:
    matched_taxon: str | None
    identity_score: float
    database_source: str


def _kmers(sequence: str, k: int = 6) -> set[str]:
    return {sequence[i:i + k] for i in range(len(sequence) - k + 1)}


@lru_cache(maxsize=8)
def _load_reference(reference_fasta: str) -> list[tuple[str, set[str]]]:
    """Loads and k-merizes the reference set once, cached for the process
    lifetime — re-hashing the whole reference DB per read would be far
    too slow at any real scale."""
    refs = []
    for record in SeqIO.parse(reference_fasta, "fasta"):
        # header format: id|phylum|class|label  (see sample_reference.fasta)
        label = record.description
        refs.append((label, _kmers(str(record.seq))))
    return refs


def search_reference(sequence: str, reference_fasta: str | None = None, k: int = 6) -> ReferenceMatch:
    """Finds the best-matching reference sequence by k-mer CONTAINMENT.

    Score = fraction of the QUERY's k-mers that are also present in the
    reference sequence. This is deliberately NOT Jaccard similarity.

    Why containment and not Jaccard: real eDNA reads are short (150-450 bp)
    while reference 18S/COI sequences are long (up to ~1800 bp). Jaccard
    (|A∩B| / |A∪B|) is dominated by the size difference — a perfect 150 bp
    substring of an 1800 bp reference shares only ~1/12 of the union's
    k-mers, so it scores ~0.1 even though it is a perfect match. That made
    the confident_match_threshold (0.85) impossible to ever clear for
    realistic read lengths, so every read fell through to the novel path
    and the known-taxa table came back empty.

    Containment (|A∩B| / |A|) is length-robust: a perfect substring of any
    length scores 1.0, a few mismatches score ~0.95+, and an unrelated read
    scores well below 0.5 — so a 0.85 threshold is now meaningful. This is
    still NOT the % identity VSEARCH/BLAST report; re-derive the threshold
    against real alignment output before quoting numbers to domain experts.
    """
    reference_fasta = reference_fasta or settings.reference_fasta
    query_kmers = _kmers(sequence, k)
    if not query_kmers:
        return ReferenceMatch(None, 0.0, "none")

    best_label, best_score = None, 0.0
    for label, ref_kmers in _load_reference(reference_fasta):
        if not ref_kmers:
            continue
        intersection = len(query_kmers & ref_kmers)
        score = intersection / len(query_kmers)  # containment: query k-mers found in ref
        if score > best_score:
            best_label, best_score = label, score

    db_source = reference_fasta.split("/")[-1]
    return ReferenceMatch(matched_taxon=best_label, identity_score=best_score, database_source=db_source)
