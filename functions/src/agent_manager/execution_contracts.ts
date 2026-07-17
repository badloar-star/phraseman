import { HttpsError } from 'firebase-functions/v2/https';

export const EXECUTION_JOB_SCHEMA_VERSION = 1 as const;
/** code_prepare jobs are claimed only by the paired local Codex Runner; server workers never execute them. */
export const EXECUTION_JOB_SCOPES = ['support_draft', 'analysis_only', 'report_triage', 'code_prepare'] as const;
export const EXECUTION_JOB_STATES = ['queued', 'leased', 'succeeded', 'failed', 'cancelled'] as const;

export type ExecutionJobScope = (typeof EXECUTION_JOB_SCOPES)[number];
export type ExecutionJobState = (typeof EXECUTION_JOB_STATES)[number];
export type ExecutionJob = Readonly<{
  schemaVersion: 1;
  taskId: string;
  taskRevision: number;
  scope: ExecutionJobScope;
  handlerVersion: string;
  state: ExecutionJobState;
  attempts: number;
  maxAttempts: number;
  leaseUntilMs: number | null;
  idempotencyKey: string;
  idempotencyKeyHash: string;
  createdAtMs: number;
  updatedAtMs: number;
  leasedAtMs: number | null;
  finishedAtMs: number | null;
  outputRef: string | null;
  outputHash: string | null;
}>;

export type ExecutionJobProjection = Readonly<Omit<ExecutionJob, 'schemaVersion' | 'idempotencyKey' | 'idempotencyKeyHash'>>;

function fail(message: string): never { throw new HttpsError('invalid-argument', message); }
function object(value: unknown): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value)) fail('execution job must be an object'); return value as Record<string, unknown>; }
function exact(input: Record<string, unknown>): void {
  const keys = ['schemaVersion', 'taskId', 'taskRevision', 'scope', 'handlerVersion', 'state', 'attempts', 'maxAttempts', 'leaseUntilMs', 'idempotencyKey', 'idempotencyKeyHash', 'createdAtMs', 'updatedAtMs', 'leasedAtMs', 'finishedAtMs', 'outputRef', 'outputHash'];
  if (Object.keys(input).some((key) => !keys.includes(key)) || keys.some((key) => !(key in input))) fail('execution job fields are invalid');
}
function identifier(value: unknown, label: string): string { if (typeof value !== 'string' || !/^[A-Za-z][A-Za-z0-9._:-]{2,159}$/.test(value)) fail(`${label} is invalid`); return value; }
function integer(value: unknown, label: string, min: number): number { if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min) fail(`${label} is invalid`); return value; }
function nullableInteger(value: unknown, label: string): number | null { return value === null ? null : integer(value, label, 0); }
function choice<T extends string>(value: unknown, choices: readonly T[], label: string): T { if (typeof value !== 'string' || !choices.includes(value as T)) fail(`${label} is invalid`); return value as T; }
function hash(value: unknown, label: string): string { if (typeof value !== 'string' || !/^[a-f0-9]{64}$/i.test(value)) fail(`${label} is invalid`); return value.toLowerCase(); }
function opaque(value: unknown, label: string, prefix?: string): string { const result = identifier(value, label); if (prefix && !result.startsWith(prefix)) fail(`${label} is invalid`); return result; }
function outputReference(value: unknown): string { if (typeof value !== 'string' || !/^execution_output:[a-f0-9]{64}$/.test(value)) fail('outputRef is invalid'); return value; }
function handlerVersion(value: unknown): string { if (typeof value !== 'string' || !/^[a-z][a-z0-9-]{2,63}-v[1-9][0-9]*$/.test(value)) fail('handlerVersion is invalid'); return value; }
function requireOutputPair(outputRef: string | null, outputHash: string | null, required: boolean): void { if (required !== (outputRef !== null && outputHash !== null)) fail('output fields are invalid'); }

export function parseExecutionJob(value: unknown): ExecutionJob {
  const input = object(value); exact(input);
  if (input.schemaVersion !== EXECUTION_JOB_SCHEMA_VERSION) fail('execution job schemaVersion is invalid');
  const state = choice(input.state, EXECUTION_JOB_STATES, 'state');
  const taskRevision = integer(input.taskRevision, 'taskRevision', 1);
  const attempts = integer(input.attempts, 'attempts', 0);
  const maxAttempts = integer(input.maxAttempts, 'maxAttempts', 1);
  if (maxAttempts > 3) fail('maxAttempts is invalid');
  if (attempts > maxAttempts) fail('attempts is invalid');
  const createdAtMs = integer(input.createdAtMs, 'createdAtMs', 0);
  const updatedAtMs = integer(input.updatedAtMs, 'updatedAtMs', createdAtMs);
  const leasedAtMs = nullableInteger(input.leasedAtMs, 'leasedAtMs');
  const finishedAtMs = nullableInteger(input.finishedAtMs, 'finishedAtMs');
  const leaseUntilMs = nullableInteger(input.leaseUntilMs, 'leaseUntilMs');
  const outputRef = input.outputRef === null ? null : outputReference(input.outputRef);
  const outputHash = input.outputHash === null ? null : hash(input.outputHash, 'outputHash');
  if (leasedAtMs !== null && leasedAtMs < createdAtMs) fail('lease timestamps are invalid');
  if (finishedAtMs !== null && finishedAtMs < createdAtMs) fail('finishedAtMs is invalid');
  if (state === 'leased') {
    if (attempts < 1 || leasedAtMs === null || leaseUntilMs === null || leaseUntilMs <= leasedAtMs || finishedAtMs !== null) fail('leaseUntilMs is invalid');
    requireOutputPair(outputRef, outputHash, false);
  } else {
    if (leaseUntilMs !== null) fail('leaseUntilMs is invalid');
    if (state === 'queued') {
      if (finishedAtMs !== null) fail('finishedAtMs is invalid');
      requireOutputPair(outputRef, outputHash, false);
    } else {
      if (finishedAtMs === null) fail('finishedAtMs is invalid');
      requireOutputPair(outputRef, outputHash, state === 'succeeded');
    }
  }
  return Object.freeze({
    schemaVersion: EXECUTION_JOB_SCHEMA_VERSION, taskId: identifier(input.taskId, 'taskId'), taskRevision,
    scope: choice(input.scope, EXECUTION_JOB_SCOPES, 'scope'), handlerVersion: handlerVersion(input.handlerVersion), state,
    attempts, maxAttempts, leaseUntilMs, idempotencyKey: opaque(input.idempotencyKey, 'idempotencyKey', 'exec:'),
    idempotencyKeyHash: hash(input.idempotencyKeyHash, 'idempotencyKeyHash'), createdAtMs, updatedAtMs, leasedAtMs,
    finishedAtMs, outputRef, outputHash,
  });
}

export function projectExecutionJob(value: unknown): ExecutionJobProjection {
  const job = parseExecutionJob(value);
  return Object.freeze({
    taskId: job.taskId, taskRevision: job.taskRevision, scope: job.scope, handlerVersion: job.handlerVersion,
    state: job.state, attempts: job.attempts, maxAttempts: job.maxAttempts, leaseUntilMs: job.leaseUntilMs,
    createdAtMs: job.createdAtMs, updatedAtMs: job.updatedAtMs, leasedAtMs: job.leasedAtMs,
    finishedAtMs: job.finishedAtMs, outputRef: job.outputRef, outputHash: job.outputHash,
  });
}
