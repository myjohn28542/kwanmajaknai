import numpy as np
import pytest

from attribution import (
    Hotspots,
    back_trajectories,
    mean_trajectory,
    region_shares,
    round_to_step,
    score_hotspots,
)
from wind import WindGrid

BBOX = (96.5, 16.5, 103.0, 22.5)


def constant_grid(u: float, v: float) -> WindGrid:
    lons = np.arange(96.5, 103.01, 0.5)
    lats = np.arange(16.5, 22.51, 0.5)
    times = np.arange(0.0, 100.0)
    shape = (times.size, lats.size, lons.size)
    f = {n: np.zeros(shape) for n in ("u10", "v10", "u100", "v100", "u850", "v850")}
    for n in ("u10", "u100", "u850"):
        f[n][:] = u
    for n in ("v10", "v100", "v850"):
        f[n][:] = v
    f["blh"] = np.full(shape, 1000.0)
    return WindGrid(lons=lons, lats=lats, times=times, fields=f)


def run(grid, hours=10, n=1, sigma=0.0, lon=100.0, lat=20.0, t0=90.0):
    rng = np.random.default_rng(0)
    return back_trajectories(
        grid, np.array([lon]), np.array([lat]), t0, n=n, hours=hours,
        sigma_km=sigma, rng=rng, bbox=BBOX,
    )


def test_westerly_backward_trajectory_goes_west():
    # Wind FROM the west at 10 m/s blows smoke eastward. The air now over the
    # receptor was therefore WEST of it an hour ago: stepping backward = upwind = west.
    pos, active = run(constant_grid(u=10.0, v=0.0), hours=1)
    assert active.all()
    dlon_km = (pos[1, 0, 0] - pos[0, 0, 0]) * 111.32 * np.cos(np.radians(20.0))
    assert dlon_km == pytest.approx(-36.0, rel=0.01)  # 10 m/s * 3600 s = 36 km
    assert pos[1, 0, 1] == pytest.approx(20.0)


def test_southerly_backward_trajectory_goes_south():
    pos, _ = run(constant_grid(u=0.0, v=5.0), hours=2)
    assert pos[2, 0, 1] < pos[1, 0, 1] < pos[0, 0, 1]
    assert pos[2, 0, 0] == pytest.approx(100.0)


def test_particles_leaving_bbox_become_inactive_and_freeze():
    pos, active = run(constant_grid(u=20.0, v=0.0), hours=48, lon=97.0)
    assert not active[-1, 0]
    first_out = int(np.argmin(active[:, 0]))
    assert (pos[first_out:, 0] == pos[first_out, 0]).all()


def test_random_walk_spreads_the_ensemble():
    pos, _ = run(constant_grid(0.0, 0.0), hours=24, n=200, sigma=3.0)
    spread_km = pos[-1, :, 1].std() * 111.32
    assert 3.0 * np.sqrt(24) * 0.8 < spread_km < 3.0 * np.sqrt(24) * 1.2


def hotspots(lon, lat, t, frp=10.0, conf=1.0, region=0):
    n = len(lon)
    return Hotspots(
        lon=np.asarray(lon, float), lat=np.asarray(lat, float), t=np.asarray(t, float),
        frp=np.full(n, frp), conf_w=np.full(n, conf), region=np.full(n, region, int),
    )


def test_hotspot_on_upwind_path_is_scored_with_decay():
    grid = constant_grid(u=10.0, v=0.0)
    pos, active = run(grid, hours=10)
    # put a fire exactly where the trajectory is 5 h back, detected at that time
    lon5, lat5 = pos[5, 0]
    hot = hotspots([lon5], [lat5], [90.0 - 5])
    scores = score_hotspots(pos, active, 90.0, hot, n_per_group=1)
    assert scores.shape == (1, 1)
    # The particle passes within r(k) of the fire at several steps around k=5; the
    # k=5 term alone is log1p(10)*exp(-5/24).
    assert scores[0, 0] >= np.log1p(10.0) * np.exp(-5 / 24)


def test_downwind_fire_scores_zero():
    grid = constant_grid(u=10.0, v=0.0)
    pos, active = run(grid, hours=10)
    hot = hotspots([101.0], [20.0], [85.0])  # east of the receptor = downwind
    assert score_hotspots(pos, active, 90.0, hot, n_per_group=1)[0, 0] == 0.0


def test_fire_detected_after_target_time_is_ignored():
    grid = constant_grid(0.0, 0.0)
    pos, active = run(grid, hours=5)
    hot = hotspots([100.0], [20.0], [92.0])  # 2 h AFTER t0=90, within the ±6 h window
    assert score_hotspots(pos, active, 90.0, hot, n_per_group=1)[0, 0] == 0.0


def test_confidence_and_frp_weighting():
    grid = constant_grid(0.0, 0.0)
    pos, active = run(grid, hours=0)
    hot = Hotspots(
        lon=np.array([100.0, 100.0]), lat=np.array([20.0, 20.0]), t=np.array([90.0, 90.0]),
        frp=np.array([10.0, 10.0]), conf_w=np.array([1.0, 0.3]), region=np.array([0, 1]),
    )
    s = score_hotspots(pos, active, 90.0, hot, n_per_group=1)[0]
    assert s[0] == pytest.approx(np.log1p(10.0))
    assert s[1] == pytest.approx(0.3 * np.log1p(10.0))


def test_scores_are_normalised_per_particle():
    grid = constant_grid(0.0, 0.0)
    hot = hotspots([100.0], [20.0], [90.0])
    pos1, a1 = run(grid, hours=0, n=1)
    pos5, a5 = run(grid, hours=0, n=5)
    s1 = score_hotspots(pos1, a1, 90.0, hot, n_per_group=1)
    s5 = score_hotspots(pos5, a5, 90.0, hot, n_per_group=5)
    assert s5[0, 0] == pytest.approx(s1[0, 0])


def test_region_shares_normalise_to_100():
    shares = region_shares(np.array([3.0, 1.0, 0.0, 4.0]), np.array([0, 1, 1, 2]), 3)
    assert shares.sum() == pytest.approx(100.0)
    assert shares.tolist() == pytest.approx([37.5, 12.5, 50.0])


def test_region_shares_of_zero_total_is_zero():
    assert region_shares(np.zeros(3), np.array([0, 1, 2]), 3).sum() == 0.0


def test_round_to_step_keeps_sum_100():
    assert sum(round_to_step([61.0, 23.0, 16.0], 5)) == 100
    assert round_to_step([61.0, 23.0, 16.0], 5) == [60, 25, 15]
    assert sum(round_to_step([33.4, 33.3, 33.3], 5)) == 100


def test_mean_trajectory_ignores_inactive_particles():
    pos = np.zeros((2, 2, 2))
    pos[1, 0] = [1.0, 1.0]
    pos[1, 1] = [9.0, 9.0]
    active = np.array([[True, True], [True, False]])
    traj = mean_trajectory(pos, active, n_per_group=2)
    assert traj[0][1] == [1.0, 1.0]
