/**
 * Раскладка галереи карточек — дискретные шаги 1 / 2 / 3 / 5 колонок по утверждённому макету docs/design/v2-app/cards-v2.html
 * (CSS `.zg.s0…s3`, движок `initZoom`).
 *
 * зачем (Карточки 2.0, решение владельца 12.10): прежний непрерывный масштаб 1…4 колонок заменён четырьмя остановками с фиксированными
 * высотами плиток 118 / 96 / 62 / 37 и зазорами 10 / 10 / 8 / 5. Между остановками плитки «перетекают» (FLIP, 380 мс):
 * позиция и размер каждой плитки линейно меняются от старой раскладки к новой, а точка под пальцами остаётся на месте (сдвиг прокрутки `shift`).
 * Функции помечены 'worklet': их считает и UI-поток (покадровый переход), и обычный JS (тесты, окно отрисовки).
 */

export type GalleryStepDef = Readonly<{ cols: number; h: number; gap: number; radius: number }>;

/** Шаг 0 — крупно (1 колонка) … шаг 3 — мелко (5 колонок). Числа — из CSS макета. */
export const GALLERY_STEPS: readonly GalleryStepDef[] = [
  { cols: 1, h: 118, gap: 10, radius: 16 },
  { cols: 2, h: 96, gap: 10, radius: 14 },
  { cols: 3, h: 62, gap: 8, radius: 12 },
  { cols: 5, h: 37, gap: 5, radius: 8 },
];

export const GALLERY_LAST_STEP = GALLERY_STEPS.length - 1;
/** Шаг по умолчанию — 2 колонки (середина шкалы): шаг поиска и запасной при мусорном значении. */
export const GALLERY_DEFAULT_STEP = 1;
/**
 * Шаг при ПЕРВОМ открытии и после сброса — горизонтальные карточки на всю ширину (крайнее правое положение ползунка, шаг 0).
 * зачем (владелец 18.10 через координатора: «при ОТКРЫТИИ экран должен выглядеть как на макете — ГОРИЗОНТАЛЬНЫЕ карточки на всю ширину»): сетка из 2 колонок открывалась по
 * умолчанию вместо макета. Если человек сам сменил размер — его выбор запоминается (gallery_step_prefs) и важнее этого значения.
 */
export const GALLERY_OPEN_STEP = 0;
/** Длительность и кривая перетекания плиток (MORPH_MS / EASE макета). */
export const GALLERY_MORPH_MS = 380;
export const GALLERY_MORPH_EASE = [0.2, 0.8, 0.2, 1] as const;

export function clampStep(step: number): number {
  'worklet';
  return Math.max(0, Math.min(GALLERY_LAST_STEP, Math.round(Number.isFinite(step) ? step : GALLERY_DEFAULT_STEP)));
}

export type GalleryLayout = Readonly<{ step: number; cols: number; w: number; h: number; gap: number }>;

export function galleryLayoutFor(step: number, width: number): GalleryLayout {
  'worklet';
  const s = clampStep(step);
  const def = GALLERY_STEPS[s]!;
  const w = (width - def.gap * (def.cols - 1)) / def.cols;
  return { step: s, cols: def.cols, w, h: def.h, gap: def.gap };
}

/** Позиция карточки i в сетке (левый верхний угол). */
export function galleryPosition(i: number, layout: GalleryLayout): Readonly<{ x: number; y: number }> {
  'worklet';
  const row = Math.floor(i / layout.cols);
  const col = i % layout.cols;
  return { x: col * (layout.w + layout.gap), y: row * (layout.h + layout.gap) };
}

/** Высота всей сетки на n карточек (без нижнего зазора). */
export function galleryHeight(n: number, layout: GalleryLayout): number {
  'worklet';
  if (n <= 0) return 0;
  const rows = Math.ceil(n / layout.cols);
  return rows * layout.h + (rows - 1) * layout.gap;
}

/** Какие карточки видны при смещении прокрутки (запас — по две строки с каждой стороны), для окна отрисовки. */
export function galleryVisibleRange(n: number, layout: GalleryLayout, scrollY: number, viewportH: number): Readonly<{ from: number; to: number }> {
  const rowH = layout.h + layout.gap;
  const firstRow = Math.max(0, Math.floor(scrollY / rowH) - 2);
  const lastRow = Math.floor((scrollY + viewportH) / rowH) + 2;
  return { from: Math.min(n, firstRow * layout.cols), to: Math.min(n, (lastRow + 1) * layout.cols) };
}

/** Объединение двух окон — на время перетекания рисуем плитки и старой, и новой раскладки. */
export function unionRange(a: Readonly<{ from: number; to: number }>, b: Readonly<{ from: number; to: number }>): Readonly<{ from: number; to: number }> {
  return { from: Math.min(a.from, b.from), to: Math.max(a.to, b.to) };
}

/** Индекс карточки, ближайшей к точке (x, y) в координатах сетки (pickAnchor макета); -1 — карточек нет. */
export function galleryAnchorIndex(n: number, layout: GalleryLayout, x: number, y: number): number {
  if (n <= 0) return -1;
  const col = Math.max(0, Math.min(layout.cols - 1, Math.floor(x / (layout.w + layout.gap))));
  const row = Math.max(0, Math.floor(y / (layout.h + layout.gap)));
  return Math.min(n - 1, row * layout.cols + col);
}

/**
 * Новая прокрутка, при которой карточка-опора остаётся под пальцами после смены шага (докрутка `scrollTop += …` в setStep макета).
 * `fx` — точка пальцев по горизонтали в координатах сетки, `fvY` — по вертикали в окне прокрутки, `gridTop` — где сетка начинается в содержимом.
 */
export function galleryScrollFor(opts: Readonly<{ n: number; prev: GalleryLayout; next: GalleryLayout; fx: number; fvY: number; scrollY: number; gridTop: number }>): number {
  const { n, prev, next, fx, fvY, scrollY, gridTop } = opts;
  const focalGridY = fvY + scrollY - gridTop;
  const anchor = galleryAnchorIndex(n, prev, fx, focalGridY);
  if (anchor < 0) return scrollY;
  const oldTop = galleryPosition(anchor, prev).y;
  const fy = Math.max(0, Math.min(1, (focalGridY - oldTop) / prev.h));
  const newFingerY = gridTop + galleryPosition(anchor, next).y + fy * next.h;
  return Math.max(0, newFingerY - fvY);
}

/** Шаг по положению ползунка 0…1: справа — крупнее (шаг 0), слева — мельче (шаг 3). */
export function stepForSliderFraction(fraction: number): number {
  'worklet';
  const f = Math.max(0, Math.min(1, fraction));
  return GALLERY_LAST_STEP - Math.round(f * GALLERY_LAST_STEP);
}

/** Положение ползунка 0…1 для шага (обратное к stepForSliderFraction). */
export function sliderFractionForStep(step: number): number {
  'worklet';
  return (GALLERY_LAST_STEP - clampStep(step)) / GALLERY_LAST_STEP;
}

/**
 * Точки градиента CSS-угла для прямоугольника w×h в долях бокса: у CSS длина линии градиента зависит от пропорций,
 * поэтому у вытянутой карточки (1 колонка) 158° выглядит иначе, чем у квадратной — считаем как браузер.
 */
export function cssGradientPoints(angleDeg: number, w: number, h: number): Readonly<{ start: { x: number; y: number }; end: { x: number; y: number } }> {
  const rad = (angleDeg * Math.PI) / 180;
  const dx = Math.sin(rad);
  const dy = -Math.cos(rad);
  const len = Math.abs(w * dx) + Math.abs(h * dy);
  const sx = 0.5 - (dx * len) / (2 * w);
  const sy = 0.5 - (dy * len) / (2 * h);
  return { start: { x: sx, y: sy }, end: { x: 1 - sx, y: 1 - sy } };
}
