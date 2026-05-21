"use client";

import type { CSSProperties } from "react";
import type { Indicator, Region, Locale } from "@/types/data";
import { regionsGeo } from "@/lib/map/loadGeo";
import { color, glow } from "@/lib/ui/tokens";
import { formatValue, unitSuffix } from "@/lib/data/format";
import { t } from "@/lib/i18n/strings";

export interface ShareCardProps {
  region: Region;
  indicator: Indicator;
  year: number;
  value: number | null | undefined;
  locale: Locale;
}

const W = 1080;
const H = 1350;
const PAD = 64;

const { bbox } = regionsGeo;
const VB = `${bbox.x} ${bbox.y} ${bbox.w} ${bbox.h}`;

/**
 * Off-screen 1080×1350 template captured to PNG/PDF for sharing.
 *
 * Renders at native resolution regardless of viewport — html-to-image
 * captures the actual `width` × `height` we declare here, so the export
 * is crisp on retina without zooming.
 *
 * Layout (top → bottom):
 *
 *   • Statizen wordmark + locale-aware tagline
 *   • Year + indicator title
 *   • Big accent value with glow
 *   • Region name
 *   • Mini-map of Azerbaijan with the selected region highlighted
 *   • Footer: source citation + statizen.vercel.app
 */
export function ShareCard({
  region,
  indicator,
  year,
  value,
  locale,
}: ShareCardProps) {
  const regionName = locale === "az" ? region.name_az : region.name_en;
  const indicatorLabel =
    locale === "az" ? indicator.label_az : indicator.label_en;
  const titleWithUnit = `${indicatorLabel} ${unitSuffix(indicator.unit, locale)}`;
  const formattedValue =
    value == null ? "—" : formatValue(value, indicator.unit, locale);

  return (
    <div
      style={{
        position: "relative",
        width: W,
        height: H,
        background: color.bg,
        color: color.text,
        fontFamily:
          "Archivo, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        padding: PAD,
        // Soft purple wash behind the value so the card has visual depth
        // even when rendered standalone.
        backgroundImage: `radial-gradient(80% 60% at 50% 55%, rgba(97,43,244,0.18) 0%, rgba(0,0,0,0) 70%)`,
      }}
    >
      {/* Header */}
      <header style={headerStyle}>
        <div style={wordmarkStyle}>Statizen</div>
        <div style={taglineStyle}>{t("shareTagline", locale)}</div>
      </header>

      {/* Hero */}
      <main style={heroStyle}>
        <div style={yearStyle}>{year}</div>
        <div style={titleStyle}>{titleWithUnit}</div>
        <div style={valueStyle}>{formattedValue}</div>
        <div style={regionStyle}>{regionName}</div>
      </main>

      {/* Mini-map */}
      <div style={mapWrapStyle}>
        <svg
          viewBox={VB}
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid meet"
          style={{ display: "block" }}
        >
          {/* Pass 1 — fills */}
          {regionsGeo.regions.map((g) => (
            <path
              key={`fill-${g.id}`}
              d={g.d}
              fill={g.id === region.id ? color.accent : color.mapFill}
            />
          ))}
          {/* Pass 2 — strokes (so neighbours' fills can't paint over borders) */}
          {regionsGeo.regions.map((g) => (
            <path
              key={`stroke-${g.id}`}
              d={g.d}
              fill="none"
              stroke={color.mapStroke}
              strokeWidth={2}
              shapeRendering="geometricPrecision"
            />
          ))}
        </svg>
      </div>

      {/* Footer */}
      <footer style={footerStyle}>
        <span>{t("source", locale)}: stat.gov.az</span>
        <span style={{ opacity: 0.9 }}>statizen.vercel.app</span>
      </footer>
    </div>
  );
}

const headerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
};
const wordmarkStyle: CSSProperties = {
  fontSize: 56,
  fontWeight: 700,
  letterSpacing: "-1.5px",
  lineHeight: 1,
};
const taglineStyle: CSSProperties = {
  fontSize: 24,
  color: color.muted,
  letterSpacing: "-0.4px",
};
const heroStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "flex-start",
  gap: 16,
  // Pulled a bit toward the wordmark for visual balance with the map below.
  paddingTop: 24,
  paddingBottom: 24,
};
const yearStyle: CSSProperties = {
  fontSize: 32,
  color: color.muted,
  letterSpacing: "-0.5px",
  fontWeight: 500,
};
const titleStyle: CSSProperties = {
  fontSize: 48,
  letterSpacing: "-1px",
  lineHeight: 1.1,
  textShadow: glow,
};
const valueStyle: CSSProperties = {
  fontSize: 240,
  fontWeight: 700,
  letterSpacing: "-6px",
  lineHeight: 1,
  color: color.text,
  textShadow: "0 0 40px rgba(97,43,244,0.6), 0 0 12px rgba(255,255,255,0.4)",
  marginTop: 8,
  marginBottom: 8,
};
const regionStyle: CSSProperties = {
  fontSize: 40,
  color: color.muted,
  letterSpacing: "-0.6px",
};
const mapWrapStyle: CSSProperties = {
  width: "100%",
  height: 380,
  // Slight surround so the country doesn't touch the edges.
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
const footerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  fontSize: 22,
  color: color.muted,
  letterSpacing: "-0.3px",
  paddingTop: 24,
  borderTop: "1px solid rgba(255,255,255,0.08)",
};
