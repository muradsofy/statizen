# /public/geo

`regions.json` — 14 economic-region SVG paths (viewBox `0 0 1512 1184`),
extracted from the Figma design (vault ADR 0009). Pre-projected design-space
geometry — **not** GeoJSON, no d3-geo. Region IDs are canonical (vault
ADR 0008), owner-confirmed.

Regenerate: extract via Figma plugin → `etl/geo/figma/{assemble,named,emit}.py`.

No rayon geometry here (open question #2). `etl/rayon_membership.json` holds
the source-traced rayon→region grouping for a future rayon layer.
