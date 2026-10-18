/**
 * Сетка галереи с разной высотой рядов: каждый ряд — высота самой «высокой» карточки в нём (текст не режется, плитка растёт).
 *
 * зачем (владелец 18.10: «карточка растёт по высоте под текст»): прежняя раскладка (cardsGalleryLayout) держала одну высоту на шаг — длинная фраза резалась.
 * Здесь для каждого из четырёх шагов считаются ширина плитки, верх и высота каждого ряда; плитке отдаются готовые геометрии по ВСЕМ шагам (x, y, w, h),
 * а перетекание между шагами на UI-потоке просто линейно ведёт её из геометрии «откуда» в геометрию «куда». Окно отрисовки, опора щипка и докрутка
 * списка считаются по верхам рядов (бинарный поиск). Модуль чистый — тестируется без React Native.
 */
import { GALLERY_STEPS, clampStep } from './cardsGalleryLayout';
import { stepFace, tileFit, type StepFace } from './cardsGalleryFit';

export type TileGeom = Readonly<{ x: number; y: number; w: number; h: number }>;

export type GridCard = Readonly<{ id: string; front: string; back?: string | null }>;

export type GalleryGrid = Readonly<{
  step: number; cols: number; gap: number; tileW: number; face: StepFace;
  rowTops: readonly number[]; rowHeights: readonly number[];
  /** Высота всей сетки без нижнего зазора. */
  height: number;
  geom: (index: number) => TileGeom;
  /** Сколько строк фразы и перевода оценено у карточки — для сверки с настоящим замером. */
  lines: (index: number) => Readonly<{ wordLines: number; trLines: number }>;
}>;

export type GalleryGrids = Readonly<{
  grids: readonly [GalleryGrid, GalleryGrid, GalleryGrid, GalleryGrid];
  count: number;
  width: number;
  /** Высоты сеток по шагам (для высоты контейнера на UI-потоке). */
  heights: readonly [number, number, number, number];
  /** Геометрии карточки по всем четырём шагам — один и тот же массив на всё время жизни этих сеток. */
  geoms: (index: number) => readonly TileGeom[];
}>;

/** Поправка высоты по настоящему замеру: `${id}|${step}` → дополнительные px. */
export type GridFixes = ReadonlyMap<string, number>;

export const fixKey = (id: string, step: number): string => `${id}|${step}`;

export function buildGalleryGrid(step: number, cards: readonly GridCard[], width: number, fontScale = 1, fixes?: GridFixes): GalleryGrid {
  const s = clampStep(step);
  const def = GALLERY_STEPS[s]!;
  const tileW = (width - def.gap * (def.cols - 1)) / def.cols;
  const face = stepFace(s, tileW, fontScale);
  const fits = cards.map((c) => tileFit(face, c.front, c.back, fixes?.get(fixKey(c.id, s)) ?? 0));
  const rows = Math.ceil(cards.length / def.cols);
  const rowHeights: number[] = [];
  const rowTops: number[] = [];
  let y = 0;
  for (let r = 0; r < rows; r += 1) {
    let h = face.minH;
    for (let c = r * def.cols; c < Math.min(cards.length, (r + 1) * def.cols); c += 1) h = Math.max(h, fits[c]!.h);
    rowTops.push(y);
    rowHeights.push(h);
    y += h + def.gap;
  }
  const height = rows > 0 ? y - def.gap : 0;
  const geom = (i: number): TileGeom => {
    const r = Math.floor(i / def.cols);
    const col = i % def.cols;
    return { x: col * (tileW + def.gap), y: rowTops[r] ?? 0, w: tileW, h: rowHeights[r] ?? face.minH };
  };
  return { step: s, cols: def.cols, gap: def.gap, tileW, face, rowTops, rowHeights, height, geom, lines: (i) => ({ wordLines: fits[i]?.wordLines ?? 1, trLines: fits[i]?.trLines ?? 0 }) };
}

export function buildGalleryGrids(cards: readonly GridCard[], width: number, fontScale = 1, fixes?: GridFixes): GalleryGrids {
  const grids = [0, 1, 2, 3].map((s) => buildGalleryGrid(s, cards, width, fontScale, fixes)) as unknown as GalleryGrids['grids'];
  const cache: (readonly TileGeom[] | undefined)[] = [];
  const geoms = (i: number): readonly TileGeom[] => (cache[i] ??= grids.map((g) => g.geom(i)));
  return { grids, count: cards.length, width, heights: [grids[0].height, grids[1].height, grids[2].height, grids[3].height], geoms };
}

/** Индекс первого ряда, чей низ ниже `y` (бинарный поиск по верхам и высотам). */
export function rowAt(grid: GalleryGrid, y: number): number {
  const n = grid.rowTops.length;
  if (n === 0) return 0;
  let lo = 0;
  let hi = n - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (grid.rowTops[mid]! + grid.rowHeights[mid]! + grid.gap <= y) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Окно отрисовки: ряды, видимые при прокрутке, плюс запас по две строки с каждой стороны. */
export function gridVisibleRange(grid: GalleryGrid, n: number, scrollY: number, viewportH: number): Readonly<{ from: number; to: number }> {
  if (n <= 0) return { from: 0, to: 0 };
  const firstRow = Math.max(0, rowAt(grid, Math.max(0, scrollY)) - 2);
  const lastRow = rowAt(grid, Math.max(0, scrollY) + viewportH) + 2;
  return { from: Math.min(n, firstRow * grid.cols), to: Math.min(n, (lastRow + 1) * grid.cols) };
}

/** Карточка, ближайшая к точке (x, y) в координатах сетки; -1 — карточек нет. */
export function gridAnchorIndex(grid: GalleryGrid, n: number, x: number, y: number): number {
  if (n <= 0) return -1;
  const col = Math.max(0, Math.min(grid.cols - 1, Math.floor(x / (grid.tileW + grid.gap))));
  const row = Math.min(grid.rowTops.length - 1, rowAt(grid, Math.max(0, y)));
  return Math.min(n - 1, Math.max(0, row) * grid.cols + col);
}

/** Новая прокрутка, при которой карточка под пальцами остаётся под ними после смены шага (то же, что galleryScrollFor, но по рядам разной высоты). */
export function gridScrollFor(opts: Readonly<{ n: number; prev: GalleryGrid; next: GalleryGrid; fx: number; fvY: number; scrollY: number; gridTop: number }>): number {
  const { n, prev, next, fx, fvY, scrollY, gridTop } = opts;
  const focalGridY = fvY + scrollY - gridTop;
  const anchor = gridAnchorIndex(prev, n, fx, focalGridY);
  if (anchor < 0) return scrollY;
  const a = prev.geom(anchor);
  const fy = Math.max(0, Math.min(1, (focalGridY - a.y) / Math.max(1, a.h)));
  const b = next.geom(anchor);
  const newFingerY = gridTop + b.y + fy * b.h;
  return Math.max(0, newFingerY - fvY);
}
