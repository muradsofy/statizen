"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { indicatorsData } from "@/lib/data/loadData";
import { useAppStore } from "@/lib/state/store";
import { t } from "@/lib/i18n/strings";
import { hapticScrub } from "@/lib/haptics";

export interface YearPickerProps {
  /** Mobile variant retained for API back-compat; visual spec is identical. */
  compact?: boolean;
  width?: number | string;
}

// Figma node 42:110 (mobile) / 34:321 (desktop) — both 350 × 32.
const TRACK_HEIGHT = 32;
// Hit-area expansion above + below the visible track. 32 + 2·6 = 44 px,
// matching Apple's HIG minimum without changing the visual layout.
const HIT_EXPAND_PX = 6;
const PILL_HEIGHT = 32;
const PILL_FONT_SIZE = 14;

/**
 * Year scrubber. Matches Figma node 42:110 (mobile) and 34:321 (desktop):
 *
 *   • 32 px tall pill-shaped track (`rgba(34,34,34,0.5)` + 6.55 px
 *     backdrop blur + 0.5 px border `rgba(255,255,255,0.25)`,
 *     border-radius 24).
 *   • White pill (`#3c3c3c` text, 14 px Archivo SemiBold) sliding along
 *     the full width, sitting on top of the border (`top: -0.5`).
 *
 * UX details that aren't in the design but matter on mobile:
 *
 *   • The native `<input type="range">` is invisible and expanded ±6 px
 *     vertically so the full hit area is 44 px (HIG minimum).
 *     `touch-action: pan-x` so the slider captures horizontal touches
 *     without competing with vertical scroll.
 *   • The pill's `left` change is *not* CSS-transitioned during a drag.
 *     onChange already fires at the input's native rate (~60 Hz); a
 *     parallel 80 ms transition on every frame just stacks up animations
 *     and stutters. Transition is enabled only for non-drag jumps
 *     (e.g. URL state changes, year reset).
 *   • `setSelectedYear` is rAF-batched so a fast drag can't fire
 *     hundreds of renders per second (iOS Safari kills pages that hang
 *     the main thread). The store update is paired with a debounced URL
 *     write in `useUrlSync` so we also don't hammer history.replaceState.
 */
export function YearPicker({ compact = false, width = "100%" }: YearPickerProps) {
  // `compact` is accepted but currently has no visual effect — kept for API
  // back-compat with callers that already pass it.
  void compact;

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

  // Measure pill width so the pill's left edge can sit flush against the
  // track's right edge at the max year.
  const pillRef = useRef<HTMLDivElement>(null);
  const [pillWidth, setPillWidth] = useState(48);
  useLayoutEffect(() => {
    const el = pillRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.offsetWidth;
      setPillWidth((prev) => (Math.abs(w - prev) > 0.5 ? w : prev));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // rAF-batch state updates so a fast drag can't fire 60+ renders/sec.
  // Declared above the early-return below so hook order stays stable.
  const pendingYearRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  // True while the user is actively touching/dragging the slider —
  // disables the pill's CSS transition so a 60 Hz scrub doesn't stack
  // queued animations.
  const [dragging, setDragging] = useState(false);

  if (!years.length || latestYear === null) return null;

  const currentYear = selectedYear ?? latestYear;
  const idx = Math.max(0, years.indexOf(currentYear));
  const maxIdx = years.length - 1;
  const pct = maxIdx === 0 ? 100 : (idx / maxIdx) * 100;

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

  return (
    <div
      style={{
        position: "relative",
        width,
        height: TRACK_HEIGHT,
        background: "rgba(34, 34, 34, 0.5)",
        backdropFilter: "blur(6.55px)",
        WebkitBackdropFilter: "blur(6.55px)",
        border: "0.5px solid rgba(255, 255, 255, 0.25)",
        borderRadius: 24,
        overflow: "clip",
        boxSizing: "border-box",
      }}
    >
      <input
        type="range"
        min={0}
        max={maxIdx}
        step={1}
        value={idx}
        onChange={onSlide}
        onPointerDown={() => setDragging(true)}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
        onTouchStart={() => setDragging(true)}
        onTouchEnd={() => setDragging(false)}
        onTouchCancel={() => setDragging(false)}
        aria-label={t("year", locale)}
        style={{
          position: "absolute",
          // Expand the hit area vertically while keeping the visible
          // track at 32 px — touch target is now 44 px.
          top: -HIT_EXPAND_PX,
          left: 0,
          width: "100%",
          height: TRACK_HEIGHT + HIT_EXPAND_PX * 2,
          opacity: 0,
          margin: 0,
          padding: 0,
          background: "transparent",
          WebkitAppearance: "none",
          appearance: "none",
          touchAction: "pan-x",
          cursor: "pointer",
          zIndex: 2,
        }}
        className="year-slider"
      />
      {/* Year pill. Sits on the track surface (top: -0.5 over the border).
          left is anchored so the pill stays inside the track at idx=0 / max. */}
      <div
        ref={pillRef}
        style={{
          position: "absolute",
          top: -0.5,
          left: `calc((100% - ${pillWidth}px) * ${pct} / 100)`,
          height: PILL_HEIGHT,
          background: "#ffffff",
          color: "#3c3c3c",
          padding: "4px 8px",
          borderRadius: 99,
          fontSize: PILL_FONT_SIZE,
          fontWeight: 600,
          lineHeight: "16px",
          letterSpacing: "-0.28px",
          whiteSpace: "nowrap",
          pointerEvents: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          // Only transition when NOT actively dragging — the input fires
          // onChange at ~60 Hz during a scrub and CSS transitions on
          // every frame cause iOS jank.
          transition: dragging ? "none" : "left 120ms ease-out",
          willChange: "left",
        }}
      >
        {currentYear}
      </div>
    </div>
  );
}

/** Backwards-compat: some callers used <YearScrubber compact />. */
export const YearScrubber = YearPicker;
