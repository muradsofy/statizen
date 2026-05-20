"use client";

import { useUrlSync } from "@/lib/state/useUrlSync";
import { Wordmark } from "./Wordmark";
import { FollowUs } from "./FollowUs";
import { LocationsPanel } from "./LocationsPanel";
import { DataCard } from "./DataCard";
import { IndicatorPicker } from "./IndicatorPicker";
import { RegionPill } from "./RegionPicker";
import { YearPicker } from "./YearPicker";
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
        className="hidden md:block fixed left-[88px] top-[120px] z-10"
        style={{ pointerEvents: "auto" }}
      >
        <IndicatorPicker width={350} />
      </div>

      {/* Desktop bottom-left: locations list + data card */}
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

      {/* Desktop year picker — bottom-right (Figma 34:321: y=874, height=56,
          so bottom = 982 - 874 - 56 = 52px from the bottom edge). */}
      <div
        className="hidden md:block fixed right-[88px] bottom-[52px] z-10"
        style={{ pointerEvents: "auto", width: 350 }}
      >
        <YearPicker />
      </div>

      {/* Mobile chapter+indicator row — top under header (Figma 34:332 at y=77) */}
      <div
        className="md:hidden fixed left-5 right-5 top-[77px] z-10"
        style={{ pointerEvents: "auto" }}
      >
        <IndicatorPicker width="100%" layout="row" />
      </div>

      {/* Mobile bottom stack — Figma 30:310 sits at y=523, height=289 in a
          844px frame → bottom = 844 - 523 - 289 = 32px from the bottom edge.
          Order top→bottom: Region pill, DataCard, YearPicker. */}
      <div
        className="md:hidden fixed left-5 right-5 bottom-[32px] flex flex-col gap-3 z-10"
        style={{ pointerEvents: "none" }}
      >
        <div style={{ pointerEvents: "auto" }}>
          <RegionPill />
        </div>
        <div style={{ pointerEvents: "auto" }}>
          <DataCard compact width="100%" />
        </div>
        <div style={{ pointerEvents: "auto" }}>
          <YearPicker compact width="100%" />
        </div>
      </div>

    </>
  );
}
