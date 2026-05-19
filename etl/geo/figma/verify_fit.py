"""Offline check: render the exact AzerbaijanMap transform for selected
regions to confirm the selected region is fully visible + centered.
Mirrors the component constants (PAD24, FIT_MARGIN .55, SEL 1.3..3.0)."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).parents[3]
d = json.loads((ROOT / "public/geo/regions.json").read_text())
bb = d["bbox"]
PAD = 24
VW, VH = bb["w"] + PAD * 2, bb["h"] + PAD * 2
CX, CY = bb["x"] + bb["w"] / 2, bb["y"] + bb["h"] / 2
VB = f'{bb["x"]-PAD} {bb["y"]-PAD} {VW} {VH}'
regs = {r["id"]: r for r in d["regions"]}


def fit(rw, rh):
    s = min(VW / rw, VH / rh) * 0.55
    return max(1.3, min(3.0, s))


def render(sel):
    r = regs[sel]
    b = r["bbox"]
    tx, ty = b["x"] + b["w"] / 2, b["y"] + b["h"] / 2
    s = fit(b["w"], b["h"])
    trx, tryy = CX - s * tx, CY - s * ty
    paths = []
    for g in d["regions"]:
        fill = "#612bf4" if g["id"] == sel else "#0e0e0e"
        paths.append(
            f'<path d="{g["d"]}" fill="{fill}" '
            f'stroke="rgba(255,255,255,0.12)" stroke-width="1"/>')
    # 1440x900-ish viewport, meet (letterbox), bg black
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="900" '
        f'viewBox="{VB}" preserveAspectRatio="xMidYMid meet">'
        f'<rect x="-9999" y="-9999" width="99999" height="99999" '
        f'fill="#000"/>'
        f'<g transform="translate({trx} {tryy}) scale({s})">'
        + "".join(paths) + "</g></svg>")
    out = Path(__file__).parent / f"fit_{sel}.svg"
    out.write_text(svg)
    print(f"{sel}: s={s:.2f} center=({tx:.0f},{ty:.0f}) -> {out.name}")


for sel in sys.argv[1:]:
    render(sel)
