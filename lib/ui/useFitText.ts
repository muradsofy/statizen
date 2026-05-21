"use client";

import { useLayoutEffect, useRef, useState } from "react";

/**
 * Step font-size down until the text fits within `maxLines`, or the
 * provided `min` size is reached. Measurement is DOM-based (handles
 * variable-width fonts like Archivo correctly).
 *
 *   const { ref, fontSize } = useFitText(title, { base: 24, min: 16, maxLines: 3 });
 *
 *   <div ref={ref} style={{ fontSize, lineHeight: 1.2 }}>{title}</div>
 *
 * Re-runs when `text`, `base`, `min`, `maxLines`, or the element's own
 * size changes (via ResizeObserver) — so the same title at a narrower
 * width can shrink further on the fly.
 */
export function useFitText(
  text: string,
  opts: { base: number; min: number; maxLines: number; step?: number },
): { ref: React.RefObject<HTMLDivElement | null>; fontSize: number } {
  const { base, min, maxLines, step = 2 } = opts;
  const ref = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(base);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    function fit() {
      if (!el) return;
      // Try base first. If it overflows maxLines, step down by `step`
      // until either the text fits or we hit `min`.
      for (let s = base; s >= min; s -= step) {
        el.style.fontSize = `${s}px`;
        // line-height: 1.2 is the convention used by the consuming
        // styles; computing from element guards against override.
        const lh = parseFloat(getComputedStyle(el).lineHeight) || s * 1.2;
        if (el.scrollHeight <= lh * maxLines + 1) {
          setFontSize(s);
          return;
        }
      }
      setFontSize(min);
    }

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, base, min, maxLines, step]);

  return { ref, fontSize };
}
