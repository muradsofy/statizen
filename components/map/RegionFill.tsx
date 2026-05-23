"use client";

import { motion } from "framer-motion";
import type { RegionGeo } from "@/types/data";
import { color } from "@/lib/ui/tokens";
import { haptic } from "@/lib/haptics";

export interface RegionFillProps {
  geo: RegionGeo;
  /**
   * Optional override for the SVG `d` attribute. When provided, the
   * shape is taken from this (e.g. a topology-derived polyline that
   * shares vertices with the border mesh); when omitted, falls back to
   * `geo.d` (the original Figma path with curves preserved).
   */
  d?: string;
  locale: "en" | "az";
  active: boolean;
  hovered: boolean;
  /** True when another region is selected — this one fades to focus the active one. */
  dimmed?: boolean;
  onEnter: (id: string) => void;
  onLeave: () => void;
  onSelect: (id: string) => void;
}

/**
 * Interactive fill layer for one region. Stroke is drawn separately
 * via the topology mesh (see AzerbaijanMap) — that way adjacent fills
 * can't paint over each other's borders, and every shared edge is
 * drawn exactly once.
 */
export function RegionFill({
  geo,
  d,
  locale,
  active,
  hovered,
  dimmed = false,
  onEnter,
  onLeave,
  onSelect,
}: RegionFillProps) {
  const fill = active
    ? color.accent
    : hovered
      ? "#1d1d20"
      : color.mapFill;
  return (
    <motion.path
      d={d ?? geo.d}
      fill={fill}
      // Same-colour stroke anchors the fill edge: against the pure-black
      // background the active region's saturated purple otherwise shows
      // a thin anti-aliased rim. Stroke covers the AA transition zone
      // so the perceived edge is sharp.
      stroke={fill}
      strokeWidth={1}
      vectorEffect="non-scaling-stroke"
      shapeRendering="geometricPrecision"
      tabIndex={0}
      role="button"
      aria-label={locale === "az" ? geo.name_az : geo.name_en}
      // Sync `stroke` with `fill` so the same-colour anchoring stroke
      // doesn't briefly outpace the fill mid-transition (otherwise the
      // accent stroke pops to full purple while the fill is still
      // interpolating, reading as a momentary outline).
      style={{
        cursor: "pointer",
        outline: "none",
        transition: "fill 120ms ease, stroke 120ms ease",
      }}
      // Focus mode: when another region is selected, fade this one
      // toward the bg so the active region pops. Active region stays at
      // full opacity even when `dimmed` is theoretically passed.
      animate={{ opacity: dimmed && !active ? 0.4 : 1 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => onEnter(geo.id)}
      onMouseLeave={onLeave}
      onFocus={() => onEnter(geo.id)}
      onBlur={onLeave}
      onClick={(e) => {
        e.stopPropagation();
        if (!active) haptic("medium");
        onSelect(geo.id);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          if (!active) haptic("medium");
          onSelect(geo.id);
        }
      }}
    />
  );
}
