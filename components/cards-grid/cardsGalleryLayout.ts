/**
 * Раскладка галереи карточек — движок из утверждённого макета docs/design/v2-app/cards-gallery.html (блок LOCKED:cards-engine), дословно по формулам.
 *
 * зачем (владелец: «Карточки меняют размер и форму», один движок во всех списках карточек): масштаб v∈[0,1] непрерывно меняет число колонок (1…4),
 * форму карточки (соотношение сторон), кегль, скругление и поля; мелкие карточки теряют транскрипцию, значок озвучки и точки.
 * Функции помечены 'worklet': их считает и UI-поток (покадровый щипок), и обычный JS (тесты, окно прокрутки).
 */

export const GALLERY_GAP = 12;
export const GALLERY_LEVELS = ['l', 'm', 's', 'xs'] as const;
export type GalleryLevel = (typeof GALLERY_LEVELS)[number];

const RATIO = [0.27, 0.8, 1.0, 1.15];
export const GALLERY_FONT = [22, 18, 14.5, 12.5] as const;
export const GALLERY_IPA = [14, 12, 0, 0] as const;
export const GALLERY_RADIUS = [24, 22, 18, 14] as const;
export const GALLERY_PAD = [16, 12, 10, 8] as const;

export type GalleryLayout = Readonly<{ cols: number; idx: number; w: number; h: number; f: number }>;

export function galleryLayoutFor(v: number, width: number): GalleryLayout {
  'worklet';
  const band = Math.min(3.999, Math.max(0, v) * 3.999);
  const idx = Math.floor(band);
  const f = band - idx;
  const cols = idx + 1;
  const w = (width - GALLERY_GAP * (cols - 1)) / cols;
  const h = Math.round(w * RATIO[idx]! * (1.05 - 0.1 * f));
  return { cols, idx, w, h, f };
}

/** Позиция карточки i в сетке (левый верхний угол). */
export function galleryPosition(i: number, layout: GalleryLayout): Readonly<{ x: number; y: number }> {
  'worklet';
  const row = Math.floor(i / layout.cols);
  const col = i % layout.cols;
  return { x: col * (layout.w + GALLERY_GAP), y: row * (layout.h + GALLERY_GAP) };
}

/** Высота всей сетки на n карточек. */
export function galleryHeight(n: number, layout: GalleryLayout): number {
  'worklet';
  return Math.ceil(n / layout.cols) * (layout.h + GALLERY_GAP);
}

/** Какие строки видны при смещении прокрутки (запас — по строке с каждой стороны сверху, снизу), для окна отрисовки. */
export function galleryVisibleRange(n: number, layout: GalleryLayout, scrollY: number, viewportH: number): Readonly<{ from: number; to: number }> {
  const rowH = layout.h + GALLERY_GAP;
  const firstRow = Math.max(0, Math.floor(scrollY / rowH) - 2);
  const lastRow = Math.floor((scrollY + viewportH) / rowH) + 2;
  return { from: Math.min(n, firstRow * layout.cols), to: Math.min(n, (lastRow + 1) * layout.cols) };
}

/**
 * Точки градиента CSS-угла для прямоугольника w×h в долях бокса: у CSS длина линии градиента зависит от пропорций,
 * поэтому у вытянутой карточки (1 колонка) 145° выглядит иначе, чем у квадратной — считаем как браузер.
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
