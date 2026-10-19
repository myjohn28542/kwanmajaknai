import { useEffect, useRef } from "react";
import { compass8, dustCount, hazeOpacity, pmIndex, SKIES, trend, windFromBearing } from "../lib/island";
import type { Snapshot, TambonSummary } from "../lib/types";
import { pmLevel, thaiTime } from "../lib/util";
import { Mascot } from "./Mascot";

type Props = {
  tambon: TambonSummary;
  snapshot: Snapshot | null;
  previousPm: number | null; // PM2.5 three hours earlier, for the trend arrow
};

const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

/** Dust specks drifting with the wind; count and colour follow PM2.5. Pauses off-screen. */
function DustCanvas({ count, color, windFrom }: { count: number; color: string; windFrom: number | null }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = () => {
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
    };
    size();
    // travel = opposite of where the wind comes from; screen x = east, y = south
    const travel = (((windFrom ?? 90) + 180) * Math.PI) / 180;
    const vx = Math.sin(travel);
    const vy = -Math.cos(travel);
    const specks = Array.from({ length: count }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.6 + Math.random() * 2.2,
      s: 0.015 + Math.random() * 0.035, // canvas widths per second
      a: 0.25 + Math.random() * 0.5,
      w: Math.random() * Math.PI * 2,
    }));
    let raf = 0;
    let last = performance.now();
    let visible = true;
    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const { width: w, height: h } = canvas;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = color;
      for (const p of specks) {
        p.w += dt;
        p.x = (p.x + (vx * p.s + Math.sin(p.w) * 0.004) * dt + 1) % 1;
        p.y = (p.y + (vy * p.s + Math.cos(p.w * 0.7) * 0.004) * dt + 1) % 1;
        ctx.globalAlpha = p.a;
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, p.r * dpr, 0, Math.PI * 2);
        ctx.fill();
      }
      if (visible && !reducedMotion()) raf = requestAnimationFrame(draw);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible) {
        last = performance.now();
        raf = requestAnimationFrame(draw);
      }
    });
    io.observe(canvas);
    window.addEventListener("resize", size);
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("resize", size);
    };
  }, [count, color, windFrom]);
  return <canvas ref={ref} className="island-dust" aria-hidden="true" />;
}

export function IslandCard({ tambon, snapshot, previousPm }: Props) {
  const pm = snapshot?.pm25 ?? null;
  const idx = pmIndex(pm);
  const sky = SKIES[idx];
  const lvl = pmLevel(pm);
  const windFrom = snapshot ? windFromBearing(snapshot.trajectory) : null;
  const top = snapshot?.status === "ok" ? snapshot.regions[0] : null;
  const tr = trend(pm, previousPm);
  const haze = hazeOpacity(pm);

  return (
    <section
      className={`island level-${idx}`}
      style={{ background: `linear-gradient(180deg, ${sky.top} 0%, ${sky.bottom} 78%)` }}
      aria-label={`สภาพอากาศ ต.${tambon.name_th}`}
    >
      <div className="island-sun-glow" style={{ opacity: idx === 0 ? 0.9 : idx === 1 ? 0.5 : 0 }} />
      <img className="island-img" src="/islands/chiangrai.webp" alt="" width={850} height={674} />
      <div className="island-haze" style={{ opacity: haze, background: `radial-gradient(ellipse at 50% 60%, ${sky.haze} 0%, ${sky.haze}cc 45%, ${sky.haze}00 75%)` }} />
      <div className="island-haze drift" style={{ opacity: haze * 0.8, background: `linear-gradient(90deg, ${sky.haze}00, ${sky.haze} 35%, ${sky.haze}aa 70%, ${sky.haze}00)` }} />
      <DustCanvas count={dustCount(pm)} color={sky.dust} windFrom={windFrom} />

      <div className="island-head glass">
        <div className="island-place">
          ต.{tambon.name_th} <span>อ.{tambon.amphoe_th}</span>
        </div>
        <div className="island-pm">
          <strong>{pm == null ? "–" : Math.round(pm)}</strong>
          <span>
            µg/m³
            <br />
            PM2.5
          </span>
        </div>
        {lvl && (
          <div className="island-level" style={{ background: lvl.color, color: lvl.ink }}>
            {lvl.label}
          </div>
        )}
        {snapshot && <div className="island-time">{thaiTime(snapshot.t)} น. · ประมาณการ</div>}
      </div>

      <div className="island-mascot">
        <Mascot level={idx} />
      </div>

      <div className="island-stats glass">
        <div>
          <span className="k">ควันมาจาก</span>
          <span className="v">{top ? `${top.label_th} ${Math.round(top.pct)}%` : snapshot ? "ไม่พบไฟเด่น" : "–"}</span>
        </div>
        <div>
          <span className="k">ลมพัดมาจาก</span>
          <span className="v">{windFrom == null ? "–" : `ทิศ${compass8(windFrom)}`}</span>
        </div>
        <div>
          <span className="k">3 ชม.ที่ผ่านมา</span>
          <span className="v">{tr === "up" ? "ฝุ่นเพิ่มขึ้น ↑" : tr === "down" ? "ฝุ่นลดลง ↓" : tr === "flat" ? "ทรงตัว" : "–"}</span>
        </div>
      </div>
    </section>
  );
}
