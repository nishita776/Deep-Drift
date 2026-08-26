"""
Stage 1: Sequencing, QC & ASV generation.

This is a simplified stand-in for a real DADA2/Cutadapt run. It does the
same conceptual job — trim low-quality ends, drop reads that are too short
or too low-quality overall, then dereplicate identical reads into ASVs
(unique sequence + read count) — using pure Python + Biopython so the
whole pipeline runs with no external binaries required.

Before this goes anywhere near real scientific use, swap this for actual
DADA2 (via subprocess or rpy2) and Cutadapt for primer trimming — this
module's job is to keep the *interface* (FASTQ in, list[ASV] out) stable
so the rest of the pipeline doesn't need to change when you do.
"""
from dataclasses import dataclass
from collections import Counter
from Bio import SeqIO


@dataclass
class ASVRecord:
    sequence: str
    count: int


def _mean_quality(record) -> float:
    quals = record.letter_annotations.get("phred_quality", [])
    return sum(quals) / len(quals) if quals else 0.0


def quality_trim(sequence: str, quals: list[int], min_qual: int = 20) -> str:
    """Trim from the 3' end until quality is acceptable — a simplified
    version of what Cutadapt/DADA2 do more rigorously."""
    end = len(quals)
    while end > 0 and quals[end - 1] < min_qual:
        end -= 1
    return sequence[:end]


def run_qc(fastq_path: str, min_length: int = 100, min_mean_quality: float = 20.0) -> list[ASVRecord]:
    """
    Parse a FASTQ file, trim, filter, and dereplicate into ASVs.

    Returns a list of ASVRecord sorted by descending count (most abundant
    sequence first) — this ordering matters downstream since abundance-
    weighted decisions (e.g. blank subtraction) assume it.
    """
    seq_counts: Counter[str] = Counter()

    for record in SeqIO.parse(fastq_path, "fastq"):
        quals = record.letter_annotations.get("phred_quality", [])
        trimmed_seq = quality_trim(str(record.seq), quals)

        if len(trimmed_seq) < min_length:
            continue
        if quals and _mean_quality(record) < min_mean_quality:
            continue

        seq_counts[trimmed_seq] += 1

    asvs = [ASVRecord(sequence=seq, count=count) for seq, count in seq_counts.items()]
    asvs.sort(key=lambda a: a.count, reverse=True)
    return asvs
