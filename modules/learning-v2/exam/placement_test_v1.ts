// placement_test_v1.ts — движок входного теста «Не хочу с начала» (реестр владельца №10). Чистые функции, без хранения и сети.
// зачем (владелец 21.10, docs/work/OWNER_DECISIONS_2026-10-21.md стр. 85–91): «1 вопрос на тему по порядку уроков». Тест бесплатный,
// без энергии. Итог — номер урока N, с которого человек начнёт. Решает телефон; этот модуль только считает.
// ЗАМОК ВЛАДЕЛЬЦА 25.10: «а вообще убери 2 доп вопроса вообще» (снимает его же замок 21.10 №10 «ошибка → ещё 2, зачёт 2 из 3»):
// первая ошибка — тест окончен, этот урок — «начнём здесь». Добора после ошибки и зачёта «2 из 3» нет.
// ЗАМОК ВЛАДЕЛЬЦА 28.10 (кнопки через координатора): потолок — старт не дальше урока 10 (PLACEMENT_START_CAP_LESSON_V1); «вопросов может
// быть больше, может быть и 20» — оценка точнее: по ДВА вопроса на урок (PLACEMENT_QUESTIONS_PER_LESSON_V1), урок освоен только при
// обоих верных. Это не «добор после ошибки» 21.10: оба вопроса задаются всегда, а любая ошибка сразу заканчивает тест.

export type PlacementLessonOutcomeV1 = 'credited' | 'failed';

export type PlacementTestStateV1 = Readonly<{
  /** Уроки по порядку, доступные для теста (с материалами). */
  lessons: readonly number[];
  /** Индекс текущего урока в `lessons`. */
  index: number;
  /** Ответы по текущему уроку (до PLACEMENT_QUESTIONS_PER_LESSON_V1 вопросов). */
  attempts: readonly boolean[];
  /** Итог по решённым темам, по порядку. */
  outcomes: readonly Readonly<{ lessonOrdinal: number; outcome: PlacementLessonOutcomeV1; attempts: readonly boolean[] }>[];
  /** true — тест окончен (стоп на незасчитанной теме или кончились уроки). */
  finished: boolean;
}>;

export type PlacementTestResultV1 = Readonly<{
  /** Урок, с которого начинать (первая незасчитанная тема); null — засчитаны все доступные уроки. */
  startLessonOrdinal: number | null;
  /** Уроки, которые открываются (засчитанные темы перед стопом). */
  openedLessonOrdinals: readonly number[];
}>;

/**
 * ЗАМОК ВЛАДЕЛЬЦА 28.10 (кнопки через координатора): «максимум открывать можно до 10 урока. Все предыдущие уроки не считаются
 * пройденными, но при этом их можно открыть и пройти». Старт — не дальше урока 10, поэтому вопросы задаются только по урокам
 * 1…9: ответ по уроку 10 и дальше уже ничего бы не изменил («вопросов сколько нужно»). Все верно → уроки 1–9 открыты
 * (только эпизод 1, остальные открываются прохождением — замок 25.10 не меняется), старт — урок 10.
 */
export const PLACEMENT_START_CAP_LESSON_V1 = 10;

/** Вопросов на урок (28.10): урок освоен только при всех верных; первая ошибка — старт определён, тест окончен. */
export const PLACEMENT_QUESTIONS_PER_LESSON_V1 = 2;

export function startPlacementTestV1(lessons: readonly number[]): PlacementTestStateV1 {
  const ordered = [...new Set(lessons.filter((n) => Number.isSafeInteger(n) && n >= 1 && n < PLACEMENT_START_CAP_LESSON_V1))].sort((a, b) => a - b);
  if (ordered.length < lessons.length) {
    console.log('[PLACEMENT-UNLOCK] cap', JSON.stringify({ capLesson: PLACEMENT_START_CAP_LESSON_V1, given: lessons.length, asked: ordered.length, lastAsked: ordered[ordered.length - 1] ?? null })); // guard-ok: потолок урезал список вопросов
  }
  return Object.freeze({ lessons: Object.freeze(ordered), index: 0, attempts: Object.freeze([]), outcomes: Object.freeze([]), finished: ordered.length === 0 });
}

/** Урок текущего вопроса; null — тест окончен. */
export function placementCurrentLessonV1(state: PlacementTestStateV1): number | null {
  return state.finished ? null : state.lessons[state.index] ?? null;
}

/** Решена ли тема: любая ошибка → «не освоен» сразу (старт определён); все PLACEMENT_QUESTIONS_PER_LESSON_V1 верны → освоен; иначе ждём следующий вопрос. */
export function placementLessonDecisionV1(attempts: readonly boolean[]): PlacementLessonOutcomeV1 | null {
  if (attempts.some((correct) => !correct)) return 'failed';
  return attempts.length >= PLACEMENT_QUESTIONS_PER_LESSON_V1 ? 'credited' : null;
}

/** Ответ на текущий вопрос → новое состояние (исходное не меняется). */
export function answerPlacementTestV1(state: PlacementTestStateV1, correct: boolean): PlacementTestStateV1 {
  if (state.finished) return state;
  const lessonOrdinal = state.lessons[state.index];
  const attempts = Object.freeze([...state.attempts, correct]);
  const decision = placementLessonDecisionV1(attempts);
  if (decision === null) {
    console.log('[PLACEMENT]', JSON.stringify({ lessonOrdinal, correct, decision: 'pending', answered: attempts.length, of: PLACEMENT_QUESTIONS_PER_LESSON_V1 })); // guard-ok: верно, ждём следующий вопрос урока
    return Object.freeze({ ...state, attempts });
  }
  const outcomes = Object.freeze([...state.outcomes, Object.freeze({ lessonOrdinal, outcome: decision, attempts })]);
  const nextIndex = state.index + 1;
  // стоп на первой незасчитанной теме; иначе — следующий урок, если он есть
  const finished = decision === 'failed' || nextIndex >= state.lessons.length;
  console.log('[PLACEMENT]', JSON.stringify({ lessonOrdinal, correct, decision, next: finished ? (decision === 'failed' ? 'stop_start_here' : 'stop_all_known') : state.lessons[nextIndex] })); // guard-ok: решение по каждому ответу
  return Object.freeze({ ...state, index: finished ? state.index : nextIndex, attempts: Object.freeze([]), outcomes, finished });
}

export function placementTestResultV1(state: PlacementTestStateV1): PlacementTestResultV1 {
  const failed = state.outcomes.find((o) => o.outcome === 'failed');
  const result: PlacementTestResultV1 = Object.freeze({
    startLessonOrdinal: failed ? failed.lessonOrdinal : null,
    openedLessonOrdinals: Object.freeze(state.outcomes.filter((o) => o.outcome === 'credited').map((o) => o.lessonOrdinal)),
  });
  // зачем (координатор 28.10, «при всех верных тест открывает слишком много»): ответы, счёт, вычисленный уровень и сколько уроков
  // откроется — до выбора владельцем новой шкалы. Лог раз на итог теста.
  const answers = state.outcomes.map((o) => `${o.lessonOrdinal}:${o.outcome === 'credited' ? '+' : '-'}`).join(' ');
  console.log('[PLACEMENT-UNLOCK] result', JSON.stringify({
    answers,
    score: `${result.openedLessonOrdinals.length}/${state.outcomes.length}`,
    lessonsInTest: state.lessons.length,
    stoppedOn: failed ? failed.lessonOrdinal : 'none_all_correct',
    startLesson: result.startLessonOrdinal,
    willOpenFirstEpisodeOf: result.openedLessonOrdinals.length,
  })); // guard-ok: итог теста одной строкой
  return result;
}
