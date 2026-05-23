// Centralized UI strings (EN/AZ). Data-derived strings (region/indicator
// names, units) come from /data — see Rule 02 "every string from a message
// key" with the exception of those data fields.
//
// Why not next-intl: PROJECT.md called for next-intl with `/az` URL prefix,
// but the app is a single-page static export — next-intl's middleware-based
// routing isn't supported by `output:'export'`. The same UX (toggle +
// locale-aware UI) is delivered here with /?lang=az URL state. Logged as a
// scope decision in the vault.

import type { Locale } from "@/types/data";

export const STRINGS = {
  appTitle: { en: "Statizen", az: "Statizen" },
  followUs: { en: "Follow us", az: "Bizi izləyin" },
  mapAria: {
    en: "Map of Azerbaijan economic regions",
    az: "Azərbaycanın iqtisadi rayonları xəritəsi",
  },
  selectRegion: { en: "Select a region", az: "Bölgə seçin" },
  selectRegionLong: {
    en: "Select a region to see data",
    az: "Məlumat üçün bölgə seçin",
  },
  noData: { en: "No data", az: "Məlumat yoxdur" },
  indicator: { en: "Indicator", az: "Göstərici" },
  chapter: { en: "Chapter", az: "Bölmə" },
  region: { en: "Region", az: "Bölgə" },
  year: { en: "Year", az: "İl" },
  latestYear: { en: "Latest", az: "Ən son" },
  updated: { en: "Updated", az: "Yeniləndi" },
  localeEn: { en: "EN", az: "EN" },
  localeAz: { en: "AZ", az: "AZ" },
  language: { en: "Language", az: "Dil" },
  theme: { en: "Theme", az: "Mövzu" },
  themeComingSoon: { en: "Light mode soon", az: "İşıqlı rejim tezliklə" },
  share: { en: "Share", az: "Paylaş" },
  shareAria: { en: "Share this data", az: "Bu məlumatı paylaş" },
  shareTagline: {
    en: "Azerbaijan regional statistics",
    az: "Azərbaycanın regional statistikası",
  },
  downloadPng: { en: "Download PNG", az: "PNG yüklə" },
  downloadPdf: { en: "Download PDF", az: "PDF yüklə" },
  shareNative: { en: "Share…", az: "Paylaş…" },
  source: { en: "Source", az: "Mənbə" },
} as const;

export type StringKey = keyof typeof STRINGS;

export function t(key: StringKey, locale: Locale): string {
  return STRINGS[key][locale];
}
