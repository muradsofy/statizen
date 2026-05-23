"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { surface, color, glow } from "@/lib/ui/tokens";
import { useAppStore } from "@/lib/state/store";
import { t } from "@/lib/i18n/strings";
import { haptic } from "@/lib/haptics";
import type { Locale } from "@/types/data";

/**
 * Header menu — the small `=` square pill in the top-right next to the
 * @sofyzen link. Houses the language toggle today; reserves a slot
 * for a future theme switch (light/dark). Same surface tokens and
 * portal pattern as the Dropdown, so it floats above any z-context.
 *
 * Why not reuse the generic Dropdown: this isn't a value-selection
 * pattern — it's a settings sheet with grouped controls, so the
 * Dropdown's listbox semantics don't fit. Shares the portal logic
 * inline instead of generalizing prematurely.
 */
export function HeaderMenu() {
  const locale = useAppStore((s) => s.locale);
  const setLocale = useAppStore((s) => s.setLocale);

  const [open, setOpen] = useState(false);
  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  // Track the trigger rect while open; close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function recompute() {
      if (triggerRef.current) {
        setTriggerRect(triggerRef.current.getBoundingClientRect());
      }
    }
    function onDown(e: PointerEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      // Allow clicks inside the menu itself (rendered in portal).
      const menu = document.querySelector("[data-statizen-header-menu]");
      if (menu?.contains(target)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    recompute();
    window.addEventListener("resize", recompute);
    window.addEventListener("scroll", recompute, true);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", recompute);
      window.removeEventListener("scroll", recompute, true);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function changeLocale(value: Locale) {
    if (value !== locale) haptic("light");
    setLocale(value);
    // Don't auto-close — user might also want to flip another setting.
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        style={{
          ...surface,
          width: 32,
          height: 32,
          padding: 0,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: color.text,
          outline: "none",
        }}
      >
        <EqualIcon />
      </button>

      {portalTarget &&
        createPortal(
          <AnimatePresence>
            {open && triggerRect && (
              <motion.div
                data-statizen-header-menu
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.14 }}
                role="menu"
                style={{
                  ...surface,
                  position: "fixed",
                  top: triggerRect.bottom + 8,
                  // Right-align against the trigger's right edge.
                  right: Math.max(8, window.innerWidth - triggerRect.right),
                  padding: 12,
                  minWidth: 200,
                  zIndex: 50,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <Section label={t("language", locale)}>
                  <LocaleSwitch
                    locale={locale}
                    onChange={changeLocale}
                  />
                </Section>
                {/* Theme switch slot — wired once light mode lands. */}
                <Section label={t("theme", locale)}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      color: color.muted,
                      letterSpacing: "-0.24px",
                    }}
                  >
                    {t("themeComingSoon", locale)}
                  </p>
                </Section>
              </motion.div>
            )}
          </AnimatePresence>,
          portalTarget,
        )}
    </>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span
        style={{
          fontSize: 11,
          letterSpacing: "0.5px",
          textTransform: "uppercase",
          color: color.faint,
          fontWeight: 500,
        }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

function LocaleSwitch({
  locale,
  onChange,
}: {
  locale: Locale;
  onChange: (l: Locale) => void;
}) {
  function Btn({ value, label }: { value: Locale; label: string }) {
    const active = locale === value;
    return (
      <button
        type="button"
        onClick={() => onChange(value)}
        aria-pressed={active}
        aria-label={`${label} (${value})`}
        style={{
          flex: "1 1 0",
          background: active ? "rgba(255,255,255,0.06)" : "transparent",
          border: "none",
          padding: "6px 10px",
          color: active ? color.text : color.muted,
          textShadow: active ? glow : "none",
          fontSize: 14,
          letterSpacing: "-0.28px",
          cursor: "pointer",
          outline: "none",
          borderRadius: 12,
          transition: "color 120ms ease, background 120ms ease",
        }}
      >
        {label}
      </button>
    );
  }
  return (
    <div style={{ display: "flex", gap: 4 }}>
      <Btn value="en" label="EN" />
      <Btn value="az" label="AZ" />
    </div>
  );
}

function EqualIcon() {
  // Figma node 2001:341 "equal" — two horizontal lines, 1px stroke,
  // rounded caps. Rendered at 16×16 to match the design's icon slot.
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1}
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M2.5 6 H13.5 M2.5 10 H13.5" />
    </svg>
  );
}
