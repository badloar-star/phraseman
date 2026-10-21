// ═══════════════════════════════════════════════════════════════════════════
// home_scene_inputs.ts — входы героя «Сцены», которые считаются из того, что уже лежит на телефоне.
//
// зачем (координатор 22.10: «С возвращением» — 3 дня, как в утверждённой таблице, сигнал 5 · ВХОД не трогать; «серия прервалась»
// и «всё пройдено» — локально: серия и дата последнего засчитанного дня — в локальном прогрессе, пройденные эпизоды и выпуск — в
// прогрессе V2): чистые функции, без хранилища и сети. Даты — ключи дня 'YYYY-MM-DD' (личный прогресс, activityDates).
// ═══════════════════════════════════════════════════════════════════════════

const DAY_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Полных календарных дней между последним засчитанным днём и сегодня (по часам телефона); нет даты — null. */
export function homeSceneDaysSince(lastDay: string | null, now: Date): number | null {
  const m = lastDay ? DAY_KEY.exec(lastDay) : null;
  if (!m) return null;
  const last = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((today - last) / 86_400_000));
}

/** Последний засчитанный день из списка дат прогресса (самая поздняя). */
export function homeSceneLastActivityDay(activityDates: readonly string[]): string | null {
  let best: string | null = null;
  for (const d of activityDates) if (DAY_KEY.test(d) && (best === null || d > best)) best = d;
  return best;
}

/**
 * «Серия прервалась»: пропущен ровно один день (последний засчитанный — позавчера), серия была от 2 дней и у человека нет Plus.
 * зачем: по правилу серии (hall_of_fame_utils, §137) пропуск одного дня ждёт занятия, и у Free первое же занятие начнёт серию
 * заново — это и есть «прервалась». У Plus в этот момент решает заморозка — героем «прервалась» не пугаем. Пропуск 2+ дней —
 * уже «С возвращением» (приоритет выше).
 */
export function homeSceneStreakLost(input: Readonly<{ daysAway: number | null; streakCount: number; plus: boolean }>): boolean {
  return input.daysAway === 2 && input.streakCount >= 2 && !input.plus;
}

/**
 * «Всё выпущенное пройдено»: в уроке продолжения пройдены все выпущенные эпизоды, а первый эпизод следующего урока не выпущен.
 * isReleased — та же проверка выпуска, что у курса (isLearningV2SessionReleasedV1), передаётся снаружи.
 */
export function homeSceneAllReleasedDone(
  progress: Readonly<{ lessonOrdinal: number; done: number; total: number }> | null,
  isReleased: (lessonOrdinal: number, sessionOrdinal: number) => boolean,
): boolean {
  if (!progress || progress.total <= 0 || progress.done < progress.total) return false;
  return !isReleased(progress.lessonOrdinal + 1, 1);
}
