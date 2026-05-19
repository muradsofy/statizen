"use client";

import { indicatorsData } from "@/lib/data/loadData";
import { useAppStore } from "@/lib/state/store";
import { Dropdown } from "./Dropdown";
import { t } from "@/lib/i18n/strings";

export interface IndicatorPickerProps {
  width?: number | string;
}

export function IndicatorPicker({ width = 350 }: IndicatorPickerProps) {
  const activeIndicatorId = useAppStore((s) => s.activeIndicatorId);
  const setActive = useAppStore((s) => s.setActiveIndicator);
  const locale = useAppStore((s) => s.locale);

  const options = indicatorsData.indicators.map((i) => ({
    value: i.id,
    label: locale === "az" ? i.label_az : i.label_en,
  }));

  return (
    <Dropdown
      value={activeIndicatorId}
      options={options}
      onChange={setActive}
      ariaLabel={t("indicator", locale)}
      width={width}
    />
  );
}
