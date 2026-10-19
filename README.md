# ควันมาจากไหน (Where does the smoke come from?)

A static web app that estimates, every hour, where the smoke over each sub-district
(tambon) of Chiang Rai came from. It runs backward wind trajectories from each tambon
and matches them against NASA FIRMS satellite fire hotspots. Results are district/country
level estimates, **not evidence against any person**.

```
pipeline/   Python 3.12 (uv). fetch -> compute -> render. Writes web/public/data/.
web/        Vite + React + TypeScript + MapLibre GL. Fully static.
PLAN.md     Design notes and algorithm decisions.
```

No database and no server code: the pipeline precomputes JSON + PNG, and the site is
uploaded to Cloudflare Pages.

## Setup

Needs [uv](https://docs.astral.sh/uv/), Node 22 + npm, and (for `render`) Chromium via Playwright.

```bash
cp .env.example .env        # fill in what you have; everything is optional for local runs
make setup                  # uv sync, playwright chromium, npm ci
make fetch                  # FIRMS + wind + PM2.5 -> pipeline/cache/
make backfill               # first run: 24 hourly snapshots -> web/public/data/
make dev                    # http://localhost:3000
```

Without `make` (e.g. Windows), run the same commands directly:

```bash
cd pipeline && uv run python run.py fetch && uv run python run.py compute --backfill 24
cd web && npm run dev
```

### Environment variables

| Variable | Used by | Notes |
|---|---|---|
| `FIRMS_MAP_KEY` | pipeline | Free key from <https://firms.modaps.eosdis.nasa.gov/api/map_key/>. Without it the pipeline falls back to the public SE-Asia 7-day CSVs (same data, less control). |
| `VITE_MAPTILER_KEY` | web build | Optional. MapTiler basemap and hillshade. Without it the map uses OpenFreeMap with no hillshade. |
| `SITE_URL` | web build | Absolute public origin, e.g. `https://kwanmajaknai.pages.dev`. Needed for `og:image` / `og:url`. |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CF_PAGES_PROJECT` | deploy | Wrangler Pages deploy. |
| `KWAN_CACHE_DIR`, `KWAN_OUT_DIR` | pipeline | Optional overrides for `pipeline/cache` and `web/public/data`. |

## Commands

| | |
|---|---|
| `make fetch` | Download FIRMS hotspots (4 UTC dates, ≥72 h), the Open-Meteo 0.5° wind grid (182 points, 4 calls) and PM2.5 for the 124 tambon centroids (cached per 3 h). |
| `make compute` | Attribution for the current hour. Adds one snapshot to each `web/public/data/{id}.json` (keeps 24), and writes `index.json` and `hotspots.json`. About 1 s per hour of data. |
| `make backfill` | Recompute the last 24 hours (first run, or after downtime). |
| `make build` | `vite build`, then `scripts/prerender.mjs` writes `dist/t/{id}.html` with per-tambon `og:title` and `og:image`. |
| `make render` | Playwright screenshots `/?tambon={id}&share=1` at 1200×630 into `data/{id}.png` (about 1–2 min for all 124). |
| `make deploy` | `wrangler pages deploy web/dist`. |
| `make hourly` | `fetch compute build render deploy`. |
| `make test` | pytest (trajectory sign, interpolation edges, scoring, regions, I/O) and vitest. |
| `make geo` | Rebuild `pipeline/geo/tambons.json` and `regions.geojson` from the raw boundary downloads. Already committed, so only needed if the sources change. |

## Running it hourly

### Option A: a small VPS (cron)

```cron
# m  h dom mon dow  command
20  *  *   *   *    cd /srv/kwanmajaknai && make hourly >> /var/log/kwan.log 2>&1
```

The VPS disk keeps the cache and the 24-hour history between runs.

### Option B: GitHub Actions

`.github/workflows/hourly.yml` runs at :20 every hour. It keeps `pipeline/cache` and
`web/public/data` between runs with `actions/cache`. Set these in the repo settings:

- secrets: `FIRMS_MAP_KEY`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and optionally `VITE_MAPTILER_KEY`
- variables: `SITE_URL`, `CF_PAGES_PROJECT`

For the first run, start the workflow by hand with `backfill = 24`.

## Deploying to Cloudflare Pages

1. `npx wrangler@4 pages project create kwanmajaknai --production-branch main`
2. Set `SITE_URL` to the Pages URL (or your custom domain).
3. Run `make hourly` once, or the GitHub workflow.

Pages serves `/t/TH571204` from `t/TH571204.html` (pretty URLs), so shared links get
per-tambon previews. `web/public/_headers` sets `/data/*` to a 5-minute cache.

## API budgets

- FIRMS: 12 calls per run with a key, far under the 5000 per 10 minutes limit. Final dates are cached forever, and today/yesterday are refreshed at most every 45 minutes.
- Open-Meteo (free, non-commercial): about 182 location-calls per hour for wind and 124 per 3 hours for PM2.5, roughly 5,400 a day against the 10,000 a day limit. If the site is ever used commercially, get an Open-Meteo API plan.

## Data and attribution

NASA FIRMS (VIIRS S-NPP / NOAA-20 / NOAA-21 NRT) · Open-Meteo.com (CC BY 4.0), including
Copernicus CAMS for PM2.5 · GADM 4.1 · Natural Earth · OCHA/RTSD admin boundaries via HDX
(CC BY-IGO) · OpenFreeMap / OpenMapTiles © OpenStreetMap contributors. The site footer
carries the same attributions and the disclaimer.

## Known limits

- Particles that leave the bbox (96.5–103 E, 16.5–22.5 N) stop scoring, so fires further away are not counted.
- `MIN_SCORE` (3.0) was calibrated on quiet October data and should be re-checked once the haze season starts.
- The JS bundle is about 74 KB gzip before the map. MapLibre adds about 290 KB gzip, plus about 150 KB for its worker, after the result card is already showing. Raw (uncompressed) size is over 1 MB because MapLibre alone is about 1 MB.
