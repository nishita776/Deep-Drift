from pathlib import Path
import random
from Bio import SeqIO


# ---------------------------------------------------------
# Paths
# ---------------------------------------------------------

INPUT_FILE = Path(
    r"C:\Users\nishi\Downloads\coidb.dada2.toSpecies.exclNA.fasta"
    r"\coidb.dada2.toSpecies.exclNA.fasta"
)

OUTPUT_FILE = Path(
    r"C:\Users\nishi\Downloads\novataxa_backend (5)"
    r"\backend\app\data\reference_coi.fasta"
)


# ---------------------------------------------------------
# Marine phyla we want
# ---------------------------------------------------------

MARINE_PHYLA = {
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
}


# Maximum sequences per phylum
LIMIT_PER_PHYLUM = 100


# ---------------------------------------------------------
# Main
# ---------------------------------------------------------

def main():

    print("=" * 60)
    print("BUILDING COI REFERENCE DATABASE")
    print("=" * 60)

    print(f"Input:")
    print(INPUT_FILE)

    print(f"\nOutput:")
    print(OUTPUT_FILE)

    print("\nReading COI database...")
    print("This may take a while because the source is ~3.8 GB.\n")

    OUTPUT_FILE.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    # Keep track of how many sequences we have
    counts = {
        phylum: 0
        for phylum in MARINE_PHYLA
    }

    total_seen = 0
    total_written = 0

    # -----------------------------------------------------
    # Stream through FASTA
    # -----------------------------------------------------

    with open(
        INPUT_FILE,
        "r",
        encoding="utf-8",
        errors="ignore",
    ) as input_handle, open(
        OUTPUT_FILE,
        "w",
        encoding="utf-8",
    ) as output_handle:

        for record in SeqIO.parse(
            input_handle,
            "fasta",
        ):

            total_seen += 1

            # Every 10,000 records print progress
            if total_seen % 10000 == 0:

                print(
                    f"Processed {total_seen:,} records | "
                    f"Written {total_written:,}"
                )

            # -------------------------------------------------
            # Parse taxonomy
            # -------------------------------------------------

            header = record.description

            fields = [
                x.strip()
                for x in header.split(";")
                if x.strip()
            ]

            # Need at least:
            # kingdom, phylum, class, order, family, genus, species
            if len(fields) < 3:
                continue

            # First field is kingdom
            # Second field is phylum
            # Third field is class
            phylum = fields[1]
            cls = fields[2]

            # Only keep our marine phyla
            if phylum not in MARINE_PHYLA:
                continue

            # Stop collecting once we have 100
            if counts[phylum] >= LIMIT_PER_PHYLUM:
                continue

            # Species is usually the last taxonomy field
            if len(fields) >= 7:
                species = fields[-1]
            else:
                species = "unidentified"

            # -------------------------------------------------
            # Clean sequence
            # -------------------------------------------------

            sequence = str(record.seq).upper()

            # Remove anything that's not DNA
            sequence = "".join(
                base
                for base in sequence
                if base in "ACGTN"
            )

            # Ignore very short sequences
            if len(sequence) < 100:
                continue

            # -------------------------------------------------
            # Create Novataxa-compatible header
            # -------------------------------------------------

            number = counts[phylum]

            new_header = (
                f"{phylum.lower()}_{number}"
                f"|{phylum}"
                f"|{cls}"
                f"|{species}"
            )

            # -------------------------------------------------
            # Write FASTA
            # -------------------------------------------------

            output_handle.write(
                f">{new_header}\n"
            )

            # Wrap sequence at 80 characters
            for i in range(
                0,
                len(sequence),
                80,
            ):

                output_handle.write(
                    sequence[i:i + 80] + "\n"
                )

            counts[phylum] += 1
            total_written += 1

            # -------------------------------------------------
            # Stop early if all phyla are full
            # -------------------------------------------------

            if all(
                count >= LIMIT_PER_PHYLUM
                for count in counts.values()
            ):

                print(
                    "\nReached 100 sequences "
                    "for every marine phylum."
                )

                break

    # ---------------------------------------------------------
    # Summary
    # ---------------------------------------------------------

    print("\n" + "=" * 60)
    print("COI REFERENCE BUILD COMPLETE")
    print("=" * 60)

    print(
        f"\nTotal source records examined: "
        f"{total_seen:,}"
    )

    print(
        f"Total COI sequences written: "
        f"{total_written:,}"
    )

    print("\nSequences by phylum:")

    for phylum in sorted(MARINE_PHYLA):

        print(
            f"  {phylum}: "
            f"{counts[phylum]}"
        )

    print(
        f"\nOutput file:"
    )

    print(
        OUTPUT_FILE
    )


if __name__ == "__main__":
    main()