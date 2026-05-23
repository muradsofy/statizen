// Tiny GeoJSON → SVG `d` converter for our pre-projected pixel-space
// geometry. We don't need d3-geo (ADR 0009): coordinates are already in
// SVG units, no projection required — just chain M/L commands.

import type {
  Position,
  Polygon,
  MultiPolygon,
  LineString,
  MultiLineString,
} from "geojson";

function ringToD(ring: Position[]): string {
  if (ring.length === 0) return "";
  const [first, ...rest] = ring;
  let d = `M${first[0]} ${first[1]}`;
  for (const p of rest) d += `L${p[0]} ${p[1]}`;
  d += "Z";
  return d;
}

function lineToD(line: Position[]): string {
  if (line.length === 0) return "";
  const [first, ...rest] = line;
  let d = `M${first[0]} ${first[1]}`;
  for (const p of rest) d += `L${p[0]} ${p[1]}`;
  return d;
}

/**
 * Convert a GeoJSON Polygon / MultiPolygon (used for fills) or
 * LineString / MultiLineString (used for meshes) into an SVG `d`
 * string suitable for `<path d={…}>`.
 */
export function geometryToD(
  geom: Polygon | MultiPolygon | LineString | MultiLineString | null | undefined,
): string {
  if (!geom) return "";
  switch (geom.type) {
    case "Polygon":
      return geom.coordinates.map(ringToD).join("");
    case "MultiPolygon":
      return geom.coordinates
        .map((poly) => poly.map(ringToD).join(""))
        .join("");
    case "LineString":
      return lineToD(geom.coordinates);
    case "MultiLineString":
      return geom.coordinates.map(lineToD).join("");
  }
}
