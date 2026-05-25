// Locale-aware accessors for data fields that ship in multiple
// languages (regions, indicators, chapters). Picks `<field>_<locale>`
// with a graceful fallback to `<field>_en` so a missing translation
// never breaks the UI — useful while RU coverage is filled in.

import type { Locale, Region, Indicator, Chapter } from "@/types/data";

/** Generic lookup: read `<field>_<locale>` off an object, fall back to
 *  `<field>_en` if missing/empty. Typed loose at the boundary; the
 *  wrappers below (regionName / indicatorLabel / chapterLabel) carry
 *  the strict types out to call sites. */
function pickLang(
  obj: Record<string, unknown>,
  field: string,
  locale: Locale,
): string {
  const v = obj[`${field}_${locale}`];
  if (typeof v === "string" && v.length > 0) return v;
  const en = obj[`${field}_en`];
  return typeof en === "string" ? en : "";
}

/** Region display name in the active locale (falls back to EN). */
export function regionName(r: Region, locale: Locale): string {
  return pickLang(r as unknown as Record<string, unknown>, "name", locale);
}

/** Indicator display label in the active locale (falls back to EN). */
export function indicatorLabel(i: Indicator, locale: Locale): string {
  return pickLang(i as unknown as Record<string, unknown>, "label", locale);
}

/** Chapter display label in the active locale (falls back to EN). */
export function chapterLabel(c: Chapter, locale: Locale): string {
  return pickLang(c as unknown as Record<string, unknown>, "label", locale);
}
