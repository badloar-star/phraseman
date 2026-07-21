/**
 * Pure lifecycle seam for the V2 generation DAG.
 *
 * The existing content-factory queue remains the only queue/worker. This module
 * only decides whether a persisted stage is eligible to run and applies the
 * bounded state transition; callers own Firestore transactions, leases and
 * artifact writes.
 */
export type V2StageState = 'queued' | 'running' | 'succeeded' | 'failed';

export interface V2StageRecord {
  readonly stageId: string;
  readonly dependsOn: readonly string[];
  readonly state: V2StageState;
  readonly attempts: number;
  readonly maxAttempts: number;
  readonly leaseExpiresAtMs?: number;
}

export type V2StageEvent = 'start' | 'retry' | 'succeed' | 'fail';

export interface V2StageTransitionOptions {
  readonly dependencyStates: Readonly<Record<string, V2StageState>>;
  readonly nowMs: number;
}

const LEASE_MS = 10 * 60 * 1000;

function assertClock(nowMs: number): void {
  if (!Number.isSafeInteger(nowMs) || nowMs < 0) throw new Error('v2_stage_clock_invalid');
}

function dependenciesReady(stage: V2StageRecord, dependencyStates: Readonly<Record<string, V2StageState>>): boolean {
  return stage.dependsOn.length > 0
    ? stage.dependsOn.every((dependencyId) => dependencyStates[dependencyId] === 'succeeded')
    : true;
}

function leaseExpired(stage: V2StageRecord, nowMs: number): boolean {
  return stage.state === 'running'
    && typeof stage.leaseExpiresAtMs === 'number'
    && stage.leaseExpiresAtMs <= nowMs;
}

/** Return stage IDs eligible for the single existing worker to claim. */
export function selectRunnableV2Stages(stages: readonly V2StageRecord[], nowMs: number): readonly string[] {
  assertClock(nowMs);
  const states = Object.fromEntries(stages.map((stage) => [stage.stageId, stage.state])) as Record<string, V2StageState>;
  const selected = stages
    .filter((stage) => {
      const eligibleState = stage.state === 'queued' || leaseExpired(stage, nowMs);
      return eligibleState
        && stage.attempts < stage.maxAttempts
        && dependenciesReady(stage, states);
    })
    .map((stage) => stage.stageId)
    .sort();
  return Object.freeze(selected);
}

export function transitionV2Stage(
  stage: V2StageRecord,
  event: V2StageEvent,
  options: V2StageTransitionOptions,
): V2StageRecord {
  assertClock(options.nowMs);
  if (!Number.isSafeInteger(stage.attempts) || stage.attempts < 0 || !Number.isSafeInteger(stage.maxAttempts) || stage.maxAttempts < 1) {
    throw new Error('v2_stage_attempts_invalid');
  }
  if ((event === 'start' || event === 'retry') && !dependenciesReady(stage, options.dependencyStates)) {
    throw new Error('v2_stage_dependencies_not_ready');
  }
  if (event === 'start') {
    if (!(stage.state === 'queued' || leaseExpired(stage, options.nowMs))) throw new Error('v2_stage_not_runnable');
    if (stage.attempts >= stage.maxAttempts) throw new Error('v2_stage_retry_exhausted');
    return Object.freeze({ ...stage, state: 'running', attempts: stage.attempts + 1, leaseExpiresAtMs: options.nowMs + LEASE_MS });
  }
  if (event === 'retry') {
    if (stage.state !== 'failed') throw new Error('v2_stage_not_failed');
    if (stage.attempts >= stage.maxAttempts) throw new Error('v2_stage_retry_exhausted');
    return Object.freeze({ ...stage, state: 'running', attempts: stage.attempts + 1, leaseExpiresAtMs: options.nowMs + LEASE_MS });
  }
  if (event === 'succeed') {
    if (stage.state !== 'running') throw new Error('v2_stage_not_running');
    return Object.freeze({ ...stage, state: 'succeeded', leaseExpiresAtMs: undefined });
  }
  if (stage.state !== 'running') throw new Error('v2_stage_not_running');
  return Object.freeze({ ...stage, state: 'failed', leaseExpiresAtMs: undefined });
}

