// Typed access to the static map geometry.
//
// Two representations are bundled:
//
//   regions.json       — the original Figma-sourced SVG paths, one per
//                        region. Kept for `bbox` metadata + interactive
//                        click-target paths (`d` strings).
//   regions.topo.json  — TopoJSON of the same 14 regions with shared
//                        edges coalesced. Used to render borders as
//                        SINGLE paths (interior + outline meshes) so
//                        each edge is drawn exactly once — fixes the
//                        sub-pixel gaps / doubled strokes the per-region
//                        stroke loop was producing.
//
// See ADR 0009 (paths from Figma, no d3-geo) and the topology pipeline
// in etl/build_topology.py.

import geo from "@/public/geo/regions.json";
import topo from "@/public/geo/regions.topo.json";
import type { GeoFile } from "@/types/data";
import type { Topology, GeometryCollection, MultiPolygon, Polygon } from "topojson-specification";

export const regionsGeo = geo as GeoFile;

/**
 * The region topology. `objects.data` is the GeometryCollection that
 * holds one Polygon / MultiPolygon per region, with arcs referencing
 * `topo.arcs`.
 */
type RegionGeometry = (Polygon | MultiPolygon) & {
  id: string;
  properties: { id: string };
};

export type RegionsTopology = Topology<{
  data: GeometryCollection<RegionGeometry>;
}>;

export const regionsTopo = topo as unknown as RegionsTopology;

/** Convenience accessor for the GeometryCollection key. */
export const REGIONS_COLLECTION = "data" as const;
