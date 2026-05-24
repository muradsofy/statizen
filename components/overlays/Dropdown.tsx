"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { surface, color, glow } from "@/lib/ui/tokens";
import { haptic } from "@/lib/haptics";

export interface DropdownOption {
  value: string;
  label: string;
}

export interface DropdownProps {
  value: string | null;
  options: DropdownOption[];
  placeholder?: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  /** Trigger width — number (px) or "100%" or "auto" for intrinsic. Default 350 (Figma). */
  width?: number | string;
  /** Ideal ceiling for the open menu. Dynamically clamped to fit the
   *  available space in the viewport (with 16px breathing room), so on a
   *  small phone the menu shrinks instead of overflowing. Default 480. */
  menuMaxHeight?: number;
  /** Vertical padding of the trigger button. Default 12. */
  paddingY?: number;
  /** Show the chevron icon on the right (default true). */
  showChevron?: boolean;
  /** Hard ceiling for menu growth, in viewport y-coords (pixels from
   *  top). Used when there's other UI above the trigger that the menu
   *  must not overlap. Pass a function to re-resolve on each open /
   *  resize / scroll — useful when the bounding element's position
   *  depends on viewport height. Defaults to 0 (viewport top). */
  boundaryTop?: number | (() => number | undefined);
  /** Hard floor for menu growth, in viewport y-coords. Same function
   *  semantics as boundaryTop. Defaults to window.innerHeight. */
  boundaryBottom?: number | (() => number | undefined);
}

const FADE =
  "linear-gradient(to bottom, transparent 0, #000 12px, #000 calc(100% - 12px), transparent 100%)";

export function Dropdown({
  value,
  options,
  placeholder = "Select…",
  onChange,
  ariaLabel,
  width = 350,
  menuMaxHeight = 480,
  paddingY = 12,
  showChevron = true,
  boundaryTop,
  boundaryBottom,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [effectiveMax, setEffectiveMax] = useState(menuMaxHeight);
  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Floor so a viewport pathologically short on space still shows a
  // couple of items rather than a sliver.
  const MIN_MENU_HEIGHT = 160;
  const VIEWPORT_BREATHING_ROOM = 16;
  // Gap between trigger and menu (matches Figma spacing).
  const MENU_GAP = 8;

  // Portal target — `document` is undefined during SSR, so set on mount.
  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  // close on outside click. The menu renders in a portal at body so
  // it's NOT inside rootRef — taps inside the menu would otherwise
  // count as "outside" and close before the user can scroll the list
  // on mobile. We tag the menu with [data-statizen-dropdown-menu]
  // and exempt taps inside it here.
  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      const inPortal = (target as Element | null)?.closest?.(
        "[data-statizen-dropdown-menu]",
      );
      if (inPortal) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // While open: track trigger rect, decide flip direction, clamp menu
  // height to fit the viewport. The menu renders in a portal at body
  // with `position: fixed`, so it floats above any other overlay
  // regardless of stacking context — but that means we have to drive
  // its position from the trigger's rect ourselves.
  useEffect(() => {
    if (!open || !rootRef.current) return;
    function recompute() {
      if (!rootRef.current) return;
      const rect = rootRef.current.getBoundingClientRect();
      setTriggerRect(rect);
      const top =
        (typeof boundaryTop === "function" ? boundaryTop() : boundaryTop) ?? 0;
      const bottom =
        (typeof boundaryBottom === "function"
          ? boundaryBottom()
          : boundaryBottom) ?? window.innerHeight;
      const spaceBelow = bottom - rect.bottom;
      const spaceAbove = rect.top - top;
      const flip = spaceAbove > spaceBelow;
      setOpenUp(flip);
      const usable =
        (flip ? spaceAbove : spaceBelow) -
        VIEWPORT_BREATHING_ROOM -
        MENU_GAP;
      setEffectiveMax(
        Math.max(MIN_MENU_HEIGHT, Math.min(menuMaxHeight, usable)),
      );
    }
    recompute();
    window.addEventListener("resize", recompute);
    // Capture-phase scroll so we catch scrolls in any ancestor too.
    window.addEventListener("scroll", recompute, true);
    return () => {
      window.removeEventListener("resize", recompute);
      window.removeEventListener("scroll", recompute, true);
    };
  }, [open, menuMaxHeight, boundaryTop, boundaryBottom]);

  const current = options.find((o) => o.value === value);
  const label = current ? current.label : placeholder;

  return (
    <div
      ref={rootRef}
      style={{ position: "relative", width, fontFamily: "inherit" }}
    >
      <button
        type="button"
        aria-label={ariaLabel ?? label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        style={{
          ...surface,
          width: "100%",
          padding: `${paddingY}px 16px`,
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: color.text,
          fontSize: 14,
          letterSpacing: "-0.28px",
          textAlign: "left",
          cursor: "pointer",
          outline: "none",
          textShadow: glow,
        }}
      >
        <span
          style={{
            flex: "1 0 0",
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            color: current ? color.text : color.muted,
          }}
        >
          {label}
        </span>
        {showChevron && <Chevron open={open} />}
      </button>

      {portalTarget &&
        createPortal(
          <AnimatePresence>
            {open && triggerRect && (
              <motion.div
                data-statizen-dropdown-menu
                initial={{ opacity: 0, y: openUp ? 6 : -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: openUp ? 6 : -6 }}
                transition={{ duration: 0.14 }}
                style={{
                  ...surface,
                  position: "fixed",
                  left: triggerRect.left,
                  width: triggerRect.width,
                  ...(openUp
                    ? {
                        bottom:
                          window.innerHeight - triggerRect.top + MENU_GAP,
                      }
                    : { top: triggerRect.bottom + MENU_GAP }),
                  padding: 8,
                  maxHeight: effectiveMax,
                  overflow: "hidden",
                  // 50 keeps the menu above every other fixed overlay
                  // (header z-10, IndicatorPicker z-10, etc.) without
                  // depending on DOM-order tie-breaks.
                  zIndex: 50,
                }}
              >
                <div
                  className="no-scrollbar"
                  style={{
                    maxHeight: effectiveMax - 16,
                    overflowY: "auto",
                    // Explicitly opt this region in to vertical pan
                    // gestures — the map's wrapper uses
                    // `touch-action: none` to capture all gestures
                    // for its own pinch/pan; without this opt-in,
                    // iOS would let the parent eat the touch and
                    // the dropdown list wouldn't scroll.
                    touchAction: "pan-y",
                    WebkitOverflowScrolling: "touch",
                    overscrollBehavior: "contain",
                    maskImage: FADE,
                    WebkitMaskImage: FADE,
                  }}
                >
                  <ul
                    role="listbox"
                    style={{
                      listStyle: "none",
                      margin: 0,
                      padding: "8px 0",
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                    }}
                  >
                    {options.map((opt) => {
                      const active = opt.value === value;
                      return (
                        <li
                          key={opt.value}
                          role="option"
                          aria-selected={active}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (opt.value !== value) haptic("selection");
                              onChange(opt.value);
                              setOpen(false);
                            }}
                            style={{
                              display: "block",
                              width: "100%",
                              textAlign: "left",
                              padding: "8px 8px",
                              border: "none",
                              borderRadius: 12,
                              background: active
                                ? color.hoverStrong
                                : "transparent",
                              color: active ? color.text : color.muted,
                              fontSize: 14,
                              letterSpacing: "-0.28px",
                              cursor: "pointer",
                              outline: "none",
                              textShadow: active ? glow : "none",
                              transition: "background 100ms ease",
                            }}
                            onMouseEnter={(e) => {
                              if (!active)
                                e.currentTarget.style.background =
                                  "var(--c-hover-soft)";
                            }}
                            onMouseLeave={(e) => {
                              if (!active)
                                e.currentTarget.style.background =
                                  "transparent";
                            }}
                          >
                            {opt.label}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          portalTarget,
        )}
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      style={{
        flexShrink: 0,
        transform: open ? "rotate(180deg)" : "rotate(0deg)",
        transition: "transform 160ms ease",
        opacity: 0.7,
      }}
      aria-hidden
    >
      <path
        d="M4 6 L8 10 L12 6"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
