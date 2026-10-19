import { useEffect, useRef } from "react";
import {
  LngLatBounds,
  Map as MlMap,
  Marker,
  NavigationControl,
  setWorkerUrl,
  type GeoJSONSource,
  type LngLatBoundsLike,
} from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import "maplibre-gl/dist/maplibre-gl.css";
import type { HotspotPoint, Snapshot, TambonSummary } from "../lib/types";

// MapLibre 6 loads its worker from a sibling file next to the module; point it at the
// copy Vite emits into assets/.
setWorkerUrl(workerUrl);

const KEY = import.meta.env.VITE_MAPTILER_KEY as string | undefined;
const STYLE = KEY
  ? `https://api.maptiler.com/maps/dataviz/style.json?key=${KEY}`
  : "https://tiles.openfreemap.org/styles/positron";
const CHIANG_RAI: LngLatBoundsLike = [
  [99.2, 19.3],
  [100.65, 20.5],
];
const LABEL_HOURS = [12, 24, 36, 48];

type Props = {
  tambons: TambonSummary[];
  selected: TambonSummary | null;
  snapshot: Snapshot | null;
  hotspots: HotspotPoint[];
  onPick?: (lat: number, lon: number) => void;
  interactive?: boolean;
  onIdle?: () => void;
};

const empty = (): GeoJSON.FeatureCollection => ({ type: "FeatureCollection", features: [] });

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
  if (KEY) {
    map.addSource("dem", {
      type: "raster-dem",
      url: `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=${KEY}`,
    });
    const firstSymbol = map.getStyle().layers.find((l) => l.type === "symbol")?.id;
    map.addLayer(
      { id: "hillshade", type: "hillshade", source: "dem", paint: { "hillshade-exaggeration": 0.25 } },
      firstSymbol,
    );
  }
  if (!map.hasImage("kwan-arrow")) map.addImage("kwan-arrow", arrowImage());
  for (const id of ["tambons", "hotspots", "top", "traj", "selected"]) map.addSource(id, { type: "geojson", data: empty() });
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
      "circle-color": ["step", ["get", "age"], "#b91c1c", 6, "#ea580c", 24, "#f59e0b", 48, "#a8a29e"],
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

export function MapView({ tambons, selected, snapshot, hotspots, onPick, interactive = true, onIdle }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const ready = useRef(false);
  const labels = useRef<Marker[]>([]);
  const latest = useRef({ tambons, selected, snapshot, hotspots });
  latest.current = { tambons, selected, snapshot, hotspots };
  const pickRef = useRef(onPick);
  pickRef.current = onPick;

  const render = () => {
    const map = mapRef.current;
    if (!map || !ready.current) return;
    const { tambons, selected, snapshot, hotspots } = latest.current;
    setData(map, "tambons", { type: "FeatureCollection", features: tambons.map((t) => point(t.lon, t.lat)) });
    setData(map, "hotspots", {
      type: "FeatureCollection",
      features: hotspots.map(([lon, lat, frp, age]) => point(lon, lat, { frp, age })),
    });
    setData(map, "selected", {
      type: "FeatureCollection",
      features: selected ? [point(selected.lon, selected.lat)] : [],
    });
    setData(map, "top", {
      type: "FeatureCollection",
      features: snapshot?.status === "ok" ? snapshot.hotspots.map((h) => point(h.lon, h.lat)) : [],
    });
    const traj = snapshot?.trajectory ?? [];
    // Draw from the oldest position toward the tambon so arrowheads follow the smoke.
    setData(map, "traj", {
      type: "FeatureCollection",
      features:
        traj.length > 1
          ? [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [...traj].reverse() } }]
          : [],
    });
    labels.current.forEach((m) => m.remove());
    labels.current = LABEL_HOURS.filter((h) => h < traj.length).map((h) => {
      const d = document.createElement("div");
      d.className = "traj-label";
      d.textContent = `${h} ชม.ก่อน`;
      return new Marker({ element: d }).setLngLat(traj[h]).addTo(map);
    });

    const pts: [number, number][] = [...traj, ...(snapshot?.hotspots ?? []).map((h) => [h.lon, h.lat] as [number, number])];
    if (selected) pts.push([selected.lon, selected.lat]);
    if (pts.length > 1) {
      const b = new LngLatBounds(pts[0], pts[0]);
      pts.forEach((p) => b.extend(p));
      map.fitBounds(b, { padding: 40, maxZoom: 10, duration: interactive ? 600 : 0 });
    } else if (selected) {
      map.jumpTo({ center: [selected.lon, selected.lat], zoom: 9 });
    }
    if (onIdle) map.once("idle", onIdle);
  };

  useEffect(() => {
    const map = new MlMap({
      container: el.current!,
      style: STYLE,
      bounds: CHIANG_RAI,
      interactive,
      attributionControl: { compact: true },
      fadeDuration: interactive ? 300 : 0,
    });
    mapRef.current = map;
    if (interactive) map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.on("load", () => {
      addLayers(map);
      ready.current = true;
      render();
    });
    map.on("click", (e: { lngLat: { lat: number; lng: number } }) => pickRef.current?.(e.lngLat.lat, e.lngLat.lng));
    return () => {
      ready.current = false;
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(render, [tambons, selected, snapshot, hotspots]);

  return <div ref={el} className="map" />;
}
