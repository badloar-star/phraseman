#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Превью маски панели в SVG — чтобы увидеть узор до печати.

зачем: STL глазами не посмотришь без слайсера; развёртка в SVG показывает
рисунок Вороного, окна MOLLE и прорези ремней за секунду.

Запуск: python preview.py  ->  preview_forearm.svg
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

from generate import Params, build_mask, validate_params

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def mask_to_svg(p: Params, style: str, path: Path, scale: float = 3.0) -> None:
    """Растрируем маску в SVG-пиксели. Грубо, но наглядно."""
    nu, nv = 300, 400
    u = np.linspace(0.0, p.arc_len, nu)
    v = np.linspace(0.0, p.panel_len, nv)
    U, V = np.meshgrid(u, v, indexing="ij")
    mask = build_mask(p, U, V, style)

    du = p.arc_len / (nu - 1) * scale
    dv = p.panel_len / (nv - 1) * scale
    w, h = p.arc_len * scale, p.panel_len * scale

    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{w:.0f}" '
        f'height="{h:.0f}" viewBox="0 0 {w:.0f} {h:.0f}">',
        f'<rect width="{w:.0f}" height="{h:.0f}" fill="#0d1014"/>',
        '<g fill="#7dd3c0">',
    ]
    # склеиваем горизонтальные пробеги, чтобы файл не распух
    for j in range(nv):
        col = mask[:, j]
        i = 0
        while i < nu:
            if col[i]:
                start = i
                while i < nu and col[i]:
                    i += 1
                parts.append(
                    f'<rect x="{start * du:.1f}" y="{j * dv:.1f}" '
                    f'width="{(i - start) * du:.1f}" height="{dv + 0.6:.1f}"/>'
                )
            else:
                i += 1
    parts.append("</g></svg>")
    path.write_text("".join(parts), encoding="utf-8")

    filled = mask.mean() * 100
    print(f"  {style:<8} заполнение {filled:5.1f}%  -> {path.name}")


def main() -> None:
    p = Params()
    validate_params(p)
    here = Path(__file__).parent
    print("\nПревью развёртки (плоский вид панели):")
    mask_to_svg(p, "voronoi", here / "preview_forearm.svg")
    mask_to_svg(p, "shield", here / "preview_shield.svg")
    print()


if __name__ == "__main__":
    main()
