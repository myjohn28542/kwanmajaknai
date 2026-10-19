"""Shared constants and env-driven settings."""
from __future__ import annotations

import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PIPELINE = ROOT / "pipeline"
CACHE = Path(os.environ.get("KWAN_CACHE_DIR", PIPELINE / "cache"))
OUT = Path(os.environ.get("KWAN_OUT_DIR", ROOT / "web" / "public" / "data"))

# west, south, east, north — Northern Thailand + Shan State + northern Laos
BBOX = (96.5, 16.5, 103.0, 22.5)
GRID_STEP = 0.5
PROVINCE_CODE = "57"  # Chiang Rai

FIRMS_MAP_KEY = os.environ.get("FIRMS_MAP_KEY", "").strip()
FIRMS_SOURCES = ("VIIRS_SNPP_NRT", "VIIRS_NOAA20_NRT", "VIIRS_NOAA21_NRT")
FIRMS_DAYS = 3

# Attribution parameters (see PLAN.md)
N_PARTICLES = 60
HOURS_BACK = 48
SIGMA_KM = 3.0
MATCH_WINDOW_H = 6.0
RADIUS_BASE_KM = 8.0
RADIUS_PER_HOUR_KM = 0.3
DECAY_H = 24.0
MIXED_BLH_M = 500.0
MIN_SCORE = 3.0  # per-particle total below this => "no significant fire source".
# One small fire (FRP ~3 MW) fully crossed by the ensemble scores ~1-2, so 3 means
# "several fires on the path". Re-check against real data once the season starts.
SNAPSHOTS_KEPT = 24
