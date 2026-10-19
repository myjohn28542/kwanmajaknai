import type { Hotspots, Index, TambonDoc } from "./types";

async function get<T>(path: string): Promise<T> {
  const r = await fetch(path, { cache: "no-cache" });
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return r.json() as Promise<T>;
}

export const loadIndex = () => get<Index>("/data/index.json");
export const loadHotspots = () => get<Hotspots>("/data/hotspots.json");
export const loadTambon = (id: string) => get<TambonDoc>(`/data/${id}.json`);

const COUNTRY_HUE: Record<string, string[]> = {
  THA: ["#c2410c", "#ea580c", "#fb923c", "#fdba74", "#fed7aa"],
  MMR: ["#6d28d9", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe"],
  LAO: ["#0f766e", "#14b8a6", "#5eead4", "#99f6e4", "#ccfbf1"],
};
const OTHER = ["#475569", "#64748b", "#94a3b8"];
export const OTHER_COLOR = "#cbd5e1";

/** Bar colour per region: hue by country, lighter for each further region of that country. */
export function regionColors(countries: string[]): string[] {
  const used: Record<string, number> = {};
  return countries.map((c) => {
    const pal = COUNTRY_HUE[c] ?? OTHER;
    const i = used[c] ?? 0;
    used[c] = i + 1;
    return pal[Math.min(i, pal.length - 1)];
  });
}
