// Typed access to the static JSON data files.
// Phase 1 data is empty until the ETL runs (vault blocker B1).

import regionsJson from "@/data/regions.json";
import indicatorsJson from "@/data/indicators.json";
import valuesJson from "@/data/values.json";
import type {
  RegionsFile,
  IndicatorsFile,
  ValuesFile,
} from "@/types/data";

export const regionsData = regionsJson as RegionsFile;
export const indicatorsData = indicatorsJson as IndicatorsFile;
export const valuesData = valuesJson as ValuesFile;
