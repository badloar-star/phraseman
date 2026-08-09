/** Shared retry policy for user-facing AI explanations. */

export type ExplainRetryClass = 'free_limit' | 'validator' | 'pending' | 'paused' | 'transient';

function errorFingerprint(error: unknown): string {
  if (error && typeof error === 'object') {
    const record = error as { code?: unknown; message?: unknown; details?: unknown; status?: unknown };
    return [record.code, record.message, record.details, record.status]
      .map((value) => String(value ?? ''))
      .join(' ')
      .toLowerCase();
  }
  return String(error ?? '').toLowerCase();
}

export function classifyExplainRetry(error: unknown): ExplainRetryClass {
  const value = errorFingerprint(error);
  if (value.includes('explain_free_daily_limit') || value.includes('free_limit')) return 'free_limit';
  if (value.includes('wrong_language') || value.includes('validator')) return 'validator';
  if (value.includes('pending') || value.includes('rejected')) return 'pending';
  if (
    value.includes('ai_globally_disabled') ||
    value.includes('disabled_by_admin') ||
    value.includes('rate_limited') ||
    value.includes('explain_global_budget') ||
    value.includes('explain_user_daily_limit') ||
    value.includes('openai_key_missing') ||
    value.includes('unauthenticated') ||
    value.includes('permission-denied') ||
    value.includes('invalid-argument') ||
    value.includes('app-check') ||
    value.includes('app_check')
  ) {
    return 'paused';
  }
  return 'transient';
}

export function isFreeExplainLimitError(error: unknown): boolean {
  return classifyExplainRetry(error) === 'free_limit';
}

/**
 * Infinite background retry is intentional, but it must never become a tight
 * request loop. Validator failures recover quickly; network/provider failures
 * back off; configuration/rate/budget pauses are checked slowly until external
 * state changes. A small deterministic jitter prevents synchronized clients.
 */
export function explainRetryDelayMs(error: unknown, consecutiveFailures: number): number {
  const failures = Math.max(1, Math.floor(consecutiveFailures));
  const kind = classifyExplainRetry(error);
  if (kind === 'free_limit') return 0;

  let base: number;
  let ceiling: number;
  if (kind === 'validator') {
    base = 350;
    ceiling = 5_000;
  } else if (kind === 'pending') {
    base = 1_200;
    ceiling = 15_000;
  } else if (kind === 'paused') {
    base = 30_000;
    ceiling = 60_000;
  } else {
    base = 1_000;
    ceiling = 30_000;
  }

  const exponential = Math.min(ceiling, base * (2 ** Math.min(8, failures - 1)));
  const jitter = (failures * 53) % 251;
  return Math.min(ceiling, exponential + jitter);
}
