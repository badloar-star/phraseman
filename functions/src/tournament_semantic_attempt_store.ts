import { createHash } from 'node:crypto';
import type { SemanticReviewPass } from './tournament_semantic_review';

export type AttemptState = 'reserved' | 'calling' | 'returned' | 'recorded' | 'abandoned';

export type TournamentSemanticAttempt = Readonly<{
  internalAttemptId: string;
  jobId: string;
  candidateId: string;
  pass: SemanticReviewPass;
  /** Globally monotonic within one semantic job. */
  ordinal: number;
  /** Monotonic retry/spend count for this candidate and review pass. */
  passOrdinal: number;
  state: AttemptState;
  leaseToken: string;
  createdAtMs: number;
  updatedAtMs: number;
  responseHash?: string;
  structuredResult?: Readonly<Record<string, unknown>>;
  inputTokens?: number;
  outputTokens?: number;
}>;

export type SemanticAttemptTransition =
  | Readonly<{ kind: 'calling'; leaseToken: string; nowMs: number }>
  | Readonly<{
    kind: 'returned'; leaseToken: string; nowMs: number; responseHash: string;
    structuredResult: Readonly<Record<string, unknown>>; inputTokens: number; outputTokens: number;
  }>
  | Readonly<{ kind: 'recorded' | 'abandoned'; leaseToken: string; nowMs: number }>;

function validText(value: string): boolean {
  return typeof value === 'string' && value === value.trim() && value.length > 0 && value.length <= 200;
}

function attemptId(jobId: string, candidateId: string, pass: SemanticReviewPass, ordinal: number): string {
  const suffix = createHash('sha256').update(`${jobId}\n${candidateId}\n${pass}\n${ordinal}`, 'utf8').digest('hex');
  return `tsa_${suffix}`;
}

export function allocateSemanticAttemptOrdinals(input: Readonly<{
  globalOrdinal: number;
  passOrdinal: number;
}>): Readonly<{ ordinal: number; passOrdinal: number }> {
  if (!Number.isSafeInteger(input.globalOrdinal) || input.globalOrdinal < 0
    || !Number.isSafeInteger(input.passOrdinal) || input.passOrdinal < 0
    || input.globalOrdinal === Number.MAX_SAFE_INTEGER || input.passOrdinal === Number.MAX_SAFE_INTEGER) {
    throw new Error('semantic_attempt_ordinal_invalid');
  }
  return Object.freeze({ ordinal: input.globalOrdinal + 1, passOrdinal: input.passOrdinal + 1 });
}

export function createReservedSemanticAttempt(input: Readonly<{
  jobId: string;
  candidateId: string;
  pass: SemanticReviewPass;
  ordinal: number;
  passOrdinal: number;
  leaseToken: string;
  nowMs: number;
}>): TournamentSemanticAttempt {
  if (!validText(input.jobId) || !validText(input.candidateId) || !validText(input.leaseToken)
    || !Number.isSafeInteger(input.ordinal) || input.ordinal < 1
    || !Number.isSafeInteger(input.passOrdinal) || input.passOrdinal < 1
    || !Number.isSafeInteger(input.nowMs) || input.nowMs < 0) {
    throw new Error('semantic_attempt_input_invalid');
  }
  return Object.freeze({
    internalAttemptId: attemptId(input.jobId, input.candidateId, input.pass, input.ordinal),
    jobId: input.jobId,
    candidateId: input.candidateId,
    pass: input.pass,
    ordinal: input.ordinal,
    passOrdinal: input.passOrdinal,
    state: 'reserved',
    leaseToken: input.leaseToken,
    createdAtMs: input.nowMs,
    updatedAtMs: input.nowMs,
  });
}

export function transitionSemanticAttempt(
  attempt: TournamentSemanticAttempt,
  transition: SemanticAttemptTransition,
): TournamentSemanticAttempt {
  if (transition.leaseToken !== attempt.leaseToken) throw new Error('semantic_attempt_stale_lease');
  if (!Number.isSafeInteger(transition.nowMs) || transition.nowMs < attempt.updatedAtMs) {
    throw new Error('semantic_attempt_time_invalid');
  }
  if ((transition.kind === 'calling' && attempt.state !== 'reserved')
    || (transition.kind === 'returned' && attempt.state !== 'calling')
    || (transition.kind === 'recorded' && attempt.state !== 'returned')
    || (transition.kind === 'abandoned' && attempt.state !== 'reserved' && attempt.state !== 'calling')) {
    throw new Error('semantic_attempt_transition_invalid');
  }
  if (transition.kind === 'returned') {
    if (!/^[a-f0-9]{64}$/u.test(transition.responseHash)
      || !transition.structuredResult || typeof transition.structuredResult !== 'object'
      || Array.isArray(transition.structuredResult)
      || !Number.isSafeInteger(transition.inputTokens) || transition.inputTokens < 0
      || !Number.isSafeInteger(transition.outputTokens) || transition.outputTokens < 0) {
      throw new Error('semantic_attempt_response_invalid');
    }
    return Object.freeze({
      ...attempt, state: 'returned', updatedAtMs: transition.nowMs,
      responseHash: transition.responseHash,
      structuredResult: Object.freeze({ ...transition.structuredResult }),
      inputTokens: transition.inputTokens,
      outputTokens: transition.outputTokens,
    });
  }
  return Object.freeze({ ...attempt, state: transition.kind, updatedAtMs: transition.nowMs });
}

export function resumeSemanticAttempt(
  attempt: TournamentSemanticAttempt,
  leaseToken: string,
):
  | Readonly<{ action: 'transition_calling'; attempt: TournamentSemanticAttempt }>
  | Readonly<{ action: 'reuse_returned' | 'already_recorded'; attempt: TournamentSemanticAttempt }>
  | Readonly<{ action: 'allocate_new'; consumedAttempts: 1; abandonAttemptId: string }> {
  if (attempt.state === 'returned') return Object.freeze({ action: 'reuse_returned', attempt });
  if (attempt.state === 'recorded') return Object.freeze({ action: 'already_recorded', attempt });
  if (attempt.state === 'reserved' && attempt.leaseToken === leaseToken) {
    return Object.freeze({ action: 'transition_calling', attempt });
  }
  return Object.freeze({
    action: 'allocate_new', consumedAttempts: 1 as const, abandonAttemptId: attempt.internalAttemptId,
  });
}
