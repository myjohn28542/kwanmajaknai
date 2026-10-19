import type { Snapshot, TambonSummary } from "../lib/types";
import { pmLevel, thaiTime } from "../lib/util";
import { RegionBar } from "./RegionBar";

type Props = {
  tambon: TambonSummary;
  snapshot: Snapshot | null;
  times: string[]; // newest first
  timeIdx: number;
  onTime: (i: number) => void;
  loading: boolean;
};

export function PmBadge({ value }: { value: number | null }) {
  const lvl = pmLevel(value);
  if (!lvl || value == null) return <span className="pm muted">PM2.5 ไม่มีข้อมูล</span>;
  return (
    <span className="pm" style={{ background: lvl.color, color: lvl.ink }}>
      PM2.5 {Math.round(value)} µg/m³ · {lvl.label}
    </span>
  );
}

export function ResultCard({ tambon, snapshot, times, timeIdx, onTime, loading }: Props) {
  const n = times.length;
  return (
    <section className="card" aria-live="polite">
      <div className="card-head">
        <h2>
          ต.{tambon.name_th} <span className="muted">อ.{tambon.amphoe_th}</span>
        </h2>
        <span className="badge">ประมาณการ</span>
      </div>

      {loading && !snapshot && <p className="sentence muted">กำลังโหลด…</p>}
      {!loading && !snapshot && <p className="sentence muted">ยังไม่มีผลสำหรับเวลานี้</p>}
      {snapshot && (
        <>
          <p className="sentence">{snapshot.sentence}</p>
          <RegionBar regions={snapshot.regions} />
          <div className="facts">
            <PmBadge value={snapshot.pm25} />
            <span className="muted small">ค่าจากแบบจำลอง CAMS ไม่ใช่เครื่องวัด</span>
          </div>
          {snapshot.countries.length > 1 && (
            <p className="small">
              แยกตามประเทศ:{" "}
              {snapshot.countries.map((c) => `${c.name_th} ${Math.round(c.pct)}%`).join(" · ")}
            </p>
          )}
        </>
      )}

      {n > 1 && (
        <div className="slider">
          <label htmlFor="time">
            เวลา <strong>{thaiTime(times[timeIdx])}</strong>
            {timeIdx === 0 && <span className="muted"> (ล่าสุด)</span>}
          </label>
          <input
            id="time"
            type="range"
            min={0}
            max={n - 1}
            step={1}
            // left = oldest, right = latest
            value={n - 1 - timeIdx}
            onChange={(e) => onTime(n - 1 - Number(e.target.value))}
          />
          <div className="slider-ends small muted">
            <span>{thaiTime(times[n - 1])}</span>
            <span>{thaiTime(times[0])}</span>
          </div>
        </div>
      )}
    </section>
  );
}
