"use client";

import { motion } from "framer-motion";
import type { Locale, RegionGeo } from "@/types/data";
import { color } from "@/lib/ui/tokens";
import { haptic } from "@/lib/haptics";
import { regionsData } from "@/lib/data/loadData";
import { regionName as pickRegionName } from "@/lib/i18n/localize";
import { analytics } from "@/lib/analytics";

export interface RegionFillProps {
  geo: RegionGeo;
  /**
   * Optional override for the SVG `d` attribute. When provided, the
   * shape is taken from this (e.g. a topology-derived polyline that
   * shares vertices with the border mesh); when omitted, falls back to
   * `geo.d` (the original Figma path with curves preserved).
   */
  d?: string;
  locale: Locale;
  active: boolean;
  hovered: boolean;
  /** True when another region is selected — this one fades to focus the active one. */
  dimmed?: boolean;
  onEnter: (id: string) => void;
  onLeave: () => void;
  /** Receives the region id on first click, `null` when the already-
   *  active region is clicked again (toggle-off). The store's
   *  `setSelectedRegion` accepts both. */
  onSelect: (id: string | null) => void;
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
    ? color.mapActive
    : hovered
      ? color.mapFillHover
      : color.mapFill;
  return (
    <motion.path
      d={d ?? geo.d}
      fill={fill}
      // Each region strokes its OWN perimeter as the border — borders
      // are guaranteed to sit exactly on the region's drawn boundary,
      // bypassing the topology-mesh's phantom-arc problems entirely.
      // After the ETL snap pass, adjacent regions' vertices on shared
      // edges are bit-identical, so the two overlapping strokes
      // render as a single clean 1px line.
      stroke={color.mapStroke}
      strokeWidth={1}
      vectorEffect="non-scaling-stroke"
      shapeRendering="geometricPrecision"
      tabIndex={0}
      role="button"
      aria-label={(() => {
        // Geo carries EN/AZ baked in; for RU (or any new locale) we
        // pull from regions.json by id, falling back to the geo name.
        const r = regionsData.regions.find((rr) => rr.id === geo.id);
        return r ? pickRegionName(r, locale) : geo.name_en;
      })()}
      // Sync `stroke` with `fill` so the same-colour anchoring stroke
      // doesn't briefly outpace the fill mid-transition (otherwise the
      // accent stroke pops to full purple while the fill is still
      // interpolating, reading as a momentary outline).
      style={{
        cursor: "pointer",
        outline: "none",
        transition: "fill 120ms ease, stroke 120ms ease",
      }}
      // Focus mode: split fill and stroke opacity so the dim works
      // uniformly across all borders. Single `opacity` would leave
      // the selected region's stroke at full and neighbours' at 0.4
      // — but the selected's full-opacity stroke wins where they
      // overlap on the shared edge, so those borders never dim.
      // SVG fill-opacity + stroke-opacity are independent attributes
      // and bypass that overlap problem:
      //   • fill-opacity: only neighbours dim (selected stays vivid)
      //   • stroke-opacity: every region dims (including selected),
      //     so every border reads as a uniformly softer grey when
      //     any region is selected.
      animate={{
        fillOpacity: dimmed && !active ? 0.4 : 1,
        strokeOpacity: active || dimmed ? 0.5 : 1,
      }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => onEnter(geo.id)}
      onMouseLeave={onLeave}
      onFocus={() => onEnter(geo.id)}
      onBlur={onLeave}
      onClick={(e) => {
        e.stopPropagation();
        haptic("medium");
        if (active) {
          // Toggle-off: clicking the already-active region deselects.
          onSelect(null);
        } else {
          analytics.regionSelected(geo.id, "map");
          onSelect(geo.id);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          haptic("medium");
          if (active) {
            onSelect(null);
          } else {
            analytics.regionSelected(geo.id, "map");
            onSelect(geo.id);
          }
        }
      }}
    />
  );
}
