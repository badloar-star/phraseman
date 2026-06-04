import { getDueItems, type RecallItem } from './active_recall';
import type { RuntimeStudyTarget } from './target_storage_keys';

export const PERSONAL_PRACTICE_SEEDED_MIN_PHRASES = 3;
export const PERSONAL_PRACTICE_SEEDED_MIN_WORDS = 5;

export type PersonalPracticeSeededReadinessInput = {
  duePhraseCount?: number;
  dueWordCount?: number;
  requiredPhraseCount?: number;
  requiredWordCount?: number;
};

export type PersonalPracticeSeededReadiness =
  | {
      status: 'ready';
      reason: 'enough_due_phrases' | 'enough_due_words';
      requiredPhraseCount: number;
      requiredWordCount: number;
      duePhraseCount: number;
      dueWordCount: number;
    }
  | {
      status: 'blocked';
      reason: 'not_enough_due_material';
      requiredPhraseCount: number;
      requiredWordCount: number;
      duePhraseCount: number;
      dueWordCount: number;
    };

function safeCount(value: number | null | undefined): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(Number(value))) : 0;
}

export function resolvePersonalPracticeSeededReadiness(
  input: PersonalPracticeSeededReadinessInput,
): PersonalPracticeSeededReadiness {
  const requiredPhraseCount = safeCount(input.requiredPhraseCount) || PERSONAL_PRACTICE_SEEDED_MIN_PHRASES;
  const requiredWordCount = safeCount(input.requiredWordCount) || PERSONAL_PRACTICE_SEEDED_MIN_WORDS;
  const duePhraseCount = safeCount(input.duePhraseCount);
  const dueWordCount = safeCount(input.dueWordCount);

  if (duePhraseCount >= requiredPhraseCount) {
    return {
      status: 'ready',
      reason: 'enough_due_phrases',
      requiredPhraseCount,
      requiredWordCount,
      duePhraseCount,
      dueWordCount,
    };
  }

  if (dueWordCount >= requiredWordCount) {
    return {
      status: 'ready',
      reason: 'enough_due_words',
      requiredPhraseCount,
      requiredWordCount,
      duePhraseCount,
      dueWordCount,
    };
  }

  return {
    status: 'blocked',
    reason: 'not_enough_due_material',
    requiredPhraseCount,
    requiredWordCount,
    duePhraseCount,
    dueWordCount,
  };
}

export async function resolvePersonalPracticeSeededDuePhrases(input?: {
  studyTarget?: RuntimeStudyTarget;
  requiredPhraseCount?: number;
  limit?: number;
}): Promise<RecallItem[]> {
  const requiredPhraseCount = safeCount(input?.requiredPhraseCount) || PERSONAL_PRACTICE_SEEDED_MIN_PHRASES;
  const limit = Math.max(requiredPhraseCount, safeCount(input?.limit) || requiredPhraseCount);
  return getDueItems(limit, { commitSessionOverflow: false }, input?.studyTarget);
}
