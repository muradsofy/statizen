# /public/geo

`regions.geojson` (Phase 1) and `rayons.geojson` (Phase 2) are **not generated
yet** — placeholder intentionally omitted. Fabricating geometry would violate
vault Rule 01 (no synthetic data). This is blocker **B3**: the one-time GADM
admin-2 → mapshaper → assign `region_id` (~66 rayons) → dissolve → simplify
(<50KB) step, done in build Phase 2.
