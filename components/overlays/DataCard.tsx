"use client";

import { motion } from "framer-motion";
import {
  indicatorsData,
  regionsData,
  valuesData,
} from "@/lib/data/loadData";
import {
  selectIndicatorById,
  selectLatestValue,
  selectRegionById,
} from "@/lib/data/selectors";
import { formatValue } from "@/lib/data/format";
import { useAppStore } from "@/lib/state/store";
import { surface, color, glow } from "@/lib/ui/tokens";

export interface DataCardProps {
  /** Mobile variant: p16, title 20px, region 14px, content-height (Figma 30:296). */
  compact?: boolean;
  width?: number | string;
}

export function DataCard({ compact = false, width }: DataCardProps = {}) {
  const selectedRegionId = useAppStore((s) => s.selectedRegionId);
  const activeIndicatorId = useAppStore((s) => s.activeIndicatorId);
  const locale = useAppStore((s) => s.locale);

  const indicator = selectIndicatorById(
    indicatorsData.indicators,
    activeIndicatorId,
  );
  const region = selectedRegionId
    ? selectRegionById(regionsData.regions, selectedRegionId)
    : undefined;
  const latest =
    region && indicator
      ? selectLatestValue(valuesData.values, region.id, indicator.id)
      : undefined;

  const label = indicator
    ? locale === "az"
      ? indicator.label_az
      : indicator.label_en
    : "";
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
          {locale === "az"
            ? "Məlumat üçün bölgə seçin"
            : "Select a region to see data"}
        </div>
      ) : (
        <>
          {/* top: year, indicator title, region (Figma 30:130, gap 6) */}
          <div
            style={{ display: "flex", flexDirection: "column", gap: 6 }}
          >
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
              {label}
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

          {/* bottom: big value + source/updated row (Figma 30:173, gap 6) */}
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
                  ? `${
                      locale === "az" ? "Yeniləndi" : "Updated"
                    }: ${indicator.last_updated}`
                  : ""}
              </span>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
