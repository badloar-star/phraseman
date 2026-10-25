// placement_test_v1.ts — движок входного теста «Не хочу с начала» (реестр владельца №10). Чистые функции, без хранения и сети.
// зачем (владелец 21.10, docs/work/OWNER_DECISIONS_2026-10-21.md стр. 85–91): «1 вопрос на тему по порядку уроков». Тест бесплатный,
// без энергии. Итог — номер урока N, с которого человек начнёт. Решает телефон; этот модуль только считает.
// ЗАМОК ВЛАДЕЛЬЦА 25.10: «а вообще убери 2 доп вопроса вообще» (снимает его же замок 21.10 №10 «ошибка → ещё 2, зачёт 2 из 3»):
// по каждому уроку ОДИН вопрос; первая ошибка — тест окончен, этот урок — «начнём здесь». Добора и зачёта «2 из 3» нет.

export type PlacementLessonOutcomeV1 = 'credited' | 'failed';

export type PlacementTestStateV1 = Readonly<{
  /** Уроки по порядку, доступные для теста (с материалами). */
  lessons: readonly number[];
  /** Индекс текущего урока в `lessons`. */
  index: number;
  /** Ответ по текущему уроку (один вопрос на урок; массив — для совместимости формы состояния). */
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

export function startPlacementTestV1(lessons: readonly number[]): PlacementTestStateV1 {
  const ordered = [...new Set(lessons.filter((n) => Number.isSafeInteger(n) && n >= 1))].sort((a, b) => a - b);
  return Object.freeze({ lessons: Object.freeze(ordered), index: 0, attempts: Object.freeze([]), outcomes: Object.freeze([]), finished: ordered.length === 0 });
}

/** Урок текущего вопроса; null — тест окончен. */
export function placementCurrentLessonV1(state: PlacementTestStateV1): number | null {
  return state.finished ? null : state.lessons[state.index] ?? null;
}

/** Решена ли тема: решает первый (единственный) ответ — верно → тема знакома, мимо → стоп. */
export function placementLessonDecisionV1(attempts: readonly boolean[]): PlacementLessonOutcomeV1 | null {
  if (attempts.length === 0) return null;
  return attempts[0] ? 'credited' : 'failed';
}

/** Ответ на текущий вопрос → новое состояние (исходное не меняется). */
export function answerPlacementTestV1(state: PlacementTestStateV1, correct: boolean): PlacementTestStateV1 {
  if (state.finished) return state;
  const lessonOrdinal = state.lessons[state.index];
  const attempts = Object.freeze([...state.attempts, correct]);
  const decision = placementLessonDecisionV1(attempts);
  if (decision === null) return Object.freeze({ ...state, attempts });
  const outcomes = Object.freeze([...state.outcomes, Object.freeze({ lessonOrdinal, outcome: decision, attempts })]);
  const nextIndex = state.index + 1;
  // стоп на первой незасчитанной теме; иначе — следующий урок, если он есть
  const finished = decision === 'failed' || nextIndex >= state.lessons.length;
  console.log('[PLACEMENT]', JSON.stringify({ lessonOrdinal, correct, decision, next: finished ? (decision === 'failed' ? 'stop_start_here' : 'stop_all_known') : state.lessons[nextIndex] })); // guard-ok: решение по каждому ответу
  return Object.freeze({ ...state, index: finished ? state.index : nextIndex, attempts: Object.freeze([]), outcomes, finished });
}

export function placementTestResultV1(state: PlacementTestStateV1): PlacementTestResultV1 {
  const failed = state.outcomes.find((o) => o.outcome === 'failed');
  return Object.freeze({
    startLessonOrdinal: failed ? failed.lessonOrdinal : null,
    openedLessonOrdinals: Object.freeze(state.outcomes.filter((o) => o.outcome === 'credited').map((o) => o.lessonOrdinal)),
  });
}
