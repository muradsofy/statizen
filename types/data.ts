// Canonical TS types matching the JSON shapes in /data.
// Shapes per PROJECT.md §"ETL design"; `scope`/`source` per vault ADR 0004
// (national-context layer architected now, populated in Phase 2).

// 14 economic regions — authoritative source has 14, not the 11 in
// PROJECT.md. See vault ADR 0008 (supersedes ADR 0006).
export type RegionId =
  | "baki"
  | "nakhchivan"
  | "absheron-xizi"
  | "mountain-shirvan"
  | "ganja-dashkesen"
  | "karabakh"
  | "gazakh-tovuz"
  | "guba-khachmaz"
  | "lankaran-astara"
  | "central-aran"
  | "mil-mughan"
  | "shaki-zaqatala"
  | "east-zangezur"
  | "shirvan-salyan";

export type Locale = "en" | "az";

/** A geographic/statistical scope a value can belong to. */
export type Scope = "region" | "national";

export interface Region {
  id: RegionId;
  name_en: string;
  name_az: string;
  /** [lon, lat] for label placement / map centring. */
  centroid: [number, number];
  /** Official administrative code. */
  code: string;
}

export interface Indicator {
  id: string;
  label_en: string;
  label_az: string;
  /** e.g. "%", "persons", "manat". */
  unit: string;
  /** Origin file/dataset this indicator was parsed from. */
  source_file: string;
  /** ISO date string of the source's last update. */
  last_updated: string;
}

/** Optional sex breakdown carried when the source provides it. */
export interface ValueBreakdown {
  male?: number;
  female?: number;
  total: number;
}

export interface ValueRow {
  /** RegionId when scope==="region"; a country code (e.g. "AZ") when "national". */
  region_id: string;
  indicator_id: string;
  year: number;
  value: number;
  breakdown?: ValueBreakdown;
  /** Phase 1: always "region". Phase 2 adds "national". */
  scope: Scope;
  /** Provenance, e.g. "stat.gov.az". Distinguishes future API feeds. */
  source: string;
}

export interface RegionsFile {
  regions: Region[];
}

export interface IndicatorsFile {
  indicators: Indicator[];
}

export interface ValuesFile {
  values: ValueRow[];
}

/** One region's pre-projected SVG path (Figma design space, not geo). */
export interface RegionGeo {
  id: RegionId;
  name_en: string;
  name_az: string;
  /** SVG path data, absolute coords in the file's viewBox. */
  d: string;
  /** Label/centroid point in viewBox coords. */
  cx: number;
  cy: number;
  /** Originating Figma node id (provenance). */
  source_node: string;
}

export interface GeoFile {
  viewBox: string;
  width: number;
  height: number;
  source: string;
  regions: RegionGeo[];
}
