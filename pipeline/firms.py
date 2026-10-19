"""NASA FIRMS VIIRS NRT hotspots, cached on disk by (source, UTC date).

With FIRMS_MAP_KEY: area API, one call per source per date (12 calls per run, far
below the 5000 / 10 min limit). Without a key: the public SE-Asia 7-day CSVs, split
into the same per-date cache files.
"""
from __future__ import annotations

import csv
import io
import time
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import numpy as np
import requests

import config

AREA_URL = "https://firms.modaps.eosdis.nasa.gov/api/area/csv/{key}/{source}/{bbox}/1/{day}"
PUBLIC_URL = {
    "VIIRS_SNPP_NRT": "suomi-npp-viirs-c2/csv/SUOMI_VIIRS_C2_SouthEast_Asia_7d.csv",
    "VIIRS_NOAA20_NRT": "noaa-20-viirs-c2/csv/J1_VIIRS_C2_SouthEast_Asia_7d.csv",
    "VIIRS_NOAA21_NRT": "noaa-21-viirs-c2/csv/J2_VIIRS_C2_SouthEast_Asia_7d.csv",
}
PUBLIC_BASE = "https://firms.modaps.eosdis.nasa.gov/data/active_fire/"
FIELDS = ("latitude", "longitude", "acq_date", "acq_time", "frp", "confidence", "daynight")
REFRESH_S = 45 * 60  # recent dates are still filling in; older dates are final
FINAL_AFTER_DAYS = 2

DIR = config.CACHE / "firms"


def dates_needed(now: datetime, days: int = config.FIRMS_DAYS) -> list[date]:
    """UTC dates covering at least `days` * 24 h before now (today + `days` previous)."""
    today = now.astimezone(timezone.utc).date()
    return [today - timedelta(days=i) for i in range(days + 1)]


def _path(source: str, day: date) -> Path:
    return DIR / source / f"{day.isoformat()}.csv"


def _fresh(path: Path, day: date, today: date) -> bool:
    if not path.exists():
        return False
    if (today - day).days >= FINAL_AFTER_DAYS:
        return True
    return time.time() - path.stat().st_mtime < REFRESH_S


def _in_bbox(row: dict) -> bool:
    w, s, e, n = config.BBOX
    lat, lon = float(row["latitude"]), float(row["longitude"])
    return s <= lat <= n and w <= lon <= e


def _write(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=FIELDS, extrasaction="ignore")
    w.writeheader()
    w.writerows(rows)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(buf.getvalue(), encoding="utf-8")
    tmp.replace(path)


def _get(url: str) -> str:
    for attempt in range(3):
        r = requests.get(url, timeout=120)
        if r.status_code == 200 and not r.text.startswith("Invalid"):
            return r.text
        time.sleep(5 * (attempt + 1))
    raise RuntimeError(f"FIRMS request failed: {r.status_code} {r.text[:200]}")


def fetch(now: datetime) -> None:
    days = dates_needed(now)
    today = days[0]
    w, s, e, n = config.BBOX
    for source in config.FIRMS_SOURCES:
        todo = [d for d in days if not _fresh(_path(source, d), d, today)]
        if not todo:
            continue
        if config.FIRMS_MAP_KEY:
            for d in todo:
                url = AREA_URL.format(
                    key=config.FIRMS_MAP_KEY, source=source, bbox=f"{w},{s},{e},{n}", day=d
                )
                rows = list(csv.DictReader(io.StringIO(_get(url))))
                _write(_path(source, d), [r for r in rows if _in_bbox(r)])
        else:
            rows = csv.DictReader(io.StringIO(_get(PUBLIC_BASE + PUBLIC_URL[source])))
            by_day: dict[str, list[dict]] = defaultdict(list)
            for r in rows:
                if _in_bbox(r):
                    by_day[r["acq_date"]].append(r)
            for d in todo:
                _write(_path(source, d), by_day.get(d.isoformat(), []))


def parse_rows(rows) -> dict[str, np.ndarray]:
    """CSV rows -> arrays. t is epoch hours UTC; conf_w from the confidence class."""
    from attribution import CONFIDENCE_WEIGHT

    lon, lat, t, frp, conf = [], [], [], [], []
    seen = set()
    for r in rows:
        hhmm = str(r["acq_time"]).zfill(4)
        key = (r["latitude"], r["longitude"], r["acq_date"], hhmm)
        if key in seen:
            continue
        seen.add(key)
        dt = datetime.fromisoformat(r["acq_date"]).replace(
            hour=int(hhmm[:2]), minute=int(hhmm[2:]), tzinfo=timezone.utc
        )
        lon.append(float(r["longitude"]))
        lat.append(float(r["latitude"]))
        t.append(dt.timestamp() / 3600.0)
        frp.append(float(r["frp"] or 0.0))
        conf.append(CONFIDENCE_WEIGHT.get(str(r["confidence"]).strip().lower(), 0.7))
    return {
        "lon": np.array(lon), "lat": np.array(lat), "t": np.array(t),
        "frp": np.array(frp), "conf_w": np.array(conf),
    }


def load(now: datetime) -> dict[str, np.ndarray]:
    rows = []
    for source in config.FIRMS_SOURCES:
        for d in dates_needed(now):
            p = _path(source, d)
            if p.exists():
                rows.extend(csv.DictReader(io.StringIO(p.read_text(encoding="utf-8"))))
    return parse_rows(rows)
