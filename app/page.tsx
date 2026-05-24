"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AzerbaijanMap } from "@/components/map/AzerbaijanMap";
import { Overlays } from "@/components/overlays/Overlays";

// Page entrance — panels reveal first, then the map. Both use the
// same blur+fade choreography (8px → 0, opacity 0 → 1) so the page
// feels like it's coming into focus rather than popping in.
//
// Timing rationale:
//  • Panels lead — chrome ready before content (reads as "framework
//    first, data second"). 200ms wait beats render-then-flash.
//  • Map follows once panels have settled enough that the eye
//    doesn't jump between two competing transitions.
//  • Apple's iOS easing throughout for consistency with the rest of
//    the UI's transitions.
const EASE = [0.22, 1, 0.36, 1] as const;
const PANELS_DELAY = 0.2;
const PANELS_DURATION = 0.55;
const MAP_DELAY = 0.7;
const MAP_DURATION = 0.7;

export default function Home() {
  // Mount-flag gates the entrance animations — framer-motion's
  // initial/animate fires reliably on conditional mount but tends
  // to no-op on first paint of a client component (the SSR'd HTML
  // emits the `animate` state directly and hydration short-circuits
  // the transition). Mounting one tick later forces a real run.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <main
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--c-bg)",
        overflow: "hidden",
      }}
    >
      <AnimatePresence>
        {mounted && (
          <>
            {/* Map layer — renders behind the overlays, reveals second. */}
            <motion.div
              key="map-layer"
              initial={{ opacity: 0, filter: "blur(8px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              transition={{
                duration: MAP_DURATION,
                delay: MAP_DELAY,
                ease: EASE,
              }}
              style={{
                position: "absolute",
                inset: 0,
                willChange: "filter, opacity",
              }}
            >
              <AzerbaijanMap />
            </motion.div>

            {/* Overlays layer — reveals first, then the map fills in
                underneath. Opacity-only on this wrapper because the
                panels inside are position: fixed; any non-`none`
                filter on an ancestor makes it the containing block
                for fixed descendants and they'd get yanked out of
                the viewport during the animation. */}
            <motion.div
              key="overlays-layer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                duration: PANELS_DURATION,
                delay: PANELS_DELAY,
                ease: EASE,
              }}
              style={{ willChange: "opacity" }}
            >
              <Overlays />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Viewport-edge vignette — soft fade to the theme's bg colour
          at the corners so the focus sits in the centre. Inset
          fixed, no pointer events so it doesn't capture clicks. */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          background: "var(--c-vignette)",
          // Sits above content but below dropdown menus (z-50).
          zIndex: 5,
        }}
      />
    </main>
  );
}
