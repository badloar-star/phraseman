import { HttpsError } from 'firebase-functions/v2/https';
import { parseExecutionJob, projectExecutionJob } from './execution_contracts';

function job(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    taskId: 'task-001',
    taskRevision: 2,
    scope: 'support_draft',
    handlerVersion: 'support-draft-v1',
    state: 'queued',
    attempts: 0,
    maxAttempts: 2,
    leaseUntilMs: null,
    idempotencyKey: 'exec:task-001:r2',
    idempotencyKeyHash: 'a'.repeat(64),
    createdAtMs: 2_000_000_000_000,
    updatedAtMs: 2_000_000_000_000,
    leasedAtMs: null,
    finishedAtMs: null,
    outputRef: null,
    outputHash: null,
    ...overrides,
  };
}

describe('agent-manager execution job contract', () => {
  test('parses the bounded server-only support draft job', () => {
    const parsed = parseExecutionJob(job());
    expect(parsed.scope).toBe('support_draft');
    expect(parsed.attempts).toBe(0);
    expect(Object.isFrozen(parsed)).toBe(true);
  });

  test('accepts only the bounded execution scopes, including local-only code preparation', () => {
    expect(parseExecutionJob(job({ scope: 'analysis_only', handlerVersion: 'analysis-only-v1' })).scope).toBe('analysis_only');
    expect(parseExecutionJob(job({ scope: 'code_prepare', handlerVersion: 'code-prepare-v1' })).scope).toBe('code_prepare');
    expect(() => parseExecutionJob(job({ scope: 'content_prepare', handlerVersion: 'content-prepare-v1' }))).toThrow(HttpsError);
  });

  test('rejects unknown fields and invalid retry bounds', () => {
    expect(() => parseExecutionJob({ ...job(), unexpected: true })).toThrow('execution job fields are invalid');
    const { taskId: _taskId, ...missingTaskId } = job();
    expect(() => parseExecutionJob(missingTaskId)).toThrow('execution job fields are invalid');
    expect(() => parseExecutionJob(job({ taskRevision: 0 }))).toThrow('taskRevision is invalid');
    expect(() => parseExecutionJob(job({ attempts: 3, maxAttempts: 2 }))).toThrow('attempts is invalid');
    expect(() => parseExecutionJob(job({ maxAttempts: 4 }))).toThrow('maxAttempts is invalid');
  });

  test('rejects a job whose task revision field is absent', () => {
    const { taskRevision: _taskRevision, ...missingTaskRevision } = job();
    expect(() => parseExecutionJob(missingTaskRevision)).toThrow('execution job fields are invalid');
  });

  test('requires a lease only for a leased job and only before its deadline', () => {
    expect(() => parseExecutionJob(job({ state: 'leased', attempts: 1, leaseUntilMs: null, leasedAtMs: 2_000_000_000_001 }))).toThrow('leaseUntilMs is invalid');
    expect(() => parseExecutionJob(job({ state: 'leased', attempts: 1, leaseUntilMs: 2_000_000_000_001, leasedAtMs: 2_000_000_000_002 }))).toThrow(HttpsError);
  });

  test('rejects raw source data, PII, links, and secrets from the projection', () => {
    for (const forbidden of ['sourceBody', 'sourceLinks', 'rawPii', 'secret']) {
      expect(() => projectExecutionJob({ ...job(), [forbidden]: 'forbidden' })).toThrow(HttpsError);
    }
    expect(() => parseExecutionJob(job({ outputRef: 'output:user@example.com', outputHash: 'b'.repeat(64), state: 'succeeded', finishedAtMs: 2_000_000_000_001 }))).toThrow(HttpsError);
    expect(() => parseExecutionJob(job({ outputRef: 'execution_output:John.Smith', outputHash: 'b'.repeat(64), state: 'succeeded', finishedAtMs: 2_000_000_000_001 }))).toThrow(HttpsError);
  });

  test('allows a completed output only with a matching opaque reference and hash', () => {
    const projected = projectExecutionJob(job({
      state: 'succeeded',
      finishedAtMs: 2_000_000_000_001,
      outputRef: `execution_output:${'c'.repeat(64)}`,
      outputHash: 'b'.repeat(64),
    }));
    expect(projected).toEqual({
      taskId: 'task-001', taskRevision: 2, scope: 'support_draft', handlerVersion: 'support-draft-v1',
      state: 'succeeded', attempts: 0, maxAttempts: 2, leaseUntilMs: null,
      createdAtMs: 2_000_000_000_000, updatedAtMs: 2_000_000_000_000,
      leasedAtMs: null, finishedAtMs: 2_000_000_000_001,
      outputRef: `execution_output:${'c'.repeat(64)}`, outputHash: 'b'.repeat(64),
    });
  });
});
