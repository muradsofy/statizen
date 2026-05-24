"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/state/store";
import type { Theme } from "@/types/data";

const STORAGE_KEY = "statizen.theme";

/**
 * Owns theme resolution end-to-end:
 *  • Restores preference from localStorage on mount (overriding the
 *    default "system" in the store with what the user last picked).
 *  • Persists every change back to localStorage.
 *  • Listens to prefers-color-scheme so "system" tracks the OS in
 *    real time without a reload.
 *  • Applies the resolved value to <html data-theme="…"> so the
 *    CSS variables in globals.css drive the entire UI.
 *
 * Pair with the inline bootstrap script in app/layout.tsx that runs
 * BEFORE React hydrates — that script does the first paint without
 * a flash; this hook keeps things live thereafter.
 */
export function useTheme() {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);

  // Hydrate the store from localStorage on first mount.
  useEffect(() => {
    const stored = readStored();
    if (stored && stored !== theme) setTheme(stored);
    // theme intentionally NOT a dep — only run on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist + apply on every change, and follow OS pref when "system".
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* storage might be blocked (private mode, etc.) — fall through */
    }
    applyTheme(theme);
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    function onChange() {
      applyTheme("system");
    }
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, [theme]);
}

/** Compute the resolved theme (light|dark) for a given preference. */
export function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme === "light" || theme === "dark") return theme;
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = resolveTheme(theme);
}

function readStored(): Theme | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* storage might be blocked */
  }
  return null;
}
