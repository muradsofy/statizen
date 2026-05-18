"""Render the 14 regions labeled with canonical name_en for visual verification."""
import json
from pathlib import Path

HERE = Path(__file__).parent
ROOT = HERE.parents[2]
comb = json.loads((HERE / "combined.json").read_text())
mp = json.loads((HERE / "mapping.json").read_text())
regs = json.loads((ROOT / "data" / "regions.json").read_text())["regions"]
name_en = {r["id"]: r["name_en"] for r in regs}
W, H = comb["frameW"], comb["frameH"]

COLORS = ["#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231", "#911eb4",
          "#46f0f0", "#f032e6", "#bcf60c", "#fabebe", "#008080", "#e6beff",
          "#9a6324", "#fffac8"]
parts, labels = [], []
for i, r in enumerate(comb["regions"]):
    rid = mp.get(r["id"], "?")
    parts.append(f'<path transform="translate({r["x"]} {r["y"]})" d="{r["d"]}" '
                 f'fill="{COLORS[i]}" stroke="#222" stroke-width="1"/>')
    labels.append(
        f'<text x="{r["cx"]}" y="{r["cy"]}" font-size="20" font-family="sans-serif" '
        f'font-weight="700" fill="#000" text-anchor="middle" paint-order="stroke" '
        f'stroke="#fff" stroke-width="4">{name_en.get(rid, rid)}</text>')
svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" '
       f'width="{W}" height="{H}"><rect width="{W}" height="{H}" fill="#cfe8f5"/>'
       + "".join(parts) + "".join(labels) + "</svg>")
(HERE / "named.svg").write_text(svg)
print("wrote named.svg")
