"""ETL orchestrator: parse -> validate -> write /data/*.json.

Run:  python etl/build.py   (after python etl/download.py)

Chapters and indicators are defined in chapters.py — this file just walks
them. Emits the `scope` and `source` fields on every value row from day one
so the Phase 2 national-context layer slots in without a schema migration
(ADR 0004). `last_updated` is the retrieval date (the source files carry no
publish date — honest staleness, Rule 01); data coverage is the indicator's
`years`.
"""

import json
from pathlib import Path

import chapters
import parse
import regions
import validate

DATA_DIR = Path(__file__).parents[1] / "data"
VALUES_DIR = Path(__file__).parents[1] / "public" / "data" / "values"
RETRIEVED = "2026-05-19"  # date download.py fetched the source files


def main() -> None:
    all_values = []
    indicators = []
    used_chapters = set()
    for iid, ch, code, sheet, unit, _label in chapters.iter_indicators():
        rows, meta = parse.parse_indicator(iid)
        all_values.extend(rows)
        used_chapters.add(ch)
        indicators.append({
            "id": meta["id"],
            "chapter": ch,
            "label_en": meta["label_en"],
            # label_az: source AZ title sentence (honest, source-traced).
            "label_az": parse.az_title_for(iid) or meta["label_en"],
            "unit": meta["unit"],
            "source_file": meta["source_file"],
            "last_updated": RETRIEVED,
            "years": meta["years"],
        })
        print(f"  {ch}/{iid}: {len(rows)} rows, "
              f"years {meta['years'][0]}-{meta['years'][-1]}")

    validate.validate(all_values, indicators)

    chapters_out = [
        {"id": cid, "label_en": le, "label_az": la, "order": order}
        for cid, le, la, order in chapters.chapter_meta()
        if cid in used_chapters
    ]
    chapters_out.sort(key=lambda c: c["order"])

    DATA_DIR.mkdir(exist_ok=True)
    VALUES_DIR.mkdir(parents=True, exist_ok=True)
    (DATA_DIR / "regions.json").write_text(json.dumps(
        {"regions": [{**r, "code": r["id"]} for r in regions.CANONICAL]},
        ensure_ascii=False, indent=2) + "\n")
    (DATA_DIR / "indicators.json").write_text(json.dumps(
        {"indicators": indicators}, ensure_ascii=False, indent=2) + "\n")
    (DATA_DIR / "chapters.json").write_text(json.dumps(
        {"chapters": chapters_out}, ensure_ascii=False, indent=2) + "\n")

    # Per-indicator value files (lazy-loaded at runtime, NOT bundled).
    by_indicator: dict[str, list] = {}
    for row in all_values:
        by_indicator.setdefault(row["indicator_id"], []).append(row)
    for iid, rows in by_indicator.items():
        (VALUES_DIR / f"{iid}.json").write_text(json.dumps(
            {"values": rows}, ensure_ascii=False, indent=2) + "\n")

    # Stale per-indicator files from removed indicators — clean up.
    keep = {f"{iid}.json" for iid in by_indicator}
    for f in VALUES_DIR.glob("*.json"):
        if f.name not in keep:
            f.unlink()
            print(f"  removed stale {f.name}")

    # Legacy combined values.json kept out of bundle. Remove if present.
    legacy = DATA_DIR / "values.json"
    if legacy.exists():
        legacy.unlink()

    print(f"Wrote {len(regions.CANONICAL)} regions, {len(indicators)} "
          f"indicators ({len(chapters_out)} chapters), "
          f"{len(all_values)} values across {len(by_indicator)} files "
          f"-> {DATA_DIR} + {VALUES_DIR}")


if __name__ == "__main__":
    main()
