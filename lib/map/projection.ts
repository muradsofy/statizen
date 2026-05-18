// d3-geo projection setup. Stub — implemented in build Phase 2.

import { geoMercator, type GeoProjection } from "d3-geo";

export function createAzerbaijanProjection(
  _width: number,
  _height: number,
): GeoProjection {
  // Phase 2: fit geoMercator() to the regions GeoJSON + viewport.
  return geoMercator();
}
