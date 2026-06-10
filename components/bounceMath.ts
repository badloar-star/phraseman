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
