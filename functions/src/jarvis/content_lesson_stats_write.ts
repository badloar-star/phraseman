import { MAX_LESSON_SCORE, MIN_LESSON_SCORE } from './content_lesson_stats';

/**
 * Решение «нужно ли писать в lesson_stats» и идентификатор документа —
 * без Firestore, без побочных эффектов. Встраивается в существующую
 * транзакцию progress_events.ts::progressSubmitEvent рядом с уже идущим
 * начислением XP, не переписывая саму эту транзакцию с нуля.
 */

export type ContentStudyTarget = 'en' | 'fr';

export interface MinimalProgressEvent {
  readonly type: string;
  readonly payload: Record<string, unknown>;
}

export interface LessonScoreSample {
  readonly lessonId: number;
  readonly target: ContentStudyTarget;
  readonly score: number;
}

function isFiniteScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= MIN_LESSON_SCORE && value <= MAX_LESSON_SCORE;
}

function isPositiveLessonId(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

export function shouldRecordLessonScore(event: MinimalProgressEvent): boolean {
  if (event.type !== 'lesson_complete') return false;
  if (!isPositiveLessonId(event.payload.lessonId)) return false;
  if (!isFiniteScore(event.payload.score ?? event.payload.bestScore)) return false;
  return true;
}

export function extractLessonScoreSample(event: MinimalProgressEvent): LessonScoreSample {
  const lessonId = event.payload.lessonId as number;
  const score = (event.payload.score ?? event.payload.bestScore) as number;
  const target: ContentStudyTarget = event.payload.studyTarget === 'fr' ? 'fr' : 'en';
  return Object.freeze({ lessonId, target, score });
}

export function lessonStatsDocId(lessonId: number, target: ContentStudyTarget): string {
  return `${target}_lesson${lessonId}`;
}
