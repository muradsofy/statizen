"""Generate /public/og.png (1200x630) from the live geometry + wordmark.
One-off; re-run if the brand or geometry changes."""
import base64
import json
import subprocess
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
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
# Brand mark above the wordmark. Same PNG as android-chrome-512x512;
# kept alongside this script so the OG render is hermetic (no fetch
# at build time). Embedded as base64 because rsvg-convert resolves
# <image href="..."> URIs relative to the SVG's CWD, which is brittle.
logo_b64 = base64.b64encode((SCRIPT_DIR / "logo.png").read_bytes()).decode()
logo_uri = f"data:image/png;base64,{logo_b64}"
LOGO_SIZE = 80
LOGO_X = 80
LOGO_Y = 120
svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
  <rect width="{W}" height="{H}" fill="#000"/>
  <g transform="translate({tx} {ty}) scale({scale})">{paths}</g>
  <image x="{LOGO_X}" y="{LOGO_Y}" width="{LOGO_SIZE}" height="{LOGO_SIZE}" href="{logo_uri}"/>
  <text x="80" y="300" font-family="Archivo, Inter, system-ui, sans-serif"
    font-size="96" font-weight="600" fill="#ffffff"
    style="letter-spacing:-2px">Statizen</text>
  <text x="80" y="352" font-family="Archivo, Inter, system-ui, sans-serif"
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
