import type { SemanticReviewPass } from './tournament_semantic_review';

export type SemanticBudgetReservationInput = Readonly<{
  utcDay: string;
  candidateId: string;
  pass: SemanticReviewPass;
  dailyCap: number;
}>;

export interface TournamentSemanticBudgetStore {
  reserve(input: SemanticBudgetReservationInput): Promise<
    | Readonly<{ ok: true; used: number; attemptOrdinal: number }>
    | Readonly<{ ok: false; used: number }>
  >;
  recordUsage(input: Readonly<{
    internalAttemptId: string;
    inputTokens: number;
    outputTokens: number;
  }>): Promise<void>;
}

function validIdentity(value: string): boolean {
  return typeof value === 'string' && value === value.trim() && value.length > 0 && value.length <= 200;
}

export async function authorizeSemanticAttempt(
  store: TournamentSemanticBudgetStore,
  input: SemanticBudgetReservationInput & Readonly<{ dryRun: boolean }>,
): Promise<
  | Readonly<{ ok: true; dryRun: boolean; attemptOrdinal: number; used: number; dailyCap: number }>
  | Readonly<{ ok: false; reason: 'daily_cap_exhausted'; used: number; dailyCap: number }>
> {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(input.utcDay)
    || !validIdentity(input.candidateId)
    || !Number.isSafeInteger(input.dailyCap) || input.dailyCap < 0) {
    throw new Error('semantic_budget_input_invalid');
  }
  if (input.dryRun) return Object.freeze({
    ok: true, dryRun: true, attemptOrdinal: 0, used: 0, dailyCap: input.dailyCap,
  });
  const reservation = await store.reserve({
    utcDay: input.utcDay,
    candidateId: input.candidateId,
    pass: input.pass,
    dailyCap: input.dailyCap,
  });
  if (!reservation.ok) return Object.freeze({
    ok: false, reason: 'daily_cap_exhausted', used: reservation.used, dailyCap: input.dailyCap,
  });
  return Object.freeze({
    ok: true, dryRun: false, attemptOrdinal: reservation.attemptOrdinal,
    used: reservation.used, dailyCap: input.dailyCap,
  });
}

export async function recordSemanticAttemptUsage(
  store: TournamentSemanticBudgetStore,
  input: Readonly<{
    internalAttemptId: string;
    inputTokens: number;
    outputTokens: number;
    dryRun: boolean;
  }>,
): Promise<void> {
  if (!validIdentity(input.internalAttemptId)
    || !Number.isSafeInteger(input.inputTokens) || input.inputTokens < 0
    || !Number.isSafeInteger(input.outputTokens) || input.outputTokens < 0) {
    throw new Error('semantic_usage_invalid');
  }
  if (input.dryRun) return;
  await store.recordUsage({
    internalAttemptId: input.internalAttemptId,
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
  });
}
