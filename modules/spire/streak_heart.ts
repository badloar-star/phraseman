/**
 * «Сердечко за серию» (ТЗ docs/work/tasks/spire-engagement-2026-10-25.md §2, выбор владельца 25.10): 5 верных подряд внутри
 * ступени возвращают одно потерянное сердце. Только телефон — монет нет, сервер не знает. Раз за ступень.
 *
 * Чистое правило без React: раннер зовёт его на каждый ответ, экран рисует шкалу по `streak` и вспышку по `refilled`.
 */
export const SPIRE_STREAK_HEART_TARGET = 5;

export type SpireStreakHeartState = Readonly<{
  /** Верных подряд с последней ошибки (0…5). */
  streak: number;
  /** Сердце за серию уже вернули в этой ступени — больше не даём. */
  given: boolean;
}>;

export type SpireStreakHeartStep = Readonly<{
  state: SpireStreakHeartState;
  /** Сколько сердец после этого ответа (с учётом возврата). */
  hearts: number;
  /** На этом ответе сердце вернулось. */
  refilled: boolean;
  /** Почему не вернули на 5/5 (для журнала). */
  skip: 'full' | 'already_given' | null;
}>;

export const SPIRE_STREAK_HEART_START: SpireStreakHeartState = Object.freeze({ streak: 0, given: false });

/**
 * Один ответ. ok — ответ верный; heartsAfter — сердца после ответа по движку ступени; maxHearts — потолок (3).
 * Ошибка обнуляет серию. На 5/5: потеряно сердце и ещё не давали → +1 сердце, серия в 0, больше не даём.
 */
export function spireStreakHeartStep(
  prev: SpireStreakHeartState,
  ok: boolean,
  heartsAfter: number,
  maxHearts: number,
): SpireStreakHeartStep {
  if (!ok) return { state: { streak: 0, given: prev.given }, hearts: heartsAfter, refilled: false, skip: null };
  const streak = Math.min(prev.streak + 1, SPIRE_STREAK_HEART_TARGET);
  if (streak < SPIRE_STREAK_HEART_TARGET) return { state: { streak, given: prev.given }, hearts: heartsAfter, refilled: false, skip: null };
  if (prev.given) return { state: { streak, given: true }, hearts: heartsAfter, refilled: false, skip: 'already_given' };
  if (heartsAfter >= maxHearts) return { state: { streak, given: false }, hearts: heartsAfter, refilled: false, skip: 'full' };
  return { state: { streak: 0, given: true }, hearts: heartsAfter + 1, refilled: true, skip: null };
}

/** Шкалу показываем, только когда сердце потеряно и сердце за серию ещё не давали. */
export function spireStreakHeartVisible(s: SpireStreakHeartState, hearts: number, maxHearts: number): boolean {
  return !s.given && hearts < maxHearts && hearts > 0;
}
