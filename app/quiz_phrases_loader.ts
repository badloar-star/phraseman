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

export async function ensureQuizPhrasesLoaded(lang: Lang = 'ru', studyTarget: QuizStudyTargetLang = 'en'): Promise<void> {
  if (storageStudyTarget(studyTarget) === 'fr') {
    await ensureFrenchRemoteQuizRows(lang);
  }
}

export function prefetchQuizPhrases(lang: Lang = 'ru', studyTarget: QuizStudyTargetLang = 'en'): void {
  if (storageStudyTarget(studyTarget) === 'fr') {
    prefetchFrenchRemoteQuizRows(lang);
  }
}

export function getQuizPhrasesLoaded(
  difficulty: QuizDifficulty,
  count: number = 10,
  lang: Lang = 'ru',
  studyTarget: QuizStudyTargetLang = 'en',
): QuizPhrase[] {
  if (storageStudyTarget(studyTarget) === 'fr') {
    return getCachedFrenchRemoteQuizRows(difficulty, count, lang);
  }
  return getQuizPhrases(difficulty, count, lang, studyTarget);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
