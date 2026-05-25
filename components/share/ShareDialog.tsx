"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import type { Indicator, Region, Locale } from "@/types/data";
import { surface, color } from "@/lib/ui/tokens";
import { t } from "@/lib/i18n/strings";
import { haptic } from "@/lib/haptics";
import { ShareCard, type ShareCardFormat } from "./ShareCard";
import { analytics } from "@/lib/analytics";
import {
  downloadBlob,
  nodeToPng,
  pngBlobToPdfBlob,
  shareImageNative,
} from "@/lib/share/export";

export interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  region: Region;
  indicator: Indicator;
  year: number;
  value: number | null | undefined;
  locale: Locale;
}

type Status = "idle" | "rendering" | "done" | "error";

// Per-format preview dimensions. Both target the same 292px-wide preview
// slot so the dialog width stays stable; the story preview just grows
// taller because its source is 1080×1920 vs the post's 1080×1350.
const FORMAT_DIMS: Record<ShareCardFormat, { w: number; h: number }> = {
  post: { w: 1080, h: 1350 },
  story: { w: 1080, h: 1920 },
};
const PREVIEW_WIDTH = 292;

/**
 * Modal/sheet that previews the ShareCard and offers three export
 * actions (PNG, PDF, native Share). The ShareCard is rendered at full
 * 1080×1350 inside a fixed container that's hidden off-screen, and
 * a scaled visual clone is shown to the user. html-to-image captures
 * the off-screen one for crisp output regardless of viewport.
 */
export function ShareDialog({
  open,
  onClose,
  region,
  indicator,
  year,
  value,
  locale,
}: ShareDialogProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [format, setFormat] = useState<ShareCardFormat>("post");

  useEffect(() => {
    if (open) {
      setStatus("idle");
      setErrorMsg(null);
      setFormat("post");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const baseName = `statizen-${region.id}-${indicator.id}-${year}-${format}`;

  // Only portal client-side — `document` is undefined during SSR.
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  async function withCapture<T>(
    fn: (png: Blob) => Promise<T>,
  ): Promise<T | null> {
    if (!cardRef.current) return null;
    setStatus("rendering");
    setErrorMsg(null);
    try {
      const png = await nodeToPng(cardRef.current);
      const result = await fn(png);
      setStatus("done");
      return result;
    } catch (e) {
      setStatus("error");
      setErrorMsg((e as Error).message ?? String(e));
      return null;
    }
  }

  async function onDownloadPng() {
    haptic("light");
    analytics.shareDownloaded("png", format, indicator.id);
    await withCapture(async (png) => {
      downloadBlob(png, `${baseName}.png`);
    });
  }

  async function onDownloadPdf() {
    haptic("light");
    analytics.shareDownloaded("pdf", format, indicator.id);
    await withCapture(async (png) => {
      const pdf = await pngBlobToPdfBlob(png);
      downloadBlob(pdf, `${baseName}.pdf`);
    });
  }

  async function onShareNative() {
    haptic("light");
    analytics.shareDownloaded("native", format, indicator.id);
    await withCapture(async (png) => {
      await shareImageNative(png, `${baseName}.png`, {
        title: "Statizen",
        text: `${region.name_en} — ${indicator.label_en}`,
      });
    });
  }

  const tree = (
    <AnimatePresence>
      {open && (
        <>
          {/* Hidden 1080×1350 ShareCard — html-to-image captures THIS. */}
          <div
            aria-hidden
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              // Off-screen but rendered (not display:none — html-to-image
              // needs the computed styles).
              transform: "translate(-200vw, 0)",
              pointerEvents: "none",
              opacity: 0,
              zIndex: -1,
            }}
          >
            <div ref={cardRef}>
              <ShareCard
                region={region}
                indicator={indicator}
                year={year}
                value={value}
                locale={locale}
                format={format}
              />
            </div>
          </div>

          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={onClose}
            style={{
              position: "fixed",
              inset: 0,
              // Theme-aware scrim — dims toward the page bg so light
              // mode doesn't look like a gray slab, dark mode still
              // mutes the map underneath. 92% so the dialog clearly
              // separates from the page without the old rgba(0,0,0,0.7)
              // dark-gray feel in light mode.
              background: "color-mix(in srgb, var(--c-bg) 92%, transparent)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              zIndex: 50,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
            }}
          >
            {/* Sheet — stops backdrop clicks from closing when clicked itself */}
            <motion.div
              key="sheet"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{
                duration: 0.22,
                ease: [0.22, 1, 0.36, 1],
              }}
              role="dialog"
              aria-modal="true"
              aria-label={t("share", locale)}
              style={{
                ...surface,
                width: "min(520px, 100%)",
                display: "flex",
                flexDirection: "column",
                gap: 24,
                padding: 24,
              }}
            >
              <header
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    color: color.text,
                    letterSpacing: "-0.3px",
                  }}
                >
                  {t("share", locale)}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  style={closeBtnStyle}
                >
                  ×
                </button>
              </header>

              {/* Format toggle — Post (1080×1350, 4:5) / Story (1080×1920, 9:16) */}
              <div
                role="group"
                aria-label="Format"
                style={{
                  display: "inline-flex",
                  alignSelf: "center",
                  background: "var(--c-hover-soft)",
                  border: "0.5px solid var(--c-surface-border)",
                  borderRadius: 999,
                  padding: 4,
                  gap: 4,
                }}
              >
                <FormatToggleBtn
                  active={format === "post"}
                  onClick={() => setFormat("post")}
                  label="Post"
                  sub="4:5"
                />
                <FormatToggleBtn
                  active={format === "story"}
                  onClick={() => setFormat("story")}
                  label="Story"
                  sub="9:16"
                />
              </div>

              {/* Scaled preview of the ShareCard. Width is fixed (so the
                  dialog doesn't jump); height tracks the active format's
                  aspect ratio. */}
              {(() => {
                const dims = FORMAT_DIMS[format];
                const scale = PREVIEW_WIDTH / dims.w;
                return (
                  <div
                    style={{
                      position: "relative",
                      width: PREVIEW_WIDTH,
                      height: dims.h * scale,
                      alignSelf: "center",
                      borderRadius: 16,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        transform: `scale(${scale})`,
                        transformOrigin: "0 0",
                      }}
                    >
                      <ShareCard
                        region={region}
                        indicator={indicator}
                        year={year}
                        value={value}
                        locale={locale}
                        format={format}
                      />
                    </div>
                  </div>
                );
              })()}

              {/* Actions — Share is always present on both mobile and
                  desktop. When the Web Share API isn't available
                  (desktop browsers without it), `shareImageNative`
                  falls back to a PNG download so the button always
                  does *something* useful. */}
              <div
                style={{
                  display: "grid",
                  gap: 8,
                  gridTemplateColumns: "1fr 1fr 1fr",
                }}
              >
                <ActionButton
                  label={t("downloadPng", locale)}
                  onClick={onDownloadPng}
                  busy={status === "rendering"}
                />
                <ActionButton
                  label={t("downloadPdf", locale)}
                  onClick={onDownloadPdf}
                  busy={status === "rendering"}
                />
                <ActionButton
                  label={t("shareNative", locale)}
                  onClick={onShareNative}
                  busy={status === "rendering"}
                  primary
                />
              </div>

              {status === "error" && errorMsg && (
                <div style={errorStyle}>{errorMsg}</div>
              )}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  // Portal so the dialog escapes the DataCard's transformed ancestor —
  // `position: fixed` inside a transformed element is positioned relative
  // to that element, not the viewport.
  if (!portalTarget) return null;
  return createPortal(tree, portalTarget);
}

function ActionButton({
  label,
  onClick,
  busy,
  primary,
}: {
  label: string;
  onClick: () => void;
  busy: boolean;
  primary?: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={busy}
      whileTap={busy ? undefined : { scale: 0.97 }}
      whileHover={busy ? undefined : { opacity: 0.9 }}
      style={{
        padding: "12px 16px",
        // Primary uses the *share* accent (#8A38F5) so every share-flow
        // button shares one brand purple across themes. Accent (#612BF4)
        // is reserved for non-share emphasis.
        background: primary ? color.shareAccent : color.hoverStrong,
        border: `0.5px solid ${primary ? "transparent" : "var(--c-surface-border)"}`,
        borderRadius: 12,
        // Primary sits on the share accent — always-white foreground.
        // Secondary sits on the themed sheet — inverts with theme.
        color: primary ? color.onAccent : color.text,
        fontSize: 15,
        fontWeight: 500,
        letterSpacing: "-0.3px",
        cursor: busy ? "wait" : "pointer",
        opacity: busy ? 0.7 : 1,
      }}
    >
      {label}
    </motion.button>
  );
}

function FormatToggleBtn({
  active,
  onClick,
  label,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        gap: 6,
        padding: "6px 14px",
        borderRadius: 999,
        border: "none",
        background: active ? color.hoverStrong : "transparent",
        color: active ? color.text : color.muted,
        fontSize: 13,
        fontWeight: 500,
        letterSpacing: "-0.26px",
        cursor: "pointer",
        outline: "none",
        transition: "background 120ms ease, color 120ms ease",
      }}
    >
      <span>{label}</span>
      <span style={{ fontSize: 11, opacity: 0.65, fontVariantNumeric: "tabular-nums" }}>
        {sub}
      </span>
    </button>
  );
}

const closeBtnStyle = {
  background: "transparent",
  border: "none",
  color: color.muted,
  fontSize: 28,
  lineHeight: 1,
  cursor: "pointer",
  padding: 0,
  width: 32,
  height: 32,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
} as const;

const errorStyle = {
  fontSize: 13,
  color: "#ff6b6b",
  background: "rgba(255,107,107,0.1)",
  border: "0.5px solid rgba(255,107,107,0.3)",
  borderRadius: 8,
  padding: "8px 12px",
} as const;
