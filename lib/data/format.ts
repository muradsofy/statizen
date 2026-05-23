// Display formatting for indicator values. Shows the real number — no
// rounding of percentages beyond 1 decimal, no smoothing (Rule 01).
//
// The Figma design (30:132) appends the unit to the indicator title in
// parentheses (e.g. "Unemployment rate (%)") and drops the separate subtitle
// next to the big value, so this file exposes:
//   - `formatValue` for the big numeric display
//   - `unitSuffix` for the "(unit)" decoration appended to the title

import type { Locale } from "@/types/data";

function compactNumber(n: number, locale: Locale): string {
  const az = locale === "az";
  const loc = az ? "az" : "en-US";
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
    // "B" / "mlrd" (milyard). Trade ETL values come in as thousand-manat;
    // when re-multiplied by 1000 the top regions cross into billions.
    return abbreviate(n / 1_000_000_000, az ? " mlrd" : "B");
  }
  if (abs >= 1_000_000) {
    return abbreviate(n / 1_000_000, az ? " mln" : "M");
  }
  return new Intl.NumberFormat(loc).format(Math.round(n));
}

/** Big-number display for the DataCard hero value. */
export function formatValue(
  value: number,
  unit: string,
  locale: Locale,
): string {
  const loc = locale === "az" ? "az" : "en-US";
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
    case "persons":
    case "cases":
    case "families":
    case "facilities":
      return compactNumber(value, locale);
    case "m²":
      return `${fmtDp(value, 1)} m²`;
    default:
      return compactNumber(value, locale);
  }
}

/** "(unit)" string appended to the indicator title (Figma 30:132). */
export function unitSuffix(unit: string, locale: Locale): string {
  const az = locale === "az";
  switch (unit) {
    case "%":
      return "(%)";
    case "manat":
    case "thousand manat":
      return "(manat)";
    case "persons":
    case "thousand persons":
      return az ? "(nəfər)" : "(persons)";
    case "m²":
      return "(m²)";
    case "cases":
      return az ? "(hadisə)" : "(cases)";
    case "families":
      return az ? "(ailə)" : "(families)";
    case "facilities":
      return az ? "(obyekt)" : "(facilities)";
    default:
      return `(${unit})`;
  }
}
