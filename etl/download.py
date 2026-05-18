"""Scripted, manual-trigger downloader for stat.gov.az labour .xls files.

Per vault ADR 0003. Not scheduled. Run manually:  python etl/download.py

URLs were VERIFIED live on 2026-05-19 (all HTTP 200, application/vnd.ms-excel):
  EN: https://www.stat.gov.az/source/labour/en/<code>en.xls
  AZ: https://www.stat.gov.az/source/labour/az/<code>.xls   (NO "az" suffix —
      PROJECT.md's assumed `*az.xls` mirror was wrong; corrected here.)

Fails loudly (non-zero exit) on any 404 / wrong content-type / tiny body rather
than producing partial data (vault Rule 01). Does NOT fabricate on failure.
"""

import sys
from pathlib import Path

import requests

RAW_DIR = Path(__file__).parent / "raw"
EN_BASE = "https://www.stat.gov.az/source/labour/en"
AZ_BASE = "https://www.stat.gov.az/source/labour/az"

# indicator_id -> stat.gov.az file code. Mapping per PROJECT.md indicator list.
SOURCES = {
    "labour_force": "009_1",
    "employed": "009_2",
    "unemployment_rate": "009_3-4",  # unemployed persons + unemployment rate
    "employees": "009_5",
    "avg_wage": "009_6",
    "registered_unemployed": "009_7",
    "unemployment_benefits": "009_8",
}

MIN_BYTES = 8_000  # real files observed 39KB-250KB; anything tiny == error page


def _download(url: str, dest: Path) -> None:
    try:
        resp = requests.get(url, timeout=60)
    except requests.RequestException as exc:
        sys.exit(f"FAIL download {url}: {exc}")
    if resp.status_code != 200:
        sys.exit(f"FAIL {url}: HTTP {resp.status_code} (site changed? — Rule 00)")
    ctype = resp.headers.get("content-type", "")
    if "excel" not in ctype and "octet-stream" not in ctype:
        sys.exit(f"FAIL {url}: unexpected content-type {ctype!r} (not an .xls)")
    if len(resp.content) < MIN_BYTES:
        sys.exit(f"FAIL {url}: body only {len(resp.content)} bytes (error page?)")
    dest.write_bytes(resp.content)
    print(f"  ok {dest.name:28s} {len(resp.content):>8d} B")


def main() -> None:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Downloading {len(SOURCES) * 2} files -> {RAW_DIR}")
    for indicator_id, code in SOURCES.items():
        print(f"{indicator_id} ({code}):")
        _download(f"{EN_BASE}/{code}en.xls", RAW_DIR / f"{code}_en.xls")
        _download(f"{AZ_BASE}/{code}.xls", RAW_DIR / f"{code}_az.xls")
    print("All files downloaded and sanity-checked.")


if __name__ == "__main__":
    main()
