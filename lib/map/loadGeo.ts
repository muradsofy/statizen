// Typed access to the static map geometry (14 region SVG paths).
// Source: Figma design (see vault ADR 0009). Pre-projected — no d3-geo.

import geo from "@/public/geo/regions.json";
import type { GeoFile } from "@/types/data";

export const regionsGeo = geo as GeoFile;
