"""Build region topology from the existing Figma-sourced SVG paths.

Each region in `public/geo/regions.json` carries an `d` attribute (the SVG
path) that was drawn independently in Figma — adjacent regions don't share
vertex identities at their boundaries, so the same physical edge has slightly
different coordinates on each side. Rendered, that produces the sub-pixel
gaps / doubled strokes the user reported as "borders don't match".

This script converts every region's path into a flat polygon (sampling cubic
Béziers into short polylines), then uses the `topojson` library to build a
proper topology where shared edges are stored ONCE. The resulting
`regions.topo.json` is consumed at runtime by `topojson-client.mesh()` to
produce two single SVG paths — interior edges and the country outline —
each drawn exactly once.

See ADR 0021 (forthcoming) for the design rationale.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Iterable

from svgpathtools import parse_path, Line, CubicBezier, QuadraticBezier, Arc
import topojson as tp

REGIONS_PATH = Path(__file__).parents[1] / "public" / "geo" / "regions.json"
OUT_PATH = Path(__file__).parents[1] / "public" / "geo" / "regions.topo.json"

# Number of samples per cubic / quadratic Bézier including the endpoint. Six
# is enough that polylines are visually indistinguishable from the original
# curves at any zoom the map supports (~3× pinch); bumping higher only
# inflates topology size with no perceptible visual gain.
CURVE_SAMPLES = 6

# Vertex-clustering tolerance (viewBox units). The Figma source has each
# region drawn as an independent path, so a shared edge between A and B
# has slightly *different* coordinates on each side — measured drift sits
# in dense clusters at 1.0u and 1.4u (≈ √2, diagonal moves on a 1u grid).
# Union-find any cross-region vertices within this radius into a single
# representative point before topology extraction; topojson then sees
# bitwise-identical coordinates on shared edges and produces ONE arc per
# edge instead of two near-parallel ones.
#
# 2.5u over a ~1500u-wide viewBox = 0.17% precision loss, well below any
# visible threshold at the zoom levels the map supports (≤ 3× pinch).
# Tighter values (≤2.0) leave too many micro-arcs in the mesh — the
# Figma source has digitization drift in the 0–2u range so we need
# to be inclusive to coalesce them all. Topology fragments that still
# slip through are dropped at runtime via MIN_ARC_LENGTH.
SNAP_TOLERANCE = 2.5

# Topology pre-quantisation kept conservative — the clustering pass above
# already coalesces drift, so this is just floating-point hygiene.
QUANTIZATION = 100_000

# Region IDs whose source SVG `d` carries small spurious subpaths
# (inner-ring artefacts from the Figma drawing, not real exclaves).
# For these, keep only the LARGEST subpath; the others are dropped.
# Baki, Absheron-Xizi, Shirvan-Salyan have multiple subpaths too,
# but those represent real Caspian islands / outlying territory and
# are kept.
ARTIFACT_FILTER = {"karabakh", "gazakh-tovuz"}


def _sample_segment(seg) -> Iterable[tuple[float, float]]:
    """Yield points along a segment (excluding the start, including the end)."""
    if isinstance(seg, Line):
        yield (seg.end.real, seg.end.imag)
        return
    if isinstance(seg, (CubicBezier, QuadraticBezier, Arc)):
        for i in range(1, CURVE_SAMPLES + 1):
            t = i / CURVE_SAMPLES
            p = seg.point(t)
            yield (p.real, p.imag)
        return
    # Fallback for anything unexpected — just take the endpoint.
    yield (seg.end.real, seg.end.imag)


def flatten_path(d: str) -> list[list[tuple[float, float]]]:
    """Convert an SVG path `d` string into one or more closed coordinate rings.

    Regions with multiple `M…Z` subpaths (e.g. islands) produce one ring
    per subpath. Curves are flattened to polylines via `_sample_segment`.
    """
    path = parse_path(d)
    rings: list[list[tuple[float, float]]] = []
    for subpath in path.continuous_subpaths():
        if not subpath:
            continue
        ring: list[tuple[float, float]] = [(subpath[0].start.real, subpath[0].start.imag)]
        for seg in subpath:
            for pt in _sample_segment(seg):
                ring.append(pt)
        # GeoJSON Polygon rings must close back on themselves.
        if ring[0] != ring[-1]:
            ring.append(ring[0])
        rings.append(ring)
    return rings


def feature_for(region: dict) -> dict:
    rings = flatten_path(region["d"])

    # Specific regions carry small artefact subpaths from the Figma
    # source (visible as tiny rings inside the main territory). Strip
    # them down to just the largest subpath.
    if region["id"] in ARTIFACT_FILTER and len(rings) > 1:
        rings = [max(rings, key=len)]

    if len(rings) == 1:
        geometry = {"type": "Polygon", "coordinates": [rings[0]]}
    else:
        # Multiple disjoint subpaths in the same region → MultiPolygon.
        geometry = {
            "type": "MultiPolygon",
            "coordinates": [[r] for r in rings],
        }
    return {
        "type": "Feature",
        "id": region["id"],
        "properties": {"id": region["id"]},
        "geometry": geometry,
    }


def _snap_vertices(features: list[dict], tolerance: float) -> int:
    """Cluster every vertex across every ring into groups within `tolerance`
    units and replace each vertex with its cluster's centroid. Mutates
    `features` in place. Returns the number of clusters formed.

    Uses union-find with grid bucketing so neighbour lookup is O(1) per
    point — runs in O(n) for n vertices regardless of how clustered they
    are. Buckets are sized = `tolerance`, so any pair within the snap
    radius lives in either the same bucket or one of the eight neighbours.
    """
    # Walk every ring and collect (feature_idx, ring_path, vertex_idx, x, y).
    # Vertices appear once per occurrence — a ring's closing duplicate of
    # the first point is included so it snaps consistently with the first.
    refs: list[tuple] = []  # (feat_i, ring_ref, vert_i, x, y)
    for fi, feat in enumerate(features):
        geom = feat["geometry"]
        if geom["type"] == "Polygon":
            for ri, ring in enumerate(geom["coordinates"]):
                for vi, (x, y) in enumerate(ring):
                    refs.append((fi, (geom["coordinates"], ri), vi, x, y))
        else:  # MultiPolygon
            for pi, poly in enumerate(geom["coordinates"]):
                for ri, ring in enumerate(poly):
                    for vi, (x, y) in enumerate(ring):
                        refs.append((fi, (poly, ri), vi, x, y))

    n = len(refs)
    parent = list(range(n))

    def find(i: int) -> int:
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    def union(i: int, j: int) -> None:
        ri, rj = find(i), find(j)
        if ri != rj:
            parent[ri] = rj

    # Bucket every point. Two points within `tolerance` lie in the same
    # bucket or in one of the 8 surrounding buckets.
    from collections import defaultdict
    buckets: dict[tuple[int, int], list[int]] = defaultdict(list)
    for i, (_, _, _, x, y) in enumerate(refs):
        buckets[(int(x // tolerance), int(y // tolerance))].append(i)

    tol_sq = tolerance * tolerance
    for (bx, by), idxs in buckets.items():
        # Compare against this bucket + the 4 forward-neighbour buckets
        # (covers all 8 neighbours via the symmetric iteration order).
        neighbours = [idxs]
        for dx, dy in ((1, -1), (1, 0), (1, 1), (0, 1)):
            other = buckets.get((bx + dx, by + dy))
            if other:
                neighbours.append(other)
        flat = [i for grp in neighbours for i in grp]
        # Compare every pair within the merged neighbourhood.
        for a_pos, ia in enumerate(idxs):
            xa, ya = refs[ia][3], refs[ia][4]
            for ib in flat[a_pos + 1:]:
                xb, yb = refs[ib][3], refs[ib][4]
                dx = xa - xb
                dy = ya - yb
                if dx * dx + dy * dy <= tol_sq:
                    union(ia, ib)

    # Centroid per cluster, then rewrite every vertex with its centroid.
    sums: dict[int, list[float]] = {}
    for i, (_, _, _, x, y) in enumerate(refs):
        root = find(i)
        s = sums.get(root)
        if s is None:
            sums[root] = [x, y, 1]
        else:
            s[0] += x
            s[1] += y
            s[2] += 1
    centroids = {r: (s[0] / s[2], s[1] / s[2]) for r, s in sums.items()}

    for i, (_fi, (parent_list, ri), vi, _x, _y) in enumerate(refs):
        cx, cy = centroids[find(i)]
        parent_list[ri][vi] = (cx, cy)

    return len(centroids)


def main() -> None:
    src = json.loads(REGIONS_PATH.read_text())
    features = [feature_for(r) for r in src["regions"]]

    raw_vertices = sum(
        len(r)
        for f in features
        for r in (
            f["geometry"]["coordinates"]
            if f["geometry"]["type"] == "Polygon"
            else [r for poly in f["geometry"]["coordinates"] for r in poly]
        )
    )
    clusters = _snap_vertices(features, SNAP_TOLERANCE)
    print(
        f"  snap: {raw_vertices} vertices → {clusters} unique points "
        f"(ε = {SNAP_TOLERANCE}u, dedup ratio {clusters / raw_vertices:.2%})"
    )

    fc = {"type": "FeatureCollection", "features": features}

    topo = tp.Topology(
        fc,
        prequantize=QUANTIZATION,
        # Don't simplify — we want every original vertex preserved so the
        # mesh follows the exact perimeter. Coalescing is what we're after,
        # not coordinate reduction.
        presimplify=False,
        # Identify shared arcs by exact equality (after quantisation).
        shared_coords=True,
    )

    out = json.loads(topo.to_json())
    OUT_PATH.write_text(json.dumps(out, separators=(",", ":")) + "\n")

    arcs = len(out.get("arcs", []))
    print(f"  {len(features)} regions, {raw_vertices} raw vertices → "
          f"{arcs} unique arcs in topology")
    size_kb = OUT_PATH.stat().st_size / 1024
    print(f"  wrote {OUT_PATH.relative_to(Path(__file__).parents[1])} "
          f"({size_kb:.1f} KB)")


if __name__ == "__main__":
    main()
