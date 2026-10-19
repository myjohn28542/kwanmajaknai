"""Load the committed geo files and assign points to attribution regions."""
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import shapely
from shapely.geometry import shape

GEO = Path(__file__).parent / "geo"
NEAREST_MAX_DEG = 0.05  # points in boundary gaps (rivers, simplification) snap to nearest

COUNTRY_TH = {"THA": "ไทย", "MMR": "เมียนมา", "LAO": "ลาว", "CHN": "จีน", "VNM": "เวียดนาม"}


@dataclass
class Region:
    key: str
    country: str
    name_th: str
    name_en: str
    province_th: str | None

    @property
    def label_th(self) -> str:
        """District-level label only, e.g. 'เชียงของ', 'ฝาง (เชียงใหม่)', 'ท่าขี้เหล็ก (เมียนมา)'."""
        if self.country == "THA":
            if self.province_th in (None, "เชียงราย"):
                return self.name_th
            return f"{self.name_th} ({self.province_th})"
        if self.key == self.country:  # whole-country region (Natural Earth fallback)
            return self.name_th
        return f"{self.name_th} ({COUNTRY_TH.get(self.country, self.country)})"


class RegionIndex:
    def __init__(self, features: list[dict]):
        self.regions = [Region(**{k: f["properties"][k] for k in Region.__annotations__}) for f in features]
        self.geoms = [shape(f["geometry"]) for f in features]
        self.tree = shapely.STRtree(self.geoms)
        # Subnational features come first in the file; prefer them over country fallbacks.
        self.priority = np.array([0 if r.key != r.country else 1 for r in self.regions])

    @classmethod
    def load(cls, path: Path = GEO / "regions.geojson") -> "RegionIndex":
        return cls(json.loads(path.read_text(encoding="utf-8"))["features"])

    def __len__(self) -> int:
        return len(self.regions)

    def assign(self, lon: np.ndarray, lat: np.ndarray) -> np.ndarray:
        """Region index per point, -1 when nothing is within NEAREST_MAX_DEG."""
        pts = shapely.points(np.asarray(lon, float), np.asarray(lat, float))
        out = np.full(len(pts), -1, int)
        if len(pts) == 0:
            return out
        pi, ri = self.tree.query(pts, predicate="intersects")
        # best match per point: lowest priority value, then lowest feature index
        order = np.lexsort((ri, self.priority[ri], pi))
        pi, ri = pi[order], ri[order]
        if pi.size:
            first = np.r_[True, pi[1:] != pi[:-1]]
            out[pi[first]] = ri[first]
        missing = np.flatnonzero(out < 0)
        if missing.size:
            mi, mr = self.tree.query_nearest(pts[missing], max_distance=NEAREST_MAX_DEG)
            out[missing[mi]] = mr
        return out


def load_tambons(path: Path = GEO / "tambons.json") -> list[dict]:
    return json.loads(path.read_text(encoding="utf-8"))
