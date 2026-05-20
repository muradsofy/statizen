// Tiny wrapper around web-haptics. Single module-scope instance so any
// component can fire `haptic("selection")` without re-instantiating.
//
// On unsupported devices (most desktops, some browsers) the underlying
// trigger is a no-op — no guard needed at call sites.

"use client";

import { WebHaptics } from "web-haptics";

type Pattern =
  | "selection"
  | "light"
  | "medium"
  | "heavy"
  | "soft"
  | "rigid"
  | "success"
  | "warning"
  | "error"
  | "nudge"
  | "buzz";

let _instance: WebHaptics | null = null;

function getInstance(): WebHaptics | null {
  if (typeof window === "undefined") return null;
  if (!_instance) {
    try {
      _instance = new WebHaptics();
    } catch {
      _instance = null;
    }
  }
  return _instance;
}

/**
 * Fire a haptic pattern. Safe to call on every interaction — no-ops on
 * desktop / unsupported browsers. Patterns map to web-haptics presets:
 *   - "selection" — soft tick (year scrub, dropdown pick)
 *   - "light"     — gentle tap (locale toggle)
 *   - "medium"    — thump (region tap)
 *   - "heavy"     — strong tap
 */
export function haptic(pattern: Pattern = "selection"): void {
  getInstance()?.trigger(pattern);
}
