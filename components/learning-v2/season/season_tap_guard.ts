// ═════════════════════════════════════════════════════════════════════════
// season_tap_guard.ts — защита от двойного тапа на действиях Сезона, которые уводят с экрана («Продолжить», «Классический курс»).
//
// зачем (проверка чтением Optimistic UI, координатор 22.10: «двойной тап не открывает экран дважды»): onSessionPress и onLegacyLessons открывают окно запуска / другой экран;
// второй тап в тот же кадр, пока первый ещё не размонтировал кнопку, открывал бы его повторно. Состояние экрана (списки, раскрытая карта) от двойного тапа не страдает — оно идемпотентно.
// Окно 700 мс: быстрее человек намеренно не нажимает дважды; отказ пишет причину в журнал.
// ═════════════════════════════════════════════════════════════════════════
import type { MutableRefObject } from 'react';

export const SEASON_TAP_GUARD_MS = 700;

/** true — тап слишком близко к предыдущему (его нужно проигнорировать); иначе запоминает время и пускает. */
export function seasonTapTooSoon(lastRef: MutableRefObject<number>, tag: string, now: number = Date.now()): boolean {
  const gap = now - lastRef.current;
  if (gap >= 0 && gap < SEASON_TAP_GUARD_MS) {
    console.log('[SEASON-WIRE] двойной тап проигнорирован', JSON.stringify({ tag, gapMs: gap, windowMs: SEASON_TAP_GUARD_MS })); // guard-ok: ранний выход и его причина
    return true;
  }
  lastRef.current = now;
  return false;
}
