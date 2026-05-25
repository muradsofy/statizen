"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ShareDialog } from "@/components/share/ShareDialog";
import { indicatorsData, regionsData } from "@/lib/data/loadData";
import { useIndicatorValues } from "@/lib/data/useIndicatorValues";
import {
  selectIndicatorById,
  selectLatestValue,
  selectRegionById,
  selectValueAt,
} from "@/lib/data/selectors";
import { useAppStore } from "@/lib/state/store";
import { color } from "@/lib/ui/tokens";
import { haptic } from "@/lib/haptics";
import { analytics } from "@/lib/analytics";
import { t } from "@/lib/i18n/strings";

export interface ShareButtonProps {
  /** Width override; default `100%` so the parent flex row controls sizing. */
  width?: number | string;
  /** Height; default 44 (Figma 47:3294). */
  height?: number;
}

/**
 * Purple pill that opens the ShareDialog. Figma node 47:3294 / 47:3805.
 *
 * Self-connected to the store so callers don't have to drill region /
 * indicator / value props. Renders `null` when there's nothing to
 * share (no region selected, indicator missing data, etc.) — Overlays
 * can render this unconditionally inside a flex row and the layout
 * collapses cleanly when it isn't needed.
 */
export function ShareButton({ width = "100%", height = 44 }: ShareButtonProps) {
  const selectedRegionId = useAppStore((s) => s.selectedRegionId);
  const activeIndicatorId = useAppStore((s) => s.activeIndicatorId);
  const selectedYear = useAppStore((s) => s.selectedYear);
  const locale = useAppStore((s) => s.locale);

  const indicator = selectIndicatorById(
    indicatorsData.indicators,
    activeIndicatorId,
  );
  const region = selectedRegionId
    ? selectRegionById(regionsData.regions, selectedRegionId)
    : undefined;
  const { values } = useIndicatorValues(
    region && indicator ? indicator.id : null,
  );
  const latest =
    region && indicator
      ? (selectedYear !== null
          ? selectValueAt(values, region.id, indicator.id, selectedYear)
          : undefined) ??
        selectLatestValue(values, region.id, indicator.id)
      : undefined;

  const [open, setOpen] = useState(false);

  if (!region || !indicator || !latest) return null;

  return (
    <>
      <motion.button
        type="button"
        aria-label={t("shareAria", locale)}
        onClick={() => {
          haptic("light");
          setOpen(true);
          analytics.shareOpened(region.id, indicator.id);
        }}
        whileTap={{ scale: 0.96 }}
        whileHover={{ filter: "brightness(1.08)" }}
        style={{
          width,
          height,
          background: color.shareAccent,
          // Always-white foreground — brand purple is dark in both
          // themes, so color.text (which inverts) would be unreadable
          // in light mode.
          color: color.onAccent,
          border: "none",
          borderRadius: 999,
          padding: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          cursor: "pointer",
          boxSizing: "border-box",
          letterSpacing: "-0.3px",
          fontSize: 16,
          fontWeight: 400,
          lineHeight: "20px",
          fontVariationSettings: "'wdth' 100",
        }}
      >
        <ShareIosIcon size={20} />
        <span>{t("share", locale)}</span>
      </motion.button>
      <ShareDialog
        open={open}
        onClose={() => setOpen(false)}
        region={region}
        indicator={indicator}
        year={latest.year}
        value={latest.value}
        locale={locale}
      />
    </>
  );
}

/** iOS-style share glyph — arrow up out of a tray. Figma 47:3297 share-ios. */
function ShareIosIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M10 1.5v10" />
      <polyline points="6,5 10,1.5 14,5" />
      <path d="M3 10v6.5A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V10" />
    </svg>
  );
}
