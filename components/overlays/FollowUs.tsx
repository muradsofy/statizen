"use client";

import { surface, color } from "@/lib/ui/tokens";
import { t } from "@/lib/i18n/strings";
import { useAppStore } from "@/lib/state/store";

const LINKEDIN_URL = "https://www.linkedin.com/in/msofiyev/";
const HANDLE = "@sofyzen";

export function FollowUs() {
  const locale = useAppStore((s) => s.locale);
  return (
    <a
      href={LINKEDIN_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${t("followUs", locale)} — ${HANDLE} on LinkedIn`}
      style={{
        ...surface,
        height: 32,
        padding: "0 12px",
        fontSize: 14,
        fontWeight: 500,
        color: color.text,
        letterSpacing: "-0.28px",
        cursor: "pointer",
        whiteSpace: "nowrap",
        textDecoration: "none",
        display: "inline-flex",
        alignItems: "center",
      }}
    >
      {HANDLE}
    </a>
  );
}
