export type GenerationErrorCode =
  | 'source_missing'
  | 'source_coverage'
  | 'provider_rate_limit'
  | 'provider_schema'
  | 'qa_failed'
  | 'budget_exhausted'
  | 'storage_failed'
  | 'permission_denied'
  | 'cancelled'
  | 'unknown';

export interface ClassifiedGenerationError {
  readonly code: GenerationErrorCode;
  readonly retryable: boolean;
}

export interface GenerationFailureRecord extends ClassifiedGenerationError {
  readonly attempt: number;
  readonly message: string;
  readonly occurredAt: string;
}

const CLASSIFIERS: readonly Readonly<{
  pattern: RegExp;
  code: GenerationErrorCode;
  retryable: boolean;
}>[] = [
  { pattern: /source_registry_(?:not_found|required|missing)/i, code: 'source_missing', retryable: false },
  { pattern: /blueprint_lesson_not_found|source_coverage/i, code: 'source_coverage', retryable: false },
  { pattern: /provider_rate_limit|rate.?limit|too many requests/i, code: 'provider_rate_limit', retryable: true },
  { pattern: /generation_stage_schema_failed/i, code: 'provider_schema', retryable: true },
  { pattern: /generated_(?:surface|lesson)_invalid|provider_schema/i, code: 'provider_schema', retryable: false },
  { pattern: /qa_failed|quality.?gate/i, code: 'qa_failed', retryable: false },
  { pattern: /daily_budget_exceeded|budget_exhausted/i, code: 'budget_exhausted', retryable: false },
  { pattern: /artifact_.+_(?:unavailable|timeout)|storage_(?:failed|unavailable)/i, code: 'storage_failed', retryable: true },
  { pattern: /permission.?denied|unauthenticated/i, code: 'permission_denied', retryable: false },
  { pattern: /cancel(?:led|ed)/i, code: 'cancelled', retryable: false },
];

function errorText(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return String(error ?? '');
}

export function classifyGenerationError(error: unknown): ClassifiedGenerationError {
  const text = errorText(error);
  const match = CLASSIFIERS.find((entry) => entry.pattern.test(text));
  return match
    ? Object.freeze({ code: match.code, retryable: match.retryable })
    : Object.freeze({ code: 'unknown', retryable: false });
}

export function sanitizeGenerationErrorDetail(value: unknown, maxLength = 300): string {
  const safeLimit = Number.isSafeInteger(maxLength) ? Math.max(1, Math.min(1000, maxLength)) : 300;
  return String(value ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\bOPENAI_API_KEY\s*=\s*[^\s]+/gi, 'OPENAI_API_KEY=[REDACTED]')
    .replace(/\bAuthorization\s*:\s*Bearer\s+[^\s]+/gi, 'Authorization: Bearer [REDACTED]')
    .trim()
    .slice(0, safeLimit);
}

export function buildGenerationFailureRecord(error: unknown, attempt: number, occurredAt = new Date().toISOString()): GenerationFailureRecord {
  const classified = classifyGenerationError(error);
  return Object.freeze({
    attempt: Number.isSafeInteger(attempt) && attempt > 0 ? attempt : 1,
    code: classified.code,
    retryable: classified.retryable,
    message: sanitizeGenerationErrorDetail(errorText(error)),
    occurredAt,
  });
}
