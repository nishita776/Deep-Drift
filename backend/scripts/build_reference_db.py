"""
Builds real per-marker reference FASTAs from public databases, in the
`id|phylum|class|label` header format the pipeline expects.

It writes:
    app/data/reference_18s.fasta
    app/data/reference_coi.fasta

Usage:
    pip install requests biopython

    python scripts/build_reference_db.py --marker 18s
    python scripts/build_reference_db.py --marker coi
    python scripts/build_reference_db.py --marker both

18S source:
SILVA 18S eukaryote training set from Zenodo.

COI source:
BOLD Systems public API, queried per target phylum with marker=COI-5P.

Both are filtered down to a hackathon-manageable subset using
--limit-per-taxon.
"""

import argparse
import gzip
import io
import random
import re
import sys
from pathlib import Path

import requests
from Bio import SeqIO


# -------------------------------------------------------------------
# Paths
# -------------------------------------------------------------------

DATA_DIR = Path(__file__).parent.parent / "app" / "data"


# -------------------------------------------------------------------
# Marine-relevant phyla
# -------------------------------------------------------------------

MARINE_PHYLA = [
    "Cnidaria",
    "Mollusca",
    "Arthropoda",
    "Chordata",
    "Annelida",
    "Echinodermata",
    "Porifera",
    "Bryozoa",
    "Nematoda",
    "Platyhelminthes",
]


# -------------------------------------------------------------------
# SILVA 18S source
# -------------------------------------------------------------------

SILVA_18S_URL = (
    "https://zenodo.org/records/1447330/files/"
    "silva_132.18s.99_rep_set.dada2.fa.gz?download=1"
)


# -------------------------------------------------------------------
# Build 18S reference database
# -------------------------------------------------------------------

def build_18s(limit_per_phylum: int, seed: int) -> None:

    print("Downloading SILVA 18S eukaryote training set from Zenodo...")

    try:
        resp = requests.get(
            SILVA_18S_URL,
            stream=True,
            timeout=180,
        )
        resp.raise_for_status()

    except requests.RequestException as exc:
        print(f"Failed to download SILVA 18S dataset: {exc}")
        return

    print("Download complete. Decompressing...")

    try:
        raw = gzip.decompress(resp.content)

    except OSError as exc:
        print(f"Failed to decompress SILVA file: {exc}")
        return

    print("Parsing FASTA records...")

    records = list(
        SeqIO.parse(
            io.StringIO(
                raw.decode("utf-8", errors="ignore")
            ),
            "fasta",
        )
    )

    print(f"Parsed {len(records)} SILVA 18S records.")

    # ---------------------------------------------------------------
    # Group sequences by phylum
    # ---------------------------------------------------------------

    by_phylum: dict[str, list] = {
        phylum: []
        for phylum in MARINE_PHYLA
    }

    for rec in records:

        fields = [
            field
            for field in rec.description.split(";")
            if field
        ]

        for phylum in MARINE_PHYLA:

            if phylum in fields:

                idx = fields.index(phylum)

                by_phylum[phylum].append(
                    (
                        fields,
                        idx,
                        str(rec.seq),
                    )
                )

                break

    # Print how many sequences were found for each phylum
    print("\n18S sequences found by phylum:")

    for phylum, entries in by_phylum.items():
        print(f"  {phylum}: {len(entries)}")

    # ---------------------------------------------------------------
    # Write reference FASTA
    # ---------------------------------------------------------------

    rng = random.Random(seed)

    out_path = DATA_DIR / "reference_18s.fasta"

    written = 0

    with open(out_path, "w", encoding="utf-8") as f:

        for phylum, entries in by_phylum.items():

            sample = rng.sample(
                entries,
                min(
                    limit_per_phylum,
                    len(entries),
                ),
            )

            for i, (fields, idx, seq) in enumerate(sample):

                # Class is the rank immediately after phylum
                if idx + 1 < len(fields):
                    cls = fields[idx + 1]
                else:
                    cls = "unknown_class"

                # Last taxonomy field as species/label
                label = fields[-1].replace(" ", "_")

                header = (
                    f"{phylum.lower()}_{i}"
                    f"|{phylum}"
                    f"|{cls}"
                    f"|{label}"
                )

                f.write(
                    f">{header}\n"
                    f"{seq}\n"
                )

                written += 1

    print(
        f"\nWrote {written} sequences to {out_path}"
    )


# -------------------------------------------------------------------
# Build COI reference database
# -------------------------------------------------------------------

def build_coi(limit_per_phylum: int, seed: int) -> None:

    out_path = DATA_DIR / "reference_coi.fasta"

    rng = random.Random(seed)

    written = 0

    # ---------------------------------------------------------------
    # Create HTTP session
    # ---------------------------------------------------------------

    session = requests.Session()

    session.headers.update(
        {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0 Safari/537.36"
            ),
            "Accept": (
                "text/tab-separated-values, "
                "text/plain, */*"
            ),
        }
    )

    # ---------------------------------------------------------------
    # Make sure data directory exists
    # ---------------------------------------------------------------

    DATA_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    # ---------------------------------------------------------------
    # Open output FASTA
    # ---------------------------------------------------------------

    with open(
        out_path,
        "w",
        encoding="utf-8",
    ) as f:

        # -----------------------------------------------------------
        # Query every marine phylum
        # -----------------------------------------------------------

        for phylum in MARINE_PHYLA:

            print(
                f"\nQuerying BOLD for "
                f"{phylum} (COI-5P)..."
            )

            url = (
                "http://v3.boldsystems.org/"
                "index.php/API_Public/combined"
                f"?taxon={phylum}"
                f"&marker=COI-5P"
                f"&format=tsv"
            )

            try:

                resp = session.get(
                    url,
                    timeout=120,
                )

                resp.raise_for_status()

            except requests.RequestException as exc:

                print(
                    f"  Skipping {phylum}: {exc}",
                    file=sys.stderr,
                )

                continue

            # -------------------------------------------------------
            # Check for HTML / bot detection
            # -------------------------------------------------------

            text = resp.text

            stripped = text.lstrip().lower()

            if (
                stripped.startswith("<!doctype")
                or stripped.startswith("<html")
            ):

                print(
                    f"  BOLD returned an HTML page "
                    f"instead of TSV for {phylum}.",
                    file=sys.stderr,
                )

                print(
                    f"  This is likely bot detection "
                    f"or rate limiting.",
                    file=sys.stderr,
                )

                print(
                    f"  First 200 characters: "
                    f"{text[:200]!r}",
                    file=sys.stderr,
                )

                continue

            # -------------------------------------------------------
            # Parse TSV
            # -------------------------------------------------------

            lines = text.splitlines()

            if len(lines) < 2:

                print(
                    f"  No records for {phylum}"
                )

                continue

            header_cols = lines[0].split("\t")

            try:

                seq_idx = header_cols.index(
                    "nucleotides"
                )

                class_idx = header_cols.index(
                    "class_name"
                )

                species_idx = header_cols.index(
                    "species_name"
                )

                id_idx = header_cols.index(
                    "processid"
                )

            except ValueError:

                print(
                    f"  Unexpected BOLD TSV columns "
                    f"for {phylum}.",
                    file=sys.stderr,
                )

                print(
                    f"  Columns received: "
                    f"{header_cols[:15]}",
                    file=sys.stderr,
                )

                continue

            # -------------------------------------------------------
            # Extract rows
            # -------------------------------------------------------

            rows = [
                row.split("\t")
                for row in lines[1:]
                if row.strip()
            ]

            rows = [
                row
                for row in rows
                if (
                    len(row) > seq_idx
                    and row[seq_idx].strip()
                )
            ]

            print(
                f"  Found {len(rows)} usable records."
            )

            # -------------------------------------------------------
            # Randomly select subset
            # -------------------------------------------------------

            sample = rng.sample(
                rows,
                min(
                    limit_per_phylum,
                    len(rows),
                ),
            )

            # -------------------------------------------------------
            # Write selected sequences
            # -------------------------------------------------------

            phylum_written = 0

            for row in sample:

                seq = re.sub(
                    r"[^ACGTacgtNn]",
                    "",
                    row[seq_idx],
                )

                # Ignore very short sequences
                if len(seq) < 100:
                    continue

                cls = (
                    row[class_idx]
                    or "unknown_class"
                )

                species = (
                    row[species_idx]
                    or "unidentified"
                ).replace(
                    " ",
                    "_",
                )

                pid = row[id_idx]

                header = (
                    f"{pid}"
                    f"|{phylum}"
                    f"|{cls}"
                    f"|{species}"
                )

                f.write(
                    f">{header}\n"
                    f"{seq}\n"
                )

                written += 1
                phylum_written += 1

            print(
                f"  Wrote {phylum_written} "
                f"sequences for {phylum}."
            )

    # ---------------------------------------------------------------
    # Final result
    # ---------------------------------------------------------------

    print(
        f"\nWrote {written} sequences to {out_path}"
    )

    # ---------------------------------------------------------------
    # If nothing was downloaded
    # ---------------------------------------------------------------

    if written == 0:

        print(
            "\nWARNING: No COI sequences were written."
        )

        print(
            """
Possible reasons:

1. BOLD is blocking automated requests.
2. The BOLD API is unavailable.
3. The API response format changed.
4. Your network is blocking the request.

Fallback option:

Use the pre-built COI reference dataset:

https://figshare.scilifelab.se/articles/dataset/COI_reference_sequences_from_BOLD_DB/20514192

Download:

bold_clustered.assignTaxonomy.fasta.gz

Then filter it down to the desired marine phyla.
"""
        )


# -------------------------------------------------------------------
# Main
# -------------------------------------------------------------------

def main() -> None:

    parser = argparse.ArgumentParser(
        description=__doc__
    )

    parser.add_argument(
        "--marker",
        choices=[
            "18s",
            "coi",
            "both",
        ],
        default="both",
        help="Which reference database to build.",
    )

    parser.add_argument(
        "--limit-per-taxon",
        type=int,
        default=100,
        help=(
            "Maximum number of sequences "
            "kept per marine phylum."
        ),
    )

    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random sampling seed.",
    )

    args = parser.parse_args()

    # Make sure app/data exists
    DATA_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    print("=" * 60)
    print("REFERENCE DATABASE BUILDER")
    print("=" * 60)

    print(
        f"Marker: {args.marker}"
    )

    print(
        f"Limit per phylum: "
        f"{args.limit_per_taxon}"
    )

    print(
        f"Output directory: "
        f"{DATA_DIR}"
    )

    print("=" * 60)

    # ---------------------------------------------------------------
    # Build 18S
    # ---------------------------------------------------------------

    if args.marker in (
        "18s",
        "both",
    ):

        print("\n========== BUILDING 18S ==========\n")

        build_18s(
            args.limit_per_taxon,
            args.seed,
        )

    # ---------------------------------------------------------------
    # Build COI
    # ---------------------------------------------------------------

    if args.marker in (
        "coi",
        "both",
    ):

        print("\n========== BUILDING COI ==========\n")

        build_coi(
            args.limit_per_taxon,
            args.seed,
        )

    # ---------------------------------------------------------------
    # Finished
    # ---------------------------------------------------------------

    print("\n" + "=" * 60)
    print("REFERENCE DATABASE BUILD COMPLETE")
    print("=" * 60)

    print(
        f"\nCheck these files:"
    )

    if args.marker in (
        "18s",
        "both",
    ):
        print(
            f"  {DATA_DIR / 'reference_18s.fasta'}"
        )

    if args.marker in (
        "coi",
        "both",
    ):
        print(
            f"  {DATA_DIR / 'reference_coi.fasta'}"
        )


# -------------------------------------------------------------------
# Entry point
# -------------------------------------------------------------------

if __name__ == "__main__":
    main()