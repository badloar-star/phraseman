// ════════════════════════════════════════════════════════════════════════════
// season_modal_bounds.ts — «окно эпизода всегда целиком в экране» (жалоба владельца, iPhone 2.0.2: окно съехало вправо, правый край и кнопка обрезаны).
//
// зачем: раскрытая карта — слой поверх «Сезона» с полями 24 по бокам. Если родитель на миг оказался смещён или шире окна (пейджер вкладок в движении,
// первый кадр до измерения), карта вылезала за правый край. Чистые функции считают, нужен ли сдвиг и насколько; сама карта применяет его через left/right.
// Без React и без часов — тестируется таблицей.
// ════════════════════════════════════════════════════════════════════════════

export const SEASON_MODAL_MARGIN = 24;
/** Допуск измерения: меньше полупикселя — это округление, а не смещение. */
const EPS = 0.5;

export type SeasonModalRect = Readonly<{ x: number; width: number }>;

/** Карта целиком в окне, с допуском. */
export function seasonModalInside(rect: SeasonModalRect, windowWidth: number): boolean {
  return rect.x >= -EPS && rect.x + rect.width <= windowWidth + EPS;
}

/**
 * На сколько сдвинуть карту по горизонтали (dp, + вправо), чтобы она встала в окно с полями margin.
 * 0 — карта на месте или сдвигать нечем: шире окна (тогда ширину режет maxWidth, а не сдвиг).
 */
export function seasonModalShift(rect: SeasonModalRect, windowWidth: number, margin: number = SEASON_MODAL_MARGIN): number {
  if (!(windowWidth > 0) || !Number.isFinite(rect.x) || !Number.isFinite(rect.width)) return 0;
  if (seasonModalInside(rect, windowWidth)) return 0;
  if (rect.width > windowWidth) return 0;
  // вернуть номинальное левое поле; если и так не лезет справа — прижать правым полем
  const toMargin = margin - rect.x;
  const maxRight = windowWidth - margin - (rect.x + rect.width + toMargin);
  return maxRight < 0 ? toMargin + maxRight : toMargin;
}

/** Предельная ширина карты: окно минус два поля (не уже нуля). */
export function seasonModalMaxWidth(windowWidth: number, margin: number = SEASON_MODAL_MARGIN): number {
  return Math.max(0, Math.floor(windowWidth) - margin * 2);
}
