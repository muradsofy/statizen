"use client";

import { regionsData } from "@/lib/data/loadData";
import { useAppStore } from "@/lib/state/store";
import { Dropdown } from "./Dropdown";
import { t } from "@/lib/i18n/strings";
import { regionName } from "@/lib/i18n/localize";

export interface RegionPickerProps {
  width?: number | string;
}

export function RegionPicker({ width = "100%" }: RegionPickerProps) {
  const selectedRegionId = useAppStore((s) => s.selectedRegionId);
  const setSelected = useAppStore((s) => s.setSelectedRegion);
  const locale = useAppStore((s) => s.locale);

  const options = regionsData.regions.map((r) => ({
    value: r.id,
    label: regionName(r, locale),
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
    label: regionName(r, locale),
  }));

  // Mobile-only: the IndicatorPicker row sits at top:77 and is ~44px
  // tall (chapter+indicator row). Stop the upward-opening menu just
  // below it so the two pickers never visually merge. The dropdown
  // re-clamps on resize, so this constant is safe across orientations.
  const REGION_MENU_TOP = 77 + 44 + 8;

  // data-statizen-region-pill — stable selector for the mobile
  // IndicatorPicker's `boundaryBottom`, which needs the RegionPill's
  // top edge to know when to stop downward menu growth. Locale-neutral
  // unlike the aria-label.
  return (
    <div data-statizen-region-pill>
      <Dropdown
        value={selectedRegionId}
        options={options}
        placeholder={t("selectRegion", locale)}
        onChange={setSelected}
        ariaLabel={t("region", locale)}
        width={width}
        paddingY={12}
        boundaryTop={REGION_MENU_TOP}
      />
    </div>
  );
}
