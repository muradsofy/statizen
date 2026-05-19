"use client";

import { useEffect } from "react";
import { indicatorsData, regionsData } from "@/lib/data/loadData";
import { useAppStore } from "./store";
import type { Locale } from "@/types/data";

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
    const lang = p.get("lang");
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
    if (lang === "az" || lang === "en") {
      st.setLocale(lang as Locale);
    }

    function syncLang(l: Locale) {
      if (typeof document !== "undefined") {
        document.documentElement.lang = l;
      }
    }
    syncLang(useAppStore.getState().locale);

    const unsub = useAppStore.subscribe((s, prev) => {
      if (
        s.selectedRegionId === prev.selectedRegionId &&
        s.activeIndicatorId === prev.activeIndicatorId &&
        s.locale === prev.locale
      ) {
        return;
      }
      if (s.locale !== prev.locale) syncLang(s.locale);

      const q = new URLSearchParams(window.location.search);
      if (s.selectedRegionId) q.set("region", s.selectedRegionId);
      else q.delete("region");
      q.set("indicator", s.activeIndicatorId);
      if (s.locale !== "en") q.set("lang", s.locale);
      else q.delete("lang");

      const qs = q.toString();
      window.history.replaceState(
        null,
        "",
        qs ? `?${qs}` : window.location.pathname,
      );
    });
    return unsub;
  }, []);
}
