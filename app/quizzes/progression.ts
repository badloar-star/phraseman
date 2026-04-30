import type { QuizPhrase } from '../quiz_data';

// Pure transition helper for moving quiz flow forward.
// Keeps progression logic deterministic and reusable across tap/auto-advance paths.
export type QuizProgressionState = {
  reviewing: boolean;
  idx: number;
  phrasesLength: number;
  reviewQ: QuizPhrase[];
  rIdx: number;
  isRight: boolean;
};

export type QuizProgressionResult = {
  done: boolean;
  nextIdx?: number;
  nextReviewQ?: QuizPhrase[];
  nextRIdx?: number;
};

export function getQuizTimerSeconds(level: 'easy' | 'medium' | 'hard'): number {
  if (level === 'easy') return 40;
  if (level === 'medium') return 50;
  return 70;
}

export function computeNextQuizProgression(state: QuizProgressionState): QuizProgressionResult {
  if (!state.reviewing) {
    if (state.idx + 1 >= state.phrasesLength) {
      return { done: true };
    }
    return { done: false, nextIdx: state.idx + 1 };
  }

  if (state.isRight) {
    const nextReviewQ = state.reviewQ.filter((_, i) => i !== state.rIdx);
    if (nextReviewQ.length === 0) return { done: true, nextReviewQ, nextRIdx: 0 };
    const nextRIdx = state.rIdx >= nextReviewQ.length ? 0 : state.rIdx;
    return { done: false, nextReviewQ, nextRIdx };
  }

  const item = state.reviewQ[state.rIdx];
  const nextReviewQ = [...state.reviewQ.filter((_, i) => i !== state.rIdx), item];
  const nextRIdx = state.rIdx >= nextReviewQ.length ? 0 : state.rIdx;
  return { done: false, nextReviewQ, nextRIdx };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
