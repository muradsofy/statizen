"""Parse stat.gov.az .xls files into normalized value rows.

Driven by the chapter registry in chapters.py — no per-indicator code here.

Two layouts are supported:

  * WIDE (default) — one row per region, columns are years. Year-header row
    is auto-detected (first row with >=3 integer cells in [2000, 2035]).
    Region name is in the first non-empty cell of cols 0..3.

  * LONG (opt-in via `format: "long"` in the indicator entry) — region
    NAME alternates with stacks of YEAR/value rows. One column holds the
    year (auto-detected — column with the most year-shaped integers); the
    indicator's `value_col` points at the metric column. Used by files
    like 002_6 (natural increase) and 006_9 (marriages/divorces) where one
    workbook sheet packs multiple metrics into adjacent columns.

    Long-format sources rarely include direct economic-region totals
    (Baku/Nakhchivan/AZ are the usual exceptions). For regions that only
    appear as sub-rayons (e.g. Absheron-Khizi = Sumgayit city + Absheron
    district + Khizi district), the long parser sums sub-rayon values
    using etl/rayon_membership.json. Direct region rows always win over
    aggregates when both are available for the same (rid, year).

Region rows are matched via regions.py; an economic-region row that fails
to resolve in WIDE format is a HARD FAILURE (Rule 01). Rayon sub-rows are
skipped in wide format (Phase 1 is region + national scope only); in
long format they're aggregated into their parent economic region.
"""

import json
import re
from pathlib import Path

import xlrd

import chapters
import regions


_RAYON_TO_RID = None  # populated on first call to _rayon_map()


def _rayon_map():
    """Lazy-loaded flat map: rayon name_en (lowercased, stripped) → region id."""
    global _RAYON_TO_RID
    if _RAYON_TO_RID is None:
        path = Path(__file__).parent / "rayon_membership.json"
        if not path.exists():
            _RAYON_TO_RID = {}
            return _RAYON_TO_RID
        data = json.loads(path.read_text(encoding="utf-8"))
        out = {}
        for region in data.get("regions", []):
            rid = region["id"]
            for rayon in region.get("rayons", []):
                key = regions.normalize(rayon["name_en"]).lower()
                if key:
                    out[key] = rid
        _RAYON_TO_RID = out
    return _RAYON_TO_RID

RAW_DIR = Path(__file__).parent / "raw"


_YEAR_RE = re.compile(r"^\s*(20[0-2]\d|203[0-5])\s*[\*\)\d\s]*$")


def _coerce_year(v):
    """Return the year int if v looks like a year header cell, else None.

    Handles both float cells (`2024.0`) and string cells with annotation
    suffixes (`'2018'`, `'2019*'`, `'20251)'` — preliminary / footnote
    markers used by stat.gov.az 022 / 034 / etc.). Range gate: 2000-2035.
    """
    if isinstance(v, (int, float)):
        if isinstance(v, float) and not v.is_integer():
            return None
        iv = int(v)
        return iv if 2000 <= iv <= 2035 else None
    if isinstance(v, str):
        m = _YEAR_RE.match(v)
        if m:
            iv = int(m.group(1))
            return iv if 2000 <= iv <= 2035 else None
    return None


def _find_year_row(sh):
    """First row with >=3 year-shaped cells in [2000, 2035]. Returns
    (row, {col: year}) or None if not found (suggests long format)."""
    for r in range(min(sh.nrows, 20)):
        cols = {}
        for c in range(sh.ncols):
            year = _coerce_year(sh.cell_value(r, c))
            if year is not None:
                cols[c] = year
        if len(cols) >= 3:
            return r, cols
    return None


def _detect_year_col(sh):
    """Column with the most year-shaped integers (long-format files). Returns
    the column index, or None if no column hits the threshold."""
    counts: dict[int, int] = {}
    for r in range(sh.nrows):
        for c in range(sh.ncols):
            v = sh.cell_value(r, c)
            if isinstance(v, float) and v.is_integer() and 1990 <= v <= 2035:
                counts[c] = counts.get(c, 0) + 1
    if not counts:
        return None
    best_col, best_count = max(counts.items(), key=lambda kv: kv[1])
    return best_col if best_count >= 5 else None


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


def _quantize(val: float, unit: str):
    """Match the wide-format rounding rules."""
    if unit == "%":
        return round(val, 4)
    return int(val) if val.is_integer() else round(val, 2)


def _parse_wide(sh, year_row, year_cols, indicator_id, unit, chapter, code):
    """Wide format: one row per region, year columns."""
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
                f"FAIL {chapter}/{code}: economic-region row {name!r} did "
                f"not resolve (Rule 01 — add alias in regions.py)")
        else:
            continue  # rayon / marker — skipped in Phase 1

        for c, year in year_cols.items():
            val = sh.cell_value(r, c)
            if not isinstance(val, float):
                continue  # "-", "…", "" -> genuinely missing, don't fake it
            rows.append({
                "region_id": rid, "indicator_id": indicator_id,
                "year": year, "value": _quantize(val, unit),
                "scope": scope, "source": "stat.gov.az",
            })
    return rows


def _parse_long(sh, year_col, value_col, indicator_id, unit, chapter, code):
    """Long format: region label rows alternate with year/value stacks.

    State machine walks rows top-to-bottom. Three kinds of label rows:

      * national    ("Republic of Azerbaijan")   — emit directly as AZ
      * region      ("Baku city" / "Nakhchivan AR - total") — emit directly
      * sub-rayon   ("Sumgayit city" / "Absheron district") — looked up in
                    rayon_membership.json and *accumulated* into the
                    parent economic region's running sum

    Direct emissions are deduped by (rid, year) — if the source repeats
    a region (e.g. "Nakhchivan AR - total" then "Nakhchivan city" both
    resolving to nakhchivan), the first emission wins. After the scan,
    aggregated sub-rayon values are emitted only for rids that received
    no direct rows.

    Skips the title/header band at the top of the sheet by capping the
    start cursor to 2 rows above the first year row.
    """
    rayon_map = _rayon_map()

    first_year_row = None
    for r in range(sh.nrows):
        v = sh.cell_value(r, year_col)
        if isinstance(v, float) and v.is_integer() and 1990 <= v <= 2035:
            first_year_row = r
            break
    if first_year_row is None:
        return []
    start_row = max(0, first_year_row - 2)

    rows = []
    current_rid = None
    current_scope = None
    current_is_rayon = False  # True → accumulate, not emit
    seen_year = set()  # (rid, year) — direct emissions
    direct_rids = set()
    agg = {}  # rid → year → running sum

    for r in range(start_row, sh.nrows):
        year_cell = sh.cell_value(r, year_col)
        is_year_row = (
            isinstance(year_cell, float)
            and year_cell.is_integer()
            and 1990 <= year_cell <= 2035
        )
        if is_year_row:
            if current_rid is None:
                continue
            year = int(year_cell)
            val = sh.cell_value(r, value_col)
            if not isinstance(val, float):
                continue
            if current_is_rayon:
                agg.setdefault(current_rid, {})[year] = (
                    agg.setdefault(current_rid, {}).get(year, 0.0) + val
                )
                continue
            key = (current_rid, year)
            if key in seen_year:
                continue
            seen_year.add(key)
            direct_rids.add(current_rid)
            rows.append({
                "region_id": current_rid, "indicator_id": indicator_id,
                "year": year, "value": _quantize(val, unit),
                "scope": current_scope, "source": "stat.gov.az",
            })
            continue

        # Label row — find name in any column.
        name = ""
        for c in range(min(5, sh.ncols)):
            v = regions.normalize(sh.cell_value(r, c))
            if v:
                name = v
                break
        if not name:
            continue

        if regions.is_national(name):
            current_rid, current_scope = "AZ", "national"
            current_is_rayon = False
            continue

        direct_rid = regions.resolve_region(name)
        if direct_rid is not None:
            current_rid = direct_rid
            current_scope = "region"
            current_is_rayon = False
            continue

        # Sub-rayon lookup — accumulate under its parent economic region.
        rayon_parent = rayon_map.get(name.lower())
        if rayon_parent is not None:
            current_rid = rayon_parent
            current_scope = "region"
            current_is_rayon = True
            continue

        if regions.has_region_marker(name):
            raise SystemExit(
                f"FAIL {chapter}/{code}: economic-region row {name!r} did "
                f"not resolve (Rule 01 — add alias in regions.py)")

        # Unknown marker — clear state so its year rows are ignored.
        current_rid = None
        current_scope = None
        current_is_rayon = False

    # Emit aggregated sub-rayon totals for rids that had no direct rows.
    for rid, by_year in agg.items():
        if rid in direct_rids:
            continue
        for year, total in sorted(by_year.items()):
            rows.append({
                "region_id": rid, "indicator_id": indicator_id,
                "year": year, "value": _quantize(total, unit),
                "scope": "region", "source": "stat.gov.az",
            })

    return rows


def parse_indicator(indicator_id: str):
    """Returns (rows, meta). Raises SystemExit on any unresolved region row."""
    info = None
    chapter = None
    for iid, ch, code, sheet, unit, label_en, _label_az, _label_ru \
            in chapters.iter_indicators():
        if iid == indicator_id:
            info = (code, sheet, unit, label_en, ch)
            chapter = ch
            break
    if info is None:
        raise SystemExit(f"FAIL: indicator {indicator_id!r} not in registry")
    code, sheet, unit, label_en, _ = info

    # Pull the full indicator entry to read optional long-format fields
    # and the synthesize_national flag.
    fmt = "wide"
    value_col = None
    synth_national = False
    for chap_id, ch_dict in chapters.CHAPTERS.items():
        if chap_id != chapter:
            continue
        ind_entry = ch_dict["indicators"].get(indicator_id)
        if ind_entry:
            fmt = ind_entry.get("format", "wide")
            value_col = ind_entry.get("value_col")
            synth_national = bool(ind_entry.get("synthesize_national"))
        break

    path = RAW_DIR / f"{chapter}__{code}_en.xls"
    if not path.exists():
        raise SystemExit(f"FAIL: missing {path} — run download.py first")
    book = xlrd.open_workbook(str(path))
    if sheet not in book.sheet_names():
        raise SystemExit(
            f"FAIL {chapter}/{code}: sheet {sheet!r} not in "
            f"{book.sheet_names()}")
    sh = book.sheet_by_name(sheet)

    if fmt == "long":
        if value_col is None:
            raise SystemExit(
                f"FAIL {chapter}/{indicator_id}: long format requires "
                "`value_col` in the indicator entry (column index of the "
                "metric to extract)")
        year_col = _detect_year_col(sh)
        if year_col is None:
            raise SystemExit(
                f"FAIL {chapter}/{code} sheet {sheet!r}: long format set "
                "but no year column detected (need >=5 year-shaped cells "
                "in one column)")
        rows = _parse_long(sh, year_col, value_col, indicator_id, unit,
                           chapter, code)
        years = sorted({row["year"] for row in rows})
    else:
        wide = _find_year_row(sh)
        if wide is None:
            raise SystemExit(
                f"FAIL {chapter}/{code} sheet {sheet!r}: no year-header "
                "row (source layout changed?). If the file is long-format, "
                "add `format: \"long\"` + `value_col` to the indicator.")
        year_row, year_cols = wide
        rows = _parse_wide(sh, year_row, year_cols, indicator_id, unit,
                           chapter, code)
        years = sorted(set(year_cols.values()))

    # Synthesize a national-total row for additive indicators whose source
    # only publishes regional figures (e.g. system_nat_accounts/034 has 14
    # economic regions but no Republic row — sum-of-regions is THE national
    # total by definition). Opt-in per indicator.
    if synth_national and not any(r["scope"] == "national" for r in rows):
        by_year = {}
        for r in rows:
            if r["scope"] != "region":
                continue
            by_year[r["year"]] = by_year.get(r["year"], 0.0) + r["value"]
        for year, total in sorted(by_year.items()):
            rows.append({
                "region_id": "AZ", "indicator_id": indicator_id,
                "year": year, "value": _quantize(float(total), unit),
                "scope": "national", "source": "stat.gov.az",
            })

    meta = {
        "id": indicator_id,
        "chapter": chapter,
        "label_en": label_en,
        "unit": unit,
        "source_file": f"stat.gov.az {code}en.xls",
        "source_title_en": find_title(sh, sheet),
        "years": years,
    }
    return rows, meta


def az_title_for(indicator_id: str) -> str:
    """The AZ source-title sentence for an indicator (used as label_az)."""
    code = sheet = None
    chapter = None
    for iid, ch, c, s, _, _, _, _ in chapters.iter_indicators():
        if iid == indicator_id:
            code, sheet, chapter = c, s, ch
            break
    if code is None:
        return ""
    path = RAW_DIR / f"{chapter}__{code}_az.xls"
    if not path.exists():
        return ""
    book = xlrd.open_workbook(str(path))
    if sheet not in book.sheet_names():
        return ""
    return find_title(book.sheet_by_name(sheet), sheet)
