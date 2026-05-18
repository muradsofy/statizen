"""Extract the source-traced rayon -> economic-region membership.

stat.gov.az groups every rayon under its economic region ("<region> ...
total" then "including:" then the rayons). EN and AZ 009_1 files share row
order, so EN/AZ names are read in parallel. This removes most of blocker B3
(no manual GADM->region guesswork — the official grouping is authoritative).

Writes etl/rayon_membership.json. Run:  python etl/membership.py
"""

import json
from pathlib import Path

import xlrd

import parse
import regions

RAW = Path(__file__).parent / "raw"
OUT = Path(__file__).parent / "rayon_membership.json"


def _names(sh, r):
    for c in range(min(4, sh.ncols)):
        v = regions.normalize(sh.cell_value(r, c))
        if v:
            return v
    return ""


def main() -> None:
    en = xlrd.open_workbook(str(RAW / "009_1_en.xls")).sheet_by_name("9.1")
    az = xlrd.open_workbook(str(RAW / "009_1_az.xls")).sheet_by_name("9.1")
    yr, _ = parse._find_year_row(en)

    by_id = {r["id"]: {**r, "rayons": []} for r in regions.CANONICAL}
    order = []
    current = None
    for r in range(yr + 1, en.nrows):
        name_en = _names(en, r)
        name_az = _names(az, r) if r < az.nrows else ""
        if not name_en:
            continue
        if regions.is_national(name_en):
            current = None
            continue
        rid = regions.resolve_region(name_en)
        if rid is not None:
            current = rid
            if rid not in order:
                order.append(rid)
            continue
        if regions.has_region_marker(name_en):
            raise SystemExit(f"FAIL: unresolved region {name_en!r}")
        low = name_en.lower()
        if low.startswith(("including", "o cümlədən")) or name_en.endswith(":"):
            continue
        if current is None:
            continue
        by_id[current]["rayons"].append(
            {"name_en": name_en, "name_az": name_az})

    out = {"regions": [by_id[i] for i in order]}
    total = sum(len(x["rayons"]) for x in out["regions"])
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n")
    print(f"{len(out['regions'])} regions, {total} rayons -> {OUT}")
    for x in out["regions"]:
        print(f"  {x['id']:16s} {len(x['rayons']):2d} rayons")


if __name__ == "__main__":
    main()
