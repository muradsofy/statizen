"""ETL orchestrator: parse -> validate -> write /data/*.json.

Run:  python etl/build.py   (after python etl/download.py)

Emits the `scope` and `source` fields on every value row from day one so the
Phase 2 national-context layer slots in without a schema migration (ADR 0004).
`last_updated` is the retrieval date (the source files carry no publish date —
honest staleness, Rule 01); data coverage is the indicator's `years`.
"""

import datetime as dt
import json
from pathlib import Path

import xlrd

import parse
import regions
import validate

DATA_DIR = Path(__file__).parents[1] / "data"
RAW_DIR = Path(__file__).parent / "raw"
RETRIEVED = "2026-05-19"  # date download.py fetched the source files


def _az_title(code: str, sheet: str) -> str:
    path = RAW_DIR / f"{code}_az.xls"
    if not path.exists():
        return ""
    book = xlrd.open_workbook(str(path))
    if sheet not in book.sheet_names():
        return ""
    return parse.find_title(book.sheet_by_name(sheet), sheet)


def main() -> None:
    all_values = []
    indicators = []
    for iid, (code, sheet, unit, _label) in parse.INDICATORS.items():
        rows, meta = parse.parse_indicator(iid)
        all_values.extend(rows)
        indicators.append({
            "id": meta["id"],
            "label_en": meta["label_en"],
            # label_az: source AZ title sentence (honest, source-traced);
            # short AZ labels are refined in build Phase 7 (i18n).
            "label_az": _az_title(code, sheet) or meta["label_en"],
            "unit": meta["unit"],
            "source_file": meta["source_file"],
            "last_updated": RETRIEVED,
            "years": meta["years"],
        })
        print(f"  {iid}: {len(rows)} rows, years {meta['years'][0]}"
              f"-{meta['years'][-1]}")

    validate.validate(all_values, indicators)

    DATA_DIR.mkdir(exist_ok=True)
    (DATA_DIR / "regions.json").write_text(json.dumps(
        {"regions": [{**r, "code": r["id"]} for r in regions.CANONICAL]},
        ensure_ascii=False, indent=2) + "\n")
    (DATA_DIR / "indicators.json").write_text(json.dumps(
        {"indicators": indicators}, ensure_ascii=False, indent=2) + "\n")
    (DATA_DIR / "values.json").write_text(json.dumps(
        {"values": all_values}, ensure_ascii=False, indent=2) + "\n")
    print(f"Wrote {len(regions.CANONICAL)} regions, {len(indicators)} "
          f"indicators, {len(all_values)} values -> {DATA_DIR}")


if __name__ == "__main__":
    main()
