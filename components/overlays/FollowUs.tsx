"use client";

import { surface, color } from "@/lib/ui/tokens";
import { t } from "@/lib/i18n/strings";
import { useAppStore } from "@/lib/state/store";

// Target is open question B4 #3 — render the pill now, wire the href
// once the owner decides. Not a dead link in the meantime.
export function FollowUs() {
  const locale = useAppStore((s) => s.locale);
  return (
    <button
      type="button"
      aria-label={t("followUs", locale)}
      title={t("followUsComingSoon", locale)}
      style={{
        ...surface,
        padding: "8px 12px",
        fontSize: 14,
        color: color.text,
        letterSpacing: "-0.28px",
        cursor: "default",
        whiteSpace: "nowrap",
      }}
    >
      {t("followUs", locale)}
    </button>
  );
}
