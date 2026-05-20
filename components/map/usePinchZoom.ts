"use client";

import { useEffect, useRef, useState } from "react";
import type { MotionValue } from "framer-motion";
import { animate } from "framer-motion";

interface PinchStart {
  dist: number;
  scale: number;
}

function touchDistance(t1: Touch, t2: Touch): number {
  const dx = t1.clientX - t2.clientX;
  const dy = t1.clientY - t2.clientY;
  return Math.hypot(dx, dy);
}

/**
 * Two-finger pinch-to-zoom over a ref'd element. Mutates the supplied
 * framer-motion `scale` value. Clamps between `min` and `max`, snapping
 * back to `min` if the user pinches below it. Reports `isPinching` so
 * the caller can disable framer's single-touch drag while a pinch is
 * active.
 */
export function usePinchZoom(
  ref: React.RefObject<HTMLElement | null>,
  scale: MotionValue<number>,
  min: number,
  max: number,
) {
  const [isPinching, setIsPinching] = useState(false);
  const startRef = useRef<PinchStart | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length !== 2) return;
      startRef.current = {
        dist: touchDistance(e.touches[0], e.touches[1]),
        scale: scale.get(),
      };
      setIsPinching(true);
    }

    function onTouchMove(e: TouchEvent) {
      if (!startRef.current || e.touches.length !== 2) return;
      e.preventDefault(); // stop page zoom + framer-motion drag
      const dist = touchDistance(e.touches[0], e.touches[1]);
      const ratio = dist / startRef.current.dist;
      // Allow pinch below min during the gesture (with rubber-band feel)
      // — snap back on release.
      const raw = startRef.current.scale * ratio;
      const clamped = Math.min(max, Math.max(min * 0.85, raw));
      scale.set(clamped);
    }

    function onTouchEnd(e: TouchEvent) {
      if (e.touches.length >= 2) return;
      if (!startRef.current) return;
      startRef.current = null;
      setIsPinching(false);
      // Rubber-band snap back if user pinched below the min.
      if (scale.get() < min) {
        animate(scale, min, {
          type: "spring",
          stiffness: 200,
          damping: 25,
        });
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
  }, [ref, scale, min, max]);

  return { isPinching };
}
