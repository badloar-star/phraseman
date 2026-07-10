import type { LessonPhrase, LessonPhraseSourceLocales, LessonWord } from '../lesson_data_types';
import { normalizeSourceLocale } from '../source_locales';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function tokenizeSurface(value: string): string[] {
  return value.match(/[\p{L}\p{M}\p{N}]+(?:['’.-][\p{L}\p{M}\p{N}]+)*|[^\s]/gu)?.filter(Boolean) ?? [];
}

function lessonWords(targetText: string, distractorPool: readonly string[]): LessonWord[] {
  return tokenizeSurface(targetText).map((text) => ({
    text,
    correct: text,
    distractors: distractorPool.filter((candidate) => candidate !== text).slice(0, 5),
    category: /^[^\p{L}\p{M}\p{N}]+$/u.test(text) ? 'punctuation' : 'generated',
  }));
}

export function lessonRowsFromCourseReleasePayload(
  payload: unknown,
  identity: { studyTarget: string; learnerSourceLocale: string; lessonId: number },
): LessonPhrase[] {
  if (!isRecord(payload) || Number(payload.lessonId) !== identity.lessonId) throw new Error('course_release_lesson_identity_mismatch');
  if (!Array.isArray(payload.phrases) || payload.phrases.length !== 50 || !Array.isArray(payload.vocabulary)) throw new Error('course_release_lesson_invalid');
  const normalizedSourceLocale = normalizeSourceLocale(identity.learnerSourceLocale);
  const targetPool = [...new Set(payload.phrases.flatMap((value) => isRecord(value) && typeof value.targetText === 'string' ? tokenizeSurface(value.targetText) : []))];
  const seenIds = new Set<string>();
  const seenTargets = new Set<string>();
  const rows: LessonPhrase[] = payload.phrases.map((value) => {
    if (!isRecord(value) || typeof value.id !== 'string' || !value.id.trim() || typeof value.sourceText !== 'string' || !value.sourceText.trim() || typeof value.targetText !== 'string' || !value.targetText.trim()) throw new Error('course_release_lesson_invalid');
    const id = value.id.trim();
    const sourceText = value.sourceText.trim();
    const targetText = value.targetText.trim();
    const normalizedTarget = targetText.toLocaleLowerCase();
    if (seenIds.has(id) || seenTargets.has(normalizedTarget)) throw new Error('course_release_lesson_invalid');
    seenIds.add(id);
    seenTargets.add(normalizedTarget);
    const words = lessonWords(targetText, targetPool);
    if (!words.length) throw new Error('course_release_lesson_invalid');
    const sourceLocales = normalizedSourceLocale ? ({ [normalizedSourceLocale]: sourceText } as LessonPhraseSourceLocales) : undefined;
    const row: LessonPhrase = { id, english: targetText, russian: sourceText, ukrainian: sourceText, sourceLocales, words };
    if (identity.studyTarget === 'fr') { row.french = targetText; row.wordsFr = words; }
    if (identity.studyTarget === 'es') row.spanish = targetText;
    return row;
  });
  return rows;
}
