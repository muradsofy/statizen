"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MotionValue } from "framer-motion";
import { animate } from "framer-motion";

const PAN_THRESHOLD_PX = 6;
const SNAP_SPRING = { type: "spring" as const, stiffness: 220, damping: 26 };

interface PinchStart {
  dist: number;
  scale: number;
}

interface PanStart {
  x: number;
  cx: number;
  active: boolean;
}

function touchDistance(t1: Touch, t2: Touch): number {
  return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
}

export interface MapGesturesOptions {
  baseScale: number;
  pinchMax: number;
  /** Pinch can rubber-band below this factor of baseScale during the gesture. */
  pinchMinFactor?: number;
  /** Full viewBox width (units) — used for px → vb conversion when panning. */
  vbWidth: number;
  /** Centre of the country in viewBox units. Snap-back target for cx. */
  cxNeutral: number;
  /** Horizontal extent of the country content (viewBox units). */
  contentLeft: number;
  contentRight: number;
  /** Visible viewBox horizontal range — usually `[contentLeft − PAD, contentRight + PAD]`. */
  vbLeft: number;
  vbRight: number;
}

/**
 * Two-finger pinch-to-zoom + single-finger horizontal pan over a ref'd
 * element. Mutates the supplied framer `scale` and `cx` MotionValues.
 *
 * Pinch writes scale directly — pass a plain MotionValue (NOT a
 * useSpring) so the gesture tracks the fingers without lag. Pan updates
 * cx in viewBox units, clamped so country edges can't cross the
 * viewport edges (page background is never exposed). Activates only
 * after PAN_THRESHOLD_PX so taps still fire as onClick on region paths.
 */
export function useMapGestures(
  ref: React.RefObject<HTMLElement | null>,
  scale: MotionValue<number>,
  cx: MotionValue<number>,
  options: MapGesturesOptions,
) {
  const [isPinching, setIsPinching] = useState(false);
  const pinchRef = useRef<PinchStart | null>(null);
  const panRef = useRef<PanStart | null>(null);

  const opts = useMemo(
    () => options,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      options.baseScale,
      options.pinchMax,
      options.pinchMinFactor,
      options.vbWidth,
      options.cxNeutral,
      options.contentLeft,
      options.contentRight,
      options.vbLeft,
      options.vbRight,
    ],
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function cxBoundsAt(s: number): { min: number; max: number } {
      const visW = opts.vbRight - opts.vbLeft;
      const contentW = opts.contentRight - opts.contentLeft;
      const ratio = (contentW * s) / visW;
      if (ratio <= 1) return { min: opts.cxNeutral, max: opts.cxNeutral };
      const centreVb = (opts.vbLeft + opts.vbRight) / 2;
      const cxMin = opts.contentLeft + (centreVb - opts.vbLeft) / s;
      const cxMax = opts.contentRight + (centreVb - opts.vbRight) / s;
      if (cxMin > cxMax) return { min: opts.cxNeutral, max: opts.cxNeutral };
      return { min: cxMin, max: cxMax };
    }

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length === 1) {
        panRef.current = {
          x: e.touches[0].clientX,
          cx: cx.get(),
          active: false,
        };
      } else if (e.touches.length === 2) {
        panRef.current = null;
        pinchRef.current = {
          dist: touchDistance(e.touches[0], e.touches[1]),
          scale: scale.get(),
        };
        setIsPinching(true);
      }
    }

    function onTouchMove(e: TouchEvent) {
      if (pinchRef.current && e.touches.length === 2) {
        e.preventDefault();
        const dist = touchDistance(e.touches[0], e.touches[1]);
        const ratio = dist / pinchRef.current.dist;
        const raw = pinchRef.current.scale * ratio;
        const min = opts.baseScale * (opts.pinchMinFactor ?? 0.85);
        const clamped = Math.min(opts.pinchMax, Math.max(min, raw));
        scale.set(clamped);
        return;
      }

      if (panRef.current && e.touches.length === 1) {
        const dxPx = e.touches[0].clientX - panRef.current.x;
        if (!panRef.current.active) {
          if (Math.abs(dxPx) < PAN_THRESHOLD_PX) return;
          panRef.current.active = true;
        }
        e.preventDefault();
        const elNow = ref.current;
        if (!elNow) return;
        const elWidth = elNow.getBoundingClientRect().width || 1;
        const s = scale.get();
        const dCx = (-dxPx * opts.vbWidth) / (s * elWidth);
        const target = panRef.current.cx + dCx;
        const b = cxBoundsAt(s);
        cx.set(Math.max(b.min, Math.min(b.max, target)));
      }
    }

    function onTouchEnd(e: TouchEvent) {
      if (pinchRef.current && e.touches.length < 2) {
        pinchRef.current = null;
        setIsPinching(false);
        if (scale.get() < opts.baseScale) {
          animate(scale, opts.baseScale, SNAP_SPRING);
          animate(cx, opts.cxNeutral, SNAP_SPRING);
        } else {
          const b = cxBoundsAt(scale.get());
          const curr = cx.get();
          const clamped = Math.max(b.min, Math.min(b.max, curr));
          if (clamped !== curr) animate(cx, clamped, SNAP_SPRING);
        }
      }
      if (panRef.current && e.touches.length === 0) {
        panRef.current = null;
      }
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [ref, scale, cx, opts]);

  return { isPinching };
}
