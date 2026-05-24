"use client";

import { useEffect } from "react";
import { indicatorsData, regionsData } from "@/lib/data/loadData";
import { useAppStore } from "./store";
import type { Locale, Theme } from "@/types/data";

/**
 * Two-way sync between the store and ?region= & ?indicator= & ?lang= so
 * views are shareable. Uses history.replaceState (no router) — works under
 * static export with no Suspense requirement. Also reflects `locale` into
 * `<html lang>` for accessibility / SEO.
 */
export function useUrlSync() {
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const region = p.get("region");
    const indicator = p.get("indicator");
    const year = p.get("year");
    const lang = p.get("lang");
    const theme = p.get("theme");
    const st = useAppStore.getState();
    if (region && regionsData.regions.some((r) => r.id === region)) {
      st.setSelectedRegion(region);
    }
    if (
      indicator &&
      indicatorsData.indicators.some((i) => i.id === indicator)
    ) {
      st.setActiveIndicator(indicator);
    }
    if (year && /^\d{4}$/.test(year)) {
      st.setSelectedYear(parseInt(year, 10));
    }
    if (lang === "az" || lang === "en") {
      st.setLocale(lang as Locale);
    }
    if (theme === "light" || theme === "dark" || theme === "system") {
      st.setTheme(theme as Theme);
    }

    function syncLang(l: Locale) {
      if (typeof document !== "undefined") {
        document.documentElement.lang = l;
      }
    }
    syncLang(useAppStore.getState().locale);

    // Debounce window.history.replaceState. Safari throttles the
    // history API hard (≈100 calls per 30 s) and kills the page once
    // the budget is exhausted — a fast year-scrub at 60 Hz blew past
    // that limit and crashed iOS. Coalesce bursty updates and write
    // the URL once the store has been quiet for 200 ms.
    let pending: ReturnType<typeof setTimeout> | null = null;
    function writeUrl() {
      const s = useAppStore.getState();
      const q = new URLSearchParams(window.location.search);
      if (s.selectedRegionId) q.set("region", s.selectedRegionId);
      else q.delete("region");
      q.set("indicator", s.activeIndicatorId);
      if (s.selectedYear !== null) q.set("year", String(s.selectedYear));
      else q.delete("year");
      if (s.locale !== "en") q.set("lang", s.locale);
      else q.delete("lang");
      // Default is "system" — only serialize explicit user choices.
      if (s.theme !== "system") q.set("theme", s.theme);
      else q.delete("theme");
      const qs = q.toString();
      window.history.replaceState(
        null,
        "",
        qs ? `?${qs}` : window.location.pathname,
      );
    }

    const unsub = useAppStore.subscribe((s, prev) => {
      if (
        s.selectedRegionId === prev.selectedRegionId &&
        s.activeIndicatorId === prev.activeIndicatorId &&
        s.selectedYear === prev.selectedYear &&
        s.locale === prev.locale &&
        s.theme === prev.theme
      ) {
        return;
      }
      // Lang attribute isn't throttled — apply immediately.
      if (s.locale !== prev.locale) syncLang(s.locale);

      if (pending !== null) clearTimeout(pending);
      pending = setTimeout(() => {
        pending = null;
        writeUrl();
      }, 200);
    });
    return () => {
      if (pending !== null) clearTimeout(pending);
      unsub();
    };
  }, []);
}
