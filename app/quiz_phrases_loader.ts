/**
 * Quiz phrase pools are bundled with the app so the quiz screen never races an
 * async module load while rendering the first question.
 */
import type { QuizDifficulty, QuizPhrase, QuizStudyTargetLang } from './quiz_data';
import { getQuizPhrases } from './quiz_data';
import type { Lang } from '../constants/i18n';

/** @deprecated No-op; data is bundled. Kept for call-site compatibility. */
export async function ensureQuizPhrasesLoaded(): Promise<void> {
  // intentionally empty
}

/** @deprecated No-op; data is bundled. */
export function prefetchQuizPhrases(): void {
  // intentionally empty
}

export function getQuizPhrasesLoaded(
  difficulty: QuizDifficulty,
  count: number = 10,
  lang: Lang = 'ru',
  studyTarget: QuizStudyTargetLang = 'en',
): QuizPhrase[] {
  if (studyTarget === 'fr') return [];
  return getQuizPhrases(difficulty, count, lang);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
