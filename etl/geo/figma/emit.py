"""Emit public/geo/regions.json from the confirmed Figma extraction.

Bakes each region's translate offset into the path coords (absolute,
viewBox space) so the map component needs no per-path transform.
Source: Figma design (node 24:280), region IDs confirmed by the owner.
"""
import json
import re
from pathlib import Path

HERE = Path(__file__).parent
ROOT = HERE.parents[2]
comb = json.loads((HERE / "combined.json").read_text())
mp = json.loads((HERE / "mapping.json").read_text())
regs = {r["id"]: r for r in
        json.loads((ROOT / "data" / "regions.json").read_text())["regions"]}

W, H = comb["frameW"], comb["frameH"]
NUM = re.compile(r"-?\d+(?:\.\d+)?")


def shift(d, dx, dy):
    """Offset every coordinate pair in an M/L/C/Z path by (dx, dy)."""
    out, i = [], 0
    for tok in re.finditer(r"([MLCZ])([^MLCZ]*)", d):
        cmd, body = tok.group(1), tok.group(2)
        if cmd == "Z":
            out.append("Z")
            continue
        nums = [float(n) for n in NUM.findall(body)]
        pts = []
        for j in range(0, len(nums), 2):
            pts.append(f"{round(nums[j] + dx)} {round(nums[j + 1] + dy)}")
        out.append(cmd + " ".join(pts))
    return "".join(out)


regions = []
seen = set()
for r in comb["regions"]:
    rid = mp[r["id"]]
    assert rid in regs, rid
    assert rid not in seen, f"duplicate region {rid}"
    seen.add(rid)
    regions.append({
        "id": rid,
        "name_en": regs[rid]["name_en"],
        "name_az": regs[rid]["name_az"],
        "d": shift(r["d"], r["x"], r["y"]),
        "cx": r["cx"], "cy": r["cy"],
        "source_node": r["id"],
    })
assert len(regions) == 14, len(regions)
# canonical order
order = list(regs.keys())
regions.sort(key=lambda x: order.index(x["id"]))

# Tight bounding box over all baked region paths (for zoom-to-country).
xs, ys = [], []
for rg in regions:
    nums = [float(n) for n in re.findall(r"-?\d+(?:\.\d+)?", rg["d"])]
    xs += nums[0::2]
    ys += nums[1::2]
bbox = {
    "x": round(min(xs)),
    "y": round(min(ys)),
    "w": round(max(xs) - min(xs)),
    "h": round(max(ys) - min(ys)),
}

out = {"viewBox": f"0 0 {W} {H}", "width": W, "height": H,
       "bbox": bbox,
       "source": "Figma design N6wxEKiXeVu9boXMEvd3qE node 24:280",
       "regions": regions}
dest = ROOT / "public" / "geo" / "regions.json"
dest.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n")
print(f"wrote {dest} : {len(regions)} regions, viewBox {out['viewBox']}, "
      f"{dest.stat().st_size} bytes")
