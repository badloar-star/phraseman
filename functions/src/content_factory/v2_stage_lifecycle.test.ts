import {
  selectRunnableV2Stages,
  transitionV2Stage,
  type V2StageRecord,
} from './v2_stage_lifecycle';

const stage = (id: string, dependsOn: readonly string[] = [], state: V2StageRecord['state'] = 'queued'): V2StageRecord => ({
  stageId: id,
  dependsOn,
  state,
  attempts: state === 'running' ? 1 : 0,
  maxAttempts: 3,
  leaseExpiresAtMs: state === 'running' ? 1000 : undefined,
});

describe('V2 generation stage lifecycle', () => {
  it('selects only queued stages whose dependencies succeeded, in stable order', () => {
    expect(selectRunnableV2Stages([
      stage('b', ['a']),
      stage('a'),
      stage('blocked', ['failed'], 'queued'),
      stage('failed', [], 'failed'),
    ], 500)).toEqual(['a']);
  });

  it('treats an expired running lease as retryable, but not a live lease', () => {
    expect(selectRunnableV2Stages([stage('live', [], 'running')], 500)).toEqual([]);
    expect(selectRunnableV2Stages([stage('expired', [], 'running')], 1500)).toEqual(['expired']);
  });

  it('requires a successful dependency before starting a stage', () => {
    expect(() => transitionV2Stage(stage('b', ['a']), 'start', { dependencyStates: { a: 'queued' }, nowMs: 10 }))
      .toThrow('v2_stage_dependencies_not_ready');
    expect(transitionV2Stage(stage('b', ['a']), 'start', { dependencyStates: { a: 'succeeded' }, nowMs: 10 }))
      .toMatchObject({ state: 'running', attempts: 1, leaseExpiresAtMs: 10 + 10 * 60 * 1000 });
  });

  it('does not retry a terminally exhausted stage', () => {
    expect(() => transitionV2Stage({ ...stage('x', [], 'failed'), attempts: 3 }, 'retry', { dependencyStates: {}, nowMs: 10 }))
      .toThrow('v2_stage_retry_exhausted');
  });
});
