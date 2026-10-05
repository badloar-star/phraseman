/**
 * Статус карточки экзамена уровня в списке уроков.
 *
 * зачем (learn-4/8, координатор 05.10; лог Сверки [LESSONS-EXAM]: hasResult, pct 0, passed false → «Почти — 0%»):
 * сохранённый результат стоял выше проверки Plus, и Free видел «Почти — 0%» вместо «Откроется с Plus», хотя тап по
 * карточке ведёт в пейвол. Порядок: сданный — всегда свой статус; нужен Plus — «Откроется с Plus»; несданный с
 * результатом > 0% — «Почти — N%»; 0% — как нет результата.
 */
export type LessonsExamStatusKind =
  | 'passed'
  | 'plus'
  | 'almost'
  | 'source_unavailable'
  | 'start'
  | 'prev_exam'
  | 'complete_lessons';

export type LessonsExamStatusInput = Readonly<{
  result: Readonly<{ passed: boolean; pct: number }> | null | undefined;
  examPremiumRequired: boolean;
  examSourceAvailable: boolean;
  allDone: boolean;
  isPremium: boolean;
  prevExamLevel: string | null | undefined;
}>;

export function pickLessonsExamStatus(input: LessonsExamStatusInput): LessonsExamStatusKind {
  const { result } = input;
  if (result?.passed) return 'passed';
  if (input.examPremiumRequired) return 'plus';
  if (result && Number.isFinite(result.pct) && result.pct > 0) return 'almost';
  if (!input.examSourceAvailable) return 'source_unavailable';
  if (input.allDone) return 'start';
  if (input.isPremium && input.prevExamLevel) return 'prev_exam';
  return 'complete_lessons';
}

/* expo-router: утилита, не экран */
export default function __LessonsExamStatusRouteShim() {
  return null;
}
