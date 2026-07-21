// Боевой пропуск арены: расчёт очков за матч.
// Восстановлено 2026-07-21: модуль импортировался из arena_results.tsx, но отсутствовал в репозитории.
// Победа даёт больше очков, поражение/ничья — меньше, но не ноль (участие поощряется).

export const BP_WIN = 10;
export const BP_LOSS = 3;

/** Очки боевого пропуска за один матч. */
export function bpForMatch(won: boolean): number {
  return won ? BP_WIN : BP_LOSS;
}
