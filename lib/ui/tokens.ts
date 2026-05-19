// Exact design tokens — see Statizen-vault/design/TOKENS.md.
// Authoritative visual values pulled from Figma (no guessing).

import type { CSSProperties } from "react";

export const color = {
  bg: "#000000",
  text: "#ffffff",
  muted: "rgba(255,255,255,0.5)",
  accent: "#612bf4", // active region (from reference)
  mapFill: "#0e0e0e",
  mapStroke: "rgba(255,255,255,0.08)",
} as const;

export const glow = "0 0 10px rgba(255,255,255,0.5)";

/** Shared panel / button surface (frosted dark, 6.55px blur). */
export const surface: CSSProperties = {
  background: "rgba(34,34,34,0.5)",
  backdropFilter: "blur(6.55px)",
  WebkitBackdropFilter: "blur(6.55px)",
  border: "0.5px solid rgba(255,255,255,0.25)",
  borderRadius: 24,
};

export const GUTTER = 88;
