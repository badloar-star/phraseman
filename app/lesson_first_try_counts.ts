// lesson_first_try_counts.ts — счёт итога урока по ПЕРВЫМ попыткам: «верно / ошибок / точность» и решение «ИДЕАЛ».
//
// зачем (Сверка c17199343 / 282ff3006, решение координатора 15.10, честность итога): задание, собранное неверно и исправленное на повторе,
// перезаписывает ячейку прогресса на «верно» и раньше не считалось ошибкой — итог показывал «ИДЕАЛ, 3 из 3, 0 ошибок» рядом с блоком
// «Ошибки (1)». Теперь ошибка = промах с первой попытки (как в списке «Ошибки»), точность — по первым попыткам.
// Звёзды и монеты считаются по-прежнему (по итоговому прогрессу) — этот модуль влияет только на показ.

/**
 * Состояния ячейки прогресса урока (app/lesson1.tsx, запись ответа): 'correct' — верно в первом прохождении урока,
 * 'replay_correct' — верно в ПОВТОРНОМ прохождении уже пройденного урока (isReplay), 'wrong' — неверно и не исправлено.
 * Исправленный в том же проходе промах перезаписывает ячейку на 'correct'/'replay_correct' — по ячейке его НЕ отличить;
 * промахи с первой попытки знает только список «Ошибки» этого прохода (runErrors).
 */
export type LessonFirstTryCounts = Readonly<{
  /** Верно с первой попытки. */
  correct: number;
  /** Промахи с первой попытки (неверно + исправлено на повторе), не меньше числа строк списка «Ошибки». */
  wrong: number;
  /** Итоговые верные (с повтором) — по ним считаются балл, звёзды и монеты; только для журнала. */
  finalCorrect: number;
}>;

/** Из сохранённого прогресса урока. `runErrors` — длина списка «Ошибки» этого прохода (страховка, если прогресс потерял промах). */
export function lessonFirstTryCountsFromProgress(progress: readonly string[], runErrors: number): LessonFirstTryCounts {
  // зачем (Сверка ca8abf1b2, проход 2: повтор урока без единой ошибки показал «0 верно / 3 ошибки / 0%»): 'replay_correct' — это НЕ
  // «исправлено на повторе», а «верно в повторном прохождении урока»; считать его промахом было ошибкой. Промахи = неисправленные
  // 'wrong' + список «Ошибки» этого прохода.
  const finalCorrect = progress.filter((cell) => cell === 'correct' || cell === 'replay_correct').length;
  const firstTryCorrect = finalCorrect;
  const missed = progress.filter((cell) => cell === 'wrong').length;
  const wrong = Math.max(missed, Math.max(0, Math.floor(runErrors)));
  // список «Ошибки» видел промахов больше, чем осталось в прогрессе, — лишние вычитаем из «верно», сумма ответов не растёт
  const correct = Math.max(0, firstTryCorrect - (wrong - missed));
  return { correct, wrong, finalCorrect };
}

/** Когда прогресса нет (итог из маршрута): итоговое «верно из всего» + список «Ошибки» этого прохода. */
export function lessonFirstTryCountsFromTotals(finalCorrect: number, total: number, runErrors: number): LessonFirstTryCounts {
  const safeTotal = Math.max(0, Math.floor(total));
  const safeCorrect = Math.max(0, Math.min(Math.floor(finalCorrect), safeTotal));
  const wrong = Math.min(safeTotal, Math.max(safeTotal - safeCorrect, Math.max(0, Math.floor(runErrors))));
  return { correct: safeTotal - wrong, wrong, finalCorrect: safeCorrect };
}

/* expo-router route shim: модуль в app/ — не экран */
export default function __RouteShim() { return null; }
