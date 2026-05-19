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

export function DataCard() {
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
        width: 300,
        height: 300,
        padding: 24,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
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
          {/* top: indicator title + source (Figma 19:609, gap 4) */}
          <div
            style={{ display: "flex", flexDirection: "column", gap: 4 }}
          >
            <div
              style={{
                fontSize: 24,
                color: color.text,
                letterSpacing: "-0.48px",
                textShadow: glow,
                lineHeight: 1.2,
              }}
            >
              {label}
            </div>
            <div
              style={{
                fontSize: 14,
                color: color.muted,
                letterSpacing: "-0.28px",
              }}
            >
              stat.gov.az
            </div>
          </div>

          {/* bottom: Figma "Total" row → [region] [big value] (gap 16) */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <span
                style={{
                  fontSize: 20,
                  color: color.text,
                  letterSpacing: "-0.4px",
                }}
              >
                {regionName}
              </span>
              <span
                style={{
                  fontSize: 40,
                  fontWeight: 500,
                  color: color.text,
                  letterSpacing: "-0.8px",
                  textShadow: glow,
                  lineHeight: 1,
                  whiteSpace: "nowrap",
                }}
              >
                {latest
                  ? formatValue(latest.value, indicator!.unit, locale)
                  : locale === "az"
                    ? "—"
                    : "—"}
              </span>
            </div>
            <div
              style={{
                fontSize: 12,
                color: color.muted,
                letterSpacing: "-0.24px",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>
                {latest
                  ? `${locale === "az" ? "İl" : "Year"}: ${latest.year}`
                  : locale === "az"
                    ? "Məlumat yoxdur"
                    : "No data"}
              </span>
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
