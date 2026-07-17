import { assertGenerationCheckpointIdentity, chooseGenerationCheckpointAction } from './generation_checkpoint';

describe('generation unit checkpoint', () => {
  it('replays a completed unit and resumes a validated generated payload', () => {
    expect(chooseGenerationCheckpointAction({ state: 'succeeded' }, 10_000)).toEqual({ action: 'replay' });
    expect(chooseGenerationCheckpointAction({ state: 'generated', generatedPayload: { lessonId: 1 }, qaReceipt: { status: 'passed' } }, 10_000)).toEqual({ action: 'resume', payload: { lessonId: 1 }, qaReceipt: { status: 'passed' } });
    expect(chooseGenerationCheckpointAction({ state: 'failed', generatedPayload: { lessonId: 1 }, qaReceipt: { status: 'passed' } }, 10_000)).toEqual({ action: 'resume', payload: { lessonId: 1 }, qaReceipt: { status: 'passed' } });
  });

  it('blocks a concurrent live lease but recovers a stale lease', () => {
    expect(chooseGenerationCheckpointAction({ state: 'running', leaseExpiresAtMs: 20_000 }, 10_000)).toEqual({ action: 'busy' });
    expect(chooseGenerationCheckpointAction({ state: 'running', leaseExpiresAtMs: 9_999 }, 10_000)).toEqual({ action: 'generate' });
  });

  it('does not resume malformed or failed QA payloads', () => {
    expect(chooseGenerationCheckpointAction({ state: 'generated', generatedPayload: null, qaReceipt: { status: 'passed' } }, 10_000)).toEqual({ action: 'generate' });
    expect(chooseGenerationCheckpointAction({ state: 'generated', generatedPayload: {}, qaReceipt: { status: 'failed' } }, 10_000)).toEqual({ action: 'generate' });
  });

  it('rejects a checkpoint belonging to another target, source or release unit', () => {
    const expected = { unitId: 'job-1:lesson:1', jobId: 'job-1', studyTarget: 'fr', learnerSourceLocale: 'ru', surface: 'lesson', lessonId: 1 } as const;
    expect(() => assertGenerationCheckpointIdentity({ ...expected, state: 'generated' }, expected)).not.toThrow();
    expect(() => assertGenerationCheckpointIdentity({ ...expected, studyTarget: 'de' }, expected)).toThrow('generation_checkpoint_identity_mismatch');
  });
});
