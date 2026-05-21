"use client";

import type { RegionGeo } from "@/types/data";
import { color } from "@/lib/ui/tokens";
import { haptic } from "@/lib/haptics";

export interface RegionFillProps {
  geo: RegionGeo;
  locale: "en" | "az";
  active: boolean;
  hovered: boolean;
  onEnter: (id: string) => void;
  onLeave: () => void;
  onSelect: (id: string) => void;
}

/**
 * Interactive fill layer for one region. Stroke is drawn separately in
 * a second pass (see AzerbaijanMap) so adjacent regions' fills can't
 * paint over each other's borders, and the active region's outline is
 * never clipped by a later-drawn neighbour.
 */
export function RegionFill({
  geo,
  locale,
  active,
  hovered,
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
    <path
      d={geo.d}
      fill={fill}
      stroke="none"
      tabIndex={0}
      role="button"
      aria-label={locale === "az" ? geo.name_az : geo.name_en}
      style={{ cursor: "pointer", outline: "none", transition: "fill 120ms ease" }}
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
