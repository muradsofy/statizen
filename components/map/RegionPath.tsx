"use client";

import type { RegionGeo } from "@/types/data";
import { color } from "@/lib/ui/tokens";
import { haptic } from "@/lib/haptics";

export interface RegionPathProps {
  geo: RegionGeo;
  locale: "en" | "az";
  active: boolean;
  hovered: boolean;
  onEnter: (id: string) => void;
  onLeave: () => void;
  onSelect: (id: string) => void;
}

export function RegionPath({
  geo,
  locale,
  active,
  hovered,
  onEnter,
  onLeave,
  onSelect,
}: RegionPathProps) {
  const fill = active
    ? color.accent
    : hovered
      ? "#1d1d20"
      : color.mapFill;
  return (
    <path
      d={geo.d}
      fill={fill}
      stroke={active ? color.mapStrokeActive : color.mapStroke}
      strokeWidth={active ? 1.5 : 1}
      vectorEffect="non-scaling-stroke"
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
