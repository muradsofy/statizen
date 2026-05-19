"use client";

import { motion } from "framer-motion";
import { regionsData } from "@/lib/data/loadData";
import { useAppStore } from "@/lib/state/store";
import { ScrollArea } from "@/components/ui/scroll-area";

const panelStyle: React.CSSProperties = {
  width: 220,
  height: 300,
  background: "#141416",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 14,
  padding: 8,
  backdropFilter: "none",
};

export function LocationsPanel() {
  const regions = regionsData.regions;
  const selectedRegionId = useAppStore((s) => s.selectedRegionId);
  const hoveredRegionId = useAppStore((s) => s.hoveredRegionId);
  const locale = useAppStore((s) => s.locale);
  const setSelected = useAppStore((s) => s.setSelectedRegion);
  const setHovered = useAppStore((s) => s.setHoveredRegion);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      style={panelStyle}
    >
      <ScrollArea style={{ height: "100%" }}>
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {regions.map((r) => {
            const active = selectedRegionId === r.id;
            const hovered = hoveredRegionId === r.id;
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setSelected(r.id)}
                  onMouseEnter={() => setHovered(r.id)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "7px 12px",
                    margin: 0,
                    border: "none",
                    borderRadius: 8,
                    background: active
                      ? "rgba(108,92,231,0.16)"
                      : hovered
                        ? "rgba(255,255,255,0.05)"
                        : "transparent",
                    color: active
                      ? "#ffffff"
                      : hovered
                        ? "#d6d6d8"
                        : "#8a8a8e",
                    fontWeight: active ? 500 : 400,
                    fontSize: 14,
                    cursor: "pointer",
                    transition: "background 120ms ease, color 120ms ease",
                  }}
                >
                  {locale === "az" ? r.name_az : r.name_en}
                </button>
              </li>
            );
          })}
        </ul>
      </ScrollArea>
    </motion.div>
  );
}
