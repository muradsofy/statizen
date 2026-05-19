"use client";

import { useUrlSync } from "@/lib/state/useUrlSync";
import { Wordmark } from "./Wordmark";
import { FollowUs } from "./FollowUs";
import { LocationsPanel } from "./LocationsPanel";
import { DataCard } from "./DataCard";
import { GUTTER } from "@/lib/ui/tokens";

export function Overlays() {
  useUrlSync();
  return (
    <>
      {/* Header */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          padding: `23px ${GUTTER}px`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 10,
          pointerEvents: "none",
        }}
      >
        <div style={{ pointerEvents: "auto" }}>
          <Wordmark />
        </div>
        <div style={{ pointerEvents: "auto" }}>
          <FollowUs />
        </div>
      </div>

      {/* Bottom-left pair (stacks under 1200px) */}
      <div
        className="fixed bottom-9 flex gap-[18px] z-10 max-[1200px]:flex-col"
        style={{ left: GUTTER, pointerEvents: "none" }}
      >
        <div style={{ pointerEvents: "auto" }}>
          <LocationsPanel />
        </div>
        <div style={{ pointerEvents: "auto" }}>
          <DataCard />
        </div>
      </div>
    </>
  );
}
