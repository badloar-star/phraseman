import { buildGenerationTerminalAudit, generationAuditOperationId } from './generation_audit';

describe('generation terminal audit', () => {
  const base = {
    actorUid: 'admin-1', role: 'content_editor' as const,
    entity: { collection: 'content_factory_stages' as const, id: 'stage-1' },
    attempt: 2, leaseToken: 'lease-2', outcome: 'failed' as const,
    errorCategory: 'provider_rate_limit', before: { state: 'running' }, after: { state: 'failed' },
  };

  it('builds a deterministic retry audit identity from entity, attempt and lease', () => {
    const first = buildGenerationTerminalAudit(base);
    const second = buildGenerationTerminalAudit(base);
    expect(first.operationId).toBe(second.operationId);
    expect(first.operationId).toBe(generationAuditOperationId(base.entity, 2, 'lease-2'));
    expect(first).toMatchObject({ action: 'content_factory.stage.retry', reason: 'Generation attempt 2 failed', attempt: 2, outcome: 'failed', errorCategory: 'provider_rate_limit' });
  });

  it('distinguishes initial unit generation success from retry', () => {
    expect(buildGenerationTerminalAudit({ ...base, entity: { collection: 'content_factory_job_units', id: 'job:quiz:1' }, attempt: 1, outcome: 'succeeded', errorCategory: null }).action).toBe('content_factory.unit.generate');
    expect(buildGenerationTerminalAudit({ ...base, entity: { collection: 'content_factory_job_units', id: 'job:quiz:1' }, attempt: 3 }).action).toBe('content_factory.unit.retry');
  });

  it('rejects non-terminal outcomes', () => {
    expect(() => buildGenerationTerminalAudit({ ...base, outcome: 'superseded' as never })).toThrow('generation_audit_outcome_invalid');
  });
});
