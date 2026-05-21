"use client";

import { useEffect, useRef, useState } from "react";
import {
  useMotionValue,
  useTransform,
  useMotionValueEvent,
  animate,
} from "framer-motion";
import { regionsGeo } from "@/lib/map/loadGeo";
import { useAppStore } from "@/lib/state/store";
import { useParallax } from "./useParallax";
import { useMapGestures } from "./useMapGestures";
import { RegionFill } from "./RegionFill";
import { color } from "@/lib/ui/tokens";
import { t } from "@/lib/i18n/strings";

const { bbox } = regionsGeo;
const PAD = 8;
const VB = `${bbox.x - PAD} ${bbox.y - PAD} ${bbox.w + PAD * 2} ${
  bbox.h + PAD * 2
}`;
const VW = bbox.w + PAD * 2; // visible viewBox extent (meet → whole VB shown)
const VH = bbox.h + PAD * 2;
const CX = bbox.x + bbox.w / 2; // content centre (viewBox units)
const CY = bbox.y + bbox.h / 2;
// Per Figma node 30:188 (desktop) / 30:242 (mobile), the country fills the
// viewport more aggressively than a 1.0 fit. Mobile overscans further since
// the country's wide aspect leaves a lot of vertical letterbox at scale=1.
const BASE_SCALE_DESKTOP = 1.15;
const BASE_SCALE_MOBILE = 1.4;
const FIT_MARGIN = 0.55; // selected region uses ~55% of the view → fully shown
const SEL_MIN = 1.3;
const SEL_MAX = 3.0;
const PINCH_MAX = 3.0; // upper bound for manual two-finger zoom
const PARALLAX = Math.round(bbox.w * 0.03);
const SPRING = { stiffness: 120, damping: 22, mass: 0.5 };

/** Zoom that makes a region's bbox fully fit the view with margin. */
function fitScale(rw: number, rh: number): number {
  const s = Math.min(VW / rw, VH / rh) * FIT_MARGIN;
  return Math.max(SEL_MIN, Math.min(SEL_MAX, s));
}

export function AzerbaijanMap() {
  const selectedRegionId = useAppStore((s) => s.selectedRegionId);
  const hoveredRegionId = useAppStore((s) => s.hoveredRegionId);
  const locale = useAppStore((s) => s.locale);
  const setHovered = useAppStore((s) => s.setHoveredRegion);
  const setSelected = useAppStore((s) => s.setSelectedRegion);

  // Coarse pointer (touch) → drag-to-pan; fine pointer (mouse) → parallax.
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(pointer: coarse)");
    const apply = () => setCoarse(m.matches);
    apply();
    m.addEventListener?.("change", apply);
    return () => m.removeEventListener?.("change", apply);
  }, []);

  // Mobile-viewport detection (matches the `md:` breakpoint = 768px). Used
  // for default zoom so mobile shows the country closer like the Figma frame.
  const [mobileVp, setMobileVp] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(max-width: 767px)");
    const apply = () => setMobileVp(m.matches);
    apply();
    m.addEventListener?.("change", apply);
    return () => m.removeEventListener?.("change", apply);
  }, []);

  const { x: px, y: py } = useParallax(coarse ? 0 : PARALLAX);
  const baseScale = mobileVp ? BASE_SCALE_MOBILE : BASE_SCALE_DESKTOP;
  // Plain MotionValues — not springs. Pinch and pan write to these on
  // every touchmove and need to track fingers without lag; selection
  // transitions go through `animate(...)` below for a smooth zoom.
  const scale = useMotionValue(baseScale);
  const cx = useMotionValue(CX);
  const cy = useMotionValue(CY);

  useEffect(() => {
    const r = regionsGeo.regions.find((g) => g.id === selectedRegionId);
    if (r) {
      animate(cx, r.bbox.x + r.bbox.w / 2, SPRING);
      animate(cy, r.bbox.y + r.bbox.h / 2, SPRING);
      animate(scale, fitScale(r.bbox.w, r.bbox.h), SPRING);
    } else {
      animate(cx, CX, SPRING);
      animate(cy, CY, SPRING);
      animate(scale, baseScale, SPRING);
    }
  }, [selectedRegionId, cx, cy, scale, baseScale]);

  // Pinch-to-zoom + horizontal pan on touch. Pan updates cx in viewBox
  // units (not wrapper translate) so the page background is never
  // exposed even at the country edges.
  const wrapperRef = useRef<HTMLDivElement>(null);
  useMapGestures(wrapperRef, scale, cx, {
    baseScale,
    pinchMax: PINCH_MAX,
    vbWidth: VW,
    cxNeutral: CX,
    contentLeft: bbox.x,
    contentRight: bbox.x + bbox.w,
    vbLeft: bbox.x - PAD,
    vbRight: bbox.x + bbox.w + PAD,
  });

  const transform = useTransform(
    [scale, cx, cy, px, py],
    ([s, x, y, ox, oy]: number[]) => {
      const tx = x + ox;
      const ty = y + oy;
      return `translate(${CX - s * tx} ${CY - s * ty}) scale(${s})`;
    },
  );

  const gRef = useRef<SVGGElement>(null);
  useMotionValueEvent(transform, "change", (v) => {
    gRef.current?.setAttribute("transform", v);
  });
  useEffect(() => {
    gRef.current?.setAttribute("transform", transform.get());
  }, [transform]);

  return (
    <div
      ref={wrapperRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        touchAction: coarse ? "none" : "auto",
      }}
    >
    <svg
      viewBox={VB}
      preserveAspectRatio="xMidYMid meet"
      width="100%"
      height="100%"
      role="group"
      aria-label={t("mapAria", locale)}
      style={{ display: "block", width: "100%", height: "100%" }}
      onClick={() => setSelected(null)}
    >
      <rect
        data-testid="map-bg"
        x={bbox.x - PAD}
        y={bbox.y - PAD}
        width={bbox.w + PAD * 2}
        height={bbox.h + PAD * 2}
        fill={color.bg}
      />
      <g ref={gRef}>
        {/* Pass 1 — interactive fills. No stroke here. */}
        {regionsGeo.regions.map((geo) => (
          <RegionFill
            key={`fill-${geo.id}`}
            geo={geo}
            locale={locale}
            active={selectedRegionId === geo.id}
            hovered={hoveredRegionId === geo.id}
            onEnter={setHovered}
            onLeave={() => setHovered(null)}
            onSelect={setSelected}
          />
        ))}
        {/* Pass 2 — strokes on top of every fill, so adjacent regions
            can't paint over each other's borders. Non-interactive. The
            active region's stroke is rendered last (after this loop)
            so a later-drawn neighbour can never clip it. */}
        <g pointerEvents="none">
          {regionsGeo.regions.map((geo) =>
            selectedRegionId === geo.id ? null : (
              <path
                key={`stroke-${geo.id}`}
                d={geo.d}
                fill="none"
                stroke={color.mapStroke}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
                shapeRendering="geometricPrecision"
              />
            ),
          )}
          {selectedRegionId &&
            (() => {
              const r = regionsGeo.regions.find(
                (g) => g.id === selectedRegionId,
              );
              if (!r) return null;
              return (
                <path
                  d={r.d}
                  fill="none"
                  stroke={color.mapStrokeActive}
                  strokeWidth={1.5}
                  vectorEffect="non-scaling-stroke"
                  shapeRendering="geometricPrecision"
                />
              );
            })()}
        </g>
      </g>
    </svg>
    </div>
  );
}
