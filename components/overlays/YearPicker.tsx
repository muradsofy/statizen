"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { indicatorsData } from "@/lib/data/loadData";
import { useAppStore } from "@/lib/state/store";
import { color, surface } from "@/lib/ui/tokens";
import { t } from "@/lib/i18n/strings";
import { haptic } from "@/lib/haptics";

export interface YearPickerProps {
  compact?: boolean;
  width?: number | string;
}

// Figma node 47:3635 (YearSlider — kept the name in Figma, but it's a
// stepper now: ◀ year ▶). 150 px desktop / flex-1 mobile, 44 px tall.
const PILL_HEIGHT = 44;
const PILL_PADDING_Y = 10;
const PILL_PADDING_X = 12;
const CHEVRON_SIZE = 24;

/**
 * Year stepper. Two circle-chevron buttons either side of the current
 * year. Tap left → previous year, tap right → next year. Hard-stops at
 * the first / last year the indicator has data for; arrows are
 * visually disabled at the bounds.
 *
 * Replaces the old slider+`<input type="range">` design (which crashed
 * iOS on fast scrubs and was hard to hit on mobile). The stepper kills
 * the whole class: at most one year change per tap.
 */
export function YearPicker({ compact = false, width }: YearPickerProps) {
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

  if (!years.length || latestYear === null) return null;

  const currentYear = selectedYear ?? latestYear;
  const idx = Math.max(0, years.indexOf(currentYear));
  const canPrev = idx > 0;
  const canNext = idx < years.length - 1;

  function step(direction: -1 | 1) {
    const nextIdx = idx + direction;
    if (nextIdx < 0 || nextIdx >= years.length) return;
    const nextYear = years[nextIdx];
    try {
      haptic("selection");
    } catch {
      /* haptic is a nice-to-have, never crash on it */
    }
    setYear(nextYear === latestYear ? null : nextYear);
  }

  return (
    <div
      style={{
        ...surface,
        // Pill (not the usual surface rounded-24); override the radius.
        borderRadius: 99,
        width,
        height: PILL_HEIGHT,
        padding: `${PILL_PADDING_Y}px ${PILL_PADDING_X}px`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxSizing: "border-box",
      }}
    >
      <StepButton
        direction="left"
        disabled={!canPrev}
        onClick={() => step(-1)}
        ariaLabel={t("year", locale)}
      />
      <span
        style={{
          fontSize: 16,
          fontWeight: 400,
          color: color.text,
          letterSpacing: "-0.32px",
          lineHeight: "20px",
          fontVariationSettings: "'wdth' 100",
          // Keep the year vertically centred even if the chevrons grow.
          flex: "0 0 auto",
        }}
      >
        {currentYear}
      </span>
      <StepButton
        direction="right"
        disabled={!canNext}
        onClick={() => step(1)}
        ariaLabel={t("year", locale)}
      />
    </div>
  );
}

function StepButton({
  direction,
  disabled,
  onClick,
  ariaLabel,
}: {
  direction: "left" | "right";
  disabled: boolean;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.88 }}
      aria-label={
        direction === "left" ? `${ariaLabel} −1` : `${ariaLabel} +1`
      }
      style={{
        width: CHEVRON_SIZE,
        height: CHEVRON_SIZE,
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.3 : 1,
        color: color.text,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "opacity 120ms ease",
      }}
    >
      <CircleChevron direction={direction} />
    </motion.button>
  );
}

/**
 * 24 × 24 circle with an internal chevron. Matches Figma's
 * `circle-chevron-left` / `circle-chevron-right` symbols (47:3678 /
 * 47:3679).
 */
function CircleChevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      {direction === "left" ? (
        <polyline points="13.5,8 9.5,12 13.5,16" />
      ) : (
        <polyline points="10.5,8 14.5,12 10.5,16" />
      )}
    </svg>
  );
}

/** Backwards-compat: some callers used <YearScrubber compact />. */
export const YearScrubber = YearPicker;
