/**
 * Named spring presets used across the app. Pick the one that matches
 * the *intent* of the transition, not its current feel — that way if
 * we re-tune one preset later, every motion of that intent updates.
 *
 * Stiffness/damping/mass numbers picked to match Figma's "smooth" /
 * "snap" defaults plus the iOS rubber-band feel:
 *
 *   selectZoom   — long, gentle zoom into a region (~450 ms perceived)
 *   deselect     — slightly faster ease back to the country (~350 ms)
 *   snapBack     — quick rubber-band recovery after a clamped gesture
 *   panClamp     — short, snappy re-clamp after pan overshoots
 *   instant      — zero-duration tween for `prefers-reduced-motion`
 */
export const spring = {
  selectZoom: {
    type: "spring" as const,
    stiffness: 140,
    damping: 24,
    mass: 0.7,
  },
  deselect: {
    type: "spring" as const,
    stiffness: 180,
    damping: 26,
    mass: 0.6,
  },
  snapBack: {
    type: "spring" as const,
    stiffness: 220,
    damping: 26,
    mass: 0.5,
  },
  panClamp: {
    type: "spring" as const,
    stiffness: 280,
    damping: 28,
    mass: 0.4,
  },
  instant: { duration: 0 },
} as const;

export type SpringPreset = keyof typeof spring;
