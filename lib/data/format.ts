// Display formatting for indicator values. Shows the real number — no
// rounding of percentages beyond 1 decimal, no smoothing (Rule 01).

import type { Locale } from "@/types/data";

export function formatValue(
  value: number,
  unit: string,
  locale: Locale,
): string {
  const loc = locale === "az" ? "az" : "en-US";
  if (unit === "%") return `${value.toFixed(1)}%`;
  const n = new Intl.NumberFormat(loc).format(Math.round(value));
  if (unit === "manat") return `${n} ₼`;
  return n; // persons
}

export function unitLabel(unit: string, locale: Locale): string {
  const az = locale === "az";
  if (unit === "%") return az ? "faiz" : "percent";
  if (unit === "manat") return az ? "manat" : "manat";
  return az ? "nəfər" : "persons";
}
