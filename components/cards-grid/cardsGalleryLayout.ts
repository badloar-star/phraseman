/**
 * Раскладка галереи карточек — единственный нормальный вид (шаг 0): одна горизонтальная карточка на строку по утверждённому макету docs/design/v2-app/cards-v2.html (CSS `.zg.s0`).
 *
 * зачем (владелец 22.10: «ползунок и щипок убираем, оставляем только нормальный вид»): прежние четыре остановки (1 / 2 / 3 / 5 колонок), перетекание плиток, опора щипка и докрутка
 * удалены вместе с ползунком и щипком. Остаётся одна строка таблицы: колонок 1, высота плитки 118, зазор 10, радиус 16. Параметр `step` в API сеток сохранён (всегда 0) — он входит в ключ поправки кегля и в журналы.
 */

export type GalleryStepDef = Readonly<{ cols: number; h: number; gap: number; radius: number }>;

/** Единственный шаг — 0: одна колонка, высота 118, зазор 10, радиус 16 (числа CSS макета). */
export const GALLERY_STEPS: readonly GalleryStepDef[] = [
  { cols: 1, h: 118, gap: 10, radius: 16 },
];

export const GALLERY_LAST_STEP = GALLERY_STEPS.length - 1;
/**
 * Шаг — всегда нормальный вид (владелец 22.10). Прежнее описание: при ПЕРВОМ открытии и после сброса — горизонтальные карточки на всю ширину (крайнее правое положение ползунка, шаг 0).
 * зачем (владелец 18.10 через координатора: «при ОТКРЫТИИ экран должен выглядеть как на макете — ГОРИЗОНТАЛЬНЫЕ карточки на всю ширину»): сетка из 2 колонок открывалась по
 * умолчанию вместо макета. Если человек сам сменил размер — его выбор запоминается (gallery_step_prefs) и важнее этого значения.
 */
export const GALLERY_OPEN_STEP = 0;
export function clampStep(step: number): number {
  return Math.max(0, Math.min(GALLERY_LAST_STEP, Math.round(Number.isFinite(step) ? step : GALLERY_OPEN_STEP)));
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
