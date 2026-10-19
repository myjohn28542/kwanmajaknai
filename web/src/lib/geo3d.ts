// Geometry helpers for the 3D map: fire columns and smoke puffs along the trajectory.

const KM_PER_DEG = 111.32;

/** Square footprint (closed ring) of `halfKm` around a point, for fill-extrusion. */
export function columnPolygon(lon: number, lat: number, halfKm: number): [number, number][][] {
  const dLat = halfKm / KM_PER_DEG;
  const dLon = halfKm / (KM_PER_DEG * Math.cos((lat * Math.PI) / 180));
  return [
    [
      [lon - dLon, lat - dLat],
      [lon + dLon, lat - dLat],
      [lon + dLon, lat + dLat],
      [lon - dLon, lat + dLat],
      [lon - dLon, lat - dLat],
    ],
  ];
}

/** Column height in metres: grows with log FRP so a 300 MW fire does not dwarf the map. */
export function columnHeightM(frp: number): number {
  return Math.round(3000 + 2500 * Math.log1p(Math.max(frp, 0)));
}

/** Position at fraction f∈[0,1] of a polyline's length (equirectangular distances). */
export function pathSampler(coords: [number, number][]): (f: number) => [number, number] {
  if (coords.length === 0) return () => [0, 0];
  if (coords.length === 1) return () => coords[0];
  const cum = [0];
  for (let i = 1; i < coords.length; i++) {
    const [x0, y0] = coords[i - 1];
    const [x1, y1] = coords[i];
    const k = Math.cos((((y0 + y1) / 2) * Math.PI) / 180);
    cum.push(cum[i - 1] + Math.hypot((x1 - x0) * k, y1 - y0));
  }
  const total = cum[cum.length - 1];
  return (f: number) => {
    if (total === 0) return coords[0];
    const d = Math.min(Math.max(f, 0), 1) * total;
    let i = 1;
    while (i < cum.length - 1 && cum[i] < d) i++;
    const seg = cum[i] - cum[i - 1];
    const t = seg === 0 ? 0 : (d - cum[i - 1]) / seg;
    const [x0, y0] = coords[i - 1];
    const [x1, y1] = coords[i];
    return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t];
  };
}

/** `n` evenly spaced puffs shifted by `phase`; f is each puff's fraction along the path. */
export function puffFractions(n: number, phase: number): number[] {
  const p = ((phase % 1) + 1) % 1;
  return Array.from({ length: n }, (_, i) => (i / n + p) % 1);
}

/** Compass bearing in degrees (0 = north, clockwise) from a to b. */
export function bearingDeg(a: [number, number], b: [number, number]): number {
  const k = Math.cos((((a[1] + b[1]) / 2) * Math.PI) / 180);
  const deg = (Math.atan2((b[0] - a[0]) * k, b[1] - a[1]) * 180) / Math.PI;
  return (deg + 360) % 360;
}

/** Interpolate between two bearings along the shorter arc. */
export function lerpBearing(from: number, to: number, t: number): number {
  const d = ((to - from + 540) % 360) - 180;
  return (from + d * t + 360) % 360;
}

/** Smooth 0→1 easing with zero slope at both ends. */
export const smoothstep = (t: number) => {
  const x = Math.min(Math.max(t, 0), 1);
  return x * x * (3 - 2 * x);
};
