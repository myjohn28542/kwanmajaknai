import { OTHER_COLOR, regionColors } from "../lib/data";
import type { Region } from "../lib/types";

const SHOWN = 4;

export function RegionBar({ regions, compact = false }: { regions: Region[]; compact?: boolean }) {
  if (!regions.length) return null;
  const shown = regions.slice(0, SHOWN).filter((r) => r.pct >= 1);
  const colors = regionColors(shown.map((r) => r.country));
  const other = Math.max(0, 100 - shown.reduce((s, r) => s + r.pct, 0));
  const segs = [
    ...shown.map((r, i) => ({ label: r.label_th, pct: r.pct, color: colors[i] })),
    ...(other >= 1 ? [{ label: "ที่อื่น", pct: other, color: OTHER_COLOR }] : []),
  ];
  return (
    <div className={compact ? "bar compact" : "bar"}>
      <div className="bar-track" role="img" aria-label="สัดส่วนแหล่งที่มาของควัน">
        {segs.map((s) => (
          <div key={s.label} className="bar-seg" style={{ width: `${s.pct}%`, background: s.color }} />
        ))}
      </div>
      <ul className="bar-legend">
        {segs.map((s) => (
          <li key={s.label}>
            <span className="dot" style={{ background: s.color }} />
            <span className="lbl">{s.label}</span>
            <span className="pct">{Math.round(s.pct)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
