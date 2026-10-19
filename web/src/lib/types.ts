// Shapes of the static JSON written by pipeline/output.py.

export type Region = { key: string; label_th: string; country: string; pct: number };
export type Country = { country: string; name_th: string; pct: number };
export type TopHotspot = {
  lat: number;
  lon: number;
  frp: number;
  age_h: number;
  region: string | null;
  pct: number;
};

export type Snapshot = {
  t: string; // ISO with +07:00
  status: "ok" | "no_signal";
  score: number;
  sentence: string;
  regions: Region[];
  countries: Country[];
  hotspots: TopHotspot[];
  trajectory: [number, number][]; // index k = k hours before t
  pm25: number | null;
};

export type TambonDoc = {
  id: string;
  name_th: string;
  name_en: string;
  amphoe_th: string;
  lat: number;
  lon: number;
  snapshots: Snapshot[]; // newest first
};

export type TambonSummary = {
  id: string;
  name_th: string;
  name_en: string;
  amphoe_th: string;
  lat: number;
  lon: number;
  status: Snapshot["status"] | null;
  top: Region | null;
  pm25: number | null;
};

export type Index = {
  updated_at: string;
  latest_t: string | null;
  times: string[];
  tambons: TambonSummary[];
};

// [lon, lat, frp, age_h] with age relative to `t`
export type HotspotPoint = [number, number, number, number];
export type Hotspots = { t: string; points: HotspotPoint[] };
