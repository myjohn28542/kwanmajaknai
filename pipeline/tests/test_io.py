from datetime import datetime, timezone

import numpy as np
import pytest

import firms
import meteo
import output


def test_firms_parse_rows_handles_api_and_public_formats():
    rows = [
        # area API: unpadded acq_time, single-letter confidence
        {"latitude": "20.1", "longitude": "99.9", "acq_date": "2026-11-20", "acq_time": "618",
         "frp": "12.5", "confidence": "h", "daynight": "D"},
        # public CSV: full-word confidence
        {"latitude": "20.2", "longitude": "100.0", "acq_date": "2026-11-20", "acq_time": "1845",
         "frp": "", "confidence": "low", "daynight": "N"},
        # duplicate of the first row (same detection cached twice) is dropped
        {"latitude": "20.1", "longitude": "99.9", "acq_date": "2026-11-20", "acq_time": "0618",
         "frp": "12.5", "confidence": "h", "daynight": "D"},
    ]
    a = firms.parse_rows(rows)
    assert a["lon"].tolist() == [99.9, 100.0]
    t0 = datetime(2026, 11, 20, 6, 18, tzinfo=timezone.utc).timestamp() / 3600
    assert a["t"][0] == pytest.approx(t0)
    assert a["conf_w"].tolist() == [1.0, 0.3]
    assert a["frp"].tolist() == [12.5, 0.0]


def test_firms_dates_needed_cover_three_full_days():
    days = firms.dates_needed(datetime(2026, 11, 20, 1, tzinfo=timezone.utc))
    assert [d.isoformat() for d in days] == ["2026-11-20", "2026-11-19", "2026-11-18", "2026-11-17"]


def fake_location(speed10: float, dir10: float, n_hours: int = 3) -> dict:
    h = {"time": [f"2026-11-20T{i:02d}:00" for i in range(n_hours)]}
    for v in meteo.VARS:
        h[v] = [0.0] * n_hours
    h["wind_speed_10m"] = [speed10] * n_hours
    h["wind_direction_10m"] = [dir10] * n_hours
    h["wind_speed_850hPa"] = [None] * n_hours  # gap -> falls back to 100 m
    return {"utc_offset_seconds": 25200, "hourly": h}


def test_meteo_to_grid_layout_and_units():
    lons, lats = meteo.grid_axes()
    raw = [fake_location(0.0, 0.0) for _ in range(lons.size * lats.size)]
    raw[1] = fake_location(10.0, 270.0)  # second point = (lat0, lon1): lat-major order
    g = meteo.to_grid(raw)
    assert g.fields["u10"].shape == (3, lats.size, lons.size)
    assert g.fields["u10"][0, 0, 1] == pytest.approx(10.0)  # westerly -> +u
    assert g.fields["u850"][0, 0, 1] == g.fields["u100"][0, 0, 1]
    # Local 00:00 at UTC+7 is 17:00 UTC the previous day.
    expect = datetime(2026, 11, 19, 17, tzinfo=timezone.utc).timestamp() / 3600
    assert g.times[0] == pytest.approx(expect)


def test_merge_snapshots_newest_first_dedup_and_capped():
    old = [{"t": f"2026-11-20T{h:02d}:00+07:00", "v": "old"} for h in range(5)]
    new = [{"t": "2026-11-20T04:00+07:00", "v": "new"}, {"t": "2026-11-20T05:00+07:00", "v": "new"}]
    merged = output.merge_snapshots(old, new, keep=3)
    assert [s["t"][11:13] for s in merged] == ["05", "04", "03"]
    assert merged[1]["v"] == "new"


def test_write_tambon_keeps_history(tmp_path):
    tb = {"id": "TH571204", "name_th": "เม็งราย", "name_en": "Mengrai",
          "amphoe_th": "พญาเม็งราย", "lat": 19.86, "lon": 100.18}
    output.write_tambon(tmp_path, tb, [{"t": "2026-11-20T05:00+07:00"}])
    doc = output.write_tambon(tmp_path, tb, [{"t": "2026-11-20T06:00+07:00"}])
    assert [s["t"] for s in doc["snapshots"]] == ["2026-11-20T06:00+07:00", "2026-11-20T05:00+07:00"]
    assert np.isclose(doc["lat"], 19.86)
