"""Download raw admin boundaries into pipeline/geo/raw/ (gitignored)."""
from __future__ import annotations

import io
import zipfile
from pathlib import Path

import requests

RAW = Path(__file__).parent / "geo" / "raw"

GADM = "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_{iso}_{level}.json.zip"
# GADM level 3 for THA has only 98 of Chiang Rai's 124 tambons and no Thai names, so
# tambon names/centroids come from the OCHA COD-AB attribute table (RTSD, CC BY-IGO).
SOURCES = {
    "tha_admin_boundaries.xlsx": (
        "https://data.humdata.org/dataset/d24bdc45-eb4c-4e3d-8b16-44db02667c27/resource/"
        "a925b917-01ae-48c4-9279-7efe680a6b11/download/tha_admin_boundaries.xlsx"
    ),
    "gadm41_THA_2.json": GADM.format(iso="THA", level=2),
    "gadm41_MMR_2.json": GADM.format(iso="MMR", level=2),
    "gadm41_LAO_1.json": GADM.format(iso="LAO", level=1),
    "ne_50m_admin_0_countries.geojson": (
        "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/"
        "master/geojson/ne_50m_admin_0_countries.geojson"
    ),
}


def download(force: bool = False) -> None:
    RAW.mkdir(parents=True, exist_ok=True)
    for name, url in SOURCES.items():
        dest = RAW / name
        if dest.exists() and not force:
            continue
        print(f"download {url}")
        r = requests.get(url, timeout=300)
        r.raise_for_status()
        if url.endswith(".zip"):
            with zipfile.ZipFile(io.BytesIO(r.content)) as z:
                member = next(n for n in z.namelist() if n.endswith(".json"))
                dest.write_bytes(z.read(member))
        else:
            dest.write_bytes(r.content)


if __name__ == "__main__":
    download()
