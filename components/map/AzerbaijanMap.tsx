"use client";

import { regionsGeo } from "@/lib/map/loadGeo";
import { useAppStore } from "@/lib/state/store";
import { RegionPath } from "./RegionPath";

export function AzerbaijanMap() {
  const selectedRegionId = useAppStore((s) => s.selectedRegionId);
  const hoveredRegionId = useAppStore((s) => s.hoveredRegionId);
  const locale = useAppStore((s) => s.locale);
  const setHovered = useAppStore((s) => s.setHoveredRegion);
  const setSelected = useAppStore((s) => s.setSelectedRegion);

  return (
    <svg
      viewBox={regionsGeo.viewBox}
      preserveAspectRatio="xMidYMid meet"
      width="100%"
      height="100%"
      role="group"
      aria-label="Map of Azerbaijan economic regions"
      style={{ display: "block", width: "100%", height: "100%" }}
    >
      {regionsGeo.regions.map((geo) => (
        <RegionPath
          key={geo.id}
          geo={geo}
          locale={locale}
          active={selectedRegionId === geo.id}
          hovered={hoveredRegionId === geo.id}
          onEnter={setHovered}
          onLeave={() => setHovered(null)}
          onSelect={setSelected}
        />
      ))}
    </svg>
  );
}
