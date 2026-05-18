// Global UI state. Shape per PROJECT.md §"State management".
// Stub — wired to map/panels in build Phase 3.

import { create } from "zustand";
import type { Locale } from "@/types/data";

export interface AppState {
  selectedRegionId: string | null;
  hoveredRegionId: string | null;
  activeIndicatorId: string;
  locale: Locale;
  setSelectedRegion: (id: string | null) => void;
  setHoveredRegion: (id: string | null) => void;
  setActiveIndicator: (id: string) => void;
  setLocale: (locale: Locale) => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedRegionId: null,
  hoveredRegionId: null,
  activeIndicatorId: "unemployment_rate",
  locale: "en",
  setSelectedRegion: (id) => set({ selectedRegionId: id }),
  setHoveredRegion: (id) => set({ hoveredRegionId: id }),
  setActiveIndicator: (id) => set({ activeIndicatorId: id }),
  setLocale: (locale) => set({ locale }),
}));
