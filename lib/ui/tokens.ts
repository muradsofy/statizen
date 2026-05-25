// Design tokens — authoritative visual surface for component code.
//
// Every value resolves at runtime to a CSS variable set by the
// `[data-theme]` attribute on <html> (see app/globals.css). That keeps
// JS components blissfully theme-agnostic — flip the attribute and the
// whole UI repaints, no per-component re-render needed. WCAG-AA tuned
// in both palettes; see the CSS file for the actual hex values.

import type { CSSProperties } from "react";

export const color = {
  bg: "var(--c-bg)",
  text: "var(--c-text)",
  muted: "var(--c-muted)",
  faint: "var(--c-faint)",
  accent: "var(--c-accent)",
  shareAccent: "var(--c-share-accent)",
  /** Fill for the currently-selected region on the map. Themed —
   *  vibrant on dark, soft pastel on light. Distinct from `accent`
   *  so buttons/dialogs keep their brand purple. */
  mapActive: "var(--c-map-active)",
  mapFill: "var(--c-map-fill)",
  mapFillHover: "var(--c-map-fill-hover)",
  mapStroke: "var(--c-map-stroke)",
  mapStrokeActive: "var(--c-map-stroke-active)",
  /** List-row / button hover + active surface highlights. Inverts
   *  cleanly between light and dark themes. */
  hoverSoft: "var(--c-hover-soft)",
  hoverStrong: "var(--c-hover-strong)",
  hoverText: "var(--c-hover-text)",
  /** Foreground that sits ON the purple `accent` (Share pill text,
   *  etc.). Always white — accent purple is dark in both themes. */
  onAccent: "var(--c-on-accent)",
} as const;

export const glow = "var(--c-glow)";

/** Shared panel / button surface (frosted, 22px blur). */
export const surface: CSSProperties = {
  background: "var(--c-surface-bg)",
  backdropFilter: "blur(22px)",
  WebkitBackdropFilter: "blur(22px)",
  border: "0.5px solid var(--c-surface-border)",
  borderRadius: 24,
};

export const GUTTER = 88;
