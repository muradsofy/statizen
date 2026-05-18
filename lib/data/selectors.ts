// Pure query functions over the data. Stub — implemented in build Phase 4.

import type { Indicator, Region, ValueRow } from "@/types/data";

export function selectRegionById(
  _regions: Region[],
  _id: string,
): Region | undefined {
  throw new Error("selectRegionById: not implemented (build Phase 4)");
}

export function selectIndicatorById(
  _indicators: Indicator[],
  _id: string,
): Indicator | undefined {
  throw new Error("selectIndicatorById: not implemented (build Phase 4)");
}

export function selectValue(
  _values: ValueRow[],
  _regionId: string,
  _indicatorId: string,
): ValueRow | undefined {
  throw new Error("selectValue: not implemented (build Phase 4)");
}
