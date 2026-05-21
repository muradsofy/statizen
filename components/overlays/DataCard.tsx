"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useFitText } from "@/lib/ui/useFitText";
import { ShareDialog } from "@/components/share/ShareDialog";
import { haptic } from "@/lib/haptics";
import { indicatorsData, regionsData } from "@/lib/data/loadData";
import { useIndicatorValues } from "@/lib/data/useIndicatorValues";
import {
  selectIndicatorById,
  selectLatestValue,
  selectRegionById,
  selectValueAt,
} from "@/lib/data/selectors";
import { formatValue, unitSuffix } from "@/lib/data/format";
import { useAppStore } from "@/lib/state/store";
import { surface, color, glow } from "@/lib/ui/tokens";
import { t } from "@/lib/i18n/strings";

export interface DataCardProps {
  /** Mobile variant: smaller fonts (Figma 30:296, 20px title). */
  compact?: boolean;
  width?: number | string;
}

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
  // Prefer the explicitly-picked year when set; fall back to the latest
  // available year (covers indicator default + gap years).
  const latest =
    region && indicator
      ? (selectedYear !== null
          ? selectValueAt(values, region.id, indicator.id, selectedYear)
          : undefined) ??
        selectLatestValue(values, region.id, indicator.id)
      : undefined;

  const labelBase = indicator
    ? locale === "az"
      ? indicator.label_az
      : indicator.label_en
    : "";
  const titleWithUnit = indicator
    ? `${labelBase} ${unitSuffix(indicator.unit, locale)}`
    : labelBase;
  const regionName = region
    ? locale === "az"
      ? region.name_az
      : region.name_en
    : "";

  const reduced = useReducedMotion();
  const [shareOpen, setShareOpen] = useState(false);

  // Auto-shrink the title when it overflows 3 lines. AZ translations are
  // longer than EN on average; some chapter titles (e.g. "Dövlət dəstəyi
  // ilə mənzil alan ailələr") can fall just over the line at the base size.
  const titleBase = compact ? 20 : 24;
  const titleMin = compact ? 14 : 16;
  const { ref: titleRef, fontSize: titleFontSize } = useFitText(
    titleWithUnit,
    { base: titleBase, min: titleMin, maxLines: 3 },
  );
  const swap = reduced
    ? { initial: false, animate: { opacity: 1 }, exit: { opacity: 1 }, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -6 },
        transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
      };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.05 }}
      style={{
        ...surface,
        position: "relative",
        width: width ?? (compact ? "100%" : 300),
        height: compact ? "auto" : 300,
        padding: compact ? 16 : 24,
        display: "flex",
        flexDirection: "column",
        gap: compact ? 24 : undefined,
        justifyContent: compact ? "flex-start" : "space-between",
        overflow: "clip",
      }}
    >
      {/* Share button — only meaningful with a selected region. */}
      {region && indicator && latest && (
        <motion.button
          type="button"
          aria-label={t("shareAria", locale)}
          onClick={() => {
            haptic("light");
            setShareOpen(true);
          }}
          whileTap={{ scale: 0.9 }}
          whileHover={{ opacity: 1, background: "rgba(255,255,255,0.12)" }}
          style={{
            position: "absolute",
            top: compact ? 12 : 16,
            right: compact ? 12 : 16,
            width: 32,
            height: 32,
            background: "rgba(255,255,255,0.06)",
            border: "0.5px solid rgba(255,255,255,0.18)",
            borderRadius: 999,
            color: color.muted,
            cursor: "pointer",
            padding: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1,
          }}
        >
          {/* iOS-style share glyph (arrow up out of a tray) */}
          <svg
            width="14"
            height="16"
            viewBox="0 0 14 16"
            fill="none"
            aria-hidden
          >
            <path
              d="M7 1v9"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M4 4l3-3 3 3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M1 9v4.5A1.5 1.5 0 0 0 2.5 15h9a1.5 1.5 0 0 0 1.5-1.5V9"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </motion.button>
      )}
      {region && indicator && latest && (
        <ShareDialog
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          region={region}
          indicator={indicator}
          year={latest.year}
          value={latest.value}
          locale={locale}
        />
      )}
      <AnimatePresence mode="wait" initial={false}>
      {!region ? (
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
            gap: compact ? 24 : undefined,
            justifyContent: compact ? "flex-start" : "space-between",
            flex: 1,
            minHeight: 0,
          }}
        >
          {/* Top: year, indicator title (with unit), region (Figma 30:130) */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {latest && (
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: color.muted,
                  letterSpacing: "-0.28px",
                }}
              >
                {latest.year}
              </div>
            )}
            <div
              ref={titleRef}
              style={{
                fontSize: titleFontSize,
                color: color.text,
                letterSpacing: compact ? "-0.4px" : "-0.48px",
                textShadow: glow,
                lineHeight: 1.2,
              }}
            >
              {titleWithUnit}
            </div>
            <div
              style={{
                fontSize: compact ? 14 : 16,
                color: color.muted,
                letterSpacing: compact ? "-0.28px" : "-0.32px",
              }}
            >
              {regionName}
            </div>
          </div>

          {/* Bottom: big value + source/updated row (Figma 30:173) */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div
              style={{
                fontSize: 40,
                fontWeight: 500,
                color: color.text,
                letterSpacing: "-0.8px",
                textShadow: glow,
                lineHeight: 1.1,
                whiteSpace: "nowrap",
              }}
            >
              {latest
                ? formatValue(latest.value, indicator!.unit, locale)
                : "—"}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                fontSize: 14,
                color: color.muted,
                letterSpacing: "-0.28px",
                whiteSpace: "nowrap",
              }}
            >
              <span>stat.gov.az</span>
              <span>
                {indicator
                  ? `${t("updated", locale)}: ${indicator.last_updated}`
                  : ""}
              </span>
            </div>
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </motion.div>
  );
}
