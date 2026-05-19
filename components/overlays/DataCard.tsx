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

const panelStyle: React.CSSProperties = {
  width: 340,
  height: 300,
  background: "#141416",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 14,
  padding: 24,
  display: "flex",
  flexDirection: "column",
};

const muted = "#8a8a8e";

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.05 }}
      style={panelStyle}
    >
      {!region ? (
        <div
          style={{
            margin: "auto",
            color: muted,
            fontSize: 14,
            textAlign: "center",
          }}
        >
          {locale === "az"
            ? "Məlumat üçün bölgə seçin"
            : "Select a region to see data"}
        </div>
      ) : (
        <>
          <div style={{ color: muted, fontSize: 12, letterSpacing: 0.3 }}>
            {locale === "az" ? region.name_az : region.name_en}
          </div>
          <div
            style={{
              color: "#fff",
              fontSize: 18,
              fontWeight: 500,
              marginTop: 4,
              lineHeight: 1.3,
            }}
          >
            {label}
          </div>
          <div style={{ color: muted, fontSize: 12, marginTop: 2 }}>
            stat.gov.az
          </div>

          <div style={{ marginTop: "auto" }}>
            {latest ? (
              <div
                style={{
                  color: "#fff",
                  fontSize: 52,
                  fontWeight: 600,
                  lineHeight: 1,
                }}
              >
                {formatValue(latest.value, indicator!.unit, locale)}
              </div>
            ) : (
              <div style={{ color: muted, fontSize: 20 }}>
                {locale === "az" ? "Məlumat yoxdur" : "No data"}
              </div>
            )}
            <div
              style={{
                color: muted,
                fontSize: 11,
                marginTop: 12,
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>
                {latest
                  ? `${locale === "az" ? "İl" : "Year"}: ${latest.year}`
                  : ""}
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
