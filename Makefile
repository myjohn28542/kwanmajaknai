# ควันมาจากไหน — pipeline + static site
# Needs: uv (Python 3.12), Node 22 + npm. Secrets come from the environment / .env.

-include .env
export

PY := cd pipeline && uv run python -X utf8
PAGES_PROJECT ?= $(CF_PAGES_PROJECT)

.PHONY: setup geo fetch compute backfill build render deploy hourly dev test

setup:            ## install Python + Node deps and headless Chromium
	cd pipeline && uv sync && uv run playwright install --with-deps chromium
	cd web && npm ci

geo:              ## re-derive pipeline/geo/*.json from GADM / OCHA / Natural Earth
	$(PY) geo_build.py

fetch:            ## FIRMS hotspots + Open-Meteo wind grid + PM2.5 into pipeline/cache/
	$(PY) run.py fetch

compute:          ## attribution for the current hour -> web/public/data/
	$(PY) run.py compute

backfill:         ## fill the last 24 hourly snapshots (first run / after downtime)
	$(PY) run.py compute --backfill 24

build:            ## vite build + per-tambon og pages (dist/t/{id}.html)
	cd web && npm run build

render:           ## 1200x630 share PNGs via Playwright (needs a build)
	$(PY) render.py

deploy:           ## upload web/dist to Cloudflare Pages
	cd web && npx --yes wrangler@4 pages deploy dist --project-name $(PAGES_PROJECT) --branch main

hourly: fetch compute build render deploy   ## what cron runs at :20

dev:              ## Vite dev server on :3000 (uses whatever is in web/public/data)
	cd web && npm run dev

test:
	cd pipeline && uv run pytest -q
	cd web && npm test
