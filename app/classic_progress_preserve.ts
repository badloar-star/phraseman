/**
 * зачем (владелец 04.11, ЖЁСТКО: «прогресс начатого курса не пропадает ни в коем случае»): классические курсы заменяются
 * новыми фразами, а отметки урока хранятся ПОЗИЦИОННО (lessonN_progress = ['correct','wrong','empty',…], длина = число фраз).
 * Эти чистые функции приводят сохранённый массив к длине нового урока, НИЧЕГО не стирая:
 *  - короче нового урока  → экран получает пустые ячейки в конце, сохранённое остаётся на своих местах;
 *  - длиннее нового урока → экран берёт первые N, ХВОСТ хранится как есть и дописывается обратно при каждой записи.
 * Число отметок «пройдено» при записи никогда не уменьшается. Сообщений пользователю нет.
 */
export const CLASSIC_EMPTY_MARK = 'empty';

export type RestoredLessonProgress = Readonly<{
  /** Что показывает экран: ровно `total` ячеек. */
  view: string[];
  /** Всё, что сохранено за границей `total` (пусто, если длина не больше). Дописывается обратно при записи. */
  tail: string[];
  /** Длина сохранённого массива (0 — не было или нечитаемо). */
  storedLength: number;
  /** Почему именно так — для журнала [CLASSIC-PROGRESS]. */
  reason: 'none' | 'unreadable' | 'same_length' | 'padded' | 'tail_kept';
}>;

function fresh(total: number): string[] {
  return new Array(Math.max(0, total)).fill(CLASSIC_EMPTY_MARK);
}

export function restoreLessonProgressPreserving(raw: string | null | undefined, total: number): RestoredLessonProgress {
  if (raw == null || raw === '') return { view: fresh(total), tail: [], storedLength: 0, reason: 'none' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    console.warn('[CLASSIC-PROGRESS] unreadable → пустой вид, хранилище не трогаем', error instanceof Error ? error.message : String(error));
    return { view: fresh(total), tail: [], storedLength: 0, reason: 'unreadable' };
  }
  if (!Array.isArray(parsed)) {
    console.warn('[CLASSIC-PROGRESS] not_array → пустой вид, хранилище не трогаем', typeof parsed);
    return { view: fresh(total), tail: [], storedLength: 0, reason: 'unreadable' };
  }
  const stored = parsed.map((x) => (typeof x === 'string' ? x : CLASSIC_EMPTY_MARK));
  if (stored.length === total) return { view: stored, tail: [], storedLength: stored.length, reason: 'same_length' };
  if (stored.length < total) {
    return { view: [...stored, ...new Array(total - stored.length).fill(CLASSIC_EMPTY_MARK)], tail: [], storedLength: stored.length, reason: 'padded' };
  }
  return { view: stored.slice(0, total), tail: stored.slice(total), storedLength: stored.length, reason: 'tail_kept' };
}

/** Что писать в хранилище: вид экрана + нетронутый хвост. */
export function mergeLessonProgressForSave(view: readonly string[], tail: readonly string[]): string[] {
  return tail.length > 0 ? [...view, ...tail] : [...view];
}

/** Сколько отметок «пройдено» в массиве (для сторожа «число не уменьшается»). */
export function countPassedMarks(progress: readonly string[]): number {
  return progress.filter((p) => p === 'correct' || p === 'replay_correct' || p === 'wrong').length;
}
