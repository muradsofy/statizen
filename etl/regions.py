"""Canonical economic-region model + name resolution.

Authoritative: vault ADR 0008 (supersedes ADR 0006). The stat.gov.az labour
files publish **14** economic regions, not the 11 in PROJECT.md. Names below
are source-traced (extracted from 009_1 EN/AZ on 2026-05-19), not invented.

An economic-region row that does NOT resolve to a canonical id is a HARD
FAILURE (vault Rule 01) — never a silent drop.
"""

import re
from typing import Optional

# Ordered canonical list. id is a stable slug; name_en/name_az are the source
# region names with the "economic region - total" / "iqtisadi rayonu - cəmi"
# suffix removed.
CANONICAL = [
    {"id": "baki", "name_en": "Baku", "name_az": "Bakı",
     "name_ru": "Баку"},
    {"id": "nakhchivan", "name_en": "Nakhchivan Autonomous Republic",
     "name_az": "Naxçıvan Muxtar Respublikası",
     "name_ru": "Нахчыванская Автономная Республика"},
    {"id": "absheron-xizi", "name_en": "Absheron-Khizi",
     "name_az": "Abşeron-Xızı", "name_ru": "Абшерон-Хызы"},
    {"id": "mountain-shirvan", "name_en": "Daghlig Shirvan",
     "name_az": "Dağlıq Şirvan", "name_ru": "Горный Ширван"},
    {"id": "ganja-dashkesen", "name_en": "Ganja-Dashkasan",
     "name_az": "Gəncə-Daşkəsən", "name_ru": "Гянджа-Дашкесан"},
    {"id": "karabakh", "name_en": "Karabakh", "name_az": "Qarabağ",
     "name_ru": "Карабах"},
    {"id": "gazakh-tovuz", "name_en": "Gazakh-Tovuz",
     "name_az": "Qazax-Tovuz", "name_ru": "Газах-Товуз"},
    {"id": "guba-khachmaz", "name_en": "Guba-Khachmaz",
     "name_az": "Quba-Xaçmaz", "name_ru": "Губа-Хачмаз"},
    {"id": "lankaran-astara", "name_en": "Lankaran-Astara",
     "name_az": "Lənkəran-Astara", "name_ru": "Лянкяран-Астара"},
    {"id": "central-aran", "name_en": "Central Aran",
     "name_az": "Mərkəzi Aran", "name_ru": "Центральный Аран"},
    {"id": "mil-mughan", "name_en": "Mil-Mughan", "name_az": "Mil-Muğan",
     "name_ru": "Миль-Муган"},
    {"id": "shaki-zaqatala", "name_en": "Shaki-Zagatala",
     "name_az": "Şəki-Zaqatala", "name_ru": "Шеки-Загатала"},
    {"id": "east-zangezur", "name_en": "Eastern Zangazur",
     "name_az": "Şərqi Zəngəzur", "name_ru": "Восточный Зангезур"},
    {"id": "shirvan-salyan", "name_en": "Shirvan-Salyan",
     "name_az": "Şirvan-Salyan", "name_ru": "Ширван-Сальян"},
]

REGION_IDS = [r["id"] for r in CANONICAL]

# National-total row labels (scope="national", ADR 0004).
_NATIONAL = {
    "republic of azerbaijan",
    "azərbaycan respublikası",
    "republic-total",          # trade chapter
    "republic - total",        # variant spacing
    "azərbaycan respublikası - cəmi",
}

# Core token (lowercased) -> canonical id. Covers EN + AZ source spellings.
_CORE_TO_ID = {
    "baku": "baki", "bakı": "baki",
    "nakhchivan": "nakhchivan", "naxçıvan": "nakhchivan",
    "absheron-khizi": "absheron-xizi", "abşeron-xızı": "absheron-xizi",
    # Tourism files drop the "-Khizi" half — fold the short form back.
    "absheron": "absheron-xizi", "abşeron": "absheron-xizi",
    "daghlig shirvan": "mountain-shirvan", "dağlıq şirvan": "mountain-shirvan",
    "daglig shirvan": "mountain-shirvan",  # source typo (no 'h')
    "daghligh shirvan": "mountain-shirvan",  # tourism file variant
    "ganja-dashkasan": "ganja-dashkesen",
    "gəncə-daşkəsən": "ganja-dashkesen",
    "karabakh": "karabakh", "qarabağ": "karabakh",
    "gazakh-tovuz": "gazakh-tovuz", "qazax-tovuz": "gazakh-tovuz",
    "guba-khachmaz": "guba-khachmaz", "quba-xaçmaz": "guba-khachmaz",
    "lankaran-astara": "lankaran-astara",
    "lənkəran-astara": "lankaran-astara",
    "central aran": "central-aran", "mərkəzi aran": "central-aran",
    "mil-mughan": "mil-mughan", "mil-muğan": "mil-mughan",
    "mil-mugan": "mil-mughan",  # source typo (no 'h')
    "shaki-zagatala": "shaki-zaqatala", "şəki-zaqatala": "shaki-zaqatala",
    "sheki-zagatala": "shaki-zaqatala",  # alt EN spelling
    "eastern zangazur": "east-zangezur", "şərqi zəngəzur": "east-zangezur",
    "shirvan-salyan": "shirvan-salyan", "şirvan-salyan": "shirvan-salyan",
}

# Markers that indicate a row IS economic-region level.
# stat.gov.az mixes Cyrillic homoglyphs into Latin text (observed:
# "economiс region" with Cyrillic с U+0441). Map look-alike Cyrillic ->
# Latin for MATCHING only (display names come from CANONICAL, untouched).
_HOMOGLYPH = str.maketrans({
    "а": "a", "е": "e", "о": "o", "р": "p", "с": "c", "х": "x", "у": "y",
    "к": "k", "м": "m", "н": "h", "т": "t", "в": "v", "і": "i", "ј": "j",
    "ѕ": "s", "ё": "e", "ԛ": "q", "ԝ": "w",
})

# A row IS economic-region level if it carries one of these markers.
_REGION_MARKERS = ("economic region", "iqtisadi rayon")
_SKIP_PREFIX = ("including", "o cümlədən", "9.")


def normalize(s: str) -> str:
    return re.sub(r"\s+", " ", str(s).replace("\n", " ")).strip()


def _match(s: str) -> str:
    """Lowercase + Cyrillic-homoglyph-folded form for fuzzy matching."""
    return normalize(s).lower().translate(_HOMOGLYPH)


def _core(name: str) -> str:
    """Strip region-type suffixes to get the bare region name (folded)."""
    s = _match(name)
    # Drop trailing footnote markers like " 1)", " 2)" used in crime tables.
    s = re.sub(r"\s+\d+\)\s*$", "", s)
    # Cover spaced variants — "- total" with spaces around the dash is
    # the canonical form, but some files (e.g. system_nat_accounts/034)
    # ship "-total" without the inner space. All variants land us on the
    # bare region name.
    for cut in (" - total", " -total", "- total", "-total",
                " - cəmi", " -cəmi", "- cəmi", "-cəmi"):
        i = s.find(cut)
        if i != -1:
            s = s[:i]
    for w in ("economic region", "iqtisadi rayonu", "iqtisadi rayon",
              "autonomous republic", "muxtar respublikası",
              "muxtar respublika", "city", "şəhəri"):
        s = s.replace(w, "")
    return re.sub(r"\s+", " ", s).strip(" -")


def is_national(name: str) -> bool:
    s = _match(name)
    # Test the raw form FIRST — `_NATIONAL` contains compound tags like
    # "republic-total" that the suffix cuts below would otherwise strip
    # down to "republic" and miss.
    if s.strip() in _NATIONAL:
        return True
    # Cover spaced variants — "- total" with spaces around the dash is
    # the canonical form, but some files (e.g. system_nat_accounts/034)
    # ship "-total" without the inner space.
    for cut in (" - total", " -total", "- total", "-total",
                " - cəmi", " -cəmi", "- cəmi", "-cəmi"):
        i = s.find(cut)
        if i != -1:
            s = s[:i]
    return s.strip() in _NATIONAL


_FOOTNOTE_RE = re.compile(r"^\s*\d+\)")


def has_region_marker(name: str) -> bool:
    """True if the row is explicitly an economic-region row.

    Excludes footnote-prose rows that incidentally mention "economic region"
    inside a sentence (e.g. "1) Until 2023 information on Karabakh economic
    region considers …" at the bottom of healthcare/003_6).
    """
    low = _match(name)
    if not low or low.startswith(_SKIP_PREFIX):
        return False
    if _FOOTNOTE_RE.match(low):
        return False
    return any(m in low for m in _REGION_MARKERS)


def resolve_region(name: str) -> Optional[str]:
    """Region row -> canonical id. None if it cannot be resolved.

    Safe for rayons: _CORE_TO_ID holds only the 14 region cores, and no
    rayon name reduces to one of them.
    """
    low = _match(name)
    if not low or low.startswith(_SKIP_PREFIX):
        return None
    return _CORE_TO_ID.get(_core(name))
