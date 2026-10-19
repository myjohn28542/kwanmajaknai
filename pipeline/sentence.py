"""Thai one-line summary. District/country level only — never villages or plots."""
from __future__ import annotations

from datetime import datetime, timedelta

from attribution import round_to_step

THAI_MONTHS = "ม.ค. ก.พ. มี.ค. เม.ย. พ.ค. มิ.ย. ก.ค. ส.ค. ก.ย. ต.ค. พ.ย. ธ.ค.".split()
MAX_NAMED = 3
MIN_NAMED_PCT = 10.0
ESTIMATE = "(ประมาณการ)"


def day_label(local: datetime, now_local: datetime) -> str:
    if local.date() == now_local.date():
        return "วันนี้"
    if local.date() == (now_local - timedelta(days=1)).date():
        return "เมื่อวาน"
    return f"{local.day} {THAI_MONTHS[local.month - 1]}"


def place_label(tambon: dict) -> str:
    return f"ต.{tambon['name_th']} อ.{tambon['amphoe_th']}"


def build(
    tambon: dict,
    local: datetime,
    now_local: datetime,
    shares: list[tuple[str, float]],
    significant: bool,
) -> str:
    """shares: (region label, percent) sorted descending, percents summing to ~100."""
    head = f"ควันที่{place_label(tambon)} {local:%H:%M} {day_label(local, now_local)}"
    if not significant or not shares:
        return f"{head} ไม่พบไฟที่มีนัยสำคัญตามเส้นทางลมย้อนหลัง 48 ชม. {ESTIMATE}"
    named = [(lbl, p) for lbl, p in shares[:MAX_NAMED] if p >= MIN_NAMED_PCT] or shares[:1]
    other = max(0.0, 100.0 - sum(p for _, p in named))
    rounded = round_to_step([p for _, p in named] + [other], 5)
    parts = []
    for i, ((lbl, _), pct) in enumerate(zip(named, rounded)):
        if pct == 0:
            continue
        parts.append(f"ราว {pct}% มาจากไฟในเขต{lbl}" if i == 0 else f"{pct}% จาก{lbl}")
    if rounded[-1] > 0:
        parts.append(f"{rounded[-1]}% จากที่อื่น")
    return f"{head} {' '.join(parts)} {ESTIMATE}"
