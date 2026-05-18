"""Parse stat.gov.az labour .xls into normalized value rows.

Files are NOT uniform: the year-header row is detected, not assumed (observed
at row 6 or 7 depending on file). Region name is in the first non-empty cell
of cols 0..3. Region rows are matched via regions.py; an economic-region row
that fails to resolve is a HARD FAILURE (Rule 01). Rayon sub-rows are skipped
(Phase 1 is region + national scope only).
"""

from pathlib import Path

import xlrd

import regions

RAW_DIR = Path(__file__).parent / "raw"

# indicator_id -> (file code, sheet name, unit, label_en)
INDICATORS = {
    "labour_force": ("009_1", "9.1", "persons", "Labour force"),
    "employed": ("009_2", "9.2", "persons", "Employed population"),
    "unemployment_rate": ("009_3-4", "9.4", "%", "Unemployment rate"),
    "employees": ("009_5", "9.5", "persons", "Number of employees"),
    "avg_wage": ("009_6", "9.6", "manat",
                 "Average monthly nominal wage"),
    "registered_unemployed": ("009_7", "9.7", "persons",
                              "Registered unemployed"),
    "unemployment_benefits": ("009_8", "9.8", "persons",
                              "Unemployment insurance recipients"),
}


def _find_year_row(sh):
    """First row with >=3 integer-valued cells in [2000, 2035]."""
    for r in range(min(sh.nrows, 20)):
        cols = {}
        for c in range(sh.ncols):
            v = sh.cell_value(r, c)
            if isinstance(v, float) and v.is_integer() and 2000 <= v <= 2035:
                cols[c] = int(v)
        if len(cols) >= 3:
            return r, cols
    raise SystemExit("FAIL: no year-header row found (source layout changed?)")


def find_title(sh, prefix: str) -> str:
    """The sheet's specific title cell, e.g. the one starting with '9.1'.

    Matches the exact sheet number so the parent heading
    ('9. ECONOMIC REGIONS') is not picked up.
    """
    for r in range(min(sh.nrows, 10)):
        for c in range(sh.ncols):
            v = regions.normalize(sh.cell_value(r, c))
            if v.startswith(prefix) and len(v) > len(prefix) \
                    and not v[len(prefix)].isdigit():
                return v
    return ""


def parse_indicator(indicator_id: str):
    """Yield dicts: {region_id, indicator_id, year, value, scope, source}.

    Returns (rows, meta). Raises SystemExit on any unresolved region row.
    """
    code, sheet, unit, label_en = INDICATORS[indicator_id]
    path = RAW_DIR / f"{code}_en.xls"
    if not path.exists():
        raise SystemExit(f"FAIL: missing {path} — run download.py first")
    book = xlrd.open_workbook(str(path))
    if sheet not in book.sheet_names():
        raise SystemExit(
            f"FAIL {code}: sheet {sheet!r} not in {book.sheet_names()}")
    sh = book.sheet_by_name(sheet)
    year_row, year_cols = _find_year_row(sh)

    rows = []
    seen_regions = set()
    for r in range(year_row + 1, sh.nrows):
        name = ""
        for c in range(min(4, sh.ncols)):
            v = regions.normalize(sh.cell_value(r, c))
            if v:
                name = v
                break
        if not name:
            continue

        if regions.is_national(name):
            scope, rid = "national", "AZ"
        elif regions.resolve_region(name) is not None:
            rid = regions.resolve_region(name)
            if rid in seen_regions:
                continue
            seen_regions.add(rid)
            scope = "region"
        elif regions.has_region_marker(name):
            raise SystemExit(
                f"FAIL {code}: economic-region row {name!r} did not "
                f"resolve (Rule 01 — add alias in regions.py)")
        else:
            continue  # rayon / marker — skipped in Phase 1

        for c, year in year_cols.items():
            val = sh.cell_value(r, c)
            if not isinstance(val, float):
                continue  # "-", "…", "" -> genuinely missing, don't fake it
            rows.append({
                "region_id": rid,
                "indicator_id": indicator_id,
                "year": year,
                "value": round(val, 4) if unit == "%" else (
                    int(val) if val.is_integer() else round(val, 2)),
                "scope": scope,
                "source": "stat.gov.az",
            })

    meta = {
        "id": indicator_id,
        "label_en": label_en,
        "unit": unit,
        "source_file": f"stat.gov.az {code}en.xls",
        "source_title_en": find_title(sh, sheet),
        "years": sorted(set(year_cols.values())),
    }
    return rows, meta
