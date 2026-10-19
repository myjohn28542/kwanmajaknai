# PLAN — ควันมาจากไหน (MVP, 2 weeks)

Goal: for every tambon in Chiang Rai, estimate each hour which districts/countries the
smoke over it came from (backward wind trajectories × satellite fire hotspots), and serve
it as a static, phone-first, shareable web page.

## Shape

```
cron :20 hourly
  fetch     FIRMS hotspots (3 days) + Open-Meteo wind grid + PM2.5   -> pipeline/cache/
  compute   back-trajectories for all tambons, score, aggregate      -> web/public/data/*.json
  build     vite build + prerender dist/t/{id}.html (og tags)        -> web/dist/
  render    Playwright screenshot ?tambon={id}&share=1 (1200x630)    -> data/{id}.png
  deploy    wrangler pages deploy web/dist
```

No DB, no server code. Snapshot history (last 24 h) lives in the JSON files themselves.

## Steps (in order)

1. **Geo** — `pipeline/geo_build.py`: download GADM 4.1 (THA L2+L3, MMR L2, LAO L1) and
   Natural Earth admin-0 (fallback for CHN/VNM). Derive `geo/tambons.json` (Chiang Rai
   tambon centroids, Thai names) and `geo/regions.geojson` (simplified polygons inside
   the bbox, Thai labels). Raw downloads are gitignored; derived files are committed.
2. **Fetch** — `firms.py` (area API per source per date with `FIRMS_MAP_KEY`, cached by
   (source, date); fallback to the public SE-Asia 7d CSVs when no key), `meteo.py`
   (0.5° grid, multi-location, chunked, cached per hour), `airq.py` (PM2.5 per centroid).
3. **Core** — `wind.py` (grid → u/v arrays, bilinear in space, linear in time, edge
   clamping), `attribution.py` (vectorised ensemble for all tambons at once, cKDTree per
   backward step for hotspot matching, scoring, region aggregation), `sentence.py` (Thai).
4. **Output** — `output.py`: per-tambon JSON with rolling 24 snapshots, `index.json`,
   compact `hotspots.json` for the map.
5. **Verify with real data** for พญาเม็งราย before any UI work.
6. **Web** — Vite + React + TS + MapLibre (OpenFreeMap style, MapTiler if key). Result
   card, region bar, PM2.5, 24 h slider, share (link / LINE / Facebook), share view.
7. **Share assets** — `render.py` (Playwright), `web/scripts/prerender.mjs` (og meta).
8. **Ops** — Makefile, README, cron example, GitHub Actions workflow, CF Pages deploy.

## Algorithm decisions (beyond the brief)

- Wind vectors from meteorological direction (where wind comes FROM):
  `u = -s·sin(d)`, `v = -s·cos(d)`. Backward step: `x(t-1h) = x(t) - V·3600 s`.
  So a westerly (from 270°) moves a back-trajectory **west** (upwind) — smoke under a
  westerly came from the west. Tested explicitly.
- "Daytime" = boundary-layer height at the particle ≥ 500 m (mixed layer), else night blend.
- Particles leaving the bbox stop moving and stop scoring.
- Hotspots detected after the target hour T are never used (no leakage when backfilling).
- Score normalised per particle; "no significant source" if total < `MIN_SCORE` (3.0, ≈ several fires on the path).
- Foreign regions: Myanmar districts (GADM L2) and Lao provinces (L1) with Thai labels,
  so sentences can say "ท่าขี้เหล็ก (เมียนมา)". Never finer than district.

## Out of scope for MVP

Forward forecasts, tambon polygons on the map, accounts, any per-request computation.
