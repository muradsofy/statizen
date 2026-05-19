import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export (PROJECT.md tech stack). Produces /out at build time.
  output: "export",
  // Static export can't optimize images at request time.
  images: { unoptimized: true },
  // Predictable URLs (no trailing-slash redirects on static hosts).
  trailingSlash: false,
};

export default nextConfig;
