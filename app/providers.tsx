"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";

// PostHog public project key + host. `NEXT_PUBLIC_*` is inlined at build
// time. The key is *public* (visible in any client bundle), so the
// hardcoded prod fallback is fine and avoids hidden-env-var deploy
// footguns. Override via env for staging / preview deployments that
// should not pollute prod analytics with their traffic.
const POSTHOG_KEY =
  process.env.NEXT_PUBLIC_POSTHOG_KEY ||
  "phc_u5cNsVQGhCFtEW98uPbkuioxqTYprQnShbnTLkz6VEnX";
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com";

// Match the previous Umami gating: analytics only loads in production,
// never in `next dev`.
const POSTHOG_ENABLED =
  process.env.NODE_ENV === "production" && POSTHOG_KEY.length > 0;

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!POSTHOG_ENABLED) return;
    if (posthog.__loaded) return;
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      // SPA route changes here are driven by `history.replaceState` (URL
      // params for region/indicator/lang), which posthog-js captures
      // when this option is on.
      capture_pageview: "history_change",
      capture_pageleave: true,
      person_profiles: "identified_only",
    });
  }, []);

  if (!POSTHOG_ENABLED) return <>{children}</>;
  return <PHProvider client={posthog}>{children}</PHProvider>;
}
