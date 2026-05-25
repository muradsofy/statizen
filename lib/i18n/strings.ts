// Centralized UI strings (EN/AZ/RU). Data-derived strings (region/indicator
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
  appTitle: { en: "Statizen", az: "Statizen", ru: "Statizen" },
  followUs: { en: "Follow us", az: "Bizi izləyin", ru: "Подписаться" },
  mapAria: {
    en: "Map of Azerbaijan economic regions",
    az: "Azərbaycanın iqtisadi rayonları xəritəsi",
    ru: "Карта экономических районов Азербайджана",
  },
  selectRegion: { en: "Select a region", az: "Bölgə seçin", ru: "Выберите регион" },
  selectRegionLong: {
    en: "Select a region to see data",
    az: "Məlumat üçün bölgə seçin",
    ru: "Выберите регион, чтобы увидеть данные",
  },
  noData: { en: "No data", az: "Məlumat yoxdur", ru: "Нет данных" },
  indicator: { en: "Indicator", az: "Göstərici", ru: "Показатель" },
  chapter: { en: "Chapter", az: "Bölmə", ru: "Раздел" },
  region: { en: "Region", az: "Bölgə", ru: "Регион" },
  year: { en: "Year", az: "İl", ru: "Год" },
  latestYear: { en: "Latest", az: "Ən son", ru: "Последний" },
  updated: { en: "Updated", az: "Yeniləndi", ru: "Обновлено" },
  localeEn: { en: "EN", az: "EN", ru: "EN" },
  localeAz: { en: "AZ", az: "AZ", ru: "AZ" },
  localeRu: { en: "RU", az: "RU", ru: "RU" },
  language: { en: "Language", az: "Dil", ru: "Язык" },
  theme: { en: "Theme", az: "Mövzu", ru: "Тема" },
  themeSystem: { en: "System", az: "Sistem", ru: "Система" },
  themeLight: { en: "Light", az: "İşıqlı", ru: "Светлая" },
  themeDark: { en: "Dark", az: "Qaranlıq", ru: "Тёмная" },
  share: { en: "Share", az: "Paylaş", ru: "Поделиться" },
  shareAria: {
    en: "Share this data",
    az: "Bu məlumatı paylaş",
    ru: "Поделиться данными",
  },
  shareTagline: {
    en: "Azerbaijan regional statistics",
    az: "Azərbaycanın regional statistikası",
    ru: "Региональная статистика Азербайджана",
  },
  downloadPng: { en: "Download PNG", az: "PNG yüklə", ru: "Скачать PNG" },
  downloadPdf: { en: "Download PDF", az: "PDF yüklə", ru: "Скачать PDF" },
  shareNative: { en: "Share…", az: "Paylaş…", ru: "Поделиться…" },
  source: { en: "Source", az: "Mənbə", ru: "Источник" },
  feedback: { en: "Give feedback", az: "Rəy bildirin", ru: "Оставить отзыв" },
  feedbackTitle: {
    en: "Tell us what you think",
    az: "Fikrinizi paylaşın",
    ru: "Поделитесь мнением",
  },
  feedbackPlaceholder: {
    en: "What's working? What's broken? What stat would you add?",
    az: "Nə işləyir? Nə xarabdır? Hansı göstərici əlavə etmək istərdiniz?",
    ru: "Что работает? Что не так? Какой показатель добавить?",
  },
  feedbackEmail: {
    en: "Your email (optional, for follow-up)",
    az: "E-poçt (istəyə bağlı)",
    ru: "Ваш email (необязательно)",
  },
  feedbackSend: { en: "Send", az: "Göndər", ru: "Отправить" },
  feedbackSending: { en: "Sending…", az: "Göndərilir…", ru: "Отправка…" },
  feedbackSent: {
    en: "Thanks — got it.",
    az: "Təşəkkürlər — aldıq.",
    ru: "Спасибо — получили.",
  },
  feedbackError: {
    en: "Couldn't send. Try again?",
    az: "Göndərilmədi. Yenidən cəhd edin?",
    ru: "Не отправилось. Попробовать ещё раз?",
  },
  feedbackUnconfigured: {
    en: "Feedback isn't wired up yet.",
    az: "Rəy göndərmə hələ qurulmayıb.",
    ru: "Форма отзыва пока не настроена.",
  },
} as const;

export type StringKey = keyof typeof STRINGS;

export function t(key: StringKey, locale: Locale): string {
  return STRINGS[key][locale];
}
