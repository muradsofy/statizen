"use client";

import { useAppStore } from "@/lib/state/store";
import { surface, color, glow } from "@/lib/ui/tokens";
import { t } from "@/lib/i18n/strings";
import { haptic } from "@/lib/haptics";
import type { Locale } from "@/types/data";

export function LocaleToggle() {
  const locale = useAppStore((s) => s.locale);
  const setLocale = useAppStore((s) => s.setLocale);

  function Btn({ value, label }: { value: Locale; label: string }) {
    const active = locale === value;
    return (
      <button
        type="button"
        onClick={() => {
          if (!active) haptic("light");
          setLocale(value);
        }}
        aria-pressed={active}
        aria-label={`${label} (${value})`}
        style={{
          background: "transparent",
          border: "none",
          padding: "8px 10px",
          color: active ? color.text : color.muted,
          textShadow: active ? glow : "none",
          fontSize: 14,
          letterSpacing: "-0.28px",
          cursor: "pointer",
          outline: "none",
          borderRadius: 20,
          transition: "color 120ms ease, text-shadow 120ms ease",
        }}
      >
        {label}
      </button>
    );
  }

  return (
    <div
      role="group"
      aria-label={t("localeToggleAria", locale)}
      style={{
        ...surface,
        padding: "0 4px",
        display: "flex",
        alignItems: "center",
      }}
    >
      <Btn value="en" label="EN" />
      <Btn value="az" label="AZ" />
    </div>
  );
}
