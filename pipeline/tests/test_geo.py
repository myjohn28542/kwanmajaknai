import numpy as np
import pytest

from geo import Region, RegionIndex, load_tambons


@pytest.fixture(scope="module")
def regions():
    return RegionIndex.load()


@pytest.mark.parametrize(
    "lon,lat,key,label",
    [
        (100.40, 20.27, "THA.5703", "เชียงของ"),  # Chiang Khong town
        (99.88, 20.40, "THA.5709", "แม่สาย"),  # Mae Sai, across the river from Tachileik
        (99.85, 20.50, "MMR.Tarchilaik", "ท่าขี้เหล็ก (เมียนมา)"),  # Tachileik
        (98.98, 18.79, "THA.5001", "เมืองเชียงใหม่ (เชียงใหม่)"),  # Chiang Mai city
        (100.95, 20.98, "LAO.LouangNamtha", "หลวงน้ำทา (ลาว)"),  # Luang Namtha
        (100.80, 22.00, "CHN", "จีน"),  # Jinghong, Yunnan
    ],
)
def test_region_assignment(regions, lon, lat, key, label):
    idx = regions.assign(np.array([lon]), np.array([lat]))[0]
    assert idx >= 0
    assert regions.regions[idx].key == key
    assert regions.regions[idx].label_th == label


def test_point_far_outside_any_region_is_unknown(regions):
    assert regions.assign(np.array([90.0]), np.array([10.0]))[0] == -1


def test_empty_input(regions):
    assert regions.assign(np.array([]), np.array([])).size == 0


def test_label_for_chiang_rai_amphoe_has_no_province():
    r = Region(key="THA.5712", country="THA", name_th="พญาเม็งราย", name_en="", province_th="เชียงราย")
    assert r.label_th == "พญาเม็งราย"


def test_tambons_cover_chiang_rai():
    tambons = load_tambons()
    assert len(tambons) == 124
    assert all(t["id"].startswith("TH57") for t in tambons)
    mengrai = next(t for t in tambons if t["id"] == "TH571204")
    assert (mengrai["name_th"], mengrai["amphoe_th"]) == ("เม็งราย", "พญาเม็งราย")
