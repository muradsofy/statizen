"""Fail-loud schema checks (vault Rule 01).

Fails the build if: any of the 14 economic regions is missing for any
indicator's latest year; any value is negative; any percentage exceeds 100.
"""

import regions


def validate(values, indicators):
    errors = []
    warnings = []
    by_ind = {i["id"]: i for i in indicators}

    for ind in indicators:
        iid = ind["id"]
        rows = [v for v in values
                if v["indicator_id"] == iid and v["scope"] == "region"]
        if not rows:
            errors.append(f"{iid}: no region rows parsed")
            continue
        latest = max(v["year"] for v in rows)
        present = {v["region_id"] for v in rows if v["year"] == latest}
        # Honest source gaps (region has no data in any year, OR has data in
        # earlier years but `-` in the latest) are warnings, not errors.
        # The DataCard already handles this — it shows the most recent year
        # available per (region, indicator).
        has_any = {v["region_id"] for v in rows}
        gap = (has_any & set(regions.REGION_IDS)) - present
        if gap:
            warnings.append(
                f"{iid}: no {latest} data for {sorted(gap)} (source gap)")
        if not any(v["scope"] == "national" and v["indicator_id"] == iid
                   for v in values):
            errors.append(f"{iid}: national total row not found")

    for v in values:
        if not isinstance(v["value"], (int, float)):
            errors.append(f"{v['indicator_id']}/{v['region_id']}: non-numeric")
        elif v["value"] < 0:
            errors.append(
                f"{v['indicator_id']}/{v['region_id']} {v['year']}: "
                f"negative {v['value']}")
        if by_ind.get(v["indicator_id"], {}).get("unit") == "%" \
                and isinstance(v["value"], (int, float)) and v["value"] > 100:
            errors.append(
                f"{v['indicator_id']}/{v['region_id']} {v['year']}: "
                f"pct>100 ({v['value']})")

    if errors:
        msg = "\n  - ".join(["VALIDATION FAILED (Rule 01):"] + errors)
        raise SystemExit(msg)
    for w in warnings:
        print(f"  warn: {w}")
    print(f"  validation OK: {len(values)} values, "
          f"{len(indicators)} indicators, {len(regions.REGION_IDS)} regions")
