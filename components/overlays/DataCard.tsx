"use client";

import { motion } from "framer-motion";
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.05 }}
      style={{
        ...surface,
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
      {!region ? (
        <div
          style={{
            margin: "auto",
            color: color.muted,
            fontSize: 16,
            letterSpacing: "-0.32px",
            textAlign: "center",
          }}
        >
          {t("selectRegionLong", locale)}
        </div>
      ) : (
        <>
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
              style={{
                fontSize: compact ? 20 : 24,
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
        </>
      )}
    </motion.div>
  );
}
