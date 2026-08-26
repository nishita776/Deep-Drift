"""Generates a small synthetic FASTQ for testing.

Some reads are near-exact substrings of REAL reference sequences (these
should become confident matches — the "known taxa" table); the rest are
random or self-similar-but-novel sequences (these should end up unassigned
-> clustered into candidate-novel taxa, or dropped as noise).

IMPORTANT — two things this fixture has to get right, both of which were
silently wrong before and produced an empty known-taxa table:

1. The "known" reads must be drawn from the SAME reference file the
   pipeline actually searches for this marker gene. An 18S upload searches
   app/data/reference_18s.fasta, so the seed sequences must come from there
   — not from sample_reference.fasta (a different, unrelated sequence set).

2. Reads must be a realistic length (~150-450 bp), i.e. a SUBSTRING of the
   full ~1800 bp reference, not the whole thing. The reference search now
   scores by k-mer containment (fraction of the read's k-mers found in a
   reference), which is length-robust, so a real-length substring of a
   reference still scores ~1.0 and clears the confident-match threshold.
"""
import random
import argparse
from pathlib import Path
from Bio import SeqIO

random.seed(7)

DATA_DIR = Path(__file__).resolve().parents[2] / "app" / "data"
REFERENCE_FOR_MARKER = {
    "18S": DATA_DIR / "reference_18s.fasta",
    "COI": DATA_DIR / "reference_coi.fasta",
}


def load_reference_substrings(marker: str, n: int = 2, read_len: int = 300) -> list[str]:
    """Pull `n` reference sequences and return a realistic-length substring
    of each, so the resulting reads look like real short eDNA reads that
    happen to match a known reference."""
    ref_path = REFERENCE_FOR_MARKER[marker]
    records = list(SeqIO.parse(str(ref_path), "fasta"))
    if not records:
        raise SystemExit(f"No sequences in {ref_path} — build the reference DB first.")

    chosen = records[:n]
    substrings = []
    for rec in chosen:
        seq = str(rec.seq)
        if len(seq) <= read_len:
            substrings.append(seq)
        else:
            start = random.randrange(0, len(seq) - read_len)
            substrings.append(seq[start:start + read_len])
    return substrings


def mutate(seq, n_mutations=3):
    seq = list(seq)
    for _ in range(n_mutations):
        i = random.randrange(len(seq))
        seq[i] = random.choice("ACGT")
    return "".join(seq)


def random_seq(length=300):
    return "".join(random.choice("ACGT") for _ in range(length))


def write_fastq(path, reads):
    with open(path, "w") as f:
        for i, seq in enumerate(reads):
            quals = "".join(chr(33 + 35) for _ in seq)  # flat high quality (Phred 35)
            f.write(f"@read{i}\n{seq}\n+\n{quals}\n")


def build_reads(marker: str, read_len: int = 300) -> list[str]:
    known_seeds = load_reference_substrings(marker, n=2, read_len=read_len)

    reads = []
    # 20 near-copies of known references -> confident matches (known taxa)
    for _ in range(20):
        reads.append(mutate(random.choice(known_seeds), n_mutations=2))
    # 15 reads forming ~2 novel clusters (similar to each other, not to references)
    novel_base_a = random_seq(read_len)
    novel_base_b = random_seq(read_len)
    for _ in range(8):
        reads.append(mutate(novel_base_a, n_mutations=6))
    for _ in range(7):
        reads.append(mutate(novel_base_b, n_mutations=6))
    # 3 singleton random reads (should end up as noise, not a cluster)
    for _ in range(3):
        reads.append(random_seq(read_len))
    return reads


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate a synthetic test FASTQ.")
    parser.add_argument("--marker", default="18S", choices=["18S", "COI"],
                        help="Which marker gene's reference to seed known reads from.")
    parser.add_argument("--read-len", type=int, default=300,
                        help="Approx read length (substring of the reference).")
    parser.add_argument("--out", default=None, help="Output path (default: sample.fastq next to this script).")
    args = parser.parse_args()

    reads = build_reads(args.marker, args.read_len)
    out_path = Path(args.out) if args.out else Path(__file__).parent / "sample.fastq"
    write_fastq(out_path, reads)
    print(f"wrote {len(reads)} reads ({args.marker}, ~{args.read_len}bp) to {out_path}")
