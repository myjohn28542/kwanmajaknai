import type { HotspotPoint, TambonSummary } from "./types";

export const DEFAULT_TAMBON = "TH570101"; // ต.เวียง อ.เมืองเชียงราย
const STORAGE_KEY = "kwan.tambon";

// ---------- search ----------

const strip = (s: string) => s.toLowerCase().replace(/\s+/g, "").replace(/^(ต\.|ตำบล|อ\.|อำเภอ)/, "");

/** Tambons matching a query by Thai/English tambon or amphoe name; tambon-name hits first. */
export function searchTambons(list: TambonSummary[], query: string, limit = 30): TambonSummary[] {
  const q = strip(query);
  if (!q) return list.slice(0, limit);
  const byName: TambonSummary[] = [];
  const byAmphoe: TambonSummary[] = [];
  for (const t of list) {
    if (strip(t.name_th).includes(q) || strip(t.name_en).includes(q)) byName.push(t);
    else if (strip(t.amphoe_th).includes(q)) byAmphoe.push(t);
  }
  return [...byName, ...byAmphoe].slice(0, limit);
}

// ---------- geo ----------

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = Math.PI / 180;
  const a =
    Math.sin(((lat2 - lat1) * r) / 2) ** 2 +
    Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lon2 - lon1) * r) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(a));
}

export function nearestTambon(list: TambonSummary[], lat: number, lon: number): TambonSummary | null {
  let best: TambonSummary | null = null;
  let bestD = Infinity;
  for (const t of list) {
    const d = haversineKm(lat, lon, t.lat, t.lon);
    if (d < bestD) [best, bestD] = [t, d];
  }
  return best;
}

/**
 * Hotspots as seen from a snapshot `offsetH` hours before the latest one: only fires
 * detected by then, with ages re-based to that snapshot, within `maxAgeH`.
 */
export function hotspotsAt(points: HotspotPoint[], offsetH: number, maxAgeH = 72): HotspotPoint[] {
  const out: HotspotPoint[] = [];
  for (const [lon, lat, frp, age] of points) {
    const a = age - offsetH;
    if (a >= 0 && a <= maxAgeH) out.push([lon, lat, frp, a]);
  }
  return out;
}

// ---------- time ----------

const MONTHS = "ม.ค. ก.พ. มี.ค. เม.ย. พ.ค. มิ.ย. ก.ค. ส.ค. ก.ย. ต.ค. พ.ย. ธ.ค.".split(" ");

/** "20 พ.ย. 06:00" in Bangkok time, independent of the viewer's timezone. */
export function thaiTime(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 7 * 3600_000);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${hh}:${mm}`;
}

export function hoursBetween(laterIso: string, earlierIso: string): number {
  return Math.round((new Date(laterIso).getTime() - new Date(earlierIso).getTime()) / 3600_000);
}

// ---------- PM2.5 (Thai PCD bands, µg/m³, 2023 standard) ----------

export type PmLevel = { label: string; color: string; ink: string };

export function pmLevel(v: number | null): PmLevel | null {
  if (v == null) return null;
  if (v <= 15) return { label: "ดีมาก", color: "#3b9ddd", ink: "#fff" };
  if (v <= 25) return { label: "ดี", color: "#4caf50", ink: "#fff" };
  if (v <= 37.5) return { label: "ปานกลาง", color: "#f2c94c", ink: "#3a2f00" };
  if (v <= 75) return { label: "เริ่มมีผลกระทบต่อสุขภาพ", color: "#f2994a", ink: "#3a1d00" };
  return { label: "มีผลกระทบต่อสุขภาพ", color: "#d64545", ink: "#fff" };
}

// ---------- share / url ----------

export function tambonUrl(origin: string, id: string): string {
  return `${origin}/t/${id}`;
}

export function lineShareUrl(text: string, url: string): string {
  return `https://line.me/R/share?text=${encodeURIComponent(`${text}\n${url}`)}`;
}

export function facebookShareUrl(url: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

/** Tambon id from /t/{id}, ?tambon={id}, or null. */
export function tambonFromLocation(pathname: string, search: string): string | null {
  const m = pathname.match(/\/t\/(TH\d{6})(?:\.html)?\/?$/);
  if (m) return m[1];
  const q = new URLSearchParams(search).get("tambon");
  return q && /^TH\d{6}$/.test(q) ? q : null;
}

export const MODE_KEY = "kwan.mapMode";

export function loadSaved(key = STORAGE_KEY): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function save(value: string, key = STORAGE_KEY): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode / blocked storage: just don't remember */
  }
}
