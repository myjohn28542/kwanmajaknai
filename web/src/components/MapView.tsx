import { useEffect, useRef } from "react";
import {
  LngLatBounds,
  Map as MlMap,
  Marker,
  NavigationControl,
  setWorkerUrl,
  type GeoJSONSource,
  type LngLatBoundsLike,
  type RasterDEMSourceSpecification,
} from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import "maplibre-gl/dist/maplibre-gl.css";
import { columnHeightM, columnPolygon, pathSampler, puffFractions } from "../lib/geo3d";
import type { HotspotPoint, Snapshot, TambonSummary } from "../lib/types";

// MapLibre 6 loads its worker from a sibling file next to the module; point it at the
// copy Vite emits into assets/.
setWorkerUrl(workerUrl);

export type MapMode = "2d" | "3d";

const KEY = import.meta.env.VITE_MAPTILER_KEY as string | undefined;
const STYLE = KEY
  ? `https://api.maptiler.com/maps/dataviz/style.json?key=${KEY}`
  : "https://tiles.openfreemap.org/styles/positron";
// Elevation: MapTiler when keyed, else the free Mapzen/Tilezen terrain tiles on AWS Open Data.
const DEM: RasterDEMSourceSpecification = KEY
  ? { type: "raster-dem", url: `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=${KEY}` }
  : {
      type: "raster-dem",
      tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
      encoding: "terrarium",
      tileSize: 256,
      maxzoom: 11, // overzoom beyond this; keeps phone downloads small
      attribution:
        '<a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md" target="_blank">Terrain: Mapzen / AWS</a>',
    };
const CHIANG_RAI: LngLatBoundsLike = [
  [99.2, 19.3],
  [100.65, 20.5],
];
const LABEL_HOURS = [12, 24, 36, 48];
const EXAGGERATION = 1.8;
const PITCH_3D = 55;
const BEARING_3D = -12;
const PUFFS = 14;
const PUFF_CYCLE_MS = 7000;
const AGE_COLOR = ["step", ["get", "age"], "#b91c1c", 6, "#ea580c", 24, "#f59e0b", 48, "#a8a29e"];

type Props = {
  tambons: TambonSummary[];
  selected: TambonSummary | null;
  snapshot: Snapshot | null;
  hotspots: HotspotPoint[];
  mode?: MapMode;
  onPick?: (lat: number, lon: number) => void;
  interactive?: boolean;
  onIdle?: () => void;
};

const empty = (): GeoJSON.FeatureCollection => ({ type: "FeatureCollection", features: [] });
const fc = (features: GeoJSON.Feature[]): GeoJSON.FeatureCollection => ({ type: "FeatureCollection", features });

function arrowImage(): ImageData {
  const s = 24;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const g = c.getContext("2d")!;
  g.strokeStyle = "#1e3a8a";
  g.lineWidth = 3;
  g.lineCap = g.lineJoin = "round";
  g.beginPath();
  g.moveTo(8, 6);
  g.lineTo(16, 12);
  g.lineTo(8, 18);
  g.stroke();
  return g.getImageData(0, 0, s, s);
}

function addLayers(map: MlMap) {
  // Separate DEM sources for terrain and hillshade, as MapLibre recommends.
  map.addSource("dem-terrain", DEM);
  map.addSource("dem-shade", DEM);
  const firstSymbol = map.getStyle().layers.find((l) => l.type === "symbol")?.id;
  map.addLayer(
    {
      id: "hillshade",
      type: "hillshade",
      source: "dem-shade",
      layout: { visibility: "none" },
      paint: { "hillshade-exaggeration": 0.35, "hillshade-shadow-color": "#5b6476" },
    },
    firstSymbol,
  );
  if (!map.hasImage("kwan-arrow")) map.addImage("kwan-arrow", arrowImage());
  for (const id of ["tambons", "hotspots", "columns", "top", "traj", "puffs", "selected"]) {
    map.addSource(id, { type: "geojson", data: empty() });
  }
  map.addLayer({
    id: "tambons",
    type: "circle",
    source: "tambons",
    paint: { "circle-radius": 2.5, "circle-color": "#64748b", "circle-opacity": 0.45 },
  });
  map.addLayer({
    id: "hotspots",
    type: "circle",
    source: "hotspots",
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["get", "frp"], 0, 2.5, 10, 4, 50, 7, 300, 12],
      "circle-color": AGE_COLOR as never,
      "circle-opacity": 0.85,
      "circle-stroke-color": "#fff",
      "circle-stroke-width": 0.6,
    },
  });
  map.addLayer({
    id: "traj-line",
    type: "line",
    source: "traj",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": "#1e3a8a", "line-width": 3, "line-opacity": 0.8 },
  });
  map.addLayer({
    id: "traj-arrows",
    type: "symbol",
    source: "traj",
    layout: {
      "symbol-placement": "line",
      "symbol-spacing": 70,
      "icon-image": "kwan-arrow",
      "icon-size": 0.8,
      "icon-allow-overlap": true,
      "icon-rotation-alignment": "map",
    },
  });
  map.addLayer({
    id: "puffs",
    type: "circle",
    source: "puffs",
    paint: {
      // puffs widen as they travel from the fires toward the tambon, like a spreading plume
      "circle-radius": ["interpolate", ["linear"], ["get", "f"], 0, 4, 1, 13],
      "circle-color": "#334155",
      "circle-opacity": ["interpolate", ["linear"], ["get", "f"], 0, 0.2, 0.15, 0.65, 0.9, 0.55, 1, 0],
      "circle-blur": 0.5,
      "circle-pitch-alignment": "map",
    },
  });
  map.addLayer({
    id: "columns",
    type: "fill-extrusion",
    source: "columns",
    layout: { visibility: "none" },
    paint: {
      "fill-extrusion-color": AGE_COLOR as never,
      "fill-extrusion-height": ["get", "h"],
      "fill-extrusion-base": 0,
      "fill-extrusion-opacity": 0.9,
    },
  });
  map.addLayer({
    id: "top",
    type: "circle",
    source: "top",
    paint: {
      "circle-radius": 9,
      "circle-color": "transparent",
      "circle-stroke-color": "#111827",
      "circle-stroke-width": 2,
    },
  });
  map.addLayer({
    id: "selected",
    type: "circle",
    source: "selected",
    paint: { "circle-radius": 8, "circle-color": "#2563eb", "circle-stroke-color": "#fff", "circle-stroke-width": 3 },
  });
}

function setData(map: MlMap, id: string, data: GeoJSON.FeatureCollection) {
  (map.getSource(id) as GeoJSONSource | undefined)?.setData(data);
}

const point = (lon: number, lat: number, props: Record<string, unknown> = {}): GeoJSON.Feature => ({
  type: "Feature",
  properties: props,
  geometry: { type: "Point", coordinates: [lon, lat] },
});

function applyMode(map: MlMap, mode: MapMode) {
  const is3d = mode === "3d";
  map.setTerrain(is3d ? { source: "dem-terrain", exaggeration: EXAGGERATION } : null);
  map.setLayoutProperty("hillshade", "visibility", is3d ? "visible" : "none");
  map.setLayoutProperty("columns", "visibility", is3d ? "visible" : "none");
  map.setLayoutProperty("hotspots", "visibility", is3d ? "none" : "visible");
}

const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

export function MapView({
  tambons,
  selected,
  snapshot,
  hotspots,
  mode = "2d",
  onPick,
  interactive = true,
  onIdle,
}: Props) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const ready = useRef(false);
  const labels = useRef<Marker[]>([]);
  const latest = useRef({ tambons, selected, snapshot, hotspots, mode });
  latest.current = { tambons, selected, snapshot, hotspots, mode };
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  const sampler = useRef<((f: number) => [number, number]) | null>(null);

  const render = () => {
    const map = mapRef.current;
    if (!map || !ready.current) return;
    const { tambons, selected, snapshot, hotspots, mode } = latest.current;
    applyMode(map, mode);
    setData(map, "tambons", fc(tambons.map((t) => point(t.lon, t.lat))));
    setData(map, "hotspots", fc(hotspots.map(([lon, lat, frp, age]) => point(lon, lat, { frp, age }))));
    setData(
      map,
      "columns",
      fc(
        hotspots.map(([lon, lat, frp, age]) => ({
          type: "Feature",
          properties: { age, h: columnHeightM(frp) },
          geometry: { type: "Polygon", coordinates: columnPolygon(lon, lat, 0.7) },
        })),
      ),
    );
    setData(map, "selected", fc(selected ? [point(selected.lon, selected.lat)] : []));
    setData(
      map,
      "top",
      fc(snapshot?.status === "ok" ? snapshot.hotspots.map((h) => point(h.lon, h.lat)) : []),
    );
    const traj = snapshot?.trajectory ?? [];
    // Draw from the oldest position toward the tambon so arrowheads and puffs follow the smoke.
    const forward = [...traj].reverse() as [number, number][];
    sampler.current = forward.length > 1 ? pathSampler(forward) : null;
    setData(
      map,
      "traj",
      fc(forward.length > 1 ? [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: forward } }] : []),
    );
    if (!sampler.current) setData(map, "puffs", empty());
    else if (!interactive || reducedMotion()) drawPuffs(0.37); // static frame for screenshots
    labels.current.forEach((m) => m.remove());
    labels.current = LABEL_HOURS.filter((h) => h < traj.length).map((h) => {
      const d = document.createElement("div");
      d.className = "traj-label";
      d.textContent = `${h} ชม.ก่อน`;
      return new Marker({ element: d, anchor: "left", offset: [10, 0] }).setLngLat(traj[h]).addTo(map);
    });

    const is3d = mode === "3d";
    const pts: [number, number][] = [...traj, ...(snapshot?.hotspots ?? []).map((h) => [h.lon, h.lat] as [number, number])];
    if (selected) pts.push([selected.lon, selected.lat]);
    const camera = { pitch: is3d ? PITCH_3D : 0, bearing: is3d ? BEARING_3D : 0 };
    if (pts.length > 1) {
      const b = new LngLatBounds(pts[0], pts[0]);
      pts.forEach((p) => b.extend(p));
      map.fitBounds(b, { ...camera, padding: is3d ? 60 : 40, maxZoom: 10, duration: interactive ? 700 : 0 });
    } else if (selected) {
      map.jumpTo({ ...camera, center: [selected.lon, selected.lat], zoom: 9 });
    }
    if (onIdle) map.once("idle", onIdle);
  };

  const drawPuffs = (phase: number) => {
    const map = mapRef.current;
    const at = sampler.current;
    if (!map || !at) return;
    setData(map, "puffs", fc(puffFractions(PUFFS, phase).map((f) => point(...at(f), { f }))));
  };

  useEffect(() => {
    const map = new MlMap({
      container: el.current!,
      style: STYLE,
      bounds: CHIANG_RAI,
      interactive,
      maxPitch: 70,
      attributionControl: { compact: true },
      fadeDuration: interactive ? 300 : 0,
    });
    mapRef.current = map;
    if (interactive) map.addControl(new NavigationControl({ visualizePitch: true }), "top-right");
    map.on("load", () => {
      addLayers(map);
      ready.current = true;
      render();
    });
    map.on("click", (e: { lngLat: { lat: number; lng: number } }) => pickRef.current?.(e.lngLat.lat, e.lngLat.lng));

    // Smoke puffs drifting along the trajectory (~30 fps; rAF pauses in background tabs).
    let raf = 0;
    let last = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - last < 33 || !ready.current || !sampler.current) return;
      last = now;
      drawPuffs(now / PUFF_CYCLE_MS);
    };
    if (interactive && !reducedMotion()) raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ready.current = false;
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(render, [tambons, selected, snapshot, hotspots, mode]);

  return <div ref={el} className="map" />;
}
