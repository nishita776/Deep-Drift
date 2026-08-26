"""
Stage 8: Biodiversity Metrics.

Hand-rolled Shannon, Simpson, richness, and a rarefaction curve — these
are standard, well-defined formulas, so no external bioinformatics
library is needed here (avoids adding a dependency like scikit-bio for
four straightforward calculations).

All abundance figures here are RELATIVE SEQUENCE ABUNDANCE (read counts
per ASV/cluster), not biological abundance — PCR amplification bias,
primer bias, and gene-copy-number differences between species all mean
"more reads" does not cleanly mean "more individuals". Every place this
gets displayed to a user should carry that caveat explicitly.
"""
import math
import random
from dataclasses import dataclass


@dataclass
class BiodiversityResult:
    shannon: float
    simpson: float
    richness: int
    rarefaction_curve: dict


def shannon_index(counts: list[int]) -> float:
    total = sum(counts)
    if total == 0:
        return 0.0
    return -sum((c / total) * math.log(c / total) for c in counts if c > 0)


def simpson_index(counts: list[int]) -> float:
    total = sum(counts)
    if total <= 1:
        return 0.0
    return 1 - sum(c * (c - 1) for c in counts) / (total * (total - 1))


def richness(counts: list[int]) -> int:
    return sum(1 for c in counts if c > 0)


def rarefaction_curve(counts: list[int], steps: int = 10, seed: int = 42) -> dict:
    """Subsample without replacement at increasing depths and record how
    many distinct taxa/clusters are observed at each depth — this is what
    makes biodiversity numbers comparable across samples with different
    total read counts, which raw richness alone does not allow."""
    total_reads = sum(counts)
    if total_reads == 0:
        return {"depths": [], "richness": []}

    # Expand into a flat list of taxon labels, one entry per read, so we
    # can subsample realistically without replacement.
    pool = []
    for i, c in enumerate(counts):
        pool.extend([i] * c)

    rng = random.Random(seed)
    depths = [max(1, int(total_reads * frac)) for frac in
              [i / steps for i in range(1, steps + 1)]]

    observed_richness = []
    for depth in depths:
        sample = rng.sample(pool, min(depth, len(pool)))
        observed_richness.append(len(set(sample)))

    return {"depths": depths, "richness": observed_richness}


def compute_biodiversity(counts: list[int]) -> BiodiversityResult:
    return BiodiversityResult(
        shannon=round(shannon_index(counts), 4),
        simpson=round(simpson_index(counts), 4),
        richness=richness(counts),
        rarefaction_curve=rarefaction_curve(counts),
    )
