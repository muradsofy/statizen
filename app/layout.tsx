import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${archivo.variable} antialiased`}
        style={{
          margin: 0,
          background: "#000000",
          color: "#ffffff",
          fontFamily: "var(--font-archivo), sans-serif",
          fontVariationSettings: "'wdth' 100",
        }}
      >
        {children}
      </body>
    </html>
  );
}
