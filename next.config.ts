import type { NextConfig } from "next";

// Vercel hosts Next.js natively and serves our fully-prerendered pages
// (route shown as `○ (Static)` in the build log) directly from its edge —
// no `output: 'export'` needed. If we later host elsewhere (Netlify, S3,
// GH Pages, Cloudflare Pages without Next adapter), re-add `output:
// 'export'` and the build produces `out/`.
const nextConfig: NextConfig = {
  // next/image with optimization needs a server runtime; we don't use
  // <Image> anywhere (only a static <img>/<meta> at /og.png), so this
  // keeps us free of the image-optimization function on any host.
  images: { unoptimized: true },
};

export default nextConfig;
