// Thin Umami Cloud analytics wrapper. The script is loaded in
// app/layout.tsx only in production builds with a website-id env var
// set; here we just call `window.umami.track(...)` when it's available.
// Calls are no-ops in dev and during SSR.
//
// Umami's custom-events API: `umami.track('Event Name', { ...props })`.
// Event names show up in the dashboard's "Events" tab; props become
// columns under each event. Use stable short names — they're
// string-matched on the server.
//
// Reference: https://umami.is/docs/track-events

type UmamiProps = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    umami?: {
      track: (event: string, props?: UmamiProps) => void;
      identify?: (id: string, props?: UmamiProps) => void;
    };
  }
}

/** Send a custom event. Silently no-ops if Umami isn't loaded (dev mode,
 *  ad-blocked, SSR). Undefined / null prop values are stripped so we
 *  don't pollute the dashboard with "undefined" buckets. */
export function track(event: string, props?: UmamiProps): void {
  if (typeof window === "undefined" || !window.umami) return;
  const cleaned: Record<string, string | number | boolean> = {};
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v !== undefined && v !== null) cleaned[k] = v;
    }
  }
  try {
    window.umami.track(
      event,
      Object.keys(cleaned).length ? cleaned : undefined,
    );
  } catch {
    // Defensive — never let analytics throw into the UI path.
  }
}

// ─────────────────────────────────────────────────────────────────────
// Named event helpers — keep call sites readable + give us a single
// place to rename an event without grepping the codebase.
// ─────────────────────────────────────────────────────────────────────

export const analytics = {
  regionSelected: (regionId: string, source: "map" | "list" | "url") =>
    track("Region selected", { region: regionId, source }),
  indicatorChanged: (indicatorId: string, chapter: string) =>
    track("Indicator changed", { indicator: indicatorId, chapter }),
  yearChanged: (year: number, indicator: string) =>
    track("Year changed", { year, indicator }),
  themeChanged: (theme: "light" | "dark" | "system") =>
    track("Theme changed", { theme }),
  localeChanged: (locale: string) => track("Locale changed", { locale }),
  shareOpened: (region: string, indicator: string) =>
    track("Share opened", { region, indicator }),
  shareDownloaded: (
    kind: "png" | "pdf" | "native",
    format: "post" | "story",
    indicator: string,
  ) => track("Share downloaded", { kind, format, indicator }),
  feedbackOpened: () => track("Feedback opened"),
  feedbackSent: (hasEmail: boolean, length: number) =>
    track("Feedback sent", {
      hasEmail,
      // Bucket message length so the dashboard breakdown stays readable
      // (otherwise every length becomes its own column).
      lengthBucket:
        length < 50 ? "short" : length < 200 ? "medium" : "long",
    }),
};
