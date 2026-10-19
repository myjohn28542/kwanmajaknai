"""Open-Meteo hourly wind on a 0.5° grid (multi-location requests), cached per hour."""
from __future__ import annotations

import json
import time
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import requests

import config
from wind import WindGrid, uv_from_met

URL = "https://api.open-meteo.com/v1/forecast"
VARS = (
    "wind_speed_10m", "wind_direction_10m",
    "wind_speed_100m", "wind_direction_100m",
    "wind_speed_850hPa", "wind_direction_850hPa",
    "boundary_layer_height",
)
CHUNK = 50  # locations per request; keeps URLs short
KEEP_FILES = 48

DIR = config.CACHE / "meteo"


def grid_axes() -> tuple[np.ndarray, np.ndarray]:
    w, s, e, n = config.BBOX
    step = config.GRID_STEP
    lons = np.round(np.arange(w, e + step / 2, step), 3)
    lats = np.round(np.arange(s, n + step / 2, step), 3)
    return lons, lats


def _points() -> list[tuple[float, float]]:
    lons, lats = grid_axes()
    return [(float(la), float(lo)) for la in lats for lo in lons]  # lat-major


RETRIES = 4
BACKOFF_S = 10


def get_json(url: str, params: dict):
    """GET with retries on timeouts, connection errors and non-200 responses."""
    last: Exception | None = None
    for attempt in range(RETRIES):
        try:
            r = requests.get(url, params=params, timeout=60)
            if r.status_code == 200:
                return r.json()
            last = requests.HTTPError(f"{r.status_code} {r.text[:200]}")
        except requests.RequestException as e:
            last = e
        if attempt < RETRIES - 1:
            time.sleep(BACKOFF_S * (attempt + 1))
    raise RuntimeError(f"GET {url} failed after {RETRIES} attempts: {last}")


def get_multi(url: str, points: list[tuple[float, float]], params: dict) -> list[dict]:
    out: list[dict] = []
    for i in range(0, len(points), CHUNK):
        chunk = points[i : i + CHUNK]
        q = dict(params)
        q["latitude"] = ",".join(f"{la:g}" for la, _ in chunk)
        q["longitude"] = ",".join(f"{lo:g}" for _, lo in chunk)
        data = get_json(url, q)
        out.extend(data if isinstance(data, list) else [data])
    if len(out) != len(points):
        raise RuntimeError(f"expected {len(points)} locations, got {len(out)}")
    return out


def _cache_path(now: datetime) -> Path:
    return DIR / f"{now.astimezone(timezone.utc):%Y%m%dT%H}.json"


def fetch(now: datetime) -> Path:
    path = _cache_path(now)
    if path.exists():
        return path
    raw = get_multi(
        URL,
        _points(),
        {
            "hourly": ",".join(VARS),
            "past_days": 3,
            "forecast_days": 2,
            "timezone": "Asia/Bangkok",
            "wind_speed_unit": "ms",
        },
    )
    DIR.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(raw, separators=(",", ":")), encoding="utf-8")
    tmp.replace(path)
    for old in sorted(DIR.glob("*.json"))[:-KEEP_FILES]:
        old.unlink()
    return path


def latest_path() -> Path:
    files = sorted(DIR.glob("*.json"))
    if not files:
        raise FileNotFoundError("no wind data cached; run `make fetch` first")
    return files[-1]


def epoch_hours(local_times: list[str], utc_offset_s: int) -> np.ndarray:
    ts = [
        datetime.fromisoformat(s).replace(tzinfo=timezone.utc).timestamp() - utc_offset_s
        for s in local_times
    ]
    return np.array(ts) / 3600.0


def _arr(h: dict, name: str) -> np.ndarray:
    return np.array([np.nan if x is None else x for x in h[name]], float)


def to_grid(raw: list[dict]) -> WindGrid:
    lons, lats = grid_axes()
    nx, ny = lons.size, lats.size
    times = epoch_hours(raw[0]["hourly"]["time"], raw[0]["utc_offset_seconds"])
    nt = times.size
    f = {k: np.zeros((nt, ny, nx)) for k in ("u10", "v10", "u100", "v100", "u850", "v850", "blh")}
    for idx, loc in enumerate(raw):
        j, i = divmod(idx, nx)
        h = loc["hourly"]
        u10, v10 = uv_from_met(_arr(h, "wind_speed_10m"), _arr(h, "wind_direction_10m"))
        u100, v100 = uv_from_met(_arr(h, "wind_speed_100m"), _arr(h, "wind_direction_100m"))
        u850, v850 = uv_from_met(_arr(h, "wind_speed_850hPa"), _arr(h, "wind_direction_850hPa"))
        # Gaps: fall back to the next level down, then calm.
        u10, v10 = np.nan_to_num(u10), np.nan_to_num(v10)
        u100, v100 = np.where(np.isnan(u100), u10, u100), np.where(np.isnan(v100), v10, v100)
        u850, v850 = np.where(np.isnan(u850), u100, u850), np.where(np.isnan(v850), v100, v850)
        for k, a in (("u10", u10), ("v10", v10), ("u100", u100), ("v100", v100),
                     ("u850", u850), ("v850", v850)):
            f[k][:, j, i] = a
        f["blh"][:, j, i] = np.nan_to_num(_arr(h, "boundary_layer_height"))
    return WindGrid(lons=lons, lats=lats, times=times, fields=f)


def load_latest() -> WindGrid:
    return to_grid(json.loads(latest_path().read_text(encoding="utf-8")))
