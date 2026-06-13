/**
 * Чистая физика overscroll-резинки (без зависимостей от RN/reanimated).
 * Вынесено отдельно для тестируемости и переиспользования в BouncyScrollView и
 * BounceView. Функции помечены 'worklet' — их можно дёргать с UI-потока.
 */

// Сопротивление при оттягивании — формула Apple (UIScrollView rubber-band):
//   f(x, d, c) = (x · d · c) / (d + c · x)
// x — оверскролл за край (>0), d — высота вьюпорта, c = 0.55 (константа Apple).
// Свойства: f(0)=0; монотонно растёт; f(x) < d (есть мягкий предел ≈ d);
// при малых x ≈ x·c (линейно), при больших — насыщается. Жёсткой стенки нет.
export const APPLE_C = 0.55;

/** Возврат к краю — критически задемпфированный spring (без overshoot, как iOS). */
export const BOUNCE_SPRING = { dampingRatio: 1, duration: 500 } as const;

/**
 * Резиновое сопротивление. x — абсолютный оверскролл (>=0), dim — высота вьюпорта.
 * Возвращает «сопротивлённое» смещение (>=0, всегда < dim).
 */
export function rubberBand(x: number, dim: number): number {
  'worklet';
  if (x <= 0 || dim <= 0) return 0;
  return (x * dim * APPLE_C) / (dim + APPLE_C * x);
}

/**
 * Целевое translateY-смещение для текущей позиции скролла. Двунаправленно:
 *   • y < 0 (оверскролл сверху) → смещение ВНИЗ (>0)
 *   • y > maxScroll (оверскролл снизу) → смещение ВВЕРХ (<0)
 *   • в границах → 0
 * Возвращает null, если резинки быть не должно (в границах) — вызывающий код
 * сам решает, пружинить к 0 или оставить как есть.
 */
export function bounceOffset(
  y: number,
  layoutH: number,
  contentH: number,
  dim: number,
): number | null {
  'worklet';
  const maxScroll = contentH - layoutH;
  if (y < 0) return rubberBand(-y, dim);
  if (maxScroll > 0 && y > maxScroll) return -rubberBand(y - maxScroll, dim);
  return null;
}

/** Результат edge-pull шага: сколько тянуть (stretch) и куда сдвинулся якорь. */
export interface EdgePull {
  /** translateY резинки: >0 тянем вниз (верхний край), <0 вверх (нижний). */
  stretch: number;
  /** Новое значение якоря пальца. NaN = край отпущен/не касались. */
  anchor: number;
}

/**
 * Анти-скачок edge-pull для Android.
 *
 * `translationY` у Pan накапливается с НАЧАЛА жеста (он одновременен с нативным
 * скроллом), поэтому к моменту касания края там уже сотни px. Чтобы резинка не
 * прыгнула скачком, тянем только на дельту ОТ ЗАФИКСИРОВАННОГО У КРАЯ значения:
 *   • первое касание края → anchor = translationY, stretch = 0 (старт с нуля);
 *   • далее stretch = rubberBand(|translationY − anchor|), знак по краю;
 *   • палец пошёл обратно внутрь / сменил сторону → anchor = NaN, stretch = 0.
 *
 * Чистая функция (worklet): принимает текущий якорь, возвращает новый — никакого
 * скрытого состояния, легко тестировать.
 */
export function edgePull(
  translationY: number,
  edgeAnchor: number,
  atTop: boolean,
  atBottom: boolean,
  dim: number,
): EdgePull {
  'worklet';
  // Верхняя резинка: упёрлись в верх и тянем вниз (translationY растёт от якоря).
  // Перезахватываем якорь, если его нет ИЛИ палец оказался «позади» (translationY
  // < anchor — например, якорь остался от прошлого края или палец откатился):
  // оттяжка всегда стартует с нуля у края, без скачка.
  if (translationY > 0 && atTop && !(translationY < edgeAnchor)) {
    const anchor = Number.isNaN(edgeAnchor) ? translationY : edgeAnchor;
    return { stretch: rubberBand(translationY - anchor, dim), anchor };
  }
  // Нижняя резинка: упёрлись в низ и тянем вверх (translationY убывает от якоря).
  if (translationY < 0 && atBottom && !(translationY > edgeAnchor)) {
    const anchor = Number.isNaN(edgeAnchor) ? translationY : edgeAnchor;
    // `+ 0` сворачивает −0 (от rubberBand(0)) в обычный 0.
    return { stretch: -rubberBand(anchor - translationY, dim) + 0, anchor };
  }
  // Внутри скролла, палец пошёл обратно, или якорь с другого края — резинки нет,
  // якорь сброшен. Следующее упирание стартует заново с нуля.
  return { stretch: 0, anchor: NaN };
}
