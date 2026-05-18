"""Canonical region list + name alias dict (EN/AZ/transliterations).

Authoritative IDs: vault ADR 0006. Every spelling seen across stat.gov.az
files/years must map to one of the 11 canonical IDs. An unmapped region is a
hard failure (vault Rule 01), never a silent drop.

Stub — implemented in build Phase 1.
"""

# Canonical IDs (see vault ADR 0006). Aliases filled in build Phase 1.
CANONICAL_REGION_IDS = [
    "baki",
    "absheron-xizi",
    "mountain-shirvan",
    "ganja-dashkesen",
    "karabakh",
    "east-zangezur",
    "lankaran-astara",
    "guba-khachmaz",
    "central-aran",
    "shaki-zaqatala",
    "nakhchivan",
]
