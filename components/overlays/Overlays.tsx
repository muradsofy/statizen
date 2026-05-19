"use client";

import { useUrlSync } from "@/lib/state/useUrlSync";
import { LocationsPanel } from "./LocationsPanel";
import { DataCard } from "./DataCard";

export function Overlays() {
  useUrlSync();
  return (
    <div
      className="fixed left-[88px] bottom-9 flex gap-[18px] z-10 max-[1200px]:flex-col"
      style={{ pointerEvents: "none" }}
    >
      <div style={{ pointerEvents: "auto" }}>
        <LocationsPanel />
      </div>
      <div style={{ pointerEvents: "auto" }}>
        <DataCard />
      </div>
    </div>
  );
}
