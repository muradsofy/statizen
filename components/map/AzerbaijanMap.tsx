"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  useMotionValueEvent,
  useReducedMotion,
  animate,
  type AnimationPlaybackControls,
} from "framer-motion";
import { feature } from "topojson-client";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import { regionsGeo, regionsTopo } from "@/lib/map/loadGeo";
import { geometryToD } from "@/lib/map/geoPath";
import { useAppStore } from "@/lib/state/store";
import { useParallax } from "./useParallax";
import { useMapGestures } from "./useMapGestures";
import { RegionFill } from "./RegionFill";
import { color } from "@/lib/ui/tokens";
import { spring } from "@/lib/ui/motion";
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
// Mobile default scale used to be 1.4 to fill the portrait viewport
// more aggressively. The trade-off: southern regions ended up behind
// the bottom panel stack (RegionPill + DataCard + YearPicker, ~340px
// tall) in the no-selection state. Visitors had to select a northern
// region first to trigger the auto-zoom that brought the south back
// into view, then tap their actual target — a two-step dance.
// Pulling the scale closer to 1.0 lets the entire country fit within
// the 290-300px tappable band between the top dropdowns and the
// bottom stack. Detail drops a notch but every region is reachable
// from the default state without intermediate moves.
const BASE_SCALE_MOBILE = 1.05;
// Vertical shift of the country in the no-selection state on mobile.
// Positive values shift the country *up* (the viewBox point we look
// at moves down). At baseScale 1.05 on a 375×812 viewport, the map's
// effective px/vb ratio is ~0.23, so 1 vb ≈ 0.23 viewport-px. The
// tappable map band sits between the indicator dropdowns (~y=186)
// and the RegionPill (~y=488), centre ~y=337 — viewport centre is
// at ~y=406, so the country needs to move up by ~69 px = ~300 vb
// to seat its centre in that band.
const MOBILE_Y_BIAS = 400;
const FIT_MARGIN = 0.55; // selected region uses ~55% of the view → fully shown
const SEL_MIN = 1.3;
const SEL_MAX = 3.0;
const PINCH_MAX = 3.0; // upper bound for manual two-finger zoom
const PARALLAX = Math.round(bbox.w * 0.03);

/** Zoom that makes a region's bbox fully fit the view with margin. */
function fitScale(rw: number, rh: number): number {
  const s = Math.min(VW / rw, VH / rh) * FIT_MARGIN;
  return Math.max(SEL_MIN, Math.min(SEL_MAX, s));
}

// Topology-derived geometry. `FEATURES_BY_ID` is the per-region polygon
// features (uses topology vertices so it shares edges exactly with the
// meshes — no sub-pixel drift between fill edge and border).
const TOPO_COLLECTION = regionsTopo.objects.data;
const FEATURES_BY_ID: Record<string, Feature<Polygon | MultiPolygon>> = (() => {
  const fc = feature(regionsTopo, TOPO_COLLECTION) as {
    features: Feature<Polygon | MultiPolygon>[];
  };
  const map: Record<string, Feature<Polygon | MultiPolygon>> = {};
  for (const f of fc.features) map[String(f.id ?? f.properties?.id)] = f;
  return map;
})();

/**
 * Split a region's geometry into its main territory (largest polygon)
 * and any remaining "island" polygons. Returns SVG `d` strings ready
 * to drop into `<path d=…>`.
 */
function splitFeature(feat: Feature<Polygon | MultiPolygon>): {
  main: string;
  islands: string | null;
} {
  if (feat.geometry.type === "Polygon") {
    return { main: geometryToD(feat.geometry), islands: null };
  }
  const polys = feat.geometry.coordinates;
  // Pick the polygon with the most points in its outer ring.
  let maxIdx = 0;
  let maxPoints = 0;
  for (let i = 0; i < polys.length; i++) {
    const pts = polys[i][0].length;
    if (pts > maxPoints) {
      maxPoints = pts;
      maxIdx = i;
    }
  }
  const mainPoly: Polygon = {
    type: "Polygon",
    coordinates: polys[maxIdx],
  };
  if (polys.length === 1) {
    return { main: geometryToD(mainPoly), islands: null };
  }
  const islandsPoly: MultiPolygon = {
    type: "MultiPolygon",
    coordinates: polys.filter((_, i) => i !== maxIdx),
  };
  return {
    main: geometryToD(mainPoly),
    islands: geometryToD(islandsPoly),
  };
}

export function AzerbaijanMap() {
  const selectedRegionId = useAppStore((s) => s.selectedRegionId);
  const hoveredRegionId = useAppStore((s) => s.hoveredRegionId);
  const locale = useAppStore((s) => s.locale);
  const setHovered = useAppStore((s) => s.setHoveredRegion);
  const setSelected = useAppStore((s) => s.setSelectedRegion);

  // Per-region SVG `d` from the topology, split into the main
  // territory and the smaller "island" subpaths. Same vertices as the
  // meshes, so fill edges align with borders.
  //
  // Why split: for multi-subpath regions (Baki has 3 Caspian islands,
  // Absheron-Khızı / Shirvan-Salyan have small secondary fragments)
  // we render the islands at 0.4 opacity when the region is active —
  // the main territory stays at full saturation, islands act as
  // supporting context. Geographically honest, visually focused.
  const fillDs = useMemo(() => {
    const out: Record<string, { main: string; islands: string | null }> = {};
    for (const [id, feat] of Object.entries(FEATURES_BY_ID)) {
      out[id] = splitFeature(feat);
    }
    return out;
  }, []);

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
  // Default cy in the no-selection state. On mobile we look at a point
  // *below* the country's true centre, which shifts the displayed
  // country *up* — clears space for the bottom UI stack. Region
  // selection still centres on the region's bbox, no bias applied.
  const cyNeutral = mobileVp ? CY + MOBILE_Y_BIAS : CY;
  // Plain MotionValues — not springs. Pinch and pan write to these on
  // every touchmove and need to track fingers without lag; selection
  // transitions go through `animate(...)` below for a smooth zoom.
  const scale = useMotionValue(baseScale);
  const cx = useMotionValue(CX);
  const cy = useMotionValue(CY);

  // Respect OS-level reduced-motion. Selection still re-centres + zooms,
  // it just snaps instead of springs.
  const reduced = useReducedMotion();

  // Hold onto the currently-running selection animation controls so a
  // new selection (or a gesture taking over) can `.stop()` them — no
  // ghost springs settling into stale targets.
  const selectAnims = useRef<AnimationPlaybackControls[]>([]);
  const stopSelectAnims = useCallback(() => {
    for (const a of selectAnims.current) a.stop();
    selectAnims.current = [];
  }, []);

  useEffect(() => {
    stopSelectAnims();
    const r = regionsGeo.regions.find((g) => g.id === selectedRegionId);
    // Vertical bias keeps the active content centred in the visible
    // map band (header + dropdowns above, DataCard stack below).
    // A static vb offset would visually multiply with the zoom level
    // — a region at fitScale ~2.0 ended up shifted ~2× higher than
    // the neutral country at baseScale 1.05, leaving a big empty gap
    // below the selected region. Scale the bias inversely so the
    // visual offset stays roughly constant across selection states.
    const selScale = r ? fitScale(r.bbox.w, r.bbox.h) : baseScale;
    const yBias = mobileVp
      ? (MOBILE_Y_BIAS * baseScale) / selScale
      : 0;
    const targets = r
      ? {
          cx: r.bbox.x + r.bbox.w / 2,
          cy: r.bbox.y + r.bbox.h / 2 + yBias,
          scale: selScale,
          preset: spring.selectZoom,
        }
      : {
          cx: CX,
          cy: cyNeutral,
          scale: baseScale,
          preset: spring.deselect,
        };

    if (reduced) {
      cx.set(targets.cx);
      cy.set(targets.cy);
      scale.set(targets.scale);
      return;
    }

    selectAnims.current = [
      animate(cx, targets.cx, targets.preset),
      animate(cy, targets.cy, targets.preset),
      animate(scale, targets.scale, targets.preset),
    ];
    return stopSelectAnims;
  }, [selectedRegionId, cx, cy, scale, baseScale, cyNeutral, mobileVp, reduced]);

  // Pinch-to-zoom + two-axis pan on touch. Pan updates cx/cy in viewBox
  // units (not wrapper translate) so the page background is never
  // exposed even at the country edges.
  const wrapperRef = useRef<HTMLDivElement>(null);
  useMapGestures(wrapperRef, scale, cx, cy, {
    baseScale,
    pinchMax: PINCH_MAX,
    // Mouse-drag pan is mobile-only. Desktop visitors expect a static
    // map (clicks select regions); a hand-tool there gets in the way
    // of casual clicks and conflicts with the parallax response. Only
    // coarse pointers (touch) need the hand-tool affordance.
    enableMousePan: coarse,
    vbWidth: VW,
    vbHeight: VH,
    cxNeutral: CX,
    cyNeutral,
    contentLeft: bbox.x,
    contentRight: bbox.x + bbox.w,
    contentTop: bbox.y,
    contentBottom: bbox.y + bbox.h,
    vbLeft: bbox.x - PAD,
    vbRight: bbox.x + bbox.w + PAD,
    vbTop: bbox.y - PAD,
    vbBottom: bbox.y + bbox.h + PAD,
    onGestureStart: stopSelectAnims,
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

  // Entrance animation lives one level up in app/page.tsx — the parent
  // motion.div owns the blur+fade-in choreography for the whole map
  // layer in concert with the panels' reveal.

  return (
    <div
      ref={wrapperRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        // `none` on coarse pointers so single-finger pan / pinch
        // don't trigger browser page scroll. `pan-y` for desktop
        // keeps wheel-scroll passing through normally (the map is
        // panned with mouse drag instead). useMapGestures sets
        // `cursor: grab` / `grabbing` dynamically.
        touchAction: coarse ? "none" : "auto",
        // No text/SVG selection while dragging.
        userSelect: "none",
        WebkitUserSelect: "none",
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
        {/* Pass 1 — interactive fills. Main territory uses RegionFill
            (with click + hover + AA-anchoring stroke). Islands render
            as a separate path: when the region is *active*, islands
            stay at 0.4 opacity (supporting context, not focus). When
            another region is active, islands dim with the rest of
            their region. When no region is active, islands match
            their region's full fill. Path data comes from the
            topology so fill edges share vertices with the borders
            below. */}
        {regionsGeo.regions.map((geo) => {
          const { main } = fillDs[geo.id];
          return (
            <RegionFill
              key={`fill-${geo.id}`}
              geo={geo}
              d={main}
              locale={locale}
              active={selectedRegionId === geo.id}
              hovered={hoveredRegionId === geo.id}
              dimmed={!!selectedRegionId}
              onEnter={setHovered}
              onLeave={() => setHovered(null)}
              onSelect={setSelected}
            />
          );
        })}
        {/* Islands pass. Rendered after main fills so they share the
            same click hit-testing surface; clicking an island still
            selects the parent region via the SVG's regular onClick
            cascade. */}
        {regionsGeo.regions.map((geo) => {
          const { islands } = fillDs[geo.id];
          if (!islands) return null;
          const isActive = selectedRegionId === geo.id;
          const islandFill = isActive
            ? color.mapActive
            : hoveredRegionId === geo.id
              ? color.mapFillHover
              : color.mapFill;
          // Islands keep full opacity unless their own region is
          // active (in which case they fade to 0.4 as "supporting
          // context"). Non-active region's islands stay solid so an
          // island nested inside another region's bright fill (e.g.
          // Absheron-Khızı's fragment sitting inside Baki's purple)
          // reads as clearly distinct from that fill — never as part
          // of the active region.
          const islandOpacity = isActive ? 0.4 : 1;
          return (
            <motion.path
              key={`island-${geo.id}`}
              d={islands}
              fill={islandFill}
              stroke={color.mapStroke}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
              shapeRendering="geometricPrecision"
              aria-hidden
              style={{ cursor: "pointer" }}
              animate={{ opacity: islandOpacity }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => {
                e.stopPropagation();
                // Toggle-off when the island belongs to the active
                // region (matches RegionFill's click-to-deselect).
                setSelected(isActive ? null : geo.id);
              }}
            />
          );
        })}
        {/* Borders are drawn by each RegionFill stroking its own
            perimeter (post-snap, adjacent regions share vertices so
            overlapping strokes render as a single 1px line). The old
            topology-mesh pass produced phantom shared arcs that
            visually intruded into region interiors; per-region
            perimeters guarantee every stroke sits exactly on a real
            region boundary. */}
      </g>
    </svg>
    </div>
  );
}
