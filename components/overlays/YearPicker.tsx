"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { indicatorsData } from "@/lib/data/loadData";
import { useAppStore } from "@/lib/state/store";
import { surface } from "@/lib/ui/tokens";
import { t } from "@/lib/i18n/strings";
import { hapticScrub } from "@/lib/haptics";

export interface YearPickerProps {
  /** Mobile variant: 40px tall, 6px track, 14px pill text (Figma 34:348). */
  compact?: boolean;
  width?: number | string;
}

/** Visual breathing room between the pill and the rounded track ends. */
const PILL_INSET = 0;

/**
 * Minimal horizontal track with a small white pill at the slider thumb
 * indicating the year. Matches Figma node 34:321 (desktop) / 34:348 (mobile).
 * The pill's edges sit flush against the rounded ends of the track at the
 * extreme positions — width is measured at runtime so 4-digit / mixed
 * Archivo glyphs all align.
 */
export function YearPicker({ compact = false, width = "100%" }: YearPickerProps) {
  const activeIndicatorId = useAppStore((s) => s.activeIndicatorId);
  const selectedYear = useAppStore((s) => s.selectedYear);
  const setYear = useAppStore((s) => s.setSelectedYear);
  const locale = useAppStore((s) => s.locale);

  const indicator = indicatorsData.indicators.find(
    (i) => i.id === activeIndicatorId,
  );
  const years = indicator?.years ?? [];
  const latestYear = years.length ? years[years.length - 1] : null;

  useEffect(() => {
    if (
      selectedYear !== null &&
      years.length &&
      !years.includes(selectedYear)
    ) {
      setYear(null);
    }
  }, [activeIndicatorId, selectedYear, years, setYear]);

  // Measure pill width so we can keep its edges flush against the track ends.
  const pillRef = useRef<HTMLDivElement>(null);
  const [pillWidth, setPillWidth] = useState(48);

  useLayoutEffect(() => {
    const el = pillRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.offsetWidth; // border-box width incl. padding
      setPillWidth((prev) => (Math.abs(w - prev) > 0.5 ? w : prev));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (!years.length || latestYear === null) return null;

  const currentYear = selectedYear ?? latestYear;
  const idx = Math.max(0, years.indexOf(currentYear));
  const maxIdx = years.length - 1;
  const pct = maxIdx === 0 ? 100 : (idx / maxIdx) * 100;

  // rAF-batch state updates so a fast drag can't fire hundreds of renders
  // per second (iOS Safari kills the page when scripts run too long). We
  // remember the latest requested year and apply it once per frame.
  const pendingYearRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  function onSlide(e: React.ChangeEvent<HTMLInputElement>) {
    const i = parseInt(e.target.value, 10);
    const y = years[i];
    if (y === undefined) return;
    pendingYearRef.current = y;
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const py = pendingYearRef.current;
      pendingYearRef.current = null;
      if (py === null || py === currentYear) return;
      try {
        hapticScrub("selection");
      } catch {
        /* haptic is a nice-to-have, never crash on it */
      }
      setYear(py === latestYear ? null : py);
    });
  }

  const trackHeight = compact ? 6 : 8;
  const pillHeight = 24;
  const pillFontSize = compact ? 14 : 16;
  const containerHeight = compact ? 40 : 56;
  const containerPad = compact ? "8px 8px" : "8px 8px";

  return (
    <div
      style={{
        ...surface,
        width,
        height: containerHeight,
        padding: containerPad,
        position: "relative",
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "relative",
          flex: 1,
          height: trackHeight,
          background: "rgba(255,255,255,0.25)",
          borderRadius: 999,
        }}
      >
        <input
          type="range"
          min={0}
          max={maxIdx}
          step={1}
          value={idx}
          onChange={onSlide}
          aria-label={t("year", locale)}
          style={{
            position: "absolute",
            inset: `${-(pillHeight - trackHeight) / 2}px 0`,
            width: "100%",
            height: pillHeight,
            opacity: 0,
            cursor: "pointer",
            margin: 0,
            padding: 0,
            background: "transparent",
            WebkitAppearance: "none",
            appearance: "none",
            zIndex: 2,
          }}
          className="year-slider"
        />
        {/* Year pill — left edge anchored so the pill stays inside the
            track at idx=0 / idx=max, with a small inset on both ends. */}
        <div
          ref={pillRef}
          style={{
            position: "absolute",
            top: "50%",
            // pill left edge = inset + (trackWidth - pillWidth - 2*inset) * pct/100
            left: `calc(${PILL_INSET}px + (100% - ${pillWidth + PILL_INSET * 2}px) * ${pct} / 100)`,
            transform: "translateY(-50%)",
            background: "#ffffff",
            color: "#3c3c3c",
            padding: "4px 6px",
            borderRadius: 99,
            fontSize: pillFontSize,
            fontWeight: 600,
            lineHeight: "16px",
            letterSpacing: pillFontSize === 14 ? "-0.28px" : "-0.32px",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            transition: "left 80ms ease-out",
          }}
        >
          {currentYear}
        </div>
      </div>
    </div>
  );
}

/** Backwards-compat: some callers used <YearScrubber compact />. */
export const YearScrubber = YearPicker;
