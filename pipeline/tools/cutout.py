"""Cut a white-background island render out to a transparent WebP.

Background = near-white, near-neutral pixels connected to the image border, so white
parts of the island (the White Temple) survive unless they touch the background with
no darker outline. Edges get a short alpha ramp to avoid a white halo.

    uv run python tools/cutout.py ../assets-src/island-chiangrai-a.png ../web/public/islands/chiangrai.webp
"""
from __future__ import annotations

import sys

import numpy as np
from PIL import Image
from scipy import ndimage

THRESHOLD = 246  # min channel at/above this (and neutral) counts as background
NEUTRAL = 8  # max - min channel spread for background
SIZE = 900


def cutout(src: str, dst: str) -> None:
    rgb = np.asarray(Image.open(src).convert("RGB")).astype(np.int16)
    lo, hi = rgb.min(axis=2), rgb.max(axis=2)
    candidate = (lo >= THRESHOLD) & (hi - lo <= NEUTRAL)
    labels, _ = ndimage.label(candidate)
    border = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
    bg = np.isin(labels, border[border > 0])

    alpha = np.where(bg, 0.0, 1.0)
    edge = ndimage.binary_dilation(bg, iterations=2) & ~bg
    # light pixels right next to the background are partly transparent
    alpha[edge] = np.clip((255 - lo[edge]) / 40.0, 0.25, 1.0)
    alpha = ndimage.gaussian_filter(alpha, 0.6)

    # remove the white the edge pixels were blended with (no light halo on dark skies)
    a = np.clip(alpha, 0.05, 1.0)[..., None]
    clean = np.clip((rgb - 255.0 * (1.0 - a)) / a, 0, 255)
    rgb = np.where((alpha < 0.999)[..., None], clean, rgb)
    out = np.dstack([rgb.astype(np.uint8), (alpha * 255).astype(np.uint8)])
    im = Image.fromarray(out, "RGBA")
    bbox = im.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
    im = im.crop(bbox)
    im.thumbnail((SIZE, SIZE), Image.LANCZOS)
    im.save(dst, "WEBP", quality=86, method=6)
    print(f"{dst}: {im.size}, background {bg.mean():.0%} of source")


if __name__ == "__main__":
    cutout(sys.argv[1], sys.argv[2])
