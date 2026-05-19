// Pure query functions over the data files.

import type { Indicator, Region, ValueRow } from "@/types/data";

export function selectRegionById(
  regions: Region[],
  id: string,
): Region | undefined {
  return regions.find((r) => r.id === id);
}

export function selectIndicatorById(
  indicators: Indicator[],
  id: string,
): Indicator | undefined {
  return indicators.find((i) => i.id === id);
}

export function selectValue(
  values: ValueRow[],
  regionId: string,
  indicatorId: string,
  year: number,
): ValueRow | undefined {
  return values.find(
    (v) =>
      v.region_id === regionId &&
      v.indicator_id === indicatorId &&
      v.year === year,
  );
}

/**
 * Most recent region-scoped value for a region + indicator. Years can have
 * gaps (e.g. registered_unemployed lacks 2020-2022) — never assume a year.
 */
export function selectLatestValue(
  values: ValueRow[],
  regionId: string,
  indicatorId: string,
): ValueRow | undefined {
  let latest: ValueRow | undefined;
  for (const v of values) {
    if (
      v.region_id === regionId &&
      v.indicator_id === indicatorId &&
      v.scope === "region" &&
      (latest === undefined || v.year > latest.year)
    ) {
      latest = v;
    }
  }
  return latest;
}
