/**
 * Quiz phrase pools are bundled with the app so the quiz screen never races an
 * async module load while rendering the first question.
 */
import type { QuizDifficulty, QuizPhrase, QuizStudyTargetLang } from './quiz_data';
import { getQuizPhrases } from './quiz_data';
import { storageStudyTarget } from './target_storage_keys';
import type { Lang } from '../constants/i18n';
import {
  ensureFrenchRemoteQuizRows,
  getCachedFrenchRemoteQuizRows,
  prefetchFrenchRemoteQuizRows,
} from './french_quiz_remote_runtime';
import {
  ensureCourseReleaseQuizRows,
  getCachedCourseReleaseQuizRows,
  prefetchCourseReleaseQuizRows,
} from './language_runtime/course_release_quiz_loader';

export async function ensureQuizPhrasesLoaded(lang: Lang = 'ru', studyTarget: QuizStudyTargetLang = 'en'): Promise<void> {
  const target = storageStudyTarget(studyTarget);
  if (target === 'en') return;
  try {
    await ensureCourseReleaseQuizRows(target, lang);
  } catch (error) {
    if (target === 'fr') return ensureFrenchRemoteQuizRows(lang);
    if (target !== 'es') throw error;
  }
}

export function prefetchQuizPhrases(lang: Lang = 'ru', studyTarget: QuizStudyTargetLang = 'en'): void {
  const target = storageStudyTarget(studyTarget);
  if (target === 'en') return;
  prefetchCourseReleaseQuizRows(target, lang);
  if (target === 'fr') prefetchFrenchRemoteQuizRows(lang);
}

export function getQuizPhrasesLoaded(
  difficulty: QuizDifficulty,
  count: number = 10,
  lang: Lang = 'ru',
  studyTarget: QuizStudyTargetLang = 'en',
): QuizPhrase[] {
  const target = storageStudyTarget(studyTarget);
  if (target !== 'en') {
    const canonical = getCachedCourseReleaseQuizRows(target, lang, difficulty, count);
    if (canonical.length > 0) return canonical;
    if (target === 'fr') return getCachedFrenchRemoteQuizRows(difficulty, count, lang);
    if (target !== 'es') return [];
  }
  return getQuizPhrases(difficulty, count, lang, studyTarget);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
