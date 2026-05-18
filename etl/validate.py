"""Fail-loud schema checks (vault Rule 01).

Fails the build if: any of the 14 economic regions is missing for any
indicator's latest year; any value is negative; any percentage exceeds 100.
"""

import regions


def validate(values, indicators):
    errors = []
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
        missing = set(regions.REGION_IDS) - present
        if missing:
            errors.append(
                f"{iid}: regions missing for {latest}: {sorted(missing)}")
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
    print(f"  validation OK: {len(values)} values, "
          f"{len(indicators)} indicators, {len(regions.REGION_IDS)} regions")
