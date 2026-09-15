/**
 * Звания раздела «Диалоги».
 *
 * зачем (владелец 2026-09-14): «кружок с прогрессом в правом верхнем углу
 * небольшой и пульсирующая опасити ранг». Звание — единственный видимый
 * прогресс раздела, поэтому лестница живёт отдельным чистым модулем: её можно
 * проверить тестом, не поднимая React и иконки.
 *
 * Считаем по ПРОЙДЕННЫМ диалогам, а не по репликам: реплики фармятся, диалоги —
 * нет. Звание никогда не падает: наказание за паузу убивает возвращаемость.
 */

export type DialogRankKey = 'novice' | 'speaker' | 'orator' | 'diplomat' | 'legend';

/**
 * Пороги мягкие в начале и растут дальше: первый же пройденный диалог поднимает
 * звание, чтобы новичок увидел движение, а «Легенда» осталась редкой.
 */
const RANKS: readonly { readonly min: number; readonly key: DialogRankKey }[] = Object.freeze([
  { min: 0, key: 'novice' },
  { min: 1, key: 'speaker' },
  { min: 5, key: 'orator' },
  { min: 15, key: 'diplomat' },
  { min: 40, key: 'legend' },
]);

export interface DialogRank {
  key: DialogRankKey;
  /** Порядковый номер звания (0 — первое). */
  index: number;
  /** Сколько диалогов нужно до следующего звания; null — звание последнее. */
  next: number | null;
}

/**
 * Звание по числу пройденных диалогов. Мусор (отрицательное, NaN) даёт первое
 * звание, а не падение: подпись на карточке не стоит краша раздела.
 */
export function rankForCompleted(completedCount: number): DialogRank {
  const count = Number.isFinite(completedCount) ? Math.max(0, Math.floor(completedCount)) : 0;
  let index = 0;
  for (let i = 0; i < RANKS.length; i += 1) {
    if (count >= RANKS[i].min) index = i;
  }
  return {
    key: RANKS[index].key,
    index,
    next: index + 1 < RANKS.length ? RANKS[index + 1].min : null,
  };
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
