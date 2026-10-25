/*
 * Сводка для окна «Восстановить аккаунт?»: серия, фразы, урок.
 *
 * зачем (координатор 25.10, макет account-delete-variant-b §3, одобрен владельцем): человек, передумавший удалять
 * аккаунт, видит, что всё на месте — «12 дней · серия | 140 · фраз | 3 из 32 · уроков». Определения те же, что у экрана
 * готовности к экзамену (app/exam_readiness.ts), чтобы цифры не спорили с приложением:
 * - урок — первый из 32 уроков, где верных меньше 45 (все сданы — 32);
 * - фразы — сумма ячеек correct / replay_correct по 32 урокам (не больше 50 на урок);
 * - серия — progress.streak_count.
 * Чистая функция: на входе progress документа users/{stableUid}, без сети.
 */

export const ACCOUNT_RESTORE_LESSON_TOTAL = 32;
const LESSON_DONE_THRESHOLD = 45;
const PHRASE_SLOTS = 50;

export type AccountRestoreSummary = Readonly<{
  streakDays: number;
  phrasesLearned: number;
  currentLesson: number;
  lessonTotal: number;
}>;

type Row = Record<string, unknown>;

function nonNegativeInt(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function lessonCells(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== 'string' || raw.length === 0) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    // зачем (запрет немого catch): битая строка урока — считаем урок пустым, причина в журнале.
    console.warn('[ACCOUNT-RESTORE-SUMMARY] lesson progress parse failed', String((error as Error)?.message ?? error).slice(0, 120));
    return [];
  }
}

function correctCells(raw: unknown): number {
  return lessonCells(raw)
    .slice(0, PHRASE_SLOTS)
    .filter((cell) => cell === 'correct' || cell === 'replay_correct')
    .length;
}

export function buildAccountRestoreSummary(progress: Row | null | undefined): AccountRestoreSummary {
  const row = progress ?? {};
  let phrasesLearned = 0;
  let currentLesson = ACCOUNT_RESTORE_LESSON_TOTAL;
  let currentFound = false;
  for (let lesson = 1; lesson <= ACCOUNT_RESTORE_LESSON_TOTAL; lesson += 1) {
    const correct = correctCells(row[`lesson${lesson}_progress`]);
    phrasesLearned += correct;
    if (!currentFound && correct < LESSON_DONE_THRESHOLD) {
      currentLesson = lesson;
      currentFound = true;
    }
  }
  return Object.freeze({
    streakDays: nonNegativeInt(row.streak_count),
    phrasesLearned,
    currentLesson,
    lessonTotal: ACCOUNT_RESTORE_LESSON_TOTAL,
  });
}
