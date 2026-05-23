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

# Topology pre-quantisation: snaps every coordinate to a grid so adjacent
# regions that *should* share an edge but have sub-pixel differences end up
# with identical points. 1e5 quants over the Figma viewBox (~1500 units
# wide) gives 0.015 px resolution — far below the pixel grid, so visually
# lossless but enough to coalesce floating-point drift.
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


def main() -> None:
    src = json.loads(REGIONS_PATH.read_text())
    features = [feature_for(r) for r in src["regions"]]
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

    # Quick sanity print: how many arcs were extracted vs raw vertex count?
    raw_vertices = sum(len(r) for f in features
                       for r in (f["geometry"]["coordinates"]
                                  if f["geometry"]["type"] == "Polygon"
                                  else [r for poly in f["geometry"]["coordinates"]
                                          for r in poly]))
    arcs = len(out.get("arcs", []))
    print(f"  {len(features)} regions, {raw_vertices} raw vertices → "
          f"{arcs} unique arcs in topology")
    size_kb = OUT_PATH.stat().st_size / 1024
    print(f"  wrote {OUT_PATH.relative_to(Path(__file__).parents[1])} "
          f"({size_kb:.1f} KB)")


if __name__ == "__main__":
    main()
