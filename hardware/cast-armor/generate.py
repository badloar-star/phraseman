#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CAST ARMOR — генератор STL накладок на гипс предплечья.
Voronoi-ажур + MOLLE/PALS, печать FDM (PLA/PETG).

зачем: у владельца гипс на предплечье и FDM-принтер; нужны футуристичные
накладки, НАДЕВАЮЩИЕСЯ поверх гипса (не обжимающие), с креплениями MOLLE
под навесное снаряжение. Геометрия строится напрямую в виде треугольного
меша — без OpenSCAD, только numpy + scipy.

!! БЕЗОПАСНОСТЬ: деталь не должна сжимать гипс. Внутренний радиус всегда
   считается как «обхват гипса / 2π + CLEARANCE». CLEARANCE < 4 мм
   запрещён проверкой в validate_params().

Запуск:
    python generate.py                 # все детали с параметрами по умолчанию
    python generate.py --circ-wrist 210 --circ-elbow 270 --panel-len 160
    python generate.py --part forearm  # только одна деталь
"""

from __future__ import annotations

import argparse
import math
import struct
import sys
from dataclasses import dataclass, replace
from pathlib import Path

import numpy as np
from scipy.spatial import Voronoi

# зачем: консоль Windows по умолчанию cp1252 и рушится на русском выводе
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


# ============================================================
#  ПАРАМЕТРЫ
# ============================================================

@dataclass(frozen=True)
class Params:
    """Все размеры в миллиметрах. Неизменяемый — правки только через replace()."""

    # --- замеры гипса (измерить портновской лентой) ---
    circ_wrist: float = 200.0   # обхват у запястья (узкий конец)
    circ_elbow: float = 260.0   # обхват у локтя (широкий конец)
    panel_len: float = 150.0    # длина накрываемого участка

    # --- посадка и печать ---
    clearance: float = 6.0      # воздушный зазор гипс↔пластик. МИНИМУМ 4.
    wall: float = 2.0           # толщина стенки (1.6 гибко / 2.4 жёстко)
    arc_deg: float = 150.0      # угловой охват дуги (360 = кольцо, НЕЛЬЗЯ)

    # --- Voronoi ---
    voronoi_seeds: int = 260    # плотность ячеек (больше = мельче узор)
    strut_w: float = 2.6        # ширина перемычки (мин 2.2 для прочности)
    seed: int = 42              # зерно ГПСЧ — меняй для другого рисунка

    # --- MOLLE / PALS (стандарт: окно 38×25, шаг рядов 25) ---
    molle_slot_w: float = 38.0
    molle_slot_h: float = 25.0
    molle_row_pitch: float = 25.0
    molle_rows: int = 2
    molle_cols: int = 2
    molle_web: float = 5.0      # высота перемычки, через которую идёт ремень

    # --- ремни ---
    strap_w: float = 25.0       # ширина липучки (25 или 38)
    strap_t: float = 4.0        # толщина ремня + запас
    strap_count: int = 2

    # --- дискретизация меша ---
    seg_u: int = 220            # шагов вдоль дуги
    seg_v: int = 160            # шагов вдоль длины

    # ---- производные ----
    @property
    def r_in_wrist(self) -> float:
        return self.circ_wrist / (2 * math.pi) + self.clearance

    @property
    def r_in_elbow(self) -> float:
        return self.circ_elbow / (2 * math.pi) + self.clearance

    @property
    def r_mid(self) -> float:
        return (self.r_in_wrist + self.r_in_elbow) / 2 + self.wall / 2

    @property
    def arc_len(self) -> float:
        """Длина дуги по среднему радиусу — ширина плоской развёртки."""
        return 2 * math.pi * self.r_mid * self.arc_deg / 360.0


def validate_params(p: Params) -> None:
    """Отсекаем параметры, опасные для руки или непечатаемые."""
    if p.clearance < 4.0:
        raise ValueError(
            f"clearance={p.clearance} мм — опасно. Гипс отекает; "
            "минимум 4 мм, рекомендовано 6."
        )
    if p.arc_deg >= 330:
        raise ValueError(
            f"arc_deg={p.arc_deg}° — это замкнутое кольцо. Деталь должна "
            "сниматься без усилия; максимум ~200°."
        )
    if p.strut_w < 2.0:
        raise ValueError(f"strut_w={p.strut_w} мм — перемычки сломаются при печати.")
    if p.wall < 1.2:
        raise ValueError(f"wall={p.wall} мм — тоньше 1.2 не держит форму.")
    if p.circ_elbow <= 0 or p.circ_wrist <= 0 or p.panel_len <= 0:
        raise ValueError("Обхваты и длина должны быть больше нуля.")


# ============================================================
#  ГЕОМЕТРИЯ: развёртка → конус
# ============================================================
#
#  Работаем в плоской развёртке (u вдоль дуги, v вдоль руки),
#  строим там маску «где пластик», затем оборачиваем на конус.
#  Так узор ложится без швов и без булевых операций над телами.

def wrap_to_cone(u: np.ndarray, v: np.ndarray, r_offset: float,
                 p: Params) -> np.ndarray:
    """Развёртка (u, v) → 3D-точка на конусе. r_offset: 0 = внутр., wall = внешн."""
    ang = math.radians(-p.arc_deg / 2) + (u / p.arc_len) * math.radians(p.arc_deg)
    t = v / p.panel_len
    r = p.r_in_wrist + (p.r_in_elbow - p.r_in_wrist) * t + r_offset
    return np.stack([r * np.cos(ang), r * np.sin(ang), v], axis=-1)


# ============================================================
#  МАСКА: Voronoi + MOLLE + ремни
# ============================================================

def voronoi_mask(p: Params, U: np.ndarray, V: np.ndarray) -> np.ndarray:
    """True = пластик. Ажурная сетка Вороного: оставляем только перемычки.

    Считаем честную диаграмму scipy, затем расстояние от каждой точки сетки
    до ближайшего ребра Вороного. Точка = пластик, если она ближе strut_w/2
    к какому-нибудь ребру.
    """
    rng = np.random.default_rng(p.seed)

    # зерна с полем вокруг — чтобы у края не было обрезанных «бесконечных» ячеек
    pad_u, pad_v = p.arc_len * 0.35, p.panel_len * 0.35
    n = p.voronoi_seeds
    pts = np.column_stack([
        rng.uniform(-pad_u, p.arc_len + pad_u, n),
        rng.uniform(-pad_v, p.panel_len + pad_v, n),
    ])

    vor = Voronoi(pts)

    # собираем конечные рёбра диаграммы как отрезки
    segs = []
    for (a, b) in vor.ridge_vertices:
        if a >= 0 and b >= 0:
            segs.append((vor.vertices[a], vor.vertices[b]))
    if not segs:
        return np.ones_like(U, dtype=bool)

    A = np.array([s[0] for s in segs])   # (m, 2) начала
    B = np.array([s[1] for s in segs])   # (m, 2) концы

    P = np.stack([U.ravel(), V.ravel()], axis=-1)          # (k, 2)

    # расстояние точка→отрезок, векторно и по частям (память)
    half = p.strut_w / 2.0
    best = np.full(P.shape[0], np.inf)
    chunk = max(1, 4_000_000 // max(len(A), 1))
    AB = B - A
    denom = np.einsum("ij,ij->i", AB, AB)
    denom[denom == 0] = 1e-9

    for start in range(0, P.shape[0], chunk):
        Q = P[start:start + chunk]                          # (c, 2)
        # проекция на каждый отрезок
        AQ = Q[:, None, :] - A[None, :, :]                  # (c, m, 2)
        t = np.einsum("cmi,mi->cm", AQ, AB) / denom[None, :]
        t = np.clip(t, 0.0, 1.0)
        proj = A[None, :, :] + t[:, :, None] * AB[None, :, :]
        d = np.linalg.norm(Q[:, None, :] - proj, axis=2)    # (c, m)
        best[start:start + chunk] = d.min(axis=1)

    return (best <= half).reshape(U.shape)


def molle_mask(p: Params, U: np.ndarray, V: np.ndarray) -> np.ndarray:
    """True = пластик. Окна PALS вырезаны, вокруг них сплошное поле.

    Возвращает маску «убрать» отдельно, а зону лесенок делаем сплошной,
    чтобы стропа была прочной, а не ажурной.
    """
    total_h = p.molle_rows * p.molle_row_pitch
    z0 = (p.panel_len - total_h) / 2 + p.molle_row_pitch / 2

    span_u = p.molle_cols * p.molle_slot_w + (p.molle_cols - 1) * 6.0
    u_c = p.arc_len / 2

    solid = np.zeros_like(U, dtype=bool)   # сплошная зона стропы
    holes = np.zeros_like(U, dtype=bool)   # окна для ремня

    # зачем: стропа PALS = ТОНКАЯ горизонтальная лента с окнами, а не
    # сплошная плита. Ленту делаем ровно по высоте окна + перемычки,
    # между рядами оставляем ажур — иначе панель тяжёлая и глухая.
    band_h = (p.molle_slot_h - p.molle_web) + 2 * 3.2   # окно + узкие перемычки

    for row in range(p.molle_rows):
        z = z0 + row * p.molle_row_pitch
        band = (np.abs(V - z) <= band_h / 2) & \
               (np.abs(U - u_c) <= span_u / 2 + 2.0)
        solid |= band

        # окна внутри ленты: между ними остаются стойки, за них цепляется ремень
        for col in range(p.molle_cols):
            uc = u_c - span_u / 2 + p.molle_slot_w / 2 + col * (p.molle_slot_w + 6.0)
            win = (np.abs(V - z) <= (p.molle_slot_h - p.molle_web) / 2) & \
                  (np.abs(U - uc) <= p.molle_slot_w / 2)
            holes |= win

    return solid, holes


def strap_mask(p: Params, U: np.ndarray, V: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Окна под ремень-липучку у обоих краёв дуги + сплошное усиление вокруг."""
    solid = np.zeros_like(U, dtype=bool)
    holes = np.zeros_like(U, dtype=bool)

    # зачем: ремни выносим к ТОРЦАМ панели (у запястья и у локтя), подальше
    # от зоны MOLLE в середине — иначе прорези тонут в стропе и панель
    # держится только за центр. Проушины у самых краёв дуги.
    margin = 16.0
    zs = np.linspace(margin, p.panel_len - margin, p.strap_count)

    for z in zs:
        for uc in (margin * 0.85, p.arc_len - margin * 0.85):
            # усиленная проушина вокруг прорези
            solid |= (np.abs(V - z) <= p.strap_w / 2 + 5) & \
                     (np.abs(U - uc) <= 9.0)
            # сама щель под ремень: узкая по дуге, длинная по руке
            holes |= (np.abs(V - z) <= p.strap_w / 2) & \
                     (np.abs(U - uc) <= p.strap_t / 2)
    return solid, holes


def edge_rails_mask(p: Params, U: np.ndarray, V: np.ndarray) -> np.ndarray:
    """Сплошные рёбра по всем четырём кромкам — чтобы ажур не «играл»."""
    rail = 5.0
    return ((U <= rail) | (U >= p.arc_len - rail) |
            (V <= rail) | (V >= p.panel_len - rail))


def build_mask(p: Params, U: np.ndarray, V: np.ndarray, style: str) -> np.ndarray:
    """Итоговая маска «здесь есть пластик»."""
    if style == "shield":
        keep = np.ones_like(U, dtype=bool)          # глухой щиток
    else:
        keep = voronoi_mask(p, U, V)                # ажур

    m_solid, m_holes = molle_mask(p, U, V)
    s_solid, s_holes = strap_mask(p, U, V)

    keep |= edge_rails_mask(p, U, V)
    keep |= m_solid
    keep |= s_solid
    keep &= ~m_holes
    keep &= ~s_holes
    return keep


# ============================================================
#  ПОСТРОЕНИЕ ЗАМКНУТОГО МЕША
# ============================================================
#
#  Панель = два слоя (внутренний и внешний) + боковые стенки по всем
#  границам маски. Все треугольники ориентируем наружу — иначе слайсер
#  увидит вывернутую деталь.

def build_panel_mesh(p: Params, style: str) -> np.ndarray:
    u = np.linspace(0.0, p.arc_len, p.seg_u + 1)
    v = np.linspace(0.0, p.panel_len, p.seg_v + 1)
    U, V = np.meshgrid(u, v, indexing="ij")

    mask = build_mask(p, U, V, style)

    inner = wrap_to_cone(U, V, 0.0, p)
    outer = wrap_to_cone(U, V, p.wall, p)

    tris: list[np.ndarray] = []

    def quad(a, b, c, d):
        """Четырёхугольник a-b-c-d → два треугольника (обход задаёт нормаль)."""
        tris.append(np.array([a, b, c]))
        tris.append(np.array([a, c, d]))

    ni, nj = mask.shape
    # ячейка живая, если все 4 её угла в маске — так края получаются чистыми
    cell = mask[:-1, :-1] & mask[1:, :-1] & mask[1:, 1:] & mask[:-1, 1:]

    for i in range(ni - 1):
        for j in range(nj - 1):
            if not cell[i, j]:
                continue
            # внешняя поверхность (нормаль наружу от оси)
            quad(outer[i, j], outer[i + 1, j], outer[i + 1, j + 1], outer[i, j + 1])
            # внутренняя (обратный обход)
            quad(inner[i, j], inner[i, j + 1], inner[i + 1, j + 1], inner[i + 1, j])

            # боковые стенки там, где сосед мёртвый или край сетки
            if i == 0 or not cell[i - 1, j]:
                quad(inner[i, j], inner[i, j + 1], outer[i, j + 1], outer[i, j])
            if i == ni - 2 or not cell[i + 1, j]:
                quad(inner[i + 1, j], outer[i + 1, j],
                     outer[i + 1, j + 1], inner[i + 1, j + 1])
            if j == 0 or not cell[i, j - 1]:
                quad(inner[i, j], outer[i, j], outer[i + 1, j], inner[i + 1, j])
            if j == nj - 2 or not cell[i, j + 1]:
                quad(inner[i, j + 1], inner[i + 1, j + 1],
                     outer[i + 1, j + 1], outer[i, j + 1])

    if not tris:
        raise RuntimeError(
            "Меш пустой — маска ничего не оставила. Уменьши strut_w "
            "или voronoi_seeds."
        )
    return np.array(tris, dtype=np.float32)


def build_cuff_mesh(p: Params) -> np.ndarray:
    """Короткая манжета у запястья: та же панель, но 55 мм и шире охват."""
    q = replace(p, panel_len=55.0, arc_deg=min(p.arc_deg + 20, 190.0),
                molle_rows=1, strap_count=1, voronoi_seeds=30, seg_v=90)
    return build_panel_mesh(q, style="voronoi")


def build_pouch_mesh(p: Params) -> np.ndarray:
    """Навесной подсумок на MOLLE: открытая сверху коробка + язычок за стропу.

    зачем: коробку строим как ОДНО замкнутое тело (внешняя оболочка +
    вывернутая внутренняя полость + ободок сверху), а не набором
    пересекающихся брусков — иначе меш не watertight и слайсер гадает.
    """
    w, h, d, wall = p.molle_slot_w * 2, 60.0, 22.0, 2.0
    tris: list[np.ndarray] = []

    def quad(a, b, c, e):
        tris.append(np.array([a, b, c]))
        tris.append(np.array([a, c, e]))

    def tube(x0, x1, y0, y1, z0, z1, outward: bool):
        """Четыре боковые стенки призмы. outward=False — нормали внутрь."""
        c = [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
        for k in range(4):
            ax, ay = c[k]
            bx, by = c[(k + 1) % 4]
            if outward:
                quad((ax, ay, z0), (bx, by, z0), (bx, by, z1), (ax, ay, z1))
            else:
                quad((ax, ay, z0), (ax, ay, z1), (bx, by, z1), (bx, by, z0))

    ox0, ox1 = -w / 2, w / 2
    oy0, oy1 = -d / 2, d / 2
    ix0, ix1 = ox0 + wall, ox1 - wall
    iy0, iy1 = oy0 + wall, oy1 - wall

    # внешние стенки (нормали наружу) и внутренняя полость (нормали внутрь)
    tube(ox0, ox1, oy0, oy1, 0.0, h, outward=True)
    tube(ix0, ix1, iy0, iy1, wall, h, outward=False)

    # дно снаружи (смотрит вниз) и дно полости (смотрит вверх)
    quad((ox0, oy0, 0.0), (ox0, oy1, 0.0), (ox1, oy1, 0.0), (ox1, oy0, 0.0))
    quad((ix0, iy0, wall), (ix1, iy0, wall), (ix1, iy1, wall), (ix0, iy1, wall))

    # ободок сверху — замыкает внешнюю стенку с внутренней
    for (ax, ay, bx, by, cx, cy, ex, ey) in [
        (ox0, oy0, ox1, oy0, ix1, iy0, ix0, iy0),   # передний
        (ox1, oy1, ox0, oy1, ix0, iy1, ix1, iy1),   # задний
        (ox0, oy1, ox0, oy0, ix0, iy0, ix0, iy1),   # левый
        (ox1, oy0, ox1, oy1, ix1, iy1, ix1, iy0),   # правый
    ]:
        quad((ax, ay, h), (bx, by, h), (cx, cy, h), (ex, ey, h))

    # язычок MOLLE: отдельное замкнутое тело, заводится за стропу.
    # Печатается заодно, в слайсере это второй объект — так и надо.
    tx0, tx1 = ox0 + 6, ox1 - 6
    ty0, ty1 = oy0 - 2.4, oy0
    tz0, tz1 = -34.0, h - 6
    tube(tx0, tx1, ty0, ty1, tz0, tz1, outward=True)
    quad((tx0, ty0, tz0), (tx0, ty1, tz0), (tx1, ty1, tz0), (tx1, ty0, tz0))
    quad((tx0, ty0, tz1), (tx1, ty0, tz1), (tx1, ty1, tz1), (tx0, ty1, tz1))

    return np.array(tris, dtype=np.float32)


# ============================================================
#  ЗАПИСЬ И ПРОВЕРКА STL
# ============================================================

def write_stl_binary(path: Path, tris: np.ndarray) -> None:
    n = len(tris)
    with path.open("wb") as f:
        f.write(b"CAST ARMOR - voronoi molle forearm".ljust(80, b"\0"))
        f.write(struct.pack("<I", n))
        for t in tris:
            normal = np.cross(t[1] - t[0], t[2] - t[0])
            ln = np.linalg.norm(normal)
            normal = normal / ln if ln > 1e-12 else np.zeros(3)
            f.write(struct.pack("<3f", *normal))
            for vert in t:
                f.write(struct.pack("<3f", *vert))
            f.write(struct.pack("<H", 0))


def check_watertight(tris: np.ndarray) -> tuple[bool, int, int]:
    """Меш замкнут, если каждое ребро встречается ровно дважды.

    Возвращает (замкнут, число_рёбер_с_нечётным_счётом, всего_рёбер).
    """
    quant = np.round(tris.reshape(-1, 3).astype(np.float64), 4)
    _, idx = np.unique(quant, axis=0, return_inverse=True)
    idx = idx.reshape(-1, 3)

    edges = np.concatenate([idx[:, [0, 1]], idx[:, [1, 2]], idx[:, [2, 0]]])
    edges = np.sort(edges, axis=1)
    _, counts = np.unique(edges, axis=0, return_counts=True)
    bad = int(np.sum(counts != 2))
    return bad == 0, bad, len(counts)


def report(name: str, tris: np.ndarray, path: Path) -> None:
    pts = tris.reshape(-1, 3)
    lo, hi = pts.min(axis=0), pts.max(axis=0)
    size = hi - lo
    ok, bad, total = check_watertight(tris)
    status = "OK замкнут" if ok else f"ВНИМАНИЕ: {bad} из {total} рёбер открыты"
    print(f"  {name:<10} {len(tris):>7} треуг.  "
          f"габарит {size[0]:.0f}x{size[1]:.0f}x{size[2]:.0f} мм  [{status}]")
    print(f"             -> {path.name}")


# ============================================================
#  CLI
# ============================================================

def main() -> None:
    ap = argparse.ArgumentParser(
        description="Генератор STL накладок на гипс (Voronoi + MOLLE)")
    ap.add_argument("--circ-wrist", type=float, default=Params.circ_wrist,
                    help="обхват гипса у запястья, мм")
    ap.add_argument("--circ-elbow", type=float, default=Params.circ_elbow,
                    help="обхват гипса у локтя, мм")
    ap.add_argument("--panel-len", type=float, default=Params.panel_len,
                    help="длина накрываемого участка, мм")
    ap.add_argument("--clearance", type=float, default=Params.clearance,
                    help="зазор гипс-пластик, мм (минимум 4)")
    ap.add_argument("--arc-deg", type=float, default=Params.arc_deg,
                    help="угловой охват дуги, градусы")
    ap.add_argument("--wall", type=float, default=Params.wall,
                    help="толщина стенки, мм")
    ap.add_argument("--seed", type=int, default=Params.seed,
                    help="зерно узора Вороного — меняй для другого рисунка")
    ap.add_argument("--voronoi-seeds", type=int, default=Params.voronoi_seeds,
                    help="плотность ячеек")
    ap.add_argument("--strut-w", type=float, default=Params.strut_w,
                    help="ширина перемычки, мм")
    ap.add_argument("--part", default="all",
                    choices=["all", "forearm", "shield", "cuff", "pouch"])
    ap.add_argument("--out", default="stl", help="папка для STL")
    args = ap.parse_args()

    p = Params(
        circ_wrist=args.circ_wrist,
        circ_elbow=args.circ_elbow,
        panel_len=args.panel_len,
        clearance=args.clearance,
        arc_deg=args.arc_deg,
        wall=args.wall,
        seed=args.seed,
        voronoi_seeds=args.voronoi_seeds,
        strut_w=args.strut_w,
    )
    # зачем: stderr на Windows остаётся в cp1252 и калечит русский текст
    # исключения — ловим и печатаем через уже перенастроенный stdout
    try:
        validate_params(p)
    except ValueError as exc:
        print(f"\nОШИБКА В ПАРАМЕТРАХ: {exc}\n")
        raise SystemExit(1)

    out = Path(__file__).parent / args.out
    out.mkdir(exist_ok=True)

    print(f"\nCAST ARMOR — генерация")
    print(f"  гипс: запястье {p.circ_wrist:.0f} мм, локоть {p.circ_elbow:.0f} мм, "
          f"длина {p.panel_len:.0f} мм")
    print(f"  внутр. радиус: {p.r_in_wrist:.1f} -> {p.r_in_elbow:.1f} мм "
          f"(зазор {p.clearance:.0f} мм)")
    print(f"  дуга {p.arc_deg:.0f}°, развёртка {p.arc_len:.0f} мм\n")

    jobs = {
        "forearm": lambda: build_panel_mesh(p, "voronoi"),
        "shield": lambda: build_panel_mesh(p, "shield"),
        "cuff": lambda: build_cuff_mesh(p),
        "pouch": lambda: build_pouch_mesh(p),
    }
    todo = jobs if args.part == "all" else {args.part: jobs[args.part]}

    for name, fn in todo.items():
        tris = fn()
        path = out / f"cast_armor_{name}.stl"
        write_stl_binary(path, tris)
        report(name, tris, path)

    print(f"\nГотово. STL в: {out}")
    print("Перед печатью прочитай README.md — там про зазор и безопасность.\n")


if __name__ == "__main__":
    main()
