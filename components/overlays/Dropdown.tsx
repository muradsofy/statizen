"use client";

import { useEffect, useRef, useState } from "react";
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
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [effectiveMax, setEffectiveMax] = useState(menuMaxHeight);
  const rootRef = useRef<HTMLDivElement>(null);

  // Floor so a viewport pathologically short on space still shows a
  // couple of items rather than a sliver.
  const MIN_MENU_HEIGHT = 160;
  const VIEWPORT_BREATHING_ROOM = 16;

  // close on outside click
  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
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

  // Flip the menu above the trigger when there's more room above than below
  // — covers mobile (picker pinned to bottom, browser chrome eating space)
  // and is harmless on desktop (header picker has tons of room below).
  // Also clamp the menu height to whichever side wins, so a long region
  // list on a short phone shrinks instead of overflowing.
  useEffect(() => {
    if (!open || !rootRef.current) return;
    function recompute() {
      if (!rootRef.current) return;
      const rect = rootRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const flip = spaceAbove > spaceBelow;
      setOpenUp(flip);
      const usable = (flip ? spaceAbove : spaceBelow) - VIEWPORT_BREATHING_ROOM;
      setEffectiveMax(
        Math.max(MIN_MENU_HEIGHT, Math.min(menuMaxHeight, usable)),
      );
    }
    recompute();
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, [open, menuMaxHeight]);

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

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: openUp ? 6 : -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: openUp ? 6 : -6 }}
            transition={{ duration: 0.14 }}
            style={{
              ...surface,
              position: "absolute",
              ...(openUp
                ? { bottom: "calc(100% + 8px)" }
                : { top: "calc(100% + 8px)" }),
              left: 0,
              right: 0,
              padding: 8,
              maxHeight: effectiveMax,
              overflow: "hidden",
              zIndex: 20,
            }}
          >
            <div
              className="no-scrollbar"
              style={{
                maxHeight: effectiveMax - 16,
                overflowY: "auto",
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
                    <li key={opt.value} role="option" aria-selected={active}>
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
                            ? "rgba(255,255,255,0.06)"
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
                              "rgba(255,255,255,0.04)";
                        }}
                        onMouseLeave={(e) => {
                          if (!active)
                            e.currentTarget.style.background = "transparent";
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
      </AnimatePresence>
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
