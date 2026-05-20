// Typed access to the bundled JSON data files (regions, indicators, chapters).
// Per-indicator value rows are NOT bundled — they're lazy-loaded at runtime
// via useIndicatorValues so adding 100+ indicators doesn't bloat the initial
// download.

import regionsJson from "@/data/regions.json";
import indicatorsJson from "@/data/indicators.json";
import chaptersJson from "@/data/chapters.json";
import type {
  RegionsFile,
  IndicatorsFile,
  ChaptersFile,
} from "@/types/data";

export const regionsData = regionsJson as RegionsFile;
export const indicatorsData = indicatorsJson as IndicatorsFile;
export const chaptersData = chaptersJson as ChaptersFile;
