// placement_view_model.ts — чистая модель вида теста «Не хочу с начала» (макет chapter-exam-season.html, раздел 6).
// зачем (координатор 24.10: «только интерфейс, 1 в 1»): экраны ничего не считают сами — подпись «урок n из N», точки попыток, плашка «Ещё 2 вопроса»
// и строки итога берутся отсюда из состояния движка (`placement_test_v1.ts`, его не меняем). Тестируется без React.
import {
  PLACEMENT_TEST_EXTRA_QUESTIONS_V1,
  placementCurrentLessonV1,
  placementExtraQuestionsLeftV1,
  placementTestResultV1,
  type PlacementTestStateV1,
} from '../../../modules/learning-v2/exam/placement_test_v1';

/** Точка попытки (`.tries i`): верно / мимо / текущая / ещё впереди (пустая). */
export type PlacementTryDot = 'ok' | 'no' | 'cur' | 'empty';

/** Сколько точек всего после первой ошибки: первый вопрос + два дополнительных. */
export const PLACEMENT_TRIES_TOTAL = 1 + PLACEMENT_TEST_EXTRA_QUESTIONS_V1;

export type PlacementQuestionView = Readonly<{
  lessonOrdinal: number;
  /** «урок n из N» в шапке: n — место урока в тесте (макет: «урок 2 из 32»). */
  position: number;
  total: number;
  /** Доля полосы прогресса, 0…1. */
  progress: number;
  dots: readonly PlacementTryDot[];
  /** Плашка «Ещё 2 вопроса по этой теме» (после первой ошибки; она же закрывается, когда вопросов не осталось). */
  extraBanner: boolean;
}>;

/**
 * Точки попыток по теме. До первой ошибки — одна текущая (макет `['cur']`); после ошибки — три: сделанные, текущая и пустые впереди
 * (макет `['no','cur','']`). Тема решена — текущей нет.
 */
export function placementTryDots(attempts: readonly boolean[], decided: boolean): readonly PlacementTryDot[] {
  if (attempts.length === 0) return ['cur'];
  const dots: PlacementTryDot[] = attempts.map((right) => (right ? 'ok' : 'no'));
  if (!decided) dots.push('cur');
  if (attempts[0] === true && decided) return dots;
  while (dots.length < PLACEMENT_TRIES_TOTAL) dots.push('empty');
  return dots;
}

/** Вид текущего вопроса; null — тест окончен. */
export function placementQuestionView(state: PlacementTestStateV1): PlacementQuestionView | null {
  const lessonOrdinal = placementCurrentLessonV1(state);
  if (lessonOrdinal === null) return null;
  const total = state.lessons.length;
  const position = state.index + 1;
  return Object.freeze({
    lessonOrdinal,
    position,
    total,
    progress: total > 0 ? position / total : 0,
    dots: placementTryDots(state.attempts, false),
    extraBanner: placementExtraQuestionsLeftV1(state) > 0,
  });
}

export type PlacementResultRow = Readonly<{ lessonOrdinal: number; kind: 'opened' | 'here' }>;

export type PlacementResultView = Readonly<{
  /** Урок «начнём здесь»; null — засчитаны все доступные уроки (макета нет, см. вопрос 1 в пакете). */
  startLessonOrdinal: number | null;
  /** Открытые уроки по порядку. */
  openedLessonOrdinals: readonly number[];
  /** «1–3» либо «1» (один урок), для текста «Темы уроков {range} ты знаешь»; пусто — ничего не открыто. */
  openedRange: string;
  /** Строки списка: открытые, затем «начнём здесь». */
  rows: readonly PlacementResultRow[];
}>;

const rangeOf = (ordinals: readonly number[]): string => {
  if (ordinals.length === 0) return '';
  const first = ordinals[0] as number;
  const last = ordinals[ordinals.length - 1] as number;
  return first === last ? String(first) : `${first}–${last}`;
};

/**
 * Итог теста. `stoppedAtLesson` — тест остановлен досрочно на теме без вопроса в пуле: она считается первой незасчитанной
 * (если движок сам не нашёл провала), чтобы тест не застревал.
 */
export function placementResultView(state: PlacementTestStateV1, stoppedAtLesson: number | null = null): PlacementResultView {
  const result = placementTestResultV1(state);
  const startLessonOrdinal = result.startLessonOrdinal ?? stoppedAtLesson;
  const rows: PlacementResultRow[] = result.openedLessonOrdinals.map((lessonOrdinal) => ({ lessonOrdinal, kind: 'opened' as const }));
  if (startLessonOrdinal !== null) rows.push({ lessonOrdinal: startLessonOrdinal, kind: 'here' });
  return Object.freeze({
    startLessonOrdinal,
    openedLessonOrdinals: result.openedLessonOrdinals,
    openedRange: rangeOf(result.openedLessonOrdinals),
    rows: Object.freeze(rows),
  });
}
