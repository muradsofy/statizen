"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { surface, color } from "@/lib/ui/tokens";
import { t } from "@/lib/i18n/strings";
import { haptic } from "@/lib/haptics";
import { analytics } from "@/lib/analytics";
import { useAppStore } from "@/lib/state/store";

type Status = "idle" | "sending" | "sent" | "error" | "unconfigured";

/** Endpoint that accepts a JSON POST with `{ message, email, context }`.
 *  Public-friendly providers (no backend on our side):
 *  - Formspree: https://formspree.io/f/<form-id>
 *  - Web3Forms: https://api.web3forms.com/submit  (also needs `access_key`)
 *  - Tally webhooks, EmailJS, custom Cloudflare Worker — same shape.
 *  Override per-deploy via NEXT_PUBLIC_FEEDBACK_ENDPOINT. */
const FEEDBACK_ENDPOINT = process.env.NEXT_PUBLIC_FEEDBACK_ENDPOINT || "";
const FEEDBACK_ACCESS_KEY = process.env.NEXT_PUBLIC_FEEDBACK_ACCESS_KEY || "";

export interface FeedbackDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Lightweight feedback modal — same dialog pattern as ShareDialog
 * (portal + backdrop + sheet) so it picks up theme tokens and locale
 * consistently. Submits a JSON POST to FEEDBACK_ENDPOINT; surfaces
 * success / error inline rather than disappearing on submit, so the
 * sender knows it landed.
 */
export function FeedbackDialog({ open, onClose }: FeedbackDialogProps) {
  const locale = useAppStore((s) => s.locale);
  const activeIndicatorId = useAppStore((s) => s.activeIndicatorId);
  const selectedRegionId = useAppStore((s) => s.selectedRegionId);

  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setStatus(FEEDBACK_ENDPOINT ? "idle" : "unconfigured");
      setErrorMsg(null);
      // Don't wipe the message — visitors may have started typing
      // before reopening; cleared explicitly on successful send.
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    // Focus the textarea so visitors can start typing immediately.
    const id = requestAnimationFrame(() => textareaRef.current?.focus());
    return () => {
      window.removeEventListener("keydown", onKey);
      cancelAnimationFrame(id);
    };
  }, [open, onClose]);

  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    if (!FEEDBACK_ENDPOINT) {
      setStatus("unconfigured");
      return;
    }
    haptic("light");
    setStatus("sending");
    setErrorMsg(null);
    try {
      const payload: Record<string, unknown> = {
        message: message.trim(),
        email: email.trim() || undefined,
        // Context helps you triage feedback without asking follow-ups.
        context: {
          locale,
          indicator: activeIndicatorId,
          region: selectedRegionId ?? null,
          userAgent: navigator.userAgent,
          url: typeof window !== "undefined" ? window.location.href : "",
        },
      };
      if (FEEDBACK_ACCESS_KEY) payload.access_key = FEEDBACK_ACCESS_KEY;
      const res = await fetch(FEEDBACK_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      analytics.feedbackSent(!!email.trim(), message.trim().length);
      setStatus("sent");
      setMessage("");
      setEmail("");
    } catch (err) {
      setStatus("error");
      setErrorMsg((err as Error).message ?? String(err));
    }
  }

  const tree = (
    <AnimatePresence>
      {open && (
        <motion.div
          key="feedback-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
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
          <motion.form
            key="feedback-sheet"
            onClick={(e) => e.stopPropagation()}
            onSubmit={onSubmit}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label={t("feedback", locale)}
            style={{
              ...surface,
              width: "min(440px, 100%)",
              display: "flex",
              flexDirection: "column",
              gap: 16,
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
                {t("feedbackTitle", locale)}
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

            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("feedbackPlaceholder", locale)}
              rows={5}
              required
              minLength={5}
              maxLength={2000}
              style={textareaStyle}
            />

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("feedbackEmail", locale)}
              autoComplete="email"
              style={inputStyle}
            />

            {status === "sent" && (
              <div style={noticeStyle("ok")}>{t("feedbackSent", locale)}</div>
            )}
            {status === "error" && (
              <div style={noticeStyle("err")}>
                {t("feedbackError", locale)}
                {errorMsg ? ` (${errorMsg})` : ""}
              </div>
            )}
            {status === "unconfigured" && (
              <div style={noticeStyle("warn")}>
                {t("feedbackUnconfigured", locale)}
              </div>
            )}

            <motion.button
              type="submit"
              disabled={
                status === "sending" ||
                status === "unconfigured" ||
                message.trim().length < 5
              }
              whileTap={status === "sending" ? undefined : { scale: 0.97 }}
              style={{
                background: color.shareAccent,
                border: "none",
                borderRadius: 12,
                color: color.onAccent,
                fontSize: 15,
                fontWeight: 500,
                letterSpacing: "-0.3px",
                padding: "12px 16px",
                cursor:
                  status === "sending" || message.trim().length < 5
                    ? "wait"
                    : "pointer",
                opacity:
                  status === "sending" || message.trim().length < 5
                    ? 0.7
                    : 1,
              }}
            >
              {status === "sending"
                ? t("feedbackSending", locale)
                : t("feedbackSend", locale)}
            </motion.button>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (!portalTarget) return null;
  return createPortal(tree, portalTarget);
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

const textareaStyle: React.CSSProperties = {
  background: "var(--c-hover-soft)",
  border: "0.5px solid var(--c-surface-border)",
  borderRadius: 12,
  color: "var(--c-text)",
  fontSize: 15,
  fontFamily: "inherit",
  padding: "12px 14px",
  resize: "vertical",
  minHeight: 96,
  outline: "none",
  letterSpacing: "-0.3px",
  lineHeight: 1.4,
};

const inputStyle: React.CSSProperties = {
  background: "var(--c-hover-soft)",
  border: "0.5px solid var(--c-surface-border)",
  borderRadius: 12,
  color: "var(--c-text)",
  fontSize: 14,
  fontFamily: "inherit",
  padding: "10px 14px",
  outline: "none",
  letterSpacing: "-0.28px",
};

function noticeStyle(kind: "ok" | "err" | "warn"): React.CSSProperties {
  const palette = {
    ok: {
      color: "#34c759",
      bg: "rgba(52,199,89,0.10)",
      border: "rgba(52,199,89,0.35)",
    },
    err: {
      color: "#ff6b6b",
      bg: "rgba(255,107,107,0.10)",
      border: "rgba(255,107,107,0.30)",
    },
    warn: {
      color: "#f5a623",
      bg: "rgba(245,166,35,0.10)",
      border: "rgba(245,166,35,0.30)",
    },
  }[kind];
  return {
    fontSize: 13,
    color: palette.color,
    background: palette.bg,
    border: `0.5px solid ${palette.border}`,
    borderRadius: 8,
    padding: "8px 12px",
  };
}
