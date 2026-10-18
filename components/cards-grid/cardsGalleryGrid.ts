/**
 * Сетка галереи с разной высотой рядов: каждый ряд — высота самой «высокой» карточки в нём (текст не режется, плитка растёт).
 *
 * зачем (владелец 18.10: «карточка растёт по высоте под текст»): прежняя раскладка (cardsGalleryLayout) держала одну высоту на шаг — длинная фраза резалась.
 * Здесь для каждого из четырёх шагов считаются ширина плитки, верх и высота каждого ряда; плитке отдаются готовые геометрии по ВСЕМ шагам (x, y, w, h),
 * а перетекание между шагами на UI-потоке просто линейно ведёт её из геометрии «откуда» в геометрию «куда». Окно отрисовки, опора щипка и докрутка
 * списка считаются по верхам рядов (бинарный поиск). Модуль чистый — тестируется без React Native.
 */
import { GALLERY_STEPS, clampStep } from './cardsGalleryLayout';
import { FIT_CAP_RATIO, fitAtScale, fitWithin, stepFace, type CardFit, type StepFace } from './cardsGalleryFit';

export type TileGeom = Readonly<{ x: number; y: number; w: number; h: number }>;

export type GridCard = Readonly<{ id: string; front: string; back?: string | null }>;

export type GalleryGrid = Readonly<{
  step: number; cols: number; gap: number; tileW: number; face: StepFace;
  rowTops: readonly number[]; rowHeights: readonly number[];
  /** Высота всей сетки без нижнего зазора. */
  height: number;
  geom: (index: number) => TileGeom;
  /** Как лёг текст карточки (кегль после уменьшения, строки) — плитка рисует им и сверяет число строк с настоящим замером. */
  fit: (index: number) => CardFit;
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
  // зачем (владелец 18.10: «карточка всегда горизонтальная»): ряд растёт под самую длинную фразу, но не выше потолка по пропорции (FIT_CAP_RATIO × ширина); дальше уменьшаем кегль
  // самой длинной карточки (у короткой слова остаются крупными), и лишь если не влезает даже на полу кегля — ряд вырастает выше потолка (текст целиком важнее пропорции).
  const cap = Math.max(face.minH, Math.round(tileW * FIT_CAP_RATIO[s]!));
  const need1 = cards.map((c) => fitAtScale(face, c.front, c.back, 1, fixes?.get(fixKey(c.id, s)) ?? 0));
  const fits: CardFit[] = [];
  const rows = Math.ceil(cards.length / def.cols);
  const rowHeights: number[] = [];
  const rowTops: number[] = [];
  let y = 0;
  for (let r = 0; r < rows; r += 1) {
    const from = r * def.cols;
    const to = Math.min(cards.length, from + def.cols);
    let want = face.minH;
    for (let c = from; c < to; c += 1) want = Math.max(want, need1[c]!.h);
    const rowH = Math.min(want, cap);
    let h = rowH;
    for (let c = from; c < to; c += 1) {
      const card = cards[c]!;
      const f = need1[c]!.h <= rowH ? need1[c]! : fitWithin(face, card.front, card.back, rowH, fixes?.get(fixKey(card.id, s)) ?? 0);
      fits[c] = f;
      h = Math.max(h, f.h);
    }
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
  return { step: s, cols: def.cols, gap: def.gap, tileW, face, rowTops, rowHeights, height, geom, fit: (i) => fits[i] ?? need1[0] ?? fitAtScale(face, '', null, 1) };
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
