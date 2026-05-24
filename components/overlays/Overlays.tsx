"use client";

import { useUrlSync } from "@/lib/state/useUrlSync";
import { useTheme } from "@/lib/ui/useTheme";
import { useAppStore } from "@/lib/state/store";
import { Wordmark } from "./Wordmark";
import { FollowUs } from "./FollowUs";
import { LocationsPanel } from "./LocationsPanel";
import { DataCard } from "./DataCard";
import { IndicatorPicker } from "./IndicatorPicker";
import { RegionPill } from "./RegionPicker";
import { YearPicker } from "./YearPicker";
import { ShareButton } from "./ShareButton";
import { HeaderMenu } from "./HeaderMenu";

export function Overlays() {
  useUrlSync();
  useTheme();
  // ShareButton self-gates on (region + indicator + value). For the
  // mobile bottom row layout we need to know *up front* whether the
  // Share pill will be there — when it isn't, the YearPicker grows to
  // fill the whole row. selectedRegionId is the dominant signal; the
  // indicator/value fallback edge case (data gap on a real region) is
  // rare enough that we accept "share button slot reserved but empty".
  const hasRegion = useAppStore((s) => !!s.selectedRegionId);
  return (
    <>
      {/* Header — narrow padding on mobile, 88px gutter on desktop.
          The bar gets its own blurred surface so the wordmark +
          @sofyzen / menu read as a distinct strip from the
          dropdown pickers and map below. */}
      <div
        className="fixed top-0 left-0 right-0 flex items-center justify-between z-10 py-[23px] px-5 md:px-[88px]"
        style={{
          background: "var(--c-surface-bg)",
          backdropFilter: "blur(6.55px)",
          WebkitBackdropFilter: "blur(6.55px)",
          pointerEvents: "auto",
        }}
      >
        <Wordmark />
        <div className="flex items-center gap-2">
          <FollowUs />
          <HeaderMenu />
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
        data-statizen-desktop-bottom
        style={{ pointerEvents: "none" }}
      >
        <div style={{ pointerEvents: "auto" }}>
          <LocationsPanel />
        </div>
        <div style={{ pointerEvents: "auto" }}>
          <DataCard />
        </div>
      </div>

      {/* Desktop year picker + share button — bottom-right (Figma
          47:3789: indicators frame at y=902 in a 982-tall page → bottom
          = 982 - 902 - 44 = 36px from the bottom edge). 12px gap, no
          fixed total width: YearPicker is 150px, Share grows to fit. */}
      <div
        className="hidden md:flex fixed right-[88px] bottom-[36px] z-10 gap-3 items-center"
        style={{ pointerEvents: "auto" }}
      >
        <YearPicker width={150} />
        <ShareButton width="auto" />
      </div>

      {/* Mobile chapter+indicator row — top under header (Figma 34:332 at y=77) */}
      <div
        className="md:hidden fixed left-5 right-5 top-[77px] z-10"
        style={{ pointerEvents: "auto" }}
      >
        <IndicatorPicker width="100%" layout="row" />
      </div>

      {/* Mobile bottom stack — Figma 30:310 at y=508, height=312 in an
          844px frame → bottom = 844 - 508 - 312 = 24px from the bottom
          edge. Order top→bottom: Region pill, DataCard, then a single
          row with YearPicker + ShareButton (equal width, 12px gap). */}
      <div
        className="md:hidden fixed left-[27px] right-[27px] bottom-[24px] flex flex-col gap-3 z-10"
        style={{ pointerEvents: "none" }}
      >
        <div style={{ pointerEvents: "auto" }}>
          <RegionPill />
        </div>
        <div style={{ pointerEvents: "auto" }}>
          <DataCard compact width="100%" />
        </div>
        <div
          className="flex gap-3 items-center"
          style={{ pointerEvents: "auto" }}
        >
          <div style={{ flex: "1 1 0", minWidth: 0 }}>
            <YearPicker width="100%" />
          </div>
          {hasRegion && (
            <div style={{ flex: "1 1 0", minWidth: 0 }}>
              <ShareButton width="100%" />
            </div>
          )}
        </div>
      </div>

    </>
  );
}
