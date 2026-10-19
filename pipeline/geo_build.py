"""Derive the small committed geo files from the raw downloads.

geo/tambons.json      Chiang Rai tambon centroids + Thai names (OCHA COD-AB, RTSD)
geo/regions.geojson   attribution regions inside the bbox: Thai amphoe (GADM L2),
                      Myanmar districts (GADM L2), Lao provinces (GADM L1), and
                      Natural Earth countries for everything else (CHN, VNM, ...)
"""
from __future__ import annotations

import json
from pathlib import Path

import openpyxl
from shapely.geometry import box, mapping, shape

import config
from geo_download import RAW, download

GEO = Path(__file__).parent / "geo"

# Thai labels for the foreign regions that intersect the bbox. Anything missing falls
# back to the English GADM name.
MMR_TH = {
    "Tarchilaik": "ท่าขี้เหล็ก",
    "Kengtung": "เชียงตุง",
    "Mongsat": "เมืองสาด",
    "Mongphat": "เมืองพยาก",
    "Loilen": "ลอยเลม",
    "Taunggye": "ตองจี",
    "Lasho": "ล่าเสี้ยว",
    "Kyaukme": "จ๊อกเม",
    "Loikaw": "ลอยก่อ",
    "Bawlake": "บอลาเค",
    "Hpa-an": "ผาอัน",
    "Myawady": "เมียวดี",
    "Kawkareik": "กอกะเร็ก",
    "Taungoo": "ตองอู",
    "Pegu": "พะโค",
    "Thaton": "สะเทิม",
    "Mawlamyine": "มะละแหม่ง",
    "Meiktila": "เมะทีลา",
    "Yamethin": "ยะเมสิน",
    "Kyaukse": "จ๊อกแซ",
    "Mandalay": "มัณฑะเลย์",
}
LAO_TH = {
    "Bokeo": "บ่อแก้ว",
    "LouangNamtha": "หลวงน้ำทา",
    "Oudômxai": "อุดมไซ",
    "Phôngsali": "พงสาลี",
    "Louangphrabang": "หลวงพระบาง",
    "Xaignabouri": "ไชยบุรี",
    "Vientiane": "เวียงจันทน์",
    "Vientiane[prefecture]": "นครหลวงเวียงจันทน์",
    "Xaisômboun": "ไชสมบูรณ์",
    "Xiangkhoang": "เชียงขวาง",
    "Bolikhamxai": "บอลิคำไซ",
}
COUNTRY_TH = {
    "THA": "ไทย",
    "MMR": "เมียนมา",
    "LAO": "ลาว",
    "CHN": "จีน",
    "VNM": "เวียดนาม",
}

SIMPLIFY_DEG = 0.003  # ~300 m; fine for district-level attribution


def _sheet(wb, name: str) -> list[dict]:
    rows = wb[name].iter_rows(values_only=True)
    header = next(rows)
    return [dict(zip(header, r)) for r in rows]


def build_tambons(wb) -> list[dict]:
    out = []
    for r in _sheet(wb, "tha_admin3"):
        if r["adm1_pcode"] != f"TH{config.PROVINCE_CODE}":
            continue
        out.append(
            {
                "id": r["adm3_pcode"],
                "name_th": r["adm3_name1"],
                "name_en": r["adm3_name"],
                "amphoe_th": r["adm2_name1"],
                "amphoe_en": r["adm2_name"],
                "lat": round(float(r["center_lat"]), 5),
                "lon": round(float(r["center_lon"]), 5),
            }
        )
    out.sort(key=lambda t: t["id"])
    return out


def _clip(geom, bbox):
    g = geom.intersection(bbox).simplify(SIMPLIFY_DEG, preserve_topology=True)
    return None if g.is_empty else g


def _load(name: str) -> list[dict]:
    return json.loads((RAW / name).read_text(encoding="utf-8"))["features"]


def build_regions(wb) -> dict:
    w, s, e, n = config.BBOX
    bbox = box(w - 0.5, s - 0.5, e + 0.5, n + 0.5)
    amphoe_th = {r["adm2_pcode"]: r for r in _sheet(wb, "tha_admin2")}
    feats = []

    def add(geom, **props):
        g = _clip(geom, bbox)
        if g is not None:
            feats.append({"type": "Feature", "properties": props, "geometry": mapping(g)})

    for f in _load("gadm41_THA_2.json"):
        p = f["properties"]
        h = amphoe_th.get(f"TH{p['CC_2']}")
        name_th = h["adm2_name1"] if h else p["NL_NAME_2"].removeprefix("อำเภอ")
        province_th = h["adm1_name1"] if h else p["NL_NAME_1"].removeprefix("จังหวัด")
        add(
            shape(f["geometry"]),
            key=f"THA.{p['CC_2']}",
            country="THA",
            name_th=name_th,
            name_en=p["NAME_2"],
            province_th=province_th,
        )
    for f in _load("gadm41_MMR_2.json"):
        p = f["properties"]
        add(
            shape(f["geometry"]),
            key=f"MMR.{p['NAME_2']}",
            country="MMR",
            name_th=MMR_TH.get(p["NAME_2"], p["NAME_2"]),
            name_en=p["NAME_2"],
            province_th=None,
        )
    for f in _load("gadm41_LAO_1.json"):
        p = f["properties"]
        add(
            shape(f["geometry"]),
            key=f"LAO.{p['NAME_1']}",
            country="LAO",
            name_th=LAO_TH.get(p["NAME_1"], p["NAME_1"]),
            name_en=p["NAME_1"],
            province_th=None,
        )
    for f in _load("ne_50m_admin_0_countries.geojson"):
        a3 = f["properties"]["ADM0_A3"]
        if a3 in ("THA", "MMR", "LAO"):
            continue
        add(
            shape(f["geometry"]),
            key=a3,
            country=a3,
            name_th=COUNTRY_TH.get(a3, f["properties"]["NAME"]),
            name_en=f["properties"]["NAME"],
            province_th=None,
        )
    return {"type": "FeatureCollection", "features": feats}


def main() -> None:
    download()
    wb = openpyxl.load_workbook(RAW / "tha_admin_boundaries.xlsx", read_only=True)
    tambons = build_tambons(wb)
    regions = build_regions(wb)
    (GEO / "tambons.json").write_text(
        json.dumps(tambons, ensure_ascii=False, indent=1), encoding="utf-8"
    )
    (GEO / "regions.geojson").write_text(
        json.dumps(regions, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )
    print(f"tambons={len(tambons)} regions={len(regions['features'])}")


if __name__ == "__main__":
    main()
