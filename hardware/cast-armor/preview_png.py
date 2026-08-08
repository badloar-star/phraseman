#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Превью развёртки и 3D-вида в PNG — без сторонних библиотек.

зачем: увидеть узор и форму до печати. PNG пишем вручную (zlib+struct),
чтобы не тянуть Pillow/matplotlib в зависимости.
"""

from __future__ import annotations

import struct
import sys
import zlib
from pathlib import Path

import numpy as np

from generate import (Params, build_mask, build_panel_mesh, validate_params,
                      wrap_to_cone)

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def write_png(path: Path, rgb: np.ndarray) -> None:
    """rgb: (h, w, 3) uint8 -> PNG."""
    h, w, _ = rgb.shape
    raw = b"".join(b"\x00" + rgb[y].tobytes() for y in range(h))

    def chunk(tag: bytes, data: bytes) -> bytes:
        return (struct.pack(">I", len(data)) + tag + data +
                struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF))

    png = (b"\x89PNG\r\n\x1a\n"
           + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
           + chunk(b"IDAT", zlib.compress(raw, 9))
           + chunk(b"IEND", b""))
    path.write_bytes(png)


BG = np.array([13, 16, 20], dtype=np.uint8)
FG = np.array([125, 211, 192], dtype=np.uint8)
EDGE = np.array([232, 245, 240], dtype=np.uint8)


def render_flat(p: Params, style: str, path: Path, px: int = 900) -> None:
    """Плоская развёртка панели."""
    aspect = p.panel_len / p.arc_len
    w = px
    h = int(px * aspect)
    u = np.linspace(0.0, p.arc_len, w)
    v = np.linspace(0.0, p.panel_len, h)
    U, V = np.meshgrid(u, v, indexing="xy")
    mask = build_mask(p, U, V, style)

    img = np.zeros((h, w, 3), dtype=np.uint8)
    img[:] = BG
    img[mask] = FG

    # подсветим контур, чтобы перемычки читались
    inner = (np.roll(mask, 1, 0) & np.roll(mask, -1, 0) &
             np.roll(mask, 1, 1) & np.roll(mask, -1, 1))
    img[mask & ~inner] = EDGE

    write_png(path, img)
    print(f"  {style:<8} развёртка {w}x{h}px, заполнение {mask.mean()*100:4.1f}%"
          f"  -> {path.name}")


def render_3d(p: Params, style: str, path: Path, px: int = 900) -> None:
    """Изометрия детали: рисуем треугольники меша с простым освещением."""
    tris = build_panel_mesh(p, style)

    # камера: поворот вокруг Z, затем наклон
    az, el = np.radians(35.0), np.radians(22.0)
    Rz = np.array([[np.cos(az), -np.sin(az), 0],
                   [np.sin(az), np.cos(az), 0],
                   [0, 0, 1]])
    Rx = np.array([[1, 0, 0],
                   [0, np.cos(el), -np.sin(el)],
                   [0, np.sin(el), np.cos(el)]])
    R = Rx @ Rz

    pts = (tris.reshape(-1, 3) @ R.T).reshape(-1, 3, 3)

    # экранные координаты: x вправо, z вверх; y — глубина
    sx, sy, depth = pts[:, :, 0], pts[:, :, 2], pts[:, :, 1].mean(axis=1)

    lo_x, hi_x = sx.min(), sx.max()
    lo_y, hi_y = sy.min(), sy.max()
    pad = 0.06
    span = max(hi_x - lo_x, hi_y - lo_y) * (1 + pad * 2)
    cx, cy = (lo_x + hi_x) / 2, (lo_y + hi_y) / 2

    w = h = px
    px_x = ((sx - cx) / span + 0.5) * w
    px_y = (0.5 - (sy - cy) / span) * h

    # нормали для освещения
    e1 = pts[:, 1] - pts[:, 0]
    e2 = pts[:, 2] - pts[:, 0]
    nrm = np.cross(e1, e2)
    ln = np.linalg.norm(nrm, axis=1, keepdims=True)
    ln[ln == 0] = 1
    nrm = nrm / ln
    light = np.array([0.35, -0.75, 0.55])
    light = light / np.linalg.norm(light)
    lam = np.clip(nrm @ light, 0, 1)
    shade = 0.30 + 0.70 * lam

    img = np.zeros((h, w, 3), dtype=np.float32)
    img[:] = BG
    zbuf = np.full((h, w), np.inf, dtype=np.float32)

    # painter's algorithm + z-буфер по среднему; рисуем от дальних к ближним
    order = np.argsort(-depth)
    base = FG.astype(np.float32)

    for t in order:
        xs, ys = px_x[t], px_y[t]
        x0, x1 = int(np.floor(xs.min())), int(np.ceil(xs.max()))
        y0, y1 = int(np.floor(ys.min())), int(np.ceil(ys.max()))
        x0, y0 = max(x0, 0), max(y0, 0)
        x1, y1 = min(x1, w - 1), min(y1, h - 1)
        if x1 < x0 or y1 < y0:
            continue

        yy, xx = np.mgrid[y0:y1 + 1, x0:x1 + 1]
        # барицентрические координаты
        d = ((ys[1] - ys[2]) * (xs[0] - xs[2]) +
             (xs[2] - xs[1]) * (ys[0] - ys[2]))
        if abs(d) < 1e-9:
            continue
        a = ((ys[1] - ys[2]) * (xx - xs[2]) + (xs[2] - xs[1]) * (yy - ys[2])) / d
        b = ((ys[2] - ys[0]) * (xx - xs[2]) + (xs[0] - xs[2]) * (yy - ys[2])) / d
        c = 1 - a - b
        hit = (a >= -0.002) & (b >= -0.002) & (c >= -0.002)
        if not hit.any():
            continue

        zc = depth[t]
        sub = zbuf[y0:y1 + 1, x0:x1 + 1]
        upd = hit & (zc < sub)
        if not upd.any():
            continue
        sub[upd] = zc
        col = base * shade[t]
        img[y0:y1 + 1, x0:x1 + 1][upd] = col

    write_png(path, np.clip(img, 0, 255).astype(np.uint8))
    print(f"  {style:<8} 3D-вид   {w}x{h}px, {len(tris)} треуг."
          f"  -> {path.name}")


def main() -> None:
    p = Params()
    validate_params(p)
    here = Path(__file__).parent
    print("\nПревью CAST ARMOR:")
    render_flat(p, "voronoi", here / "preview_flat_forearm.png")
    render_flat(p, "shield", here / "preview_flat_shield.png")
    render_3d(p, "voronoi", here / "preview_3d_forearm.png")
    print()


if __name__ == "__main__":
    main()
