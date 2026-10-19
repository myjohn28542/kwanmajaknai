import numpy as np
import pytest

from wind import WindGrid, transport_wind, uv_from_met


def grid_with(fields: dict[str, float] | None = None, blh: float = 1000.0) -> WindGrid:
    lons = np.array([99.0, 99.5, 100.0])
    lats = np.array([19.0, 19.5, 20.0])
    times = np.array([0.0, 1.0, 2.0])
    shape = (3, 3, 3)
    base = {n: np.zeros(shape) for n in ("u10", "v10", "u100", "v100", "u850", "v850")}
    for k, v in (fields or {}).items():
        base[k] = np.full(shape, v)
    base["blh"] = np.full(shape, blh)
    return WindGrid(lons=lons, lats=lats, times=times, fields=base)


@pytest.mark.parametrize(
    "direction,expected",
    [
        (270, (1.0, 0.0)),  # westerly: blows from the west TOWARD the east (+u)
        (90, (-1.0, 0.0)),  # easterly blows toward the west
        (180, (0.0, 1.0)),  # southerly blows toward the north (+v)
        (0, (0.0, -1.0)),  # northerly blows toward the south
    ],
)
def test_uv_from_meteorological_direction(direction, expected):
    u, v = uv_from_met(np.array([1.0]), np.array([direction]))
    assert u[0] == pytest.approx(expected[0], abs=1e-9)
    assert v[0] == pytest.approx(expected[1], abs=1e-9)


def test_bilinear_interpolation_inside_cell():
    g = grid_with()
    # field = lon + 10*lat + 100*t, which bilinear/linear interpolation must reproduce exactly
    lon_g, lat_g = np.meshgrid(g.lons, g.lats)
    g.fields["u10"] = np.stack([lon_g + 10 * lat_g + 100 * t for t in g.times])
    val = g.sample("u10", np.array([99.2]), np.array([19.7]), 1.25)
    assert val[0] == pytest.approx(99.2 + 197.0 + 125.0)


def test_interpolation_at_exact_grid_edges():
    g = grid_with()
    lon_g, lat_g = np.meshgrid(g.lons, g.lats)
    g.fields["u10"] = np.stack([lon_g + 10 * lat_g for _ in g.times])
    # the far corner (last index) must not index out of bounds and must be exact
    val = g.sample("u10", np.array([100.0, 99.0]), np.array([20.0, 19.0]), 2.0)
    assert val == pytest.approx([300.0, 289.0])


def test_interpolation_outside_grid_clamps_to_edge():
    g = grid_with()
    lon_g, lat_g = np.meshgrid(g.lons, g.lats)
    g.fields["u10"] = np.stack([lon_g + 10 * lat_g for _ in g.times])
    val = g.sample("u10", np.array([105.0, 90.0]), np.array([25.0, 10.0]), 99.0)
    assert val == pytest.approx([300.0, 289.0])


def test_transport_wind_blends_by_boundary_layer():
    fields = {"u10": 1.0, "u100": 2.0, "u850": 4.0}
    day = grid_with(fields, blh=1200.0)
    u, _ = transport_wind(day, np.array([99.5]), np.array([19.5]), 1.0)
    assert u[0] == pytest.approx(0.5 * 2.0 + 0.5 * 4.0)
    night = grid_with(fields, blh=100.0)
    u, _ = transport_wind(night, np.array([99.5]), np.array([19.5]), 1.0)
    assert u[0] == pytest.approx(0.7 * 1.0 + 0.3 * 2.0)
