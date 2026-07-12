import { buildGenerationFailureRecord, classifyGenerationError, sanitizeGenerationErrorDetail } from './generation_errors';

describe('content factory generation error taxonomy', () => {
  it.each([
    ['source_registry_not_found', 'source_missing', false],
    ['blueprint_lesson_not_found', 'source_coverage', false],
    ['provider_rate_limit', 'provider_rate_limit', true],
    ['generated_surface_invalid', 'provider_schema', false],
    ['generated_lesson_qa_failed:duplicate_phrase', 'qa_failed', false],
    ['content_factory_daily_budget_exceeded', 'budget_exhausted', false],
    ['artifact_upload_unavailable', 'storage_failed', true],
    ['permission-denied', 'permission_denied', false],
    ['generation_cancelled', 'cancelled', false],
    ['unexpected_failure', 'unknown', false],
  ] as const)('classifies %s as %s with retryable=%s', (message, code, retryable) => {
    expect(classifyGenerationError(new Error(message))).toEqual({ code, retryable });
  });

  it('removes secrets and control characters and caps stored detail', () => {
    const raw = `OPENAI_API_KEY=sk-secret\nAuthorization: Bearer token-value\u0000${'x'.repeat(500)}`;
    const detail = sanitizeGenerationErrorDetail(raw);

    expect(detail).not.toContain('sk-secret');
    expect(detail).not.toContain('token-value');
    expect(detail).not.toContain('\u0000');
    expect(detail.length).toBeLessThanOrEqual(300);
  });

  it('builds a stable attempt record with normalized retry semantics', () => {
    expect(buildGenerationFailureRecord(new Error('provider_rate_limit: retry later'), 2, '2026-07-12T12:00:00.000Z')).toEqual({
      attempt: 2,
      code: 'provider_rate_limit',
      retryable: true,
      message: 'Error: provider_rate_limit: retry later',
      occurredAt: '2026-07-12T12:00:00.000Z',
    });
  });
});
