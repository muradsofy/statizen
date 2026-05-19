"use client";

import { motion } from "framer-motion";
import { regionsData } from "@/lib/data/loadData";
import { useAppStore } from "@/lib/state/store";
import { surface, color, glow } from "@/lib/ui/tokens";

const FADE =
  "linear-gradient(to bottom, transparent 0, #000 28px, #000 calc(100% - 28px), transparent 100%)";

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
      style={{ ...surface, width: 200, height: 300, padding: 24 }}
    >
      <div
        className="no-scrollbar"
        style={{
          height: "100%",
          width: "100%",
          overflowY: "auto",
          maskImage: FADE,
          WebkitMaskImage: FADE,
        }}
      >
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: "12px 0",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
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
                  onFocus={() => setHovered(r.id)}
                  onBlur={() => setHovered(null)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: 0,
                    margin: 0,
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    outline: "none",
                    fontSize: active ? 20 : 16,
                    fontWeight: 400,
                    letterSpacing: active ? "-0.4px" : "-0.32px",
                    color: active
                      ? color.text
                      : hovered
                        ? "rgba(255,255,255,0.8)"
                        : color.muted,
                    textShadow: active ? glow : "none",
                    transition:
                      "color 120ms ease, font-size 120ms ease, text-shadow 120ms ease",
                  }}
                >
                  {locale === "az" ? r.name_az : r.name_en}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </motion.div>
  );
}
