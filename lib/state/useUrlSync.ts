"use client";

import { useEffect } from "react";
import { indicatorsData, regionsData } from "@/lib/data/loadData";
import { useAppStore } from "./store";

/**
 * Two-way sync between the store and ?region=&indicator= so views are
 * shareable. Uses history.replaceState (no router) — works under static
 * export with no Suspense requirement. Only writes when region/indicator
 * actually change (ignores hover churn).
 */
export function useUrlSync() {
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const region = p.get("region");
    const indicator = p.get("indicator");
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

    const unsub = useAppStore.subscribe((s, prev) => {
      if (
        s.selectedRegionId === prev.selectedRegionId &&
        s.activeIndicatorId === prev.activeIndicatorId
      ) {
        return;
      }
      const q = new URLSearchParams(window.location.search);
      if (s.selectedRegionId) q.set("region", s.selectedRegionId);
      else q.delete("region");
      q.set("indicator", s.activeIndicatorId);
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
