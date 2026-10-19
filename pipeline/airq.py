"""Open-Meteo Air Quality (CAMS) PM2.5 per tambon centroid — display only (model estimate).

The CAMS forecast updates a few times a day, so cache per 3-hour block to stay well
inside Open-Meteo's free daily call budget.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

import config
from meteo import epoch_hours, get_multi

URL = "https://air-quality-api.open-meteo.com/v1/air-quality"
DIR = config.CACHE / "airq"
BLOCK_H = 3
KEEP_FILES = 16


def _cache_path(now: datetime) -> Path:
    u = now.astimezone(timezone.utc)
    return DIR / f"{u:%Y%m%d}T{u.hour - u.hour % BLOCK_H:02d}.json"


def fetch(now: datetime, tambons: list[dict]) -> Path:
    path = _cache_path(now)
    if path.exists():
        return path
    raw = get_multi(
        URL,
        [(t["lat"], t["lon"]) for t in tambons],
        {"hourly": "pm2_5", "past_days": 3, "forecast_days": 1, "timezone": "Asia/Bangkok"},
    )
    slim = {
        t["id"]: {
            "t": epoch_hours(r["hourly"]["time"], r["utc_offset_seconds"]).tolist(),
            "pm25": r["hourly"]["pm2_5"],
        }
        for t, r in zip(tambons, raw)
    }
    DIR.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(slim, separators=(",", ":")), encoding="utf-8")
    tmp.replace(path)
    for old in sorted(DIR.glob("*.json"))[:-KEEP_FILES]:
        old.unlink()
    return path


def load_latest() -> dict:
    files = sorted(DIR.glob("*.json"))
    return json.loads(files[-1].read_text(encoding="utf-8")) if files else {}


def value_at(series: dict | None, t_hours: float) -> float | None:
    if not series:
        return None
    ts = np.asarray(series["t"])
    i = int(np.argmin(np.abs(ts - t_hours)))
    v = series["pm25"][i]
    return None if v is None or abs(ts[i] - t_hours) > 1.5 else round(float(v), 1)
