from pathlib import Path
from app.pipeline.qc import run_qc

FIXTURE = str(Path(__file__).parent / "fixtures" / "sample.fastq")


def test_run_qc_produces_asvs():
    asvs = run_qc(FIXTURE)
    assert len(asvs) > 0
    # sorted descending by count
    counts = [a.count for a in asvs]
    assert counts == sorted(counts, reverse=True)


def test_run_qc_filters_short_reads(tmp_path):
    short_fastq = tmp_path / "short.fastq"
    short_fastq.write_text("@r1\nACGT\n+\nIIII\n")
    asvs = run_qc(str(short_fastq), min_length=100)
    assert asvs == []
