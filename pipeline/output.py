"""Static JSON written for the web app (web/public/data/)."""
from __future__ import annotations

import json
from pathlib import Path

import config


def _write_json(path: Path, obj) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    tmp.replace(path)


def read_json(path: Path, default=None):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return default


def merge_snapshots(existing: list[dict], new: list[dict], keep: int) -> list[dict]:
    """Newest first, one per hour (new wins), at most `keep`."""
    by_t = {s["t"]: s for s in existing}
    by_t.update({s["t"]: s for s in new})
    return sorted(by_t.values(), key=lambda s: s["t"], reverse=True)[:keep]


def write_tambon(out: Path, tambon: dict, snapshots: list[dict]) -> dict:
    path = out / f"{tambon['id']}.json"
    old = read_json(path, {}) or {}
    doc = {
        "id": tambon["id"],
        "name_th": tambon["name_th"],
        "name_en": tambon["name_en"],
        "amphoe_th": tambon["amphoe_th"],
        "lat": tambon["lat"],
        "lon": tambon["lon"],
        "snapshots": merge_snapshots(old.get("snapshots", []), snapshots, config.SNAPSHOTS_KEPT),
    }
    _write_json(path, doc)
    return doc


def write_index(out: Path, docs: list[dict], updated_at: str) -> None:
    times = sorted({s["t"] for d in docs for s in d["snapshots"]}, reverse=True)
    tambons = []
    for d in docs:
        latest = d["snapshots"][0] if d["snapshots"] else None
        tambons.append(
            {
                "id": d["id"],
                "name_th": d["name_th"],
                "name_en": d["name_en"],
                "amphoe_th": d["amphoe_th"],
                "lat": d["lat"],
                "lon": d["lon"],
                "status": latest and latest["status"],
                "top": latest and (latest["regions"][0] if latest["regions"] else None),
                "pm25": latest and latest["pm25"],
            }
        )
    _write_json(
        out / "index.json",
        {"updated_at": updated_at, "latest_t": times[0] if times else None,
         "times": times[: config.SNAPSHOTS_KEPT], "tambons": tambons},
    )


def write_hotspots(out: Path, t_iso: str, points: list[list[float]]) -> None:
    """points: [lon, lat, frp, age_h] with age relative to t_iso (the latest snapshot)."""
    _write_json(out / "hotspots.json", {"t": t_iso, "points": points})
