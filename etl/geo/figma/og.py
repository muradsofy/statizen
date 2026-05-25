"""Generate /public/og.png (1200x630) from the live geometry + wordmark.
One-off; re-run if the brand or geometry changes."""
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).parents[3]
d = json.loads((ROOT / "public/geo/regions.json").read_text())
bb = d["bbox"]
W, H = 1200, 630
# Map block on the right
MAP_W = 560
MAP_X = 600  # left edge of the map block
MAP_Y = 70
scale = min(MAP_W / bb["w"], (H - 140) / bb["h"])
tx = MAP_X - bb["x"] * scale
ty = MAP_Y - bb["y"] * scale
paths = "".join(
    f'<path d="{r["d"]}" fill="rgba(255,255,255,0.06)" stroke="#5f5f5f" '
    f'stroke-width="1" vector-effect="non-scaling-stroke"/>'
    for r in d["regions"]
)
svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
  <rect width="{W}" height="{H}" fill="#000"/>
  <g transform="translate({tx} {ty}) scale({scale})">{paths}</g>
  <text x="80" y="280" font-family="Archivo, Inter, system-ui, sans-serif"
    font-size="96" font-weight="600" fill="#ffffff"
    style="letter-spacing:-2px">Statizen</text>
  <text x="80" y="332" font-family="Archivo, Inter, system-ui, sans-serif"
    font-size="22" fill="rgba(255,255,255,0.55)"
    style="letter-spacing:-0.4px">Azerbaijan regional statistics — 10 chapters, 14 economic regions</text>
  <text x="80" y="566" font-family="Archivo, Inter, system-ui, sans-serif"
    font-size="16" fill="rgba(255,255,255,0.4)"
    style="letter-spacing:-0.2px">Source: stat.gov.az</text>
</svg>'''
src = Path(__file__).parent / "og.svg"
out = ROOT / "public/og.png"
src.write_text(svg)
subprocess.run(
    ["rsvg-convert", "-w", str(W), "-h", str(H), str(src), "-o", str(out)],
    check=True,
)
print(f"wrote {out} ({out.stat().st_size} B)")
