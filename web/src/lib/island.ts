// Pure helpers for the floating-island card: how dusty it looks and where the wind is from.
import { bearingDeg } from "./geo3d";

/** 0..4 following the Thai PCD PM2.5 bands (same cut points as pmLevel). */
export function pmIndex(v: number | null): number {
  if (v == null) return 1;
  if (v <= 15) return 0;
  if (v <= 25) return 1;
  if (v <= 37.5) return 2;
  if (v <= 75) return 3;
  return 4;
}

const COMPASS = [
  "เหนือ",
  "ตะวันออกเฉียงเหนือ",
  "ตะวันออก",
  "ตะวันออกเฉียงใต้",
  "ใต้",
  "ตะวันตกเฉียงใต้",
  "ตะวันตก",
  "ตะวันตกเฉียงเหนือ",
];

export function compass8(bearing: number): string {
  return COMPASS[Math.round((((bearing % 360) + 360) % 360) / 45) % 8];
}

/**
 * Bearing the air arrived FROM, using the trajectory position `hours` back
 * (trajectory[0] is the tambon). Null when there is no usable trajectory.
 */
export function windFromBearing(trajectory: [number, number][], hours = 3): number | null {
  if (trajectory.length < 2) return null;
  const k = Math.min(hours, trajectory.length - 1);
  const [a, b] = [trajectory[0], trajectory[k]];
  if (a[0] === b[0] && a[1] === b[1]) return null;
  return bearingDeg(a, b);
}

/** Number of floating dust specks for a PM2.5 value (a few even on clean days). */
export function dustCount(v: number | null): number {
  const x = Math.max(v ?? 10, 0);
  return Math.round(Math.min(6 + x * 1.6, 160));
}

/** Opacity of the haze layer over the island: clear below ~12 µg/m³, thick past ~90. */
export function hazeOpacity(v: number | null): number {
  const x = v ?? 10;
  return Math.round(Math.min(Math.max((x - 12) / 100, 0), 0.78) * 100) / 100;
}

export type Sky = { top: string; bottom: string; haze: string; dust: string };

/** Sky gradient, haze and dust colours per PM band: blue → pale → yellow-grey → orange-brown. */
export const SKIES: Sky[] = [
  { top: "#5fb4f0", bottom: "#dff1fd", haze: "#ffffff", dust: "#ffffff" },
  { top: "#86bfe6", bottom: "#eaf3f8", haze: "#f1f5f9", dust: "#e2e8f0" },
  { top: "#a9b8c2", bottom: "#efe9dc", haze: "#e7dfcf", dust: "#cbbfa8" },
  { top: "#b99a74", bottom: "#ecd9b8", haze: "#d9bf98", dust: "#a88a63" },
  { top: "#7c5b45", bottom: "#d4a77c", haze: "#b98c66", dust: "#7a5a43" },
];

export function trend(now: number | null, before: number | null): "up" | "down" | "flat" | null {
  if (now == null || before == null) return null;
  if (now - before >= 3) return "up";
  if (before - now >= 3) return "down";
  return "flat";
}
