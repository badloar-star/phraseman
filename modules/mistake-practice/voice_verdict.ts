export type MistakeVoiceVerdict = 'PASS' | 'FAIL' | 'UNCERTAIN' | 'INVALID';
export type MistakeVoiceOutcome = MistakeVoiceVerdict
  | 'no_speech'
  | 'stalled'
  | 'denied'
  | 'unavailable'
  | 'cancelled';
export type MistakeVoiceSessionAttemptVerdict =
  | 'correct'
  | 'pedagogical_wrong'
  | 'no_speech'
  | 'technical_error'
  | 'cancelled';

const UNCERTAINTY_POINTS = 5;

export function classifyMistakeVoiceVerdict(input: Readonly<{
  status: 'scored' | 'invalid';
  score: number | null;
  threshold: number;
}>): MistakeVoiceVerdict {
  if (input.status === 'invalid' || !Number.isFinite(input.score)) return 'INVALID';
  const score = Number(input.score);
  if (score >= input.threshold + UNCERTAINTY_POINTS) return 'PASS';
  if (score <= input.threshold - UNCERTAINTY_POINTS) return 'FAIL';
  return 'UNCERTAIN';
}

/**
 * Exhaustive boundary between speech infrastructure and learner attempts.
 * Only an accepted, confidently scored FAIL is a pedagogical error.
 */
export function mistakeVoiceOutcomeToSessionAttemptVerdict(
  outcome: MistakeVoiceOutcome,
): MistakeVoiceSessionAttemptVerdict {
  if (outcome === 'PASS') return 'correct';
  if (outcome === 'FAIL') return 'pedagogical_wrong';
  if (outcome === 'UNCERTAIN' || outcome === 'no_speech') return 'no_speech';
  if (outcome === 'cancelled') return 'cancelled';
  return 'technical_error';
}
