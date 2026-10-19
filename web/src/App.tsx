import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Footer } from "./components/Footer";
import { IslandCard } from "./components/IslandCard";
import { ResultCard } from "./components/ResultCard";
import { ShareButtons } from "./components/ShareButtons";
import { TambonSearch } from "./components/TambonSearch";
import { loadHotspots, loadIndex, loadTambon } from "./lib/data";
import type { Hotspots, Index, TambonDoc } from "./lib/types";
import type { MapMode } from "./components/MapView";
import {
  DEFAULT_TAMBON,
  haversineKm,
  hotspotsAt,
  hoursBetween,
  loadSaved,
  MODE_KEY,
  nearestTambon,
  save,
  tambonFromLocation,
  tambonUrl,
} from "./lib/util";

// MapLibre is ~85% of the JS; load it after the result card so phones see the answer first.
const MapView = lazy(() => import("./components/MapView").then((m) => ({ default: m.MapView })));
const ShareView = lazy(() => import("./components/ShareView").then((m) => ({ default: m.ShareView })));

const PICK_MAX_KM = 25; // map clicks far outside Chiang Rai are ignored
const GPS_MAX_KM = 20; // further than this from every tambon centroid = outside Chiang Rai
const SHARE = new URLSearchParams(location.search).get("share") === "1";

export default function App() {
  const [index, setIndex] = useState<Index | null>(null);
  const [hot, setHot] = useState<Hotspots | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [id, setId] = useState(() => tambonFromLocation(location.pathname, location.search) ?? loadSaved() ?? DEFAULT_TAMBON);
  const [doc, setDoc] = useState<TambonDoc | null>(null);
  // 3D terrain costs more data and battery: start in 2D on phones, 3D on big screens.
  const [mode, setMode] = useState<MapMode>(() => {
    const saved = loadSaved(MODE_KEY);
    if (saved === "2d" || saved === "3d") return saved;
    return window.matchMedia?.("(min-width: 900px)").matches ? "3d" : "2d";
  });
  const toggleMode = () => {
    const next = mode === "3d" ? "2d" : "3d";
    setMode(next);
    save(next, MODE_KEY);
  };
  const [timeIdx, setTimeIdx] = useState(0);
  const [me, setMe] = useState<[number, number] | null>(null);
  const [geoMsg, setGeoMsg] = useState<string | null>(null);
  const [playToken, setPlayToken] = useState(0);
  const [stopToken, setStopToken] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    loadIndex().then(setIndex, (e) => setError(String(e)));
    loadHotspots().then(setHot, () => setHot({ t: "", points: [] }));
  }, []);

  useEffect(() => {
    let live = true;
    loadTambon(id).then(
      (d) => live && setDoc(d),
      () => live && setDoc(null),
    );
    return () => {
      live = false;
    };
  }, [id]);

  const select = useCallback((next: string) => {
    setId(next);
    save(next);
    if (!SHARE) history.replaceState(null, "", `/t/${next}`);
  }, []);

  const tambons = index?.tambons ?? [];
  const tambon = tambons.find((t) => t.id === id) ?? null;
  const times = index?.times ?? [];
  const t = times[Math.min(timeIdx, times.length - 1)];
  const snapshot = (doc?.id === id && doc.snapshots.find((s) => s.t === t)) || null;
  const tPrev = times[Math.min(timeIdx, times.length - 1) + 3];
  const previousPm = doc?.id === id ? (doc.snapshots.find((s) => s.t === tPrev)?.pm25 ?? null) : null;
  const offset = hot?.t && t ? hoursBetween(hot.t, t) : 0;
  const shownHot = useMemo(() => (hot ? hotspotsAt(hot.points, offset) : []), [hot, offset]);

  const onPick = useCallback(
    (lat: number, lon: number) => {
      const n = nearestTambon(tambons, lat, lon);
      if (n && haversineKm(lat, lon, n.lat, n.lon) <= PICK_MAX_KM) select(n.id);
    },
    [tambons, select],
  );

  // Position stays in the browser: it only picks the nearest tambon and draws a dot.
  const locate = () => {
    if (!navigator.geolocation) {
      setGeoMsg("เบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่ง เลือกตำบลจากรายการแทนได้");
      return;
    }
    setGeoMsg("กำลังหาตำแหน่ง…");
    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude: lat, longitude: lon } }) => {
        setMe([lon, lat]);
        const n = nearestTambon(tambons, lat, lon);
        if (n && haversineKm(lat, lon, n.lat, n.lon) <= GPS_MAX_KM) {
          select(n.id);
          setGeoMsg(`คุณอยู่ใกล้ ต.${n.name_th} อ.${n.amphoe_th}`);
        } else {
          setGeoMsg("ตำแหน่งของคุณอยู่นอกเชียงราย เลือกตำบลจากรายการแทนได้");
        }
      },
      (err) =>
        setGeoMsg(
          err.code === err.PERMISSION_DENIED
            ? "ไม่ได้รับอนุญาตให้ใช้ตำแหน่ง เปิดสิทธิ์ในการตั้งค่าเบราว์เซอร์ หรือเลือกตำบลเอง"
            : "หาตำแหน่งไม่สำเร็จ ลองอีกครั้ง",
        ),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 600_000 },
    );
  };

  const canPlay = (snapshot?.trajectory.length ?? 0) > 1;
  const togglePlay = () => {
    if (playing) {
      setStopToken((n) => n + 1);
      return;
    }
    setMode("3d"); // the flight is a 3D experience; not saved as the viewer's preference
    setPlayToken((n) => n + 1);
  };

  if (error) return <p className="error">โหลดข้อมูลไม่สำเร็จ ลองใหม่อีกครั้ง ({error})</p>;

  if (SHARE) {
    return tambon && snapshot && hot ? (
      <Suspense fallback={null}>
        <ShareView tambon={tambon} snapshot={snapshot} hotspots={shownHot} />
      </Suspense>
    ) : null;
  }

  return (
    <div className="page">
      <header className="header">
        <h1>ควันมาจากไหน</h1>
        <p className="muted">ประมาณการแหล่งที่มาของควันเหนือตำบลในเชียงราย จากทิศลมย้อนหลังและจุดความร้อนจากดาวเทียม</p>
      </header>
      <main className="layout">
        <div className="side">
          <TambonSearch tambons={tambons} selected={tambon} onSelect={select} />
          <div className="locate">
            <button type="button" className="btn locate-btn" onClick={locate} disabled={!tambons.length}>
              📍 ใช้ตำแหน่งของฉัน
            </button>
            <p className="small muted" role="status">
              {geoMsg ?? "ตำแหน่งใช้ในเครื่องของคุณเท่านั้น ไม่ถูกส่งไปที่ไหน"}
            </p>
          </div>
          {tambon && <IslandCard tambon={tambon} snapshot={snapshot} previousPm={previousPm} />}
          {tambon && (
            <ResultCard
              tambon={tambon}
              snapshot={snapshot}
              times={times}
              timeIdx={Math.min(timeIdx, Math.max(times.length - 1, 0))}
              onTime={setTimeIdx}
              loading={!doc || doc.id !== id}
            />
          )}
          {tambon && snapshot && (
            <ShareButtons
              url={tambonUrl(location.origin, tambon.id)}
              text={snapshot.sentence}
              imageUrl={`/data/${tambon.id}.png`}
              fileName={`kwanmajaknai-${tambon.name_en.replace(/\W+/g, "-").toLowerCase() || tambon.id}.png`}
            />
          )}
        </div>
        <div className="map-wrap">
          <Suspense fallback={<div className="map map-loading">กำลังโหลดแผนที่…</div>}>
            <div className="map-box">
              <MapView
                tambons={tambons}
                selected={tambon}
                snapshot={snapshot}
                hotspots={shownHot}
                mode={mode}
                pm={snapshot?.pm25 ?? null}
                onPick={onPick}
                userLoc={me}
                playToken={playToken}
                stopToken={stopToken}
                onPlayingChange={setPlaying}
              />
              <div className="map-actions">
                <button type="button" className="mode-toggle" onClick={toggleMode} aria-pressed={mode === "3d"}>
                  {mode === "3d" ? "ดูแบบ 2D" : "ดูแบบ 3D"}
                </button>
                {canPlay && (
                  <button type="button" className="mode-toggle play" onClick={togglePlay} aria-pressed={playing}>
                    {playing ? "■ หยุด" : "▶ ดูควันเดินทาง"}
                  </button>
                )}
              </div>
            </div>
          </Suspense>
          <div className="legend small">
            <span><i className="sw" style={{ background: "#b91c1c" }} />ไฟ ≤6 ชม.</span>
            <span><i className="sw" style={{ background: "#ea580c" }} />≤24 ชม.</span>
            <span><i className="sw" style={{ background: "#f59e0b" }} />≤48 ชม.</span>
            <span><i className="sw" style={{ background: "#a8a29e" }} />เก่ากว่า</span>
            <span><i className="ln" />เส้นทางลมย้อนหลัง</span>
            <span><i className="puff" />ควันเคลื่อนตามลม</span>
            {mode === "3d" && <span>แท่ง = ไฟที่เป็นต้นควันหลัก (ยิ่งสูงยิ่งแรง)</span>}
            {me && <span><i className="sw" style={{ background: "#16a34a" }} />ตำแหน่งของคุณ</span>}
          </div>
          <p className="small muted hint">แตะบนแผนที่เพื่อเลือกตำบลที่ใกล้ที่สุด</p>
        </div>
      </main>
      <Footer updatedAt={index?.updated_at} />
    </div>
  );
}
