"""Pipeline CLI.

    uv run python run.py fetch                 # FIRMS + wind + PM2.5 into pipeline/cache/
    uv run python run.py compute               # attribution for the current hour
    uv run python run.py compute --backfill 24 # also fill the previous 23 hours
    uv run python run.py compute --at 2026-11-20T06:00+07:00
    uv run python run.py all                   # fetch + compute
"""
from __future__ import annotations

import argparse
import time
from datetime import datetime, timedelta, timezone

import numpy as np

import airq
import config
import firms
import meteo
import output
import sentence
from attribution import (
    Hotspots,
    back_trajectories,
    mean_trajectory,
    region_shares,
    score_hotspots,
)
from geo import COUNTRY_TH, RegionIndex, load_tambons

BKK = timezone(timedelta(hours=7))
TOP_REGIONS = 5
TOP_HOTSPOTS = 5


def floor_hour(dt: datetime) -> datetime:
    return dt.astimezone(BKK).replace(minute=0, second=0, microsecond=0)


def fetch(now: datetime) -> None:
    t = time.time()
    firms.fetch(now)
    meteo.fetch(now)
    airq.fetch(now, load_tambons())
    print(f"fetch ok in {time.time() - t:.1f}s (FIRMS {'area API' if config.FIRMS_MAP_KEY else 'public CSV'})")


def load_hotspots(now: datetime, regions: RegionIndex) -> Hotspots:
    raw = firms.load(now)
    return Hotspots(**raw, region=regions.assign(raw["lon"], raw["lat"]))


def snapshot_for(
    g: int, tambon: dict, scores: np.ndarray, hot: Hotspots, regions: RegionIndex,
    traj: list, t_local: datetime, now_local: datetime, pm25: float | None,
) -> dict:
    t0 = t_local.timestamp() / 3600.0
    total = float(scores.sum())
    significant = total >= config.MIN_SCORE
    shares = region_shares(scores, hot.region, len(regions))
    order = [i for i in np.argsort(-shares) if shares[i] > 0]
    region_list = [
        {
            "key": regions.regions[i].key,
            "label_th": regions.regions[i].label_th,
            "country": regions.regions[i].country,
            "pct": round(float(shares[i]), 1),
        }
        for i in order[:TOP_REGIONS]
    ]
    by_country: dict[str, float] = {}
    for i in order:
        c = regions.regions[i].country
        by_country[c] = by_country.get(c, 0.0) + float(shares[i])
    countries = [
        {"country": c, "name_th": COUNTRY_TH.get(c, c), "pct": round(p, 1)}
        for c, p in sorted(by_country.items(), key=lambda kv: -kv[1])
    ]
    hs = [i for i in np.argsort(-scores)[:TOP_HOTSPOTS] if scores[i] > 0]
    hotspots = [
        {
            "lat": round(float(hot.lat[i]), 2),  # ~1 km: enough for a map, not a plot
            "lon": round(float(hot.lon[i]), 2),
            "frp": round(float(hot.frp[i]), 1),
            "age_h": round(float(t0 - hot.t[i]), 1),
            "region": regions.regions[hot.region[i]].label_th if hot.region[i] >= 0 else None,
            "pct": round(100.0 * float(scores[i]) / total, 1),
        }
        for i in hs
    ]
    return {
        "t": t_local.isoformat(timespec="minutes"),
        "status": "ok" if significant else "no_signal",
        "score": round(total, 3),
        "sentence": sentence.build(
            tambon, t_local, now_local,
            [(r["label_th"], r["pct"]) for r in region_list] if significant else [],
            significant,
        ),
        "regions": region_list if significant else [],
        "countries": countries if significant else [],
        "hotspots": hotspots,
        "trajectory": traj,
        "pm25": pm25,
    }


def compute(now: datetime, at: datetime | None = None, backfill: int = 1) -> None:
    started = time.time()
    tambons = load_tambons()
    regions = RegionIndex.load()
    grid = meteo.load_latest()
    hot = load_hotspots(now, regions)
    aq = airq.load_latest()
    target = floor_hour(at or now)
    now_local = now.astimezone(BKK)
    lon0 = np.array([t["lon"] for t in tambons])
    lat0 = np.array([t["lat"] for t in tambons])
    n = config.N_PARTICLES

    per_tambon: dict[str, list[dict]] = {t["id"]: [] for t in tambons}
    for back in range(backfill):
        t_local = target - timedelta(hours=back)
        t0 = t_local.timestamp() / 3600.0
        rng = np.random.default_rng(int(t0))  # reproducible per hour
        pos, active = back_trajectories(grid, lon0, lat0, t0, rng=rng)
        scores = score_hotspots(pos, active, t0, hot, n_per_group=n)
        trajs = mean_trajectory(pos, active, n_per_group=n)
        for g, tb in enumerate(tambons):
            pm = airq.value_at(aq.get(tb["id"]), t0)
            per_tambon[tb["id"]].append(
                snapshot_for(g, tb, scores[g], hot, regions, trajs[g], t_local, now_local, pm)
            )

    docs = [output.write_tambon(config.OUT, tb, per_tambon[tb["id"]]) for tb in tambons]
    output.write_index(config.OUT, docs, now.astimezone(BKK).isoformat(timespec="seconds"))

    latest = max(datetime.fromisoformat(d["snapshots"][0]["t"]) for d in docs)
    tl = latest.timestamp() / 3600.0
    keep = (hot.t <= tl) & (hot.t >= tl - config.FIRMS_DAYS * 24)
    pts = [
        [round(float(hot.lon[i]), 2), round(float(hot.lat[i]), 2),
         round(float(hot.frp[i]), 1), round(float(tl - hot.t[i]), 1)]
        for i in np.flatnonzero(keep)
    ]
    output.write_hotspots(config.OUT, latest.isoformat(timespec="minutes"), pts)
    ok = sum(1 for d in docs if d["snapshots"][0]["status"] == "ok")
    print(
        f"compute ok in {time.time() - started:.1f}s: {len(tambons)} tambons x {backfill} h, "
        f"{len(hot)} hotspots ({len(pts)} on map), {ok} tambons with a significant source"
    )


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["fetch", "compute", "all"])
    ap.add_argument("--at", help="target hour (ISO 8601); default: current hour")
    ap.add_argument("--backfill", type=int, default=1, help="hours to compute ending at --at")
    a = ap.parse_args()
    now = datetime.now(timezone.utc)
    at = datetime.fromisoformat(a.at) if a.at else None
    if a.cmd in ("fetch", "all"):
        fetch(now)
    if a.cmd in ("compute", "all"):
        compute(now, at, a.backfill)


if __name__ == "__main__":
    main()
