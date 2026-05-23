"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useFitText } from "@/lib/ui/useFitText";
import { UnitIcon, kindForUnit } from "@/components/icons/UnitIcon";
import { indicatorsData, regionsData } from "@/lib/data/loadData";
import { useIndicatorValues } from "@/lib/data/useIndicatorValues";
import {
  selectIndicatorById,
  selectLatestValue,
  selectRegionById,
  selectValueAt,
} from "@/lib/data/selectors";
import { formatValue } from "@/lib/data/format";
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

  const indicatorLabel = indicator
    ? locale === "az"
      ? indicator.label_az
      : indicator.label_en
    : "";
  const regionName = region
    ? locale === "az"
      ? region.name_az
      : region.name_en
    : "";

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
        padding: 24,
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
          <motion.div
            key={`data-${region.id}`}
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
              <div
                style={{
                  fontSize: 16,
                  color: color.muted,
                  letterSpacing: "-0.32px",
                  lineHeight: "16px",
                  marginTop: 4,
                }}
              >
                {regionName}
              </div>
            </div>

            {/* Bottom: value + unit pill, source row. */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: 8 }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
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
                  }}
                >
                  {latest
                    ? formatValue(latest.value, indicator.unit, locale)
                    : "—"}
                </div>
                <div
                  style={{
                    background: "#ffffff",
                    width: 24,
                    height: 24,
                    borderRadius: 18,
                    padding: 3,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxSizing: "border-box",
                  }}
                  aria-hidden
                >
                  <UnitIcon kind={kindForUnit(indicator.unit)} size={18} />
                </div>
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
