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

/**
 * Mobile-only display pill (Figma 34:336). Shows the selected region name as
 * a small chip; tapping it opens the dropdown menu for changing the region.
 */
/**
 * Full-width mobile region picker (Figma 34:336). Sits at the top of the
 * bottom stack with a chevron-down on the right.
 */
export function RegionPill({ width = "100%" }: { width?: number | string }) {
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
      paddingY={12}
    />
  );
}
