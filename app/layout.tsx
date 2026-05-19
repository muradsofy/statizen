import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

export const metadata: Metadata = {
  title: "Statizen — Azerbaijan Labour Map",
  description:
    "Interactive map of Azerbaijan's labour statistics by economic region. Source: stat.gov.az.",
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
