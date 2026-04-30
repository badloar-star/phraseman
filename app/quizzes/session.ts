import type { QuizPhrase } from '../quiz_data';
import type { MutableRefObject } from 'react';

export type QuizInputStateReset = {
  chosen: number | null;
  typed: string;
  typedOk: boolean | null;
};

export type QuizReviewState = QuizInputStateReset & {
  reviewQ: QuizPhrase[];
  rIdx: number;
  reviewing: boolean;
  done: boolean;
};

export type QuizRestartState = QuizInputStateReset & {
  idx: number;
  score: number;
  streak: number;
  results: boolean[];
  done: boolean;
  reviewing: boolean;
};

export function clearQuizPendingTimers(
  autoAdvanceTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>,
  timerRef: MutableRefObject<ReturnType<typeof setInterval> | null>
): void {
  if (autoAdvanceTimerRef.current) {
    clearTimeout(autoAdvanceTimerRef.current);
    autoAdvanceTimerRef.current = null;
  }
  if (timerRef.current) {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }
}

export function buildReviewRetryState(wrongPhrases: QuizPhrase[]): QuizReviewState {
  return {
    chosen: null,
    typed: '',
    typedOk: null,
    reviewQ: wrongPhrases,
    rIdx: 0,
    reviewing: true,
    done: false,
  };
}

export function buildQuizRestartState(): QuizRestartState {
  return {
    idx: 0,
    chosen: null,
    score: 0,
    streak: 0,
    results: [],
    done: false,
    reviewing: false,
    typed: '',
    typedOk: null,
  };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
