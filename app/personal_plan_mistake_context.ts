import type { LessonPhrase, LessonWord } from './lesson_data_types';
import { phraseWordRowsForStudyTarget } from './phrase_target_utils';
import type { StudyTargetLang } from './study_target_lang_dev';

export type PersonalPlanMistakeContext = {
  planId?: string;
  planInstanceId?: string;
  planTaskId?: string;
  planDayIndex?: number;
  planPhraseLessonId?: string;
};

function cleanToken(value: string): string {
  return value
    .replace(/^\/|\/$/g, '')
    .replace(/[.!?,;:]+$/g, '')
    .trim();
}

function categoryOf(row: Pick<LessonWord, 'category'> | undefined): string {
  return String(row?.category ?? '').trim().toLowerCase();
}

export function shouldSkipPlanGrammarAnalytics(rawCategory: string | undefined | null): boolean {
  const value = String(rawCategory ?? '').trim().toLowerCase();
  return value === 'name' || value === 'user-name' || value === 'contact-name' || value === 'person-name';
}

function isFlexibleNameToken(value: string): boolean {
  const token = cleanToken(value);
  return /^[\p{L}\p{N}'-]{1,32}$/u.test(token);
}

export function isFlexiblePlanNameAnswer(
  phrase: LessonPhrase | null | undefined,
  answer: string,
  studyTarget: StudyTargetLang,
): boolean {
  const rows = phraseWordRowsForStudyTarget(phrase, studyTarget);
  if (!rows.some((row) => shouldSkipPlanGrammarAnalytics(categoryOf(row)))) return false;

  const answerTokens = answer.split(/\s+/).map(cleanToken).filter(Boolean);
  const targetRows = rows
    .map((row) => ({ row, token: cleanToken(row.correct ?? row.text) }))
    .filter((item) => item.token.length > 0);
  if (answerTokens.length !== targetRows.length) return false;

  return targetRows.every(({ row, token }, index) => {
    const picked = answerTokens[index] ?? '';
    if (shouldSkipPlanGrammarAnalytics(categoryOf(row))) return isFlexibleNameToken(picked);
    return picked.toLowerCase() === token.toLowerCase();
  });
}

export function compactPlanMistakeContext(
  context: PersonalPlanMistakeContext | undefined | null,
): PersonalPlanMistakeContext {
  if (!context) return {};
  const day = Number(context.planDayIndex);
  return {
    planId: context.planId?.trim() || undefined,
    planInstanceId: context.planInstanceId?.trim() || undefined,
    planTaskId: context.planTaskId?.trim() || undefined,
    planDayIndex: Number.isFinite(day) && day > 0 ? Math.floor(day) : undefined,
    planPhraseLessonId: context.planPhraseLessonId?.trim() || undefined,
  };
}
