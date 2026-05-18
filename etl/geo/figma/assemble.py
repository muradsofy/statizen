"""Assemble the 14 Figma region paths into one SVG for identification.

Reads b1.json + b2.json, emits ident.svg (each region a distinct color +
node-id label) and combined.json (all 14, frame-space). No region naming
here — identification is done visually from the render (Rule 01: no guessing).
"""
import json
from pathlib import Path

HERE = Path(__file__).parent
b1 = json.loads((HERE / "b1.json").read_text())
b2 = json.loads((HERE / "b2.json").read_text())
W, H = b1["frameW"], b1["frameH"]
regions = b1["regions"] + b2["regions"]
assert len(regions) == 14, len(regions)

COLORS = ["#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231", "#911eb4",
          "#46f0f0", "#f032e6", "#bcf60c", "#fabebe", "#008080", "#e6beff",
          "#9a6324", "#fffac8"]

paths, labels = [], []
for i, r in enumerate(regions):
    paths.append(
        f'<path transform="translate({r["x"]} {r["y"]})" d="{r["d"]}" '
        f'fill="{COLORS[i]}" stroke="#222" stroke-width="1"/>')
    short = r["id"].split(":")[1] if r["name"] == "Union" else r["name"]
    labels.append(
        f'<text x="{r["cx"]}" y="{r["cy"]}" font-size="22" font-family="sans-serif" '
        f'font-weight="700" fill="#000" text-anchor="middle" '
        f'paint-order="stroke" stroke="#fff" stroke-width="4">{short}</text>')

svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" '
       f'width="{W}" height="{H}"><rect width="{W}" height="{H}" fill="#cfe8f5"/>'
       + "".join(paths) + "".join(labels) + "</svg>")
(HERE / "ident.svg").write_text(svg)
(HERE / "combined.json").write_text(json.dumps(
    {"frameW": W, "frameH": H, "regions": regions}, ensure_ascii=False))
print(f"wrote ident.svg ({len(svg)} bytes), 14 regions")
for r in regions:
    print(f'  {r["id"]:8s} {r["name"]:6s} cx={r["cx"]:4d} cy={r["cy"]:4d} '
          f'x={r["x"]:4d} y={r["y"]:4d} w={r["w"]:3d} h={r["h"]:3d}')
