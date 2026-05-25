"use client";

import type { CSSProperties } from "react";
import type { Indicator, Region, Locale } from "@/types/data";
import { regionsGeo } from "@/lib/map/loadGeo";
import { color } from "@/lib/ui/tokens";
import { formatValue, unitSuffix } from "@/lib/data/format";
import { t } from "@/lib/i18n/strings";
import { regionName, indicatorLabel } from "@/lib/i18n/localize";

export type ShareCardFormat = "post" | "story";

export interface ShareCardProps {
  region: Region;
  indicator: Indicator;
  year: number;
  value: number | null | undefined;
  locale: Locale;
  /** Output canvas. `"post"` = 1080×1350 (Instagram feed, 4:5).
   *  `"story"` = 1080×1920 (Instagram Story, 9:16). Default `"post"`. */
  format?: ShareCardFormat;
}

/** Per-format canvas dimensions + safe-area paddings. Story padTop / padBottom
 *  reserve room for Instagram's profile chip (top) and "Send message" bar
 *  (bottom) so the wordmark and footer aren't covered by IG's UI. */
const DIMS: Record<ShareCardFormat, {
  W: number;
  H: number;
  padX: number;
  padTop: number;
  padBottom: number;
  mapH: number;
}> = {
  post:  { W: 1080, H: 1350, padX: 64, padTop: 64,  padBottom: 64,  mapH: 380 },
  story: { W: 1080, H: 1920, padX: 64, padTop: 220, padBottom: 280, mapH: 420 },
};

const { bbox } = regionsGeo;
const VB = `${bbox.x} ${bbox.y} ${bbox.w} ${bbox.h}`;

/**
 * Off-screen template captured to PNG/PDF for sharing. Two formats:
 *
 *   • `post`  — 1080×1350 (Instagram feed 4:5). Default.
 *   • `story` — 1080×1920 (Instagram Story 9:16) with safe-area paddings
 *               so the IG profile chip (top ~200px) and send-bar
 *               (bottom ~280px) don't clip the wordmark / footer.
 *
 * Renders at native resolution regardless of viewport — html-to-image
 * captures the actual `width` × `height` declared here, so the export
 * is crisp on retina without zooming.
 */
export function ShareCard({
  region,
  indicator,
  year,
  value,
  locale,
  format = "post",
}: ShareCardProps) {
  const regionNameStr = regionName(region, locale);
  const indicatorLabelStr = indicatorLabel(indicator, locale);
  const titleWithUnit = `${indicatorLabelStr} ${unitSuffix(indicator.unit, locale)}`;
  const formattedValue =
    value == null ? "—" : formatValue(value, indicator.unit, locale);

  const dims = DIMS[format];

  return (
    <div
      style={{
        position: "relative",
        width: dims.W,
        height: dims.H,
        background: color.bg,
        color: color.text,
        fontFamily:
          "Archivo, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        paddingTop: dims.padTop,
        paddingBottom: dims.padBottom,
        paddingLeft: dims.padX,
        paddingRight: dims.padX,
      }}
    >
      {/* Header */}
      <header style={headerStyle}>
        <div style={wordmarkStyle}>statizen</div>
        <div style={taglineStyle}>{t("shareTagline", locale)}</div>
      </header>

      {/* Hero — fills remaining vertical space */}
      <main style={heroStyle}>
        <div style={yearStyle}>{year}</div>
        <div style={titleStyle}>{titleWithUnit}</div>
        <div style={valueStyle(format)}>{formattedValue}</div>
        <div style={regionStyle}>{regionNameStr}</div>
      </main>

      {/* Mini-map */}
      <div style={{ ...mapWrapStyle, height: dims.mapH }}>
        <svg
          viewBox={VB}
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid meet"
          style={{ display: "block" }}
        >
          {regionsGeo.regions.map((g) => (
            <path
              key={`fill-${g.id}`}
              d={g.d}
              fill={g.id === region.id ? color.mapActive : color.mapFill}
            />
          ))}
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
        <span style={{ opacity: 0.9 }}>statizen.space</span>
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
};
// Big value scales up a bit in story format — extra vertical canvas
// rewards a punchier headline number.
function valueStyle(format: ShareCardFormat): CSSProperties {
  const size = format === "story" ? 280 : 240;
  return {
    fontSize: size,
    fontWeight: 700,
    letterSpacing: format === "story" ? "-7px" : "-6px",
    lineHeight: 1,
    color: color.text,
    marginTop: 8,
    marginBottom: 8,
  };
}
const regionStyle: CSSProperties = {
  fontSize: 40,
  color: color.muted,
  letterSpacing: "-0.6px",
};
const mapWrapStyle: CSSProperties = {
  width: "100%",
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
};
