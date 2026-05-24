"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import type { Indicator, Region, Locale } from "@/types/data";
import { surface, color, glow } from "@/lib/ui/tokens";
import { t } from "@/lib/i18n/strings";
import { haptic } from "@/lib/haptics";
import { ShareCard } from "./ShareCard";
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

const PREVIEW_SCALE = 0.27; // 1080×1350 → ~292×365 preview (fits ~600px viewports without scroll)

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

  useEffect(() => {
    if (open) {
      setStatus("idle");
      setErrorMsg(null);
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

  const baseName = `statizen-${region.id}-${indicator.id}-${year}`;

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
    await withCapture(async (png) => {
      downloadBlob(png, `${baseName}.png`);
    });
  }

  async function onDownloadPdf() {
    haptic("light");
    await withCapture(async (png) => {
      const pdf = await pngBlobToPdfBlob(png);
      downloadBlob(pdf, `${baseName}.pdf`);
    });
  }

  async function onShareNative() {
    haptic("light");
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
              background: "rgba(0,0,0,0.7)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
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
                    textShadow: glow,
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

              {/* Scaled preview of the ShareCard */}
              <div
                style={{
                  position: "relative",
                  width: 1080 * PREVIEW_SCALE,
                  height: 1350 * PREVIEW_SCALE,
                  alignSelf: "center",
                  borderRadius: 16,
                  overflow: "hidden",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    transform: `scale(${PREVIEW_SCALE})`,
                    transformOrigin: "0 0",
                  }}
                >
                  <ShareCard
                    region={region}
                    indicator={indicator}
                    year={year}
                    value={value}
                    locale={locale}
                  />
                </div>
              </div>

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
        background: primary ? color.accent : color.hoverStrong,
        border: `0.5px solid ${primary ? "transparent" : "var(--c-surface-border)"}`,
        borderRadius: 12,
        // Primary sits on the purple accent — always-white foreground.
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
