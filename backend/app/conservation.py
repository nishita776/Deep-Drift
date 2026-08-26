"""
Conservation status lookup for known-taxa rows.

There is no live IUCN Red List API call here -- see data/conservation_status.json's
own header comment for why (most reference-FASTA labels are accession-derived
or unassessed obscure taxa, not something worth querying a live API for even
if we had one). This is a curated, static table. Absence from the table is
not an error -- it just means 'unknown', which is the honest answer for
anything not hand-verified.
"""
import json
from functools import lru_cache
from pathlib import Path

CONSERVATION_STATUS_PATH = Path(__file__).parent / "data" / "conservation_status.json"

VALID_STATUSES = {"LC", "NT", "VU", "EN", "CR", "DD", "unknown"}


@lru_cache(maxsize=1)
def _load_conservation_table() -> dict[str, str]:
    try:
        with open(CONSERVATION_STATUS_PATH, encoding="utf-8") as f:
            raw = json.load(f)
    except (OSError, json.JSONDecodeError):
        return {}
    return {k: v for k, v in raw.items() if not k.startswith("_") and v in VALID_STATUSES}


def conservation_status_for(matched_taxon: str | None) -> str:
    """Parses the species_label segment out of a pipe-delimited matched_taxon
    (id|Phylum|Class|species_label) and looks it up. Never raises -- any
    unparseable or unmatched input just resolves to 'unknown'."""
    if not matched_taxon:
        return "unknown"
    parts = matched_taxon.split("|")
    species_label = parts[-1].strip() if parts else ""
    return _load_conservation_table().get(species_label, "unknown")
