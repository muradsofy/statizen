"use client";

import { useMemo } from "react";
import { chaptersData, indicatorsData } from "@/lib/data/loadData";
import { useAppStore } from "@/lib/state/store";
import { Dropdown } from "./Dropdown";
import { t } from "@/lib/i18n/strings";

export interface IndicatorPickerProps {
  width?: number | string;
  /** Mobile variant: chapter + indicator side-by-side in a single row. */
  layout?: "stacked" | "row";
}

export function IndicatorPicker({
  width = 350,
  layout = "stacked",
}: IndicatorPickerProps) {
  const activeIndicatorId = useAppStore((s) => s.activeIndicatorId);
  const setActive = useAppStore((s) => s.setActiveIndicator);
  const locale = useAppStore((s) => s.locale);

  const indicators = indicatorsData.indicators;
  const chapters = chaptersData.chapters;
  const showChapterPicker = chapters.length > 1;

  const activeIndicator = useMemo(
    () => indicators.find((i) => i.id === activeIndicatorId),
    [indicators, activeIndicatorId],
  );
  const activeChapterId = activeIndicator?.chapter ?? chapters[0]?.id ?? "";

  const chapterOptions = chapters.map((c) => ({
    value: c.id,
    label: locale === "az" ? c.label_az : c.label_en,
  }));

  const indicatorOptions = indicators
    .filter((i) => i.chapter === activeChapterId)
    .map((i) => ({
      value: i.id,
      label: locale === "az" ? i.label_az : i.label_en,
    }));

  function onChapterChange(chapterId: string) {
    const first = indicators.find((i) => i.chapter === chapterId);
    if (first) setActive(first.id);
  }

  if (layout === "row") {
    // Per Figma 34:332 — both pills share width 1:1 (flex-[1_0_0]) with
    // chevrons on each.
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: 8,
          width,
          alignItems: "stretch",
        }}
      >
        {showChapterPicker && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <Dropdown
              value={activeChapterId}
              options={chapterOptions}
              onChange={onChapterChange}
              ariaLabel={t("chapter", locale)}
              width="100%"
              paddingY={12}
            />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Dropdown
            value={activeIndicatorId}
            options={indicatorOptions}
            onChange={setActive}
            ariaLabel={t("indicator", locale)}
            width="100%"
            paddingY={12}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, width }}>
      {showChapterPicker && (
        <Dropdown
          value={activeChapterId}
          options={chapterOptions}
          onChange={onChapterChange}
          ariaLabel={t("chapter", locale)}
          width="100%"
        />
      )}
      <Dropdown
        value={activeIndicatorId}
        options={indicatorOptions}
        onChange={setActive}
        ariaLabel={t("indicator", locale)}
        width="100%"
      />
    </div>
  );
}
