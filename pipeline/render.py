"""Screenshot the share view (1200x630) of every tambon for og:image.

Serves web/dist on a local port, opens /?tambon={id}&share=1 in headless Chromium and
waits for the page to set window.__shareReady (map idle + fonts loaded).

    uv run python render.py                # all tambons
    uv run python render.py --only TH571204
"""
from __future__ import annotations

import argparse
import asyncio
import functools
import http.server
import shutil
import threading
import time
from pathlib import Path

from playwright.async_api import async_playwright

import config
from geo import load_tambons

DIST = config.ROOT / "web" / "dist"
CONCURRENCY = 4
TIMEOUT_MS = 45_000


class _Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):  # noqa: D401 - silence per-request logs
        pass


def serve(directory: Path) -> tuple[http.server.ThreadingHTTPServer, int]:
    handler = functools.partial(_Quiet, directory=str(directory))
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, httpd.server_address[1]


async def render(ids: list[str]) -> None:
    if not (DIST / "index.html").exists():
        raise SystemExit("web/dist missing: run `make build` first")
    httpd, port = serve(DIST)
    started = time.time()
    failed: list[str] = []
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
            )
            ctx = await browser.new_context(viewport={"width": 1200, "height": 630}, device_scale_factor=1)
            queue: asyncio.Queue[str] = asyncio.Queue()
            for i in ids:
                queue.put_nowait(i)

            async def worker() -> None:
                page = await ctx.new_page()
                while not queue.empty():
                    tid = queue.get_nowait()
                    try:
                        await page.goto(f"http://127.0.0.1:{port}/?tambon={tid}&share=1")
                        await page.wait_for_function("window.__shareReady === true", timeout=TIMEOUT_MS)
                        out = config.OUT / f"{tid}.png"
                        await page.screenshot(path=str(out), type="png")
                        dist_copy = DIST / "data" / out.name
                        if dist_copy.parent.exists():
                            shutil.copyfile(out, dist_copy)
                    except Exception as e:  # keep going; one bad page must not block the rest
                        failed.append(tid)
                        print(f"render {tid} failed: {e}")
                await page.close()

            await asyncio.gather(*(worker() for _ in range(min(CONCURRENCY, len(ids)))))
            await browser.close()
    finally:
        httpd.shutdown()
    print(f"render ok: {len(ids) - len(failed)}/{len(ids)} images in {time.time() - started:.0f}s")
    if failed:
        raise SystemExit(1)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", nargs="*", help="tambon ids (default: all)")
    a = ap.parse_args()
    asyncio.run(render(a.only or [t["id"] for t in load_tambons()]))


if __name__ == "__main__":
    main()
