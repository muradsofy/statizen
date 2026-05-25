// Display formatting for indicator values. Shows the real number — no
// rounding of percentages beyond 1 decimal, no smoothing (Rule 01).
//
// The Figma design (30:132) appends the unit to the indicator title in
// parentheses (e.g. "Unemployment rate (%)") and drops the separate subtitle
// next to the big value, so this file exposes:
//   - `formatValue` for the big numeric display
//   - `unitSuffix` for the "(unit)" decoration appended to the title

import type { Locale } from "@/types/data";

/**
 * Locale tag for `Intl.NumberFormat`. AZ wants `1 234,56` (narrow NBSP
 * thousands + comma decimal) — that's the Azerbaijani print convention,
 * but the `az` ICU locale formats German-style `1.234,56`. `fr-FR`
 * produces exactly the space+comma output we want, so we use it as the
 * AZ numeric substitute. RU also uses space-thousands + comma-decimal
 * (`ru` ICU locale renders that natively). Localized *strings* (mln /
 * mlrd / nəfər …) still come from the AZ branches elsewhere — this
 * only governs digit grouping & decimal symbol.
 */
export function numericLocale(locale: Locale): string {
  if (locale === "az") return "fr-FR";
  if (locale === "ru") return "ru-RU";
  return "en-US";
}

function compactNumber(n: number, locale: Locale): string {
  const loc = numericLocale(locale);
  const big = locale === "az" ? " mlrd" : locale === "ru" ? " млрд" : "B";
  const mil = locale === "az" ? " mln" : locale === "ru" ? " млн" : "M";
  const abs = Math.abs(n);

  function abbreviate(scaled: number, suffix: string): string {
    const a = Math.abs(scaled);
    // ≥ 100 → no decimals (3+ sig figs already), 10–99 → 1, < 10 → 2.
    const dp = a >= 100 ? 0 : a >= 10 ? 1 : 2;
    const num = new Intl.NumberFormat(loc, {
      minimumFractionDigits: dp,
      maximumFractionDigits: dp,
    }).format(scaled);
    return `${num}${suffix}`;
  }

  if (abs >= 1_000_000_000) {
    // "B" / "mlrd" / "млрд". Trade ETL values come in as thousand-manat;
    // when re-multiplied by 1000 the top regions cross into billions.
    return abbreviate(n / 1_000_000_000, big);
  }
  if (abs >= 1_000_000) {
    return abbreviate(n / 1_000_000, mil);
  }
  return new Intl.NumberFormat(loc).format(Math.round(n));
}

/** Big-number display for the DataCard hero value. */
export function formatValue(
  value: number,
  unit: string,
  locale: Locale,
): string {
  const loc = numericLocale(locale);
  const fmtDp = (n: number, dp: number) =>
    new Intl.NumberFormat(loc, { maximumFractionDigits: dp }).format(n);

  switch (unit) {
    case "%":
      return `${value.toFixed(1)}%`;
    case "manat":
    case "thousand manat":
      return compactNumber(unit === "thousand manat" ? value * 1000 : value, locale);
    case "thousand persons":
      return compactNumber(value * 1000, locale);
    case "thousand tonnes":
      return compactNumber(value * 1000, locale);
    case "persons":
    case "cases":
    case "families":
    case "facilities":
    case "tonnes":
      return compactNumber(value, locale);
    case "m²":
      return `${fmtDp(value, 1)} m²`;
    default:
      return compactNumber(value, locale);
  }
}

/**
 * Same logic as `formatValue` but returns the parts separately so an
 * animated number component (NumberFlow) can tween the digit and a
 * static `<span>` can carry the unit suffix. `display` is the
 * already-scaled number to feed to NumberFlow; `decimals` are the
 * fraction digits NumberFlow should keep stable.
 */
export interface FormattedParts {
  display: number;
  suffix: string;
  decimals: number;
}

export function formatValueParts(
  value: number,
  unit: string,
  locale: Locale,
): FormattedParts {
  switch (unit) {
    case "%":
      return { display: value, suffix: "%", decimals: 1 };
    case "manat":
    case "thousand manat":
      return compactParts(
        unit === "thousand manat" ? value * 1000 : value,
        locale,
      );
    case "thousand persons":
      return compactParts(value * 1000, locale);
    case "thousand tonnes":
      return compactParts(value * 1000, locale);
    case "persons":
    case "cases":
    case "families":
    case "facilities":
    case "tonnes":
      return compactParts(value, locale);
    case "m²":
      return { display: value, suffix: " m²", decimals: 1 };
    default:
      return compactParts(value, locale);
  }
}

function compactParts(n: number, locale: Locale): FormattedParts {
  const abs = Math.abs(n);
  function dpFor(scaled: number): number {
    const a = Math.abs(scaled);
    return a >= 100 ? 0 : a >= 10 ? 1 : 2;
  }
  const big = locale === "az" ? " mlrd" : locale === "ru" ? " млрд" : "B";
  const mil = locale === "az" ? " mln" : locale === "ru" ? " млн" : "M";
  if (abs >= 1_000_000_000) {
    const scaled = n / 1_000_000_000;
    return { display: scaled, suffix: big, decimals: dpFor(scaled) };
  }
  if (abs >= 1_000_000) {
    const scaled = n / 1_000_000;
    return { display: scaled, suffix: mil, decimals: dpFor(scaled) };
  }
  return { display: Math.round(n), suffix: "", decimals: 0 };
}

/** Bare unit label, no parens. Used as the muted-text annotation next
 *  to the DataCard value (e.g. "11,638 marriages"). Returns an empty
 *  string for units that already self-describe in the value text — %
 *  and m² — so callers don't double up. */
export function unitLabel(unit: string, locale: Locale): string {
  const pick = <T extends string>(en: T, az: T, ru: T): T =>
    locale === "az" ? az : locale === "ru" ? ru : en;
  switch (unit) {
    case "%":
      return ""; // already in the value (`4.8%`)
    case "m²":
      return ""; // already in the value (`20.9 m²`)
    case "manat":
    case "thousand manat":
      return pick("manat", "manat", "манат");
    case "persons":
    case "thousand persons":
      return pick("persons", "nəfər", "человек");
    case "cases":
      return pick("cases", "hadisə", "случаев");
    case "families":
      return pick("families", "ailə", "семей");
    case "facilities":
      return pick("facilities", "obyekt", "объектов");
    case "tonnes":
    case "thousand tonnes":
      return pick("tonnes", "ton", "тонн");
    default:
      return unit;
  }
}

/** "(unit)" string appended to the indicator title (Figma 30:132). */
export function unitSuffix(unit: string, locale: Locale): string {
  const pick = <T extends string>(en: T, az: T, ru: T): T =>
    locale === "az" ? az : locale === "ru" ? ru : en;
  switch (unit) {
    case "%":
      return "(%)";
    case "manat":
    case "thousand manat":
      return pick("(manat)", "(manat)", "(манат)");
    case "persons":
    case "thousand persons":
      return pick("(persons)", "(nəfər)", "(человек)");
    case "m²":
      return "(m²)";
    case "cases":
      return pick("(cases)", "(hadisə)", "(случаев)");
    case "families":
      return pick("(families)", "(ailə)", "(семей)");
    case "facilities":
      return pick("(facilities)", "(obyekt)", "(объектов)");
    case "tonnes":
    case "thousand tonnes":
      return pick("(tonnes)", "(ton)", "(тонн)");
    default:
      return `(${unit})`;
  }
}
