/**
 * Точка входа данных карточек уроков (PROMPT-014).
 * Массив фраз: `lesson_cards/lessonCards.generated.ts` (пересборка: `npx tsx scripts/gen-prompt014-lesson-cards.ts`).
 */
export type { PhraseCard } from './lesson_cards/phraseCardTypes';
export { generatedLessonCards as lessonCards } from './lesson_cards/lessonCards.generated';

import { lessonCards } from './lesson_cards/lessonCards.generated';

export function getPhraseCard(lessonId: number, phraseIndex: number): import('./lesson_cards/phraseCardTypes').PhraseCard | null {
  return lessonCards[lessonId]?.[phraseIndex] ?? null;
}

/** expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() {
  return null;
}
