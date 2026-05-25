"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import NumberFlow from "@number-flow/react";
import { useFitText } from "@/lib/ui/useFitText";
import { indicatorsData, regionsData } from "@/lib/data/loadData";
import { useIndicatorValues } from "@/lib/data/useIndicatorValues";
import {
  selectIndicatorById,
  selectLatestValue,
  selectRegionById,
  selectValueAt,
} from "@/lib/data/selectors";
import { formatValueParts, numericLocale, unitLabel } from "@/lib/data/format";
import { indicatorLabel as pickIndicatorLabel, regionName as pickRegionName } from "@/lib/i18n/localize";
import { useAppStore } from "@/lib/state/store";
import { surface, color, glow } from "@/lib/ui/tokens";
import { t } from "@/lib/i18n/strings";

export interface DataCardProps {
  /** Mobile variant: 204 px fixed height (Figma 47:3482). */
  compact?: boolean;
  width?: number | string;
}

/**
 * Figma node 47:3482 (mobile) / 45:127 (Card symbol). Layout:
 *
 *   ┌───────────────────────────────┐
 *   │ Indicator title (no unit)     │  28 px Archivo Medium + glow
 *   │ Region                        │  16 px @ 50% white
 *   │                               │
 *   │                               │
 *   │ 50  [ ⓘ ]                     │  40 px SemiBold value + unit icon pill
 *   │ stat.gov.az    Updated: …    │  12 px @ 25% white
 *   └───────────────────────────────┘
 *
 * Drops the previous (year • title-with-unit • region) header in favour
 * of Figma's plain (title • region) header — the year + unit have moved
 * elsewhere (YearPicker stepper / unit icon pill). The share icon is no
 * longer a card-corner button; it's its own pill alongside the
 * YearPicker (see ShareButton + Overlays).
 */
export function DataCard({ compact = false, width }: DataCardProps = {}) {
  const selectedRegionId = useAppStore((s) => s.selectedRegionId);
  const activeIndicatorId = useAppStore((s) => s.activeIndicatorId);
  const selectedYear = useAppStore((s) => s.selectedYear);
  const locale = useAppStore((s) => s.locale);

  const indicator = selectIndicatorById(
    indicatorsData.indicators,
    activeIndicatorId,
  );
  const region = selectedRegionId
    ? selectRegionById(regionsData.regions, selectedRegionId)
    : undefined;
  const { values } = useIndicatorValues(
    region && indicator ? indicator.id : null,
  );
  const latest =
    region && indicator
      ? (selectedYear !== null
          ? selectValueAt(values, region.id, indicator.id, selectedYear)
          : undefined) ??
        selectLatestValue(values, region.id, indicator.id)
      : undefined;

  const indicatorLabel = indicator ? pickIndicatorLabel(indicator, locale) : "";
  const regionName = region ? pickRegionName(region, locale) : "";

  const reduced = useReducedMotion();

  // Auto-shrink the title when it overflows 3 lines.
  // Mobile-compact starts at 24px; long indicator labels can shrink to 16px.
  const titleBase = compact ? 24 : 32;
  const titleMin = compact ? 16 : 20;
  const { ref: titleRef, fontSize: titleFontSize } = useFitText(
    indicatorLabel,
    { base: titleBase, min: titleMin, maxLines: 3 },
  );

  const swap = reduced
    ? {
        initial: false,
        animate: { opacity: 1 },
        exit: { opacity: 1 },
        transition: { duration: 0 },
      }
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -6 },
        transition: {
          duration: 0.22,
          ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
        },
      };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.05 }}
      style={{
        ...surface,
        position: "relative",
        width: width ?? (compact ? "100%" : 336),
        height: compact ? 204 : 300,
        // Mobile (compact): 16px per Figma 2024:301; desktop keeps 24.
        padding: compact ? 16 : 24,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        overflow: "clip",
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {!region || !indicator ? (
          <motion.div
            key="placeholder"
            {...swap}
            style={{
              margin: "auto",
              color: color.muted,
              fontSize: 16,
              letterSpacing: "-0.32px",
              textAlign: "center",
            }}
          >
            {t("selectRegionLong", locale)}
          </motion.div>
        ) : (
          /* Stable wrapper — keyed on "data" (not region.id) so the
             whole card doesn't remount on every region change. Only
             the region name (inner AnimatePresence) and the value
             (NumberFlow's digit tween) animate when the region
             changes within the same indicator. */
          <motion.div
            key="data"
            {...swap}
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              flex: 1,
              minHeight: 0,
              gap: 8,
            }}
          >
            {/* Top: title + region. */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: 0 }}
            >
              <div
                ref={titleRef}
                style={{
                  fontSize: titleFontSize,
                  fontWeight: 500,
                  // Scale tracking to ~-2% of font size so it stays
                  // visually consistent when the auto-shrink kicks in.
                  letterSpacing: `${-titleFontSize * 0.02}px`,
                  color: color.text,
                  textShadow: glow,
                  lineHeight: 1.15,
                }}
              >
                {indicatorLabel}
              </div>
              {/* Region label — fades in fresh on each region change
                  (same fade-up swap used everywhere else on the card). */}
              <div
                style={{
                  fontSize: 16,
                  color: color.muted,
                  letterSpacing: "-0.32px",
                  lineHeight: "16px",
                  // Mobile (compact): Figma 2024:302 sets itemSpacing 4
                  // between title and region; desktop bumps to 6 for
                  // breathing room at the larger title size.
                  marginTop: compact ? 4 : 6,
                  // Reserve the line so the swap doesn't shift layout
                  // while the old label is exiting.
                  position: "relative",
                  height: 16,
                }}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={region.id}
                    {...swap}
                    style={{
                      position: "absolute",
                      inset: 0,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {regionName}
                  </motion.span>
                </AnimatePresence>
              </div>
            </div>

            {/* Bottom: value row + source row. Mobile uses Figma 2024:305's
                itemSpacing 4; desktop stays at 8. */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: compact ? 4 : 8,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    fontSize: 40,
                    fontWeight: 600,
                    color: color.text,
                    letterSpacing: "-0.8px",
                    textShadow: glow,
                    lineHeight: 1,
                    whiteSpace: "nowrap",
                    display: "flex",
                    alignItems: "baseline",
                  }}
                >
                  {latest ? (
                    (() => {
                      const parts = formatValueParts(
                        latest.value,
                        indicator.unit,
                        locale,
                      );
                      return (
                        <NumberFlow
                          value={parts.display}
                          locales={numericLocale(locale)}
                          format={{
                            minimumFractionDigits: parts.decimals,
                            maximumFractionDigits: parts.decimals,
                          }}
                          suffix={parts.suffix}
                          // Apple's iOS curve to match the rest of
                          // the card's transitions.
                          transformTiming={{
                            duration: reduced ? 0 : 600,
                            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
                          }}
                          spinTiming={{
                            duration: reduced ? 0 : 600,
                            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
                          }}
                          opacityTiming={{
                            duration: reduced ? 0 : 300,
                            easing: "ease-out",
                          }}
                        />
                      );
                    })()
                  ) : (
                    "—"
                  )}
                </div>
                {(() => {
                  // Bare-text unit annotation in muted colour at the right
                  // of the big value. Empty for % / m² (those self-label
                  // inside the value text). Aligned to the baseline of the
                  // value digits so descenders sit on the same line.
                  const label = unitLabel(indicator.unit, locale);
                  if (!label) return null;
                  return (
                    <span
                      aria-hidden
                      style={{
                        fontSize: compact ? 14 : 16,
                        fontWeight: 400,
                        color: color.muted,
                        letterSpacing: "-0.3px",
                        // Align with the digit baseline of the parent flex
                        // (`alignItems: baseline`) so the label sits on
                        // the value's baseline, not its descender line.
                      }}
                    >
                      {label}
                    </span>
                  );
                })()}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  fontSize: 12,
                  color: color.faint,
                  letterSpacing: "-0.24px",
                  whiteSpace: "nowrap",
                }}
              >
                <span>stat.gov.az</span>
                <span>
                  {`${t("updated", locale)}: ${indicator.last_updated}`}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
