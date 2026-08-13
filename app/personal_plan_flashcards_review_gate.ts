import { loadFlashcards, type Flashcard } from '../hooks/use-flashcards';
import type { RuntimeStudyTarget } from './target_storage_keys';

export const PERSONAL_PLAN_FLASHCARDS_REVIEW_MIN_CARDS = 3;

export type PersonalPlanFlashcardsReviewReadinessInput = {
  availableCardCount?: number;
  requiredCardCount?: number;
};

export type PersonalPlanFlashcardsReviewReadiness =
  | {
      status: 'ready';
      reason: 'enough_saved_cards';
      availableCardCount: number;
      requiredCardCount: number;
    }
  | {
      status: 'blocked';
      reason: 'not_enough_saved_cards';
      availableCardCount: number;
      requiredCardCount: number;
    };

function safeCount(value: number | null | undefined): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(Number(value))) : 0;
}

function hasReviewableText(card: Flashcard): boolean {
  const en = card.en?.trim();
  const translation = card.ru?.trim() || card.uk?.trim() || card.es?.trim();
  return Boolean(en && translation);
}

export function resolvePersonalPlanFlashcardsReviewReadiness(
  input: PersonalPlanFlashcardsReviewReadinessInput,
): PersonalPlanFlashcardsReviewReadiness {
  const availableCardCount = safeCount(input.availableCardCount);
  const requiredCardCount = safeCount(input.requiredCardCount) || PERSONAL_PLAN_FLASHCARDS_REVIEW_MIN_CARDS;

  if (availableCardCount >= requiredCardCount) {
    return {
      status: 'ready',
      reason: 'enough_saved_cards',
      availableCardCount,
      requiredCardCount,
    };
  }

  return {
    status: 'blocked',
    reason: 'not_enough_saved_cards',
    availableCardCount,
    requiredCardCount,
  };
}

export async function resolvePersonalPlanFlashcardsReviewCount(
  studyTarget?: RuntimeStudyTarget,
): Promise<number> {
  const cards = await loadFlashcards(studyTarget).catch(() => [] as Flashcard[]);
  return cards.filter(hasReviewableText).length;
}
