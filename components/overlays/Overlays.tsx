"use client";

import { useUrlSync } from "@/lib/state/useUrlSync";
import { Wordmark } from "./Wordmark";
import { FollowUs } from "./FollowUs";
import { LocationsPanel } from "./LocationsPanel";
import { DataCard } from "./DataCard";
import { IndicatorPicker } from "./IndicatorPicker";
import { RegionPicker } from "./RegionPicker";
import { LocaleToggle } from "./LocaleToggle";

export function Overlays() {
  useUrlSync();
  return (
    <>
      {/* Header — narrow padding on mobile, 88px gutter on desktop */}
      <div
        className="fixed top-0 left-0 right-0 flex items-center justify-between z-10 py-[23px] px-5 md:px-[88px]"
        style={{ pointerEvents: "none" }}
      >
        <div style={{ pointerEvents: "auto" }}>
          <Wordmark />
        </div>
        <div
          className="flex items-center gap-2"
          style={{ pointerEvents: "auto" }}
        >
          <LocaleToggle />
          <FollowUs />
        </div>
      </div>

      {/* Desktop indicator picker (top-left under header) */}
      <div
        className="hidden md:block fixed left-[88px] top-[108px] z-10"
        style={{ pointerEvents: "auto" }}
      >
        <IndicatorPicker width={350} />
      </div>

      {/* Desktop bottom-left pair: locations list + data card */}
      <div
        className="hidden md:flex fixed left-[88px] bottom-9 gap-[18px] z-10"
        style={{ pointerEvents: "none" }}
      >
        <div style={{ pointerEvents: "auto" }}>
          <LocationsPanel />
        </div>
        <div style={{ pointerEvents: "auto" }}>
          <DataCard />
        </div>
      </div>

      {/* Mobile bottom stack: indicator + region dropdowns + compact data card */}
      <div
        className="md:hidden fixed left-5 right-5 bottom-6 flex flex-col gap-3 z-10"
        style={{ pointerEvents: "none" }}
      >
        <div style={{ pointerEvents: "auto" }}>
          <IndicatorPicker width="100%" />
        </div>
        <div style={{ pointerEvents: "auto" }}>
          <RegionPicker width="100%" />
        </div>
        <div style={{ pointerEvents: "auto" }}>
          <DataCard compact width="100%" />
        </div>
      </div>
    </>
  );
}
