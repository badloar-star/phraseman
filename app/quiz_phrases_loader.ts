/**
 * Quiz phrase pools are bundled with the app (no dynamic import) so the quiz
 * screen renders immediately with no "loading questions" state.
 */
import type { QuizPhrase } from './quiz_data';
import * as quizData from './quiz_data';
import type { Lang } from '../constants/i18n';

/** @deprecated No-op; data is always available. Kept for call-site compatibility. */
export async function ensureQuizPhrasesLoaded(): Promise<void> {
  // intentionally empty
}

/** @deprecated No-op; data is bundled. */
export function prefetchQuizPhrases(): void {
  // intentionally empty
}

export function getQuizPhrasesLoaded(
  difficulty: 'easy' | 'medium' | 'hard',
  count: number = 10,
  lang: Lang = 'ru',
): QuizPhrase[] {
  return quizData.getQuizPhrases(difficulty, count, lang);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
