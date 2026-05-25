// Locale-aware accessors for data fields that ship in multiple
// languages (regions, indicators, chapters). Picks `<field>_<locale>`
// with a graceful fallback to `<field>_en` so a missing translation
// never breaks the UI — useful while RU coverage is filled in.

import type { Locale, Region, Indicator, Chapter } from "@/types/data";

type WithLangFields<F extends string> = Record<`${F}_en`, string> &
  Partial<Record<`${F}_az` | `${F}_ru`, string>>;

function pickLang<F extends string>(
  obj: WithLangFields<F>,
  field: F,
  locale: Locale,
): string {
  const key = `${field}_${locale}` as `${F}_en` | `${F}_az` | `${F}_ru`;
  const v = obj[key];
  if (v && v.length) return v;
  return obj[`${field}_en` as `${F}_en`];
}

/** Region display name in the active locale (falls back to EN). */
export function regionName(r: Region, locale: Locale): string {
  return pickLang(r, "name", locale);
}

/** Indicator display label in the active locale (falls back to EN). */
export function indicatorLabel(i: Indicator, locale: Locale): string {
  return pickLang(i, "label", locale);
}

/** Chapter display label in the active locale (falls back to EN). */
export function chapterLabel(c: Chapter, locale: Locale): string {
  return pickLang(c, "label", locale);
}
