import type { MistakeTokenMeta } from './mistake_log';
import type { PersonalPlanQuizCoverage, PersonalPlanQuizSource } from './personal_plan_quizzes';

export type PersonalPlanQuizMistakeContextInput = {
  planQuizId?: string;
  planId?: string;
  planInstanceId?: string;
  planTaskId?: string;
  planDayIndex?: number;
  questionId?: string;
  coverage?: PersonalPlanQuizCoverage | null;
};

function firstPlanPhraseSource(sources: PersonalPlanQuizSource[] | undefined): Extract<PersonalPlanQuizSource, { type: 'plan_phrase' }> | null {
  const source = sources?.find((item): item is Extract<PersonalPlanQuizSource, { type: 'plan_phrase' }> => item.type === 'plan_phrase');
  return source ?? null;
}

export function buildPersonalPlanQuizMistakeMeta(
  baseMeta: MistakeTokenMeta | undefined | null,
  input: PersonalPlanQuizMistakeContextInput,
): MistakeTokenMeta {
  if (!input.planQuizId) return baseMeta ?? {};

  const source = firstPlanPhraseSource(input.coverage?.[input.questionId ?? '']);
  const day = Number(input.planDayIndex);

  return {
    ...(baseMeta ?? {}),
    phraseId: source?.phraseId ?? baseMeta?.phraseId,
    grammarTag: baseMeta?.grammarTag ?? 'personal_plan_quiz',
    planId: input.planId?.trim() || undefined,
    planInstanceId: input.planInstanceId?.trim() || undefined,
    planTaskId: input.planTaskId?.trim() || undefined,
    planDayIndex: Number.isFinite(day) && day > 0 ? Math.floor(day) : undefined,
    planPhraseLessonId: source?.lessonId ?? baseMeta?.planPhraseLessonId,
  };
}
