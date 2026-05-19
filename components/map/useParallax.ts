"use client";

import { useEffect } from "react";
import {
  useMotionValue,
  useSpring,
  useReducedMotion,
  type MotionValue,
} from "framer-motion";

/**
 * Subtle mouse-driven pan for the map. Translation is clamped to ±maxPx on
 * each axis (PROJECT.md: a few px, ≤~30). Smoothed with a framer-motion
 * spring — no requestAnimationFrame. Disabled under prefers-reduced-motion.
 */
export function useParallax(maxPx = 24): {
  x: MotionValue<number>;
  y: MotionValue<number>;
} {
  const reduced = useReducedMotion();
  const xRaw = useMotionValue(0);
  const yRaw = useMotionValue(0);
  const x = useSpring(xRaw, { stiffness: 120, damping: 20, mass: 0.4 });
  const y = useSpring(yRaw, { stiffness: 120, damping: 20, mass: 0.4 });

  useEffect(() => {
    if (reduced) {
      xRaw.set(0);
      yRaw.set(0);
      return;
    }
    function onMove(e: PointerEvent) {
      const nx = (e.clientX / window.innerWidth) * 2 - 1; // -1..1
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      xRaw.set(nx * maxPx);
      yRaw.set(ny * maxPx);
    }
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduced, maxPx, xRaw, yRaw]);

  return { x, y };
}
