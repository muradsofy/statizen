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
import { usePinchZoom } from "./usePinchZoom";
import { RegionPath } from "./RegionPath";
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

  // Viewport size for clamping the touch drag — without this the user can
  // drag the country off-screen and reveal the empty black background.
  const [vp, setVp] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const measure = () =>
      setVp({ w: window.innerWidth, h: window.innerHeight });
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const { x: px, y: py } = useParallax(coarse ? 0 : PARALLAX);
  // Drag offset in screen pixels (applied to the wrapper via CSS translate).
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);
  const baseScale = mobileVp ? BASE_SCALE_MOBILE : BASE_SCALE_DESKTOP;
  const scale = useSpring(baseScale, SPRING);
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
      scale.set(baseScale);
    }
    // Selection cancels any accumulated drag — bring the region into view
    animate(dragX, 0, { type: "spring", ...SPRING });
    animate(dragY, 0, { type: "spring", ...SPRING });
  }, [selectedRegionId, cx, cy, scale, dragX, dragY, baseScale]);

  // Pinch-to-zoom on touch. Reports isPinching so we can disable the
  // single-finger drag while two fingers are down (otherwise framer's
  // drag tracks one finger and skews the pinch).
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { isPinching } = usePinchZoom(wrapperRef, scale, baseScale, PINCH_MAX);

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
      ref={wrapperRef}
      // Drag only when no region is selected. Once selected we recentre the
      // SVG transform on the region's bbox, which throws off any drag-bound
      // math derived from `baseScale` — panning then exposes the black
      // background on the short side. The user can tap the bg to deselect
      // and pan freely again.
      drag={coarse && !isPinching && !selectedRegionId}
      dragMomentum={false}
      dragElastic={0.15}
      // Clamp the touch drag so the user can't expose more than ~20% of
      // empty viewport past the map on any side. The map renders at
      // baseScale (1.4× on mobile) so the "extra" content beyond the
      // viewport is (baseScale − 1)/2 on each side. Add a little slack so
      // the elastic rebound feels natural.
      dragConstraints={{
        left: -vp.w * (baseScale - 1) * 0.5,
        right: vp.w * (baseScale - 1) * 0.5,
        top: -vp.h * (baseScale - 1) * 0.5,
        bottom: vp.h * (baseScale - 1) * 0.5,
      }}
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
