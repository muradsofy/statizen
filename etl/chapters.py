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
# indicators: dict id -> {code, sheet, unit, label_en, label_az}.
#   code     = stat.gov.az file code (e.g. "009_1"); also keys the cached .xls
#   sheet    = the workbook sheet name to read (table number, e.g. "9.1")
#   unit     = e.g. "persons", "%", "manat"
#   label_en = short EN label for the UI
#   label_az = short AZ label for the UI. Curated, NOT the verbose source-XLS
#              sentence (which carries section numbers like "9.4" and the
#              bureaucratic "İqtisadi rayonlar və inzibati ərazi vahidləri
#              üzrə ..." prefix that has no EN counterpart).

CHAPTERS = {
    "economy": {
        "url_slug": "system_nat_accounts",
        "label_en": "Economy",
        "label_az": "İqtisadiyyat",
        "label_ru": "Экономика",
        "order": 2,
        "indicators": {
            # 034 — Output production in main branches of economy, by
            # economic region, in thousand manats. Wide format, 2003-2024
            # (the 2025 column has a footnote suffix "20251)" so the
            # year-detector skips it — correct, it's preliminary data).
            # No national-total row in the source; synthesized as sum of
            # the 14 economic regions (definitionally equals the national
            # output for an additive metric like this one).
            "regional_output": {
                "code": "034", "sheet": "34",
                "synthesize_national": True,
                "unit": "thousand manat",
                "label_en": "Regional output (all branches)",
                "label_az": "Regional məhsul (bütün sahələr)",
                "label_ru": "Региональный выпуск (все отрасли)",
            },
        },
    },
    "demoqraphy": {
        "url_slug": "demoqraphy",
        "label_en": "Demography",
        "label_az": "Demoqrafiya",
        "label_ru": "Демография",
        "order": 5,
        "indicators": {
            "population": {
                "code": "001_18", "sheet": "1.18.",
                "unit": "thousand persons",
                "label_en": "Population",
                "label_az": "Əhali",
                "label_ru": "Население",
            },
            # 002_6 packs 3 metrics into one long-format sheet ("total").
            # The source only lists direct totals for Baku / Nakhchivan
            # AR / AZ; the other 11 economic regions are summed at parse
            # time from their sub-rayons (parse._parse_long uses
            # rayon_membership.json).
            "natural_increase": {
                "code": "002_6", "sheet": "total",
                "format": "long", "value_col": 3,
                "unit": "persons",
                "label_en": "Natural population increase",
                "label_az": "Əhalinin təbii artımı",
                "label_ru": "Естественный прирост населения",
            },
            "births": {
                "code": "002_6", "sheet": "total",
                "format": "long", "value_col": 4,
                "unit": "persons",
                "label_en": "Live births",
                "label_az": "Doğulanlar",
                "label_ru": "Родившиеся",
            },
            "deaths": {
                "code": "002_6", "sheet": "total",
                "format": "long", "value_col": 5,
                "unit": "persons",
                "label_en": "Deaths",
                "label_az": "Ölənlər",
                "label_ru": "Умершие",
            },
            # 006_9 — long-format sheet "6.9." — col 1 has year, cols 2-3
            # are Marriages / Divorces (absolute counts).
            "marriages": {
                "code": "006_9", "sheet": "6.9.",
                "format": "long", "value_col": 2,
                "unit": "cases",
                "label_en": "Registered marriages",
                "label_az": "Bağlanmış nikahlar",
                "label_ru": "Зарегистрированные браки",
            },
            "divorces": {
                "code": "006_9", "sheet": "6.9.",
                "format": "long", "value_col": 3,
                "unit": "cases",
                "label_en": "Registered divorces",
                "label_az": "Pozulmuş nikahlar",
                "label_ru": "Зарегистрированные разводы",
            },
        },
    },
    "labour": {
        "url_slug": "labour",
        "label_en": "Labour market",
        "label_az": "Əmək bazarı",
        "label_ru": "Рынок труда",
        "order": 10,
        "indicators": {
            "labour_force": {
                "code": "009_1", "sheet": "9.1",
                "unit": "persons",
                "label_en": "Labour force",
                "label_az": "İşçi qüvvəsi",
                "label_ru": "Рабочая сила",
            },
            "employed": {
                "code": "009_2", "sheet": "9.2",
                "unit": "persons",
                "label_en": "Employed population",
                "label_az": "Məşğul əhali",
                "label_ru": "Занятое население",
            },
            "unemployment_rate": {
                "code": "009_3-4", "sheet": "9.4",
                "unit": "%",
                "label_en": "Unemployment rate",
                "label_az": "İşsizlik səviyyəsi",
                "label_ru": "Уровень безработицы",
            },
            "employees": {
                "code": "009_5", "sheet": "9.5",
                "unit": "persons",
                "label_en": "Number of employees",
                # Trailing "(nəfər)" unit suffix already conveys count;
                # dropping "sayı" avoids "...sayı (nəfər)" double-counting.
                "label_az": "Muzdla işləyənlər",
                "label_ru": "Численность наёмных работников",
            },
            "avg_wage": {
                "code": "009_6", "sheet": "9.6",
                "unit": "manat",
                "label_en": "Average monthly nominal wage",
                "label_az": "Orta aylıq əmək haqqı",
                "label_ru": "Среднемесячная номинальная зарплата",
            },
            "registered_unemployed": {
                "code": "009_7", "sheet": "9.7",
                "unit": "persons",
                "label_en": "Registered unemployed",
                "label_az": "Qeydiyyatda olan işsizlər",
                "label_ru": "Зарегистрированные безработные",
            },
            "unemployment_benefits": {
                "code": "009_8", "sheet": "9.8",
                "unit": "persons",
                "label_en": "Unemployment insurance recipients",
                "label_az": "İşsizlikdən sığorta alanlar",
                "label_ru": "Получатели пособия по безработице",
            },
        },
    },
    "healthcare": {
        "url_slug": "healthcare",
        "label_en": "Health & social",
        "label_az": "Səhiyyə və sosial",
        "label_ru": "Здоровье и социальная сфера",
        "order": 20,
        "indicators": {
            "housing_area_per_capita": {
                "code": "003_6", "sheet": "3.6",
                "unit": "m²",
                "label_en": "Average housing area per capita",
                "label_az": "Adambaşına yaşayış sahəsi",
                "label_ru": "Жилплощадь на душу населения",
            },
            "social_aid_recipients": {
                "code": "002_4_7", "sheet": "2_4_7",
                "unit": "persons",
                "label_en": "Addressed social aid recipients",
                "label_az": "Ünvanlı sosial yardım alanlar",
                "label_ru": "Получатели адресной соцпомощи",
            },
            "families_purchased_housing": {
                "code": "003_9", "sheet": "3.9",
                "unit": "families",
                "label_en": "Families purchased housing with state aid",
                # "...ailələr (ailə)" reads as double "families"; drop the
                # noun and let the unit suffix do the work.
                "label_az": "Dövlət dəstəyi ilə mənzil alanlar",
                "label_ru": "Семьи, купившие жильё при господдержке",
            },
        },
    },
    "crimes": {
        "url_slug": "crimes",
        "label_en": "Crime",
        "label_az": "Cinayət",
        "label_ru": "Преступность",
        "order": 30,
        "indicators": {
            "crimes_registered": {
                "code": "012_1", "sheet": "12.1",
                "unit": "cases",
                "label_en": "Registered crimes",
                "label_az": "Qeydə alınmış cinayətlər",
                "label_ru": "Зарегистрированные преступления",
            },
            "crimes_grave": {
                "code": "012_2", "sheet": "12.2",
                "unit": "cases",
                "label_en": "Grave and more grave crimes",
                "label_az": "Ağır və xüsusilə ağır cinayətlər",
                "label_ru": "Тяжкие и особо тяжкие преступления",
            },
            "crimes_juvenile": {
                "code": "012_3", "sheet": "12.3",
                "unit": "cases",
                "label_en": "Crimes by children aged 14-17",
                "label_az": "14–17 yaş cinayətləri",
                "label_ru": "Преступления подростков 14–17 лет",
            },
        },
    },
    "industry": {
        "url_slug": "industry",
        "label_en": "Industry",
        "label_az": "Sənaye",
        "label_ru": "Промышленность",
        "order": 12,
        "indicators": {
            "industrial_output": {
                "code": "022", "sheet": "22",
                "synthesize_national": True,
                "unit": "thousand manat",
                "label_en": "Industrial output",
                "label_az": "Sənaye məhsulu",
                "label_ru": "Промышленная продукция",
            },
        },
    },
    "agriculture": {
        "url_slug": "agriculture",
        "label_en": "Agriculture",
        "label_az": "Kənd təsərrüfatı",
        "label_ru": "Сельское хозяйство",
        "order": 14,
        "indicators": {
            # 2.258 / 2.259 — single-sheet wide files. Periods in the code
            # round-trip through the URL (`/agriculture/en/2.258en.xls`)
            # and the on-disk cache filename (`agriculture__2.258_en.xls`).
            "meat_production": {
                "code": "2.258", "sheet": "2.258",
                "synthesize_national": True,
                "unit": "tonnes",
                "label_en": "Meat production (slaughtered weight)",
                "label_az": "Ət istehsalı (kəsim çəkisi)",
                "label_ru": "Производство мяса (убойный вес)",
            },
            "milk_production": {
                "code": "2.259", "sheet": "2.259",
                "synthesize_national": True,
                "unit": "tonnes",
                "label_en": "Milk production",
                "label_az": "Süd istehsalı",
                "label_ru": "Производство молока",
            },
        },
    },
    "transport": {
        "url_slug": "transport",
        "label_en": "Transport",
        "label_az": "Nəqliyyat",
        "label_ru": "Транспорт",
        "order": 35,
        "indicators": {
            # Both transport files pack two sub-indicators into one
            # workbook — we use the goods/passenger COUNT sheets (30.5,
            # 30.7) and ignore the turnover (tonne-km / passenger-km)
            # sheets to keep the picker tight at launch.
            "cargo_transported": {
                "code": "030_5-6", "sheet": "30.5.",
                "synthesize_national": True,
                "unit": "thousand tonnes",
                "label_en": "Goods transported by road",
                "label_az": "Avtomobil nəqliyyatı ilə daşınmış yüklər",
                "label_ru": "Перевозки грузов автотранспортом",
            },
            "passengers_transported": {
                "code": "030_7-8", "sheet": "30.7.",
                "synthesize_national": True,
                "unit": "thousand persons",
                "label_en": "Passengers carried by road",
                "label_az": "Avtomobil nəqliyyatı ilə daşınmış sərnişinlər",
                "label_ru": "Перевозки пассажиров автотранспортом",
            },
        },
    },
    "tourism": {
        "url_slug": "tourism",
        "label_en": "Tourism",
        "label_az": "Turizm",
        "label_ru": "Туризм",
        "order": 38,
        "indicators": {
            # 005_6 / 005_8 sheet names ship with a trailing space in
            # the workbook ("5.6 " not "5.6"). Match the source exactly
            # — xlrd's sheet_by_name is whitespace-sensitive.
            "hotel_guests": {
                "code": "005_6", "sheet": "5.6 ",
                "synthesize_national": True,
                "unit": "persons",
                "label_en": "Hotel guests",
                "label_az": "Mehmanxana qonaqları",
                "label_ru": "Постояльцы гостиниц",
            },
            "foreign_hotel_guests": {
                "code": "005_8", "sheet": "5.8",
                "synthesize_national": True,
                "unit": "persons",
                "label_en": "Foreign hotel guests",
                "label_az": "Xarici mehmanxana qonaqları",
                "label_ru": "Иностранные постояльцы гостиниц",
            },
        },
    },
    "trade": {
        "url_slug": "trade",
        "label_en": "Trade",
        "label_az": "Ticarət",
        "label_ru": "Торговля",
        "order": 40,
        "indicators": {
            "retail_turnover": {
                "code": "002_31", "sheet": "2.31",
                "unit": "thousand manat",
                "label_en": "Retail trade turnover",
                "label_az": "Pərakəndə ticarət dövriyyəsi",
                "label_ru": "Оборот розничной торговли",
            },
            "retail_per_capita": {
                "code": "002_37", "sheet": "2.37",
                "unit": "manat",
                "label_en": "Retail turnover per capita",
                "label_az": "Adambaşına pərakəndə dövriyyə",
                "label_ru": "Оборот розничной торговли на душу",
            },
            "retail_domestic_goods": {
                "code": "002_39", "sheet": "2.39",
                "unit": "thousand manat",
                "label_en": "Retail trade of domestic goods",
                "label_az": "Yerli malların pərakəndə satışı",
                "label_ru": "Розничная продажа отечественных товаров",
            },
            "wholesale_turnover": {
                "code": "002_47", "sheet": "2.47",
                "unit": "thousand manat",
                "label_en": "Wholesale trade turnover",
                "label_az": "Topdansatış dövriyyəsi",
                "label_ru": "Оборот оптовой торговли",
            },
            "markets_fairs": {
                "code": "002_58", "sheet": "2.58",
                "unit": "facilities",
                "label_en": "Number of markets and fairs",
                # "...sayı (obyekt)" doubles up; drop "sayı".
                "label_az": "Bazar və yarmarkalar",
                "label_ru": "Количество рынков и ярмарок",
            },
        },
    },
}


def iter_indicators():
    """Yield (iid, chapter_id, code, sheet, unit, label_en, label_az, label_ru).

    label_az / label_ru fall back to label_en if a translation hasn't landed
    yet — safer than leaving the verbose source-XLS sentence in the UI.
    """
    for chapter_id, ch in CHAPTERS.items():
        for iid, ind in ch["indicators"].items():
            yield iid, chapter_id, ind["code"], ind["sheet"], \
                ind["unit"], ind["label_en"], \
                ind.get("label_az") or ind["label_en"], \
                ind.get("label_ru") or ind["label_en"]


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
    """Yield (id, label_en, label_az, label_ru, order) for chapters.json."""
    for chapter_id, ch in CHAPTERS.items():
        yield chapter_id, ch["label_en"], ch["label_az"], \
            ch.get("label_ru") or ch["label_en"], ch["order"]
