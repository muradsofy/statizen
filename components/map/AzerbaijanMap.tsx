"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useSpring,
  useTransform,
  useMotionValueEvent,
  animate,
  useMotionValue,
} from "framer-motion";
import { regionsGeo } from "@/lib/map/loadGeo";
import { useAppStore } from "@/lib/state/store";
import { useParallax } from "./useParallax";
import { RegionPath } from "./RegionPath";
import { color } from "@/lib/ui/tokens";

const { bbox } = regionsGeo;
const PAD = 24;
const VB = `${bbox.x - PAD} ${bbox.y - PAD} ${bbox.w + PAD * 2} ${
  bbox.h + PAD * 2
}`;
const VW = bbox.w + PAD * 2; // visible viewBox extent (meet → whole VB shown)
const VH = bbox.h + PAD * 2;
const CX = bbox.x + bbox.w / 2; // content centre (viewBox units)
const CY = bbox.y + bbox.h / 2;
const BASE_SCALE = 1.0;
const FIT_MARGIN = 0.55; // selected region uses ~55% of the view → fully shown
const SEL_MIN = 1.3;
const SEL_MAX = 3.0;
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

  const { x: px, y: py } = useParallax(coarse ? 0 : PARALLAX);
  // Drag offset in screen pixels (applied to the wrapper via CSS translate).
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);
  const scale = useSpring(BASE_SCALE, SPRING);
  const cx = useSpring(CX, SPRING);
  const cy = useSpring(CY, SPRING);

  useEffect(() => {
    const r = regionsGeo.regions.find((g) => g.id === selectedRegionId);
    if (r) {
      // centre on the region's bbox centre and zoom so it fully fits
      cx.set(r.bbox.x + r.bbox.w / 2);
      cy.set(r.bbox.y + r.bbox.h / 2);
      scale.set(fitScale(r.bbox.w, r.bbox.h));
    } else {
      cx.set(CX);
      cy.set(CY);
      scale.set(BASE_SCALE);
    }
    // Selection cancels any accumulated drag — bring the region into view
    animate(dragX, 0, { type: "spring", ...SPRING });
    animate(dragY, 0, { type: "spring", ...SPRING });
  }, [selectedRegionId, cx, cy, scale, dragX, dragY]);

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
    <motion.div
      drag={coarse}
      dragMomentum={false}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        x: dragX,
        y: dragY,
        touchAction: coarse ? "none" : "auto",
      }}
    >
    <svg
      viewBox={VB}
      preserveAspectRatio="xMidYMid meet"
      width="100%"
      height="100%"
      role="group"
      aria-label="Map of Azerbaijan economic regions"
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
        {regionsGeo.regions.map((geo) => (
          <RegionPath
            key={geo.id}
            geo={geo}
            locale={locale}
            active={selectedRegionId === geo.id}
            hovered={hoveredRegionId === geo.id}
            onEnter={setHovered}
            onLeave={() => setHovered(null)}
            onSelect={setSelected}
          />
        ))}
      </g>
    </svg>
    </motion.div>
  );
}
