"""Scripted, manual-trigger downloader for stat.gov.az source .xls files.

Per vault ADR 0003. Not scheduled. Run manually:  python etl/download.py

URLs were VERIFIED live on 2026-05-19 (all HTTP 200, application/vnd.ms-excel):
  EN: https://www.stat.gov.az/source/<slug>/en/<code>en.xls
  AZ: https://www.stat.gov.az/source/<slug>/az/<code>.xls   (NO "az" suffix —
      PROJECT.md's assumed `*az.xls` mirror was wrong; corrected here.)

Files are cached on disk as `<chapter>__<code>_<lang>.xls` so multiple
chapters can coexist without code conflicts (e.g. industry/021 vs
entrepreneurship/021).

Fails loudly (non-zero exit) on any 404 / wrong content-type / tiny body
rather than producing partial data (vault Rule 01). Does NOT fabricate on
failure.
"""

import sys
from pathlib import Path

import requests

import chapters

RAW_DIR = Path(__file__).parent / "raw"
BASE = "https://www.stat.gov.az/source"

MIN_BYTES = 8_000  # real files observed 39KB-250KB; anything tiny == error page


def _download(url: str, dest: Path) -> None:
    if dest.exists() and dest.stat().st_size >= MIN_BYTES:
        return  # cached — skip
    try:
        resp = requests.get(url, timeout=60)
    except requests.RequestException as exc:
        sys.exit(f"FAIL download {url}: {exc}")
    if resp.status_code != 200:
        sys.exit(f"FAIL {url}: HTTP {resp.status_code} (site changed? — Rule 00)")
    ctype = resp.headers.get("content-type", "")
    if ("excel" not in ctype and "octet-stream" not in ctype
            and "spreadsheet" not in ctype):
        sys.exit(f"FAIL {url}: unexpected content-type {ctype!r} (not an .xls)")
    if len(resp.content) < MIN_BYTES:
        sys.exit(f"FAIL {url}: body only {len(resp.content)} bytes (error page?)")
    dest.write_bytes(resp.content)
    print(f"  ok {dest.name:40s} {len(resp.content):>8d} B")


def main() -> None:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    plan = list(chapters.iter_downloads())
    print(f"Downloading up to {len(plan) * 2} files -> {RAW_DIR}")
    for chapter_id, url_slug, code in plan:
        en_url = f"{BASE}/{url_slug}/en/{code}en.xls"
        az_url = f"{BASE}/{url_slug}/az/{code}.xls"
        en_dest = RAW_DIR / f"{chapter_id}__{code}_en.xls"
        az_dest = RAW_DIR / f"{chapter_id}__{code}_az.xls"
        print(f"{chapter_id}/{code}:")
        _download(en_url, en_dest)
        _download(az_url, az_dest)
    print("All files downloaded and sanity-checked.")


if __name__ == "__main__":
    main()
