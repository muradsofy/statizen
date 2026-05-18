"use client";

import type { RegionGeo } from "@/types/data";

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
  const fill = active ? "#6c5ce7" : hovered ? "#2e2e34" : "#1c1c1f";
  return (
    <path
      d={geo.d}
      fill={fill}
      stroke={active ? "#b9a9ff" : "rgba(255,255,255,0.09)"}
      strokeWidth={active ? 1.5 : 1}
      tabIndex={0}
      role="button"
      aria-label={locale === "az" ? geo.name_az : geo.name_en}
      style={{ cursor: "pointer", outline: "none", transition: "fill 120ms ease" }}
      onMouseEnter={() => onEnter(geo.id)}
      onMouseLeave={onLeave}
      onFocus={() => onEnter(geo.id)}
      onBlur={onLeave}
      onClick={() => onSelect(geo.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(geo.id);
        }
      }}
    />
  );
}
