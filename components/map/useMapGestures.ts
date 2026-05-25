"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MotionValue } from "framer-motion";
import { animate } from "framer-motion";
import { spring } from "@/lib/ui/motion";

const PAN_THRESHOLD_PX = 6;

interface PinchStart {
  dist: number;
  scale: number;
}

interface PanStart {
  x: number;
  y: number;
  cx: number;
  cy: number;
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
  /** Enable the desktop hand-tool (mouse drag pans the map, cursor:
   *  grab/grabbing). When false, mouse clicks still pass through to
   *  region selection but no pan is wired. Defaults to false — pass
   *  `true` only for touch/coarse-pointer devices where the swipe is
   *  the only pan affordance. */
  enableMousePan?: boolean;
  /** Enable single-finger touch pan. When false, single touches act
   *  purely as taps (region selection). Pinch-to-zoom is unaffected
   *  by this flag. Defaults to true. Use to lock the map at its
   *  neutral position in the no-selection state so first-time visitors
   *  can't accidentally drag the country off-screen. */
  enableTouchPan?: boolean;
  /** Full viewBox width/height (units) — used for px → vb conversion when panning. */
  vbWidth: number;
  vbHeight: number;
  /** Centre of the country in viewBox units. Snap-back targets. */
  cxNeutral: number;
  cyNeutral: number;
  /** Horizontal extent of the country content (viewBox units). */
  contentLeft: number;
  contentRight: number;
  /** Vertical extent of the country content (viewBox units). */
  contentTop: number;
  contentBottom: number;
  /** Visible viewBox ranges — usually content extent ± PAD. */
  vbLeft: number;
  vbRight: number;
  vbTop: number;
  vbBottom: number;
  /**
   * Called on any touchstart. Caller should `.stop()` any running
   * selection animations on `scale`/`cx`/`cy` so the gesture writes
   * don't fight a still-settling spring.
   */
  onGestureStart?: () => void;
}

/**
 * Two-finger pinch-to-zoom + single-finger pan (both axes) over a ref'd
 * element. Mutates the supplied framer `scale`, `cx`, and `cy`
 * MotionValues.
 *
 * Pinch writes scale directly — pass plain MotionValues (NOT springs)
 * so the gesture tracks the fingers without lag. Pan updates cx/cy in
 * viewBox units, each clamped so the country edges can't cross the
 * viewport edges (page background is never exposed). Pan activates only
 * after PAN_THRESHOLD_PX of combined motion, so taps still fire as
 * onClick on region paths.
 */
export function useMapGestures(
  ref: React.RefObject<HTMLElement | null>,
  scale: MotionValue<number>,
  cx: MotionValue<number>,
  cy: MotionValue<number>,
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
      options.enableMousePan,
      options.enableTouchPan,
      options.vbWidth,
      options.vbHeight,
      options.cxNeutral,
      options.cyNeutral,
      options.contentLeft,
      options.contentRight,
      options.contentTop,
      options.contentBottom,
      options.vbLeft,
      options.vbRight,
      options.vbTop,
      options.vbBottom,
      options.onGestureStart,
    ],
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Free-pan slack at base scale. The country fully fits the visible
    // area at this zoom so the "edges can't cross the viewport edges"
    // clamp would otherwise collapse to a single point. Allow shifting
    // by ±FREE_PAN_FRACTION × content-extent in any direction so the
    // map can be dragged around at any zoom level. At 1.0 the country
    // can be moved a full content-width off-center (still leaves a
    // portion in the viewport, so the user can't fully lose the map).
    const FREE_PAN_FRACTION = 1.0;

    function cxBoundsAt(s: number): { min: number; max: number } {
      const visW = opts.vbRight - opts.vbLeft;
      const contentW = opts.contentRight - opts.contentLeft;
      const ratio = (contentW * s) / visW;
      if (ratio <= 1) {
        const slack = contentW * FREE_PAN_FRACTION;
        return { min: opts.cxNeutral - slack, max: opts.cxNeutral + slack };
      }
      const centreVb = (opts.vbLeft + opts.vbRight) / 2;
      const cxMin = opts.contentLeft + (centreVb - opts.vbLeft) / s;
      const cxMax = opts.contentRight + (centreVb - opts.vbRight) / s;
      if (cxMin > cxMax) return { min: opts.cxNeutral, max: opts.cxNeutral };
      return { min: cxMin, max: cxMax };
    }

    function cyBoundsAt(s: number): { min: number; max: number } {
      const visH = opts.vbBottom - opts.vbTop;
      const contentH = opts.contentBottom - opts.contentTop;
      const ratio = (contentH * s) / visH;
      if (ratio <= 1) {
        const slack = contentH * FREE_PAN_FRACTION;
        return { min: opts.cyNeutral - slack, max: opts.cyNeutral + slack };
      }
      const centreVb = (opts.vbTop + opts.vbBottom) / 2;
      const cyMin = opts.contentTop + (centreVb - opts.vbTop) / s;
      const cyMax = opts.contentBottom + (centreVb - opts.vbBottom) / s;
      if (cyMin > cyMax) return { min: opts.cyNeutral, max: opts.cyNeutral };
      return { min: cyMin, max: cyMax };
    }

    function onTouchStart(e: TouchEvent) {
      // Stop any running selection-zoom so this gesture's writes don't
      // fight a still-settling spring (cancel-on-gesture).
      opts.onGestureStart?.();
      if (e.touches.length === 1) {
        // Single-finger pan is gated: in the no-selection state we
        // leave the touch as a pure tap so the country can't be
        // dragged off-screen before the user has a target. Once a
        // region is selected, pan is enabled for free exploration.
        if (opts.enableTouchPan === false) {
          panRef.current = null;
          return;
        }
        panRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          cx: cx.get(),
          cy: cy.get(),
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
        const dyPx = e.touches[0].clientY - panRef.current.y;
        if (!panRef.current.active) {
          if (Math.hypot(dxPx, dyPx) < PAN_THRESHOLD_PX) return;
          panRef.current.active = true;
        }
        e.preventDefault();
        const elNow = ref.current;
        if (!elNow) return;
        const elRect = elNow.getBoundingClientRect();
        const elWidth = elRect.width || 1;
        const elHeight = elRect.height || 1;
        const s = scale.get();
        const dCx = (-dxPx * opts.vbWidth) / (s * elWidth);
        const dCy = (-dyPx * opts.vbHeight) / (s * elHeight);
        const bx = cxBoundsAt(s);
        const by = cyBoundsAt(s);
        cx.set(
          Math.max(bx.min, Math.min(bx.max, panRef.current.cx + dCx)),
        );
        cy.set(
          Math.max(by.min, Math.min(by.max, panRef.current.cy + dCy)),
        );
      }
    }

    function onTouchEnd(e: TouchEvent) {
      if (pinchRef.current && e.touches.length < 2) {
        pinchRef.current = null;
        setIsPinching(false);
        if (scale.get() < opts.baseScale) {
          animate(scale, opts.baseScale, spring.snapBack);
          animate(cx, opts.cxNeutral, spring.snapBack);
          animate(cy, opts.cyNeutral, spring.snapBack);
        } else {
          const s = scale.get();
          const bx = cxBoundsAt(s);
          const by = cyBoundsAt(s);
          const cxNow = cx.get();
          const cyNow = cy.get();
          const cxClamped = Math.max(bx.min, Math.min(bx.max, cxNow));
          const cyClamped = Math.max(by.min, Math.min(by.max, cyNow));
          if (cxClamped !== cxNow) animate(cx, cxClamped, spring.panClamp);
          if (cyClamped !== cyNow) animate(cy, cyClamped, spring.panClamp);
        }
      }
      if (panRef.current && e.touches.length === 0) {
        panRef.current = null;
      }
    }

    // ─────────────────────────────────────────────────────────────────
    // Mouse-drag pan (desktop "hand tool"). Mirrors the touch logic
    // with the same threshold so quick clicks on regions still fire
    // through to onClick handlers and only sustained drags engage pan.
    // Listeners are attached to `window` for move/up so a drag that
    // leaves the wrapper still completes (Figma-like).
    // ─────────────────────────────────────────────────────────────────

    function onMouseDown(e: MouseEvent) {
      // Left button only. Ignore middle/right so context menu + middle-
      // click new-tab on outbound links still work.
      if (e.button !== 0) return;
      // Skip when a modifier is held — leave Cmd/Ctrl/Alt for browser
      // shortcuts and future selection-modifier semantics.
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      opts.onGestureStart?.();
      panRef.current = {
        x: e.clientX,
        y: e.clientY,
        cx: cx.get(),
        cy: cy.get(),
        active: false,
      };
    }

    function onMouseMove(e: MouseEvent) {
      if (!panRef.current) return;
      const dxPx = e.clientX - panRef.current.x;
      const dyPx = e.clientY - panRef.current.y;
      if (!panRef.current.active) {
        if (Math.hypot(dxPx, dyPx) < PAN_THRESHOLD_PX) return;
        panRef.current.active = true;
        // Cursor → grabbing once we're committed to a drag.
        if (el) el.style.cursor = "grabbing";
      }
      e.preventDefault();
      const elNow = ref.current;
      if (!elNow) return;
      const elRect = elNow.getBoundingClientRect();
      const elWidth = elRect.width || 1;
      const elHeight = elRect.height || 1;
      const s = scale.get();
      const dCx = (-dxPx * opts.vbWidth) / (s * elWidth);
      const dCy = (-dyPx * opts.vbHeight) / (s * elHeight);
      const bx = cxBoundsAt(s);
      const by = cyBoundsAt(s);
      cx.set(Math.max(bx.min, Math.min(bx.max, panRef.current.cx + dCx)));
      cy.set(Math.max(by.min, Math.min(by.max, panRef.current.cy + dCy)));
    }

    function onMouseUp() {
      const wasActive = panRef.current?.active ?? false;
      panRef.current = null;
      if (el) el.style.cursor = "grab";
      // If a drag actually happened, swallow the trailing click so it
      // doesn't bubble up and select a region underneath the pointer.
      if (wasActive) {
        const swallow = (e: Event) => {
          e.stopPropagation();
          e.preventDefault();
          window.removeEventListener("click", swallow, true);
        };
        window.addEventListener("click", swallow, true);
      }
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);

    // Desktop hand-tool — only enabled when the caller opts in.
    // Without this, desktop mouse clicks fall straight through to
    // region selection (the pre-pan behaviour the owner reverted to).
    if (opts.enableMousePan) {
      el.style.cursor = "grab";
      el.addEventListener("mousedown", onMouseDown);
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    }

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
      if (opts.enableMousePan) {
        el.removeEventListener("mousedown", onMouseDown);
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
        el.style.cursor = "";
      }
    };
  }, [ref, scale, cx, cy, opts]);

  return { isPinching };
}
