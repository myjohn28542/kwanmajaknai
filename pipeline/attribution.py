"""Backward-trajectory smoke attribution.

All tambons are simulated together: particle p belongs to tambon p // n_per_group.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from scipy.spatial import cKDTree

import config
from wind import WindGrid, transport_wind

KM_PER_DEG = 111.32
REF_LAT = 19.5  # equirectangular projection for hotspot matching (<2% error in bbox)
CONFIDENCE_WEIGHT = {"h": 1.0, "high": 1.0, "n": 0.7, "nominal": 0.7, "l": 0.3, "low": 0.3}


@dataclass
class Hotspots:
    lon: np.ndarray
    lat: np.ndarray
    t: np.ndarray  # epoch hours UTC
    frp: np.ndarray
    conf_w: np.ndarray
    region: np.ndarray  # index into the region table, -1 = unknown

    def __len__(self) -> int:
        return self.lon.size

    @property
    def weight(self) -> np.ndarray:
        return np.log1p(self.frp) * self.conf_w


def _inside(lon, lat, bbox) -> np.ndarray:
    w, s, e, n = bbox
    return (lon >= w) & (lon <= e) & (lat >= s) & (lat <= n)


def back_trajectories(
    grid: WindGrid,
    lon0: np.ndarray,
    lat0: np.ndarray,
    t0: float,
    *,
    n: int = config.N_PARTICLES,
    hours: int = config.HOURS_BACK,
    sigma_km: float = config.SIGMA_KM,
    rng: np.random.Generator,
    bbox=config.BBOX,
) -> tuple[np.ndarray, np.ndarray]:
    """Release n particles per start point at t0 and step backward 1 h at a time.

    Returns positions (hours+1, P, 2) as (lon, lat) and an active mask (hours+1, P);
    index k is k hours before t0. Moving backward means subtracting the wind vector.
    """
    lon = np.repeat(np.asarray(lon0, float), n)
    lat = np.repeat(np.asarray(lat0, float), n)
    p = lon.size
    pos = np.empty((hours + 1, p, 2))
    active = np.empty((hours + 1, p), bool)
    alive = _inside(lon, lat, bbox)
    pos[0, :, 0], pos[0, :, 1], active[0] = lon, lat, alive
    for k in range(1, hours + 1):
        u, v = transport_wind(grid, lon, lat, t0 - (k - 1))
        dx_km = -u * 3.6 + rng.normal(0.0, sigma_km, p)  # m/s * 3600 s / 1000
        dy_km = -v * 3.6 + rng.normal(0.0, sigma_km, p)
        new_lon = lon + dx_km / (KM_PER_DEG * np.cos(np.radians(lat)))
        new_lat = lat + dy_km / KM_PER_DEG
        lon = np.where(alive, new_lon, lon)
        lat = np.where(alive, new_lat, lat)
        alive = alive & _inside(lon, lat, bbox)
        pos[k, :, 0], pos[k, :, 1], active[k] = lon, lat, alive
    return pos, active


def _project(lon, lat) -> np.ndarray:
    return np.column_stack(
        [lon * KM_PER_DEG * np.cos(np.radians(REF_LAT)), lat * KM_PER_DEG]
    )


def score_hotspots(
    pos: np.ndarray,
    active: np.ndarray,
    t0: float,
    hot: Hotspots,
    *,
    n_per_group: int,
) -> np.ndarray:
    """Score matrix (groups, hotspots), normalised per particle.

    A particle k hours back matches hotspots detected within ±MATCH_WINDOW_H of that
    time (never after t0) and within RADIUS_BASE + RADIUS_PER_HOUR * k km.
    """
    groups = pos.shape[1] // n_per_group
    scores = np.zeros((groups, len(hot)))
    if len(hot) == 0:
        return scores
    hxy = _project(hot.lon, hot.lat)
    weight = hot.weight
    for k in range(pos.shape[0]):
        tk = t0 - k
        win = (hot.t >= tk - config.MATCH_WINDOW_H) & (
            hot.t <= min(tk + config.MATCH_WINDOW_H, t0)
        )
        hidx = np.flatnonzero(win)
        pidx = np.flatnonzero(active[k])
        if hidx.size == 0 or pidx.size == 0:
            continue
        tree = cKDTree(hxy[hidx])
        radius = config.RADIUS_BASE_KM + config.RADIUS_PER_HOUR_KM * k
        hits = tree.query_ball_point(_project(pos[k, pidx, 0], pos[k, pidx, 1]), radius)
        lens = np.fromiter((len(h) for h in hits), int, count=len(hits))
        if lens.sum() == 0:
            continue
        part = np.repeat(pidx, lens)
        hs = hidx[np.concatenate([np.asarray(h, int) for h in hits if h])]
        np.add.at(scores, (part // n_per_group, hs), weight[hs] * np.exp(-k / config.DECAY_H))
    return scores / n_per_group


def region_shares(scores: np.ndarray, region: np.ndarray, n_regions: int) -> np.ndarray:
    """Percent of total score per region; hotspots with region -1 (unassigned) are ignored."""
    totals = np.bincount(region[region >= 0], weights=scores[region >= 0], minlength=n_regions)
    s = totals.sum()
    return totals * (100.0 / s) if s > 0 else totals


def round_to_step(values: list[float], step: int = 5) -> list[int]:
    """Round percentages to multiples of `step` that still sum to 100 (largest remainder)."""
    units = [v / step for v in values]
    floors = [int(u) for u in units]
    missing = round(100 / step) - sum(floors)
    order = sorted(range(len(units)), key=lambda i: units[i] - floors[i], reverse=True)
    for i in order[: max(missing, 0)]:
        floors[i] += 1
    return [f * step for f in floors]


def mean_trajectory(
    pos: np.ndarray, active: np.ndarray, *, n_per_group: int, min_active: float = 0.2
) -> list[list[list[float]]]:
    """Per group: hourly mean (lon, lat) of active particles, stopping when too few remain."""
    steps, p, _ = pos.shape
    groups = p // n_per_group
    pg = pos.reshape(steps, groups, n_per_group, 2)
    ag = active.reshape(steps, groups, n_per_group)
    out = []
    for g in range(groups):
        line = []
        for k in range(steps):
            a = ag[k, g]
            if a.mean() < min_active:
                break
            m = pg[k, g][a].mean(axis=0)
            line.append([round(float(m[0]), 3), round(float(m[1]), 3)])
        out.append(line)
    return out
