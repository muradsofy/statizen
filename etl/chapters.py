"""Chapter + indicator registry — single source of truth for the ETL.

Each chapter entry drives both the downloader (URL pattern) and the parser
(file → sheet → indicator mapping). Adding a new stat.gov.az chapter is a
matter of appending one CHAPTERS entry; no edits to download.py / parse.py /
build.py are required as long as the chapter follows the standard URL pattern

    https://www.stat.gov.az/source/<url_slug>/en/<code>en.xls
    https://www.stat.gov.az/source/<url_slug>/az/<code>.xls

URL quirks (e.g. gender's /qk/ sub-path, st_units's trailing _en, .xlsx) are
not implemented yet — add them when the first such chapter is ingested.
"""

# id: slug shown in URL & used as Chapter.id in /data/chapters.json.
# label_en / label_az: display labels for the UI chapter picker.
# order: display order; lower comes first.
# indicators: dict id -> {code, sheet, unit, label_en}.
#   code   = stat.gov.az file code (e.g. "009_1"); also keys the cached .xls
#   sheet  = the workbook sheet name to read (table number, e.g. "9.1")
#   unit   = e.g. "persons", "%", "manat"
#   label_en = short EN label for the UI

CHAPTERS = {
    "demoqraphy": {
        "url_slug": "demoqraphy",
        "label_en": "Demography",
        "label_az": "Demoqrafiya",
        "order": 5,
        "indicators": {
            "population": {
                "code": "001_18", "sheet": "1.18.",
                "unit": "thousand persons",
                "label_en": "Population",
            },
        },
    },
    "labour": {
        "url_slug": "labour",
        "label_en": "Labour market",
        "label_az": "Əmək bazarı",
        "order": 10,
        "indicators": {
            "labour_force": {
                "code": "009_1", "sheet": "9.1",
                "unit": "persons", "label_en": "Labour force",
            },
            "employed": {
                "code": "009_2", "sheet": "9.2",
                "unit": "persons", "label_en": "Employed population",
            },
            "unemployment_rate": {
                "code": "009_3-4", "sheet": "9.4",
                "unit": "%", "label_en": "Unemployment rate",
            },
            "employees": {
                "code": "009_5", "sheet": "9.5",
                "unit": "persons", "label_en": "Number of employees",
            },
            "avg_wage": {
                "code": "009_6", "sheet": "9.6",
                "unit": "manat",
                "label_en": "Average monthly nominal wage",
            },
            "registered_unemployed": {
                "code": "009_7", "sheet": "9.7",
                "unit": "persons", "label_en": "Registered unemployed",
            },
            "unemployment_benefits": {
                "code": "009_8", "sheet": "9.8",
                "unit": "persons",
                "label_en": "Unemployment insurance recipients",
            },
        },
    },
    "healthcare": {
        "url_slug": "healthcare",
        "label_en": "Health & social",
        "label_az": "Səhiyyə və sosial",
        "order": 20,
        "indicators": {
            "housing_area_per_capita": {
                "code": "003_6", "sheet": "3.6",
                "unit": "m²",
                "label_en": "Average housing area per capita",
            },
            "social_aid_recipients": {
                "code": "002_4_7", "sheet": "2_4_7",
                "unit": "persons",
                "label_en": "Addressed social aid recipients",
            },
            "families_purchased_housing": {
                "code": "003_9", "sheet": "3.9",
                "unit": "families",
                "label_en": "Families purchased housing with state aid",
            },
        },
    },
    "crimes": {
        "url_slug": "crimes",
        "label_en": "Crime",
        "label_az": "Cinayət",
        "order": 30,
        "indicators": {
            "crimes_registered": {
                "code": "012_1", "sheet": "12.1",
                "unit": "cases",
                "label_en": "Registered crimes",
            },
            "crimes_grave": {
                "code": "012_2", "sheet": "12.2",
                "unit": "cases",
                "label_en": "Grave and more grave crimes",
            },
            "crimes_juvenile": {
                "code": "012_3", "sheet": "12.3",
                "unit": "cases",
                "label_en": "Crimes by children aged 14-17",
            },
        },
    },
    "trade": {
        "url_slug": "trade",
        "label_en": "Trade",
        "label_az": "Ticarət",
        "order": 40,
        "indicators": {
            "retail_turnover": {
                "code": "002_31", "sheet": "2.31",
                "unit": "thousand manat",
                "label_en": "Retail trade turnover",
            },
            "retail_per_capita": {
                "code": "002_37", "sheet": "2.37",
                "unit": "manat",
                "label_en": "Retail turnover per capita",
            },
            "retail_domestic_goods": {
                "code": "002_39", "sheet": "2.39",
                "unit": "thousand manat",
                "label_en": "Retail trade of domestic goods",
            },
            "wholesale_turnover": {
                "code": "002_47", "sheet": "2.47",
                "unit": "thousand manat",
                "label_en": "Wholesale trade turnover",
            },
            "markets_fairs": {
                "code": "002_58", "sheet": "2.58",
                "unit": "facilities",
                "label_en": "Number of markets and fairs",
            },
        },
    },
}


def iter_indicators():
    """Yield (indicator_id, chapter_id, code, sheet, unit, label_en)."""
    for chapter_id, ch in CHAPTERS.items():
        for iid, ind in ch["indicators"].items():
            yield iid, chapter_id, ind["code"], ind["sheet"], \
                ind["unit"], ind["label_en"]


def iter_downloads():
    """Yield (chapter_id, url_slug, code) — one per unique (chapter, code)."""
    seen = set()
    for chapter_id, ch in CHAPTERS.items():
        for ind in ch["indicators"].values():
            key = (chapter_id, ind["code"])
            if key in seen:
                continue
            seen.add(key)
            yield chapter_id, ch["url_slug"], ind["code"]


def chapter_meta():
    """Yield (id, label_en, label_az, order) for chapters.json."""
    for chapter_id, ch in CHAPTERS.items():
        yield chapter_id, ch["label_en"], ch["label_az"], ch["order"]
