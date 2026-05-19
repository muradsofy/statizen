"use client";

import { surface, color } from "@/lib/ui/tokens";

// Target is open question B4 #3 (X / GitHub / both) — render the pill now,
// wire the href once the owner decides. Not a dead link in the meantime.
export function FollowUs() {
  return (
    <button
      type="button"
      aria-label="Follow us (link coming soon)"
      title="Coming soon"
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
      Follow us
    </button>
  );
}
