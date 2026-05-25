"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { surface, color, glow } from "@/lib/ui/tokens";
import { useAppStore } from "@/lib/state/store";
import { t } from "@/lib/i18n/strings";
import { haptic } from "@/lib/haptics";
import { analytics } from "@/lib/analytics";
import { FeedbackDialog } from "./FeedbackDialog";
import type { Locale, Theme } from "@/types/data";

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
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);

  const [open, setOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
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
    if (value !== locale) {
      haptic("light");
      analytics.localeChanged(value);
    }
    setLocale(value);
    // Don't auto-close — user might also want to flip another setting.
  }

  function changeTheme(value: Theme) {
    if (value !== theme) {
      haptic("light");
      analytics.themeChanged(value);
    }
    setTheme(value);
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
                <Section label={t("theme", locale)}>
                  <ThemeSwitch theme={theme} onChange={changeTheme} locale={locale} />
                </Section>
                <button
                  type="button"
                  onClick={() => {
                    haptic("light");
                    setFeedbackOpen(true);
                    setOpen(false);
                    analytics.feedbackOpened();
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    padding: "10px 4px",
                    color: color.text,
                    textAlign: "left",
                    fontSize: 14,
                    letterSpacing: "-0.28px",
                    cursor: "pointer",
                    outline: "none",
                    borderRadius: 8,
                    borderTop: "0.5px solid var(--c-surface-border)",
                    marginTop: 4,
                  }}
                >
                  {t("feedback", locale)}
                </button>
              </motion.div>
            )}
          </AnimatePresence>,
          portalTarget,
        )}

      <FeedbackDialog
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
      />
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
          background: active ? color.hoverStrong : "transparent",
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
      <Btn value="ru" label="RU" />
    </div>
  );
}

function ThemeSwitch({
  theme,
  onChange,
  locale,
}: {
  theme: Theme;
  onChange: (t: Theme) => void;
  locale: Locale;
}) {
  function Btn({
    value,
    label,
    icon,
  }: {
    value: Theme;
    label: string;
    icon: React.ReactNode;
  }) {
    const active = theme === value;
    return (
      <button
        type="button"
        onClick={() => onChange(value)}
        aria-pressed={active}
        aria-label={label}
        title={label}
        style={{
          flex: "1 1 0",
          background: active ? color.hoverStrong : "transparent",
          border: "none",
          padding: "8px 0",
          color: active ? color.text : color.muted,
          textShadow: active ? glow : "none",
          fontSize: 12,
          letterSpacing: "-0.24px",
          cursor: "pointer",
          outline: "none",
          borderRadius: 12,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
          transition: "color 120ms ease, background 120ms ease",
        }}
      >
        {icon}
        <span>{label}</span>
      </button>
    );
  }
  return (
    <div style={{ display: "flex", gap: 4 }}>
      <Btn value="system" label={t("themeSystem", locale)} icon={<SystemIcon />} />
      <Btn value="light" label={t("themeLight", locale)} icon={<SunIcon />} />
      <Btn value="dark" label={t("themeDark", locale)} icon={<MoonIcon />} />
    </div>
  );
}

function SystemIcon() {
  // Half-filled circle (split light/dark).
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth={1.2} />
      <path d="M8 2 a6 6 0 0 1 0 12 z" fill="currentColor" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.2}
      strokeLinecap="round"
      aria-hidden
    >
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.3 3.3l1.05 1.05M11.65 11.65l1.05 1.05M3.3 12.7l1.05-1.05M11.65 4.35l1.05-1.05" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5a5.5 5.5 0 1 0 7 7Z"
        stroke="currentColor"
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
    </svg>
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
