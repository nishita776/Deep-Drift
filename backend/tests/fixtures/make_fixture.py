"""Generates a small synthetic FASTQ for testing: some reads are near-exact
copies of reference sequences (should become confident matches), and some
are random sequences (should end up as unassigned -> clustered candidates)."""
import random
from pathlib import Path

random.seed(7)
REF_SEQS = [
    "GGCTACCACATCTAAGGAAGGCAGCAGGCGCGCAAATTACCCAATCCTGACACAGGGAGGTAGTGACAATAAATAACGATACAGGGCCCATTCGGGTCTTGTAATTGGAATGAGTACAATGTAAATACCTTAACGAGGATCCATTGGAGGGCAAGT",
    "TACCTGGTTGATCCTGCCAGTAGTCATATGCTTGTCTCAAAGATTAAGCCATGCATGTCTAAGTATAAGCAATTTATACAGTGAAACTGCGAATGGCTCATTAAATCAGTTATCGTTTATTTGATGGTACCTTACTACTTGGATAACCGTAGTAA",
]


def mutate(seq, n_mutations=3):
    seq = list(seq)
    for _ in range(n_mutations):
        i = random.randrange(len(seq))
        seq[i] = random.choice("ACGT")
    return "".join(seq)


def random_seq(length=150):
    return "".join(random.choice("ACGT") for _ in range(length))


def write_fastq(path, reads):
    with open(path, "w") as f:
        for i, seq in enumerate(reads):
            quals = "".join(chr(33 + 35) for _ in seq)  # flat high quality (Phred 35)
            f.write(f"@read{i}\n{seq}\n+\n{quals}\n")


if __name__ == "__main__":
    reads = []
    # 20 near-copies of known references (confident matches)
    for _ in range(20):
        reads.append(mutate(random.choice(REF_SEQS), n_mutations=2))
    # 15 reads forming ~2 novel clusters (similar to each other, not to references)
    novel_base_a = random_seq()
    novel_base_b = random_seq()
    for _ in range(8):
        reads.append(mutate(novel_base_a, n_mutations=4))
    for _ in range(7):
        reads.append(mutate(novel_base_b, n_mutations=4))
    # 3 singleton random reads (should end up as noise, not a cluster)
    for _ in range(3):
        reads.append(random_seq())

    out_path = Path(__file__).parent / "sample.fastq"
    write_fastq(out_path, reads)
    print(f"wrote {len(reads)} reads to {out_path}")
