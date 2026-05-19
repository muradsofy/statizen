"use client";

import { regionsData } from "@/lib/data/loadData";
import { useAppStore } from "@/lib/state/store";
import { Dropdown } from "./Dropdown";
import { t } from "@/lib/i18n/strings";

export interface RegionPickerProps {
  width?: number | string;
}

export function RegionPicker({ width = "100%" }: RegionPickerProps) {
  const selectedRegionId = useAppStore((s) => s.selectedRegionId);
  const setSelected = useAppStore((s) => s.setSelectedRegion);
  const locale = useAppStore((s) => s.locale);

  const options = regionsData.regions.map((r) => ({
    value: r.id,
    label: locale === "az" ? r.name_az : r.name_en,
  }));

  return (
    <Dropdown
      value={selectedRegionId}
      options={options}
      placeholder={t("selectRegion", locale)}
      onChange={setSelected}
      ariaLabel={t("region", locale)}
      width={width}
    />
  );
}
