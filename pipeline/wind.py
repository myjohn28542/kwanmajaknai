"""Regular lon/lat/time wind grid with bilinear-in-space, linear-in-time sampling."""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np

import config

FIELDS = ("u10", "v10", "u100", "v100", "u850", "v850", "blh")


def uv_from_met(speed: np.ndarray, direction_deg: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Meteorological direction is where the wind blows FROM, clockwise from north.

    The returned (u, v) is where the air goes: u>0 eastward, v>0 northward.
    """
    rad = np.radians(direction_deg)
    return -speed * np.sin(rad), -speed * np.cos(rad)


def _axis(coord: np.ndarray, x: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Lower index and fractional weight on a regular ascending axis, clamped to edges."""
    n = coord.size
    step = coord[1] - coord[0]
    f = np.clip((x - coord[0]) / step, 0.0, n - 1)
    i0 = np.minimum(np.floor(f).astype(int), n - 2)
    return i0, f - i0


@dataclass
class WindGrid:
    lons: np.ndarray  # (nx,) ascending, regular
    lats: np.ndarray  # (ny,) ascending, regular
    times: np.ndarray  # (nt,) epoch hours UTC, ascending, regular
    fields: dict[str, np.ndarray]  # name -> (nt, ny, nx)

    def sample(self, name: str, lon, lat, t) -> np.ndarray:
        lon, lat, t = np.broadcast_arrays(
            np.asarray(lon, float), np.asarray(lat, float), np.asarray(t, float)
        )
        f = self.fields[name]
        i0, wx = _axis(self.lons, lon)
        j0, wy = _axis(self.lats, lat)
        k0, wt = _axis(self.times, t)

        def plane(k):
            return (
                f[k, j0, i0] * (1 - wx) * (1 - wy)
                + f[k, j0, i0 + 1] * wx * (1 - wy)
                + f[k, j0 + 1, i0] * (1 - wx) * wy
                + f[k, j0 + 1, i0 + 1] * wx * wy
            )

        return plane(k0) * (1 - wt) + plane(k0 + 1) * wt


def transport_wind(grid: WindGrid, lon, lat, t) -> tuple[np.ndarray, np.ndarray]:
    """Blended wind that carries smoke (m/s).

    Mixed (daytime) boundary layer: smoke is lofted, so 0.5*100 m + 0.5*850 hPa.
    Stable (night): smoke stays low, so 0.7*10 m + 0.3*100 m.
    """
    s = lambda n: grid.sample(n, lon, lat, t)  # noqa: E731
    mixed = s("blh") >= config.MIXED_BLH_M
    u = np.where(mixed, 0.5 * s("u100") + 0.5 * s("u850"), 0.7 * s("u10") + 0.3 * s("u100"))
    v = np.where(mixed, 0.5 * s("v100") + 0.5 * s("v850"), 0.7 * s("v10") + 0.3 * s("v100"))
    return u, v
