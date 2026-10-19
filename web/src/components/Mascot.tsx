// Cartoon cloud whose mood follows the PM2.5 band (0 = very good ... 4 = unhealthy).
const BODY = ["#ffffff", "#f8fafc", "#e5e7eb", "#c8bba8", "#9b8573"];
const SHADE = ["#dbeafe", "#e2e8f0", "#cbd5e1", "#a8977f", "#7a6555"];

export function Mascot({ level }: { level: number }) {
  const l = Math.min(Math.max(level, 0), 4);
  const masked = l >= 3;
  return (
    <svg viewBox="0 0 160 120" className="mascot" role="img" aria-label={["อากาศดีมาก", "อากาศดี", "ปานกลาง", "เริ่มมีผลต่อสุขภาพ", "มีผลต่อสุขภาพ"][l]}>
      {l === 0 && (
        <g className="mascot-sun">
          <circle cx="128" cy="26" r="16" fill="#fcd34d" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <rect key={a} x="126.5" y="2" width="3" height="8" rx="1.5" fill="#fbbf24" transform={`rotate(${a} 128 26)`} />
          ))}
        </g>
      )}
      <path
        d="M38 100c-17 0-28-12-28-26 0-13 10-24 23-25 3-17 17-29 34-29 14 0 26 8 31 20 4-2 8-3 13-3 16 0 29 13 29 29 0 3 0 5-1 8 7 4 11 11 11 19 0 4-1 7-3 7z"
        fill={BODY[l]}
        stroke={SHADE[l]}
        strokeWidth="3"
      />
      {/* cheeks */}
      {l <= 1 && (
        <>
          <ellipse cx="52" cy="76" rx="7" ry="4" fill="#fda4af" opacity="0.7" />
          <ellipse cx="108" cy="76" rx="7" ry="4" fill="#fda4af" opacity="0.7" />
        </>
      )}
      {/* eyes */}
      {l === 4 ? (
        <>
          <path d="M56 62l10 5-10 5" fill="none" stroke="#1f2937" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M104 62l-10 5 10 5" fill="none" stroke="#1f2937" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : (
        <>
          <ellipse cx="62" cy="65" rx="6" ry={l === 0 ? 7 : 6.5} fill="#1f2937" />
          <ellipse cx="98" cy="65" rx="6" ry={l === 0 ? 7 : 6.5} fill="#1f2937" />
          <circle cx="64" cy="62" r="2" fill="#fff" />
          <circle cx="100" cy="62" r="2" fill="#fff" />
        </>
      )}
      {/* worried brows */}
      {(l === 2 || l === 3) && (
        <>
          {/* inner ends raised = worried, not angry */}
          <path d="M53 55l12-5" stroke="#1f2937" strokeWidth="3" strokeLinecap="round" />
          <path d="M107 55l-12-5" stroke="#1f2937" strokeWidth="3" strokeLinecap="round" />
        </>
      )}
      {/* mouth or mask */}
      {masked ? (
        <g>
          <path d="M58 76h44c2 0 3 1 3 3v6c0 7-10 12-25 12s-25-5-25-12v-6c0-2 1-3 3-3z" fill="#f8fafc" stroke="#94a3b8" strokeWidth="2" />
          <path d="M62 82h36M64 88h32" stroke="#cbd5e1" strokeWidth="2" />
          <path d="M55 79l-14-6M105 79l14-6" stroke="#94a3b8" strokeWidth="2" />
        </g>
      ) : l === 0 ? (
        <path d="M66 78q14 14 28 0" fill="#7f1d1d" stroke="#1f2937" strokeWidth="2.5" strokeLinejoin="round" />
      ) : l === 1 ? (
        <path d="M68 80q12 8 24 0" fill="none" stroke="#1f2937" strokeWidth="3" strokeLinecap="round" />
      ) : (
        <path d="M70 84q10-6 20 0" fill="none" stroke="#1f2937" strokeWidth="3" strokeLinecap="round" />
      )}
      {l === 2 && <path d="M118 52q4 8 0 11q-4-3 0-11z" fill="#7dd3fc" />}
      {l === 4 && (
        <g className="mascot-cough" stroke="#57534e" strokeWidth="3" strokeLinecap="round">
          <path d="M8 74h10" />
          <path d="M6 84l10-3" />
          <path d="M8 64l10 4" />
        </g>
      )}
    </svg>
  );
}
