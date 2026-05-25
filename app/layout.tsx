import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";
import { PostHogProvider } from "./providers";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

const SITE_URL = "https://statizen.space";
const SITE_TITLE = "Statizen — Azerbaijan regional statistics";
const SITE_DESCRIPTION =
  "Interactive map of Azerbaijan's regional statistics — demography, labour market, health, crime, and trade across the 14 economic regions. Source: stat.gov.az.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    type: "website",
    url: SITE_URL,
    siteName: "Statizen",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Statizen" }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/og.png"],
  },
};

/**
 * Pre-hydration theme bootstrap. Runs in the document <head> BEFORE
 * React mounts, so the very first paint already has the right
 * data-theme attribute (no flash of dark on light, or vice-versa).
 * The full theming hook (lib/ui/useTheme) takes over after mount and
 * keeps things in sync with localStorage / prefers-color-scheme.
 */
const themeBootstrap = `
(function() {
  try {
    var s = localStorage.getItem('statizen.theme');
    var t = (s === 'light' || s === 'dark' || s === 'system') ? s : 'system';
    var resolved = t;
    if (t === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: light)').matches
        ? 'light' : 'dark';
    }
    document.documentElement.dataset.theme = resolved;
  } catch (e) {
    document.documentElement.dataset.theme = 'dark';
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: the bootstrap script intentionally
    // rewrites data-theme before React hydrates, so the SSR'd value
    // ("dark") won't match the client. That's expected — the warning
    // would otherwise fire on every page load for every user.
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body
        className={`${archivo.variable} antialiased`}
        style={{
          margin: 0,
          background: "var(--c-bg)",
          color: "var(--c-text)",
          fontFamily: "var(--font-archivo), sans-serif",
          fontVariationSettings: "'wdth' 100",
          // Smooth theme flips — no flicker, no per-component animation
          // needed (CSS vars cascade).
          transition: "background-color 200ms ease, color 200ms ease",
        }}
      >
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
