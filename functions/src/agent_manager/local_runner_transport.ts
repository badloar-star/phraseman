import { createHash, timingSafeEqual } from 'node:crypto';
import { parseManagerTaskDraft, parseManagerTaskResult, type ManagerTaskResult } from './contracts';
import { parseExecutionJob, type ExecutionJob } from './execution_contracts';

const PAIRINGS = 'agent_manager_local_runner_pairings';
const CAPABILITIES = 'agent_manager_local_runner_capabilities';
const LEASES = 'agent_manager_local_runner_leases';
const TASKS = 'agent_manager_tasks';
const JOBS = 'agent_manager_execution_jobs';
const EVENTS = 'agent_manager_task_events';
const PAIRING_TTL_MS = 10 * 60 * 1000;
const CAPABILITY_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const LEASE_TTL_MS = 4 * 60 * 1000;

export interface LocalRunnerDocument { readonly id: string; readonly data: Record<string, unknown>; }
export interface LocalRunnerTransaction {
  get(path: string): Promise<LocalRunnerDocument | null>;
  create(path: string, data: Record<string, unknown>): void;
  update(path: string, data: Record<string, unknown>): void;
}
export interface LocalRunnerRepository {
  get(path: string): Promise<LocalRunnerDocument | null>;
  listQueuedCodePrepareJobs(): Promise<readonly LocalRunnerDocument[]>;
  runTransaction<T>(body: (transaction: LocalRunnerTransaction) => Promise<T>): Promise<T>;
}

export type LocalRunnerCapability = Readonly<{ capabilityId: string; token: string; expiresAtMs: number }>;
export type LocalRunnerCredential = Readonly<Pick<LocalRunnerCapability, 'capabilityId' | 'token'>>;
export type LocalRunnerClaim = Readonly<{ jobId: string; taskId: string; taskRevision: number; title: string; brief: string; leaseToken: string; leaseUntilMs: number }>;

function fail(message: string): never { throw new Error(message); }
function hash(value: string): string { return createHash('sha256').update(value).digest('hex'); }
function text(value: unknown, label: string, min: number, max: number): string {
  if (typeof value !== 'string' || value.length < min || value.length > max || /[\u0000-\u001f\u007f]/.test(value)) fail(`${label} is invalid`);
  return value;
}
function identifier(value: unknown, label: string): string {
  if (typeof value !== 'string' || !/^[A-Za-z][A-Za-z0-9._:-]{2,159}$/.test(value)) fail(`${label} is invalid`);
  return value;
}
function positiveInteger(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) fail(`${label} is invalid`);
  return value;
}
function equalHash(actual: unknown, raw: string): boolean {
  if (typeof actual !== 'string' || !/^[a-f0-9]{64}$/i.test(actual)) return false;
  return timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(hash(raw), 'hex'));
}
function pairingPath(pairingId: string): string { return `${PAIRINGS}/${pairingId}`; }
function capabilityPath(capabilityId: string): string { return `${CAPABILITIES}/${capabilityId}`; }
function leasePath(jobId: string): string { return `${LEASES}/${jobId}`; }
function taskPath(taskId: string): string { return `${TASKS}/${taskId}`; }
function jobPath(jobId: string): string { return `${JOBS}/${jobId}`; }
function randomIdentifier(nextRandom: () => string, label: string): string { return identifier(nextRandom(), label); }
function randomSecret(nextRandom: () => string, label: string): string { return text(nextRandom(), label, 8, 160); }

function localCapability(value: unknown, nowMs: number): LocalRunnerCredential {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('local runner capability is invalid');
  const input = value as Record<string, unknown>;
  return Object.freeze({ capabilityId: identifier(input.capabilityId, 'capabilityId'), token: text(input.token, 'capability token', 8, 160) });
}

async function requireCapability(transaction: LocalRunnerTransaction, raw: Readonly<{ capabilityId: string; token: string }>, nowMs: number): Promise<Readonly<{ capabilityId: string; ownerUid: string }>> {
  const capabilityId = identifier(raw.capabilityId, 'capabilityId');
  const token = text(raw.token, 'capability token', 8, 160);
  const document = await transaction.get(capabilityPath(capabilityId));
  const data = document?.data;
  if (!data || data.capabilityId !== capabilityId || data.revokedAtMs !== null || !equalHash(data.tokenHash, token)
    || typeof data.expiresAtMs !== 'number' || !Number.isSafeInteger(data.expiresAtMs) || data.expiresAtMs <= nowMs) {
    fail('local runner capability is unavailable');
  }
  return Object.freeze({ capabilityId, ownerUid: identifier(data.ownerUid, 'ownerUid') });
}

function queuedCodeJob(value: unknown): ExecutionJob | null {
  try {
    const job = parseExecutionJob(value);
    return job.scope === 'code_prepare' && job.state === 'queued' ? job : null;
  } catch { return null; }
}

function queuedCodeTask(value: unknown, job: ExecutionJob): Readonly<{ taskId: string; revision: number; title: string; brief: string }> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const task = value as Record<string, unknown>;
  if (task.status !== 'queued' || task.result !== null || task.revision !== job.taskRevision || task.assignedAgentId !== 'developer') return null;
  try {
    const draft = parseManagerTaskDraft({
      taskId: task.taskId, title: task.title, brief: task.brief, priority: task.priority,
      deadlineAtMs: task.deadlineAtMs, allowedScope: task.allowedScope, sourceLinks: task.sourceLinks,
    });
    if (draft.taskId !== job.taskId || draft.allowedScope !== 'code_prepare') return null;
    return Object.freeze({ taskId: draft.taskId, revision: job.taskRevision, title: draft.title, brief: draft.brief });
  } catch { return null; }
}

export async function createLocalRunnerPairing(repository: LocalRunnerRepository, input: Readonly<{ ownerUid: string }>, nowMs: number, nextRandom: () => string) {
  const ownerUid = identifier(input.ownerUid, 'ownerUid');
  const pairingId = randomIdentifier(nextRandom, 'pairingId');
  const code = randomSecret(nextRandom, 'pairing code');
  const expiresAtMs = positiveInteger(nowMs, 'nowMs') + PAIRING_TTL_MS;
  await repository.runTransaction(async (transaction) => {
    if (await transaction.get(pairingPath(pairingId))) fail('pairingId already exists');
    transaction.create(pairingPath(pairingId), {
      schemaVersion: 1, pairingId, ownerUid, codeHash: hash(code), createdAtMs: nowMs, expiresAtMs, consumedAtMs: null, revokedAtMs: null,
    });
  });
  return Object.freeze({ pairingId, code, expiresAtMs });
}

export async function exchangeLocalRunnerPairing(repository: LocalRunnerRepository, input: Readonly<{ pairingId: string; code: string }>, nowMs: number, nextRandom: () => string): Promise<LocalRunnerCapability> {
  const pairingId = identifier(input.pairingId, 'pairingId');
  const code = text(input.code, 'pairing code', 8, 160);
  const capabilityId = randomIdentifier(nextRandom, 'capabilityId');
  const token = randomSecret(nextRandom, 'capability token');
  const expiresAtMs = positiveInteger(nowMs, 'nowMs') + CAPABILITY_TTL_MS;
  await repository.runTransaction(async (transaction) => {
    const pairing = await transaction.get(pairingPath(pairingId));
    const data = pairing?.data;
    if (!data || data.pairingId !== pairingId || data.consumedAtMs !== null || data.revokedAtMs !== null
      || typeof data.expiresAtMs !== 'number' || data.expiresAtMs <= nowMs || !equalHash(data.codeHash, code)) {
      fail('pairing code is unavailable');
    }
    if (await transaction.get(capabilityPath(capabilityId))) fail('capabilityId already exists');
    const ownerUid = identifier(data.ownerUid, 'ownerUid');
    transaction.update(pairingPath(pairingId), { consumedAtMs: nowMs });
    transaction.create(capabilityPath(capabilityId), {
      schemaVersion: 1, capabilityId, ownerUid, pairingId, tokenHash: hash(token), createdAtMs: nowMs, expiresAtMs, revokedAtMs: null,
    });
  });
  return Object.freeze({ capabilityId, token, expiresAtMs });
}

export async function revokeLocalRunnerCapability(repository: LocalRunnerRepository, input: Readonly<{ ownerUid: string; capabilityId: string }>, nowMs: number): Promise<void> {
  const ownerUid = identifier(input.ownerUid, 'ownerUid');
  const capabilityId = identifier(input.capabilityId, 'capabilityId');
  await repository.runTransaction(async (transaction) => {
    const capability = await transaction.get(capabilityPath(capabilityId));
    if (!capability || capability.data.ownerUid !== ownerUid) fail('local runner capability is unavailable');
    transaction.update(capabilityPath(capabilityId), { revokedAtMs: positiveInteger(nowMs, 'nowMs') });
  });
}

export async function claimOneLocalRunnerJob(repository: LocalRunnerRepository, rawCapability: LocalRunnerCredential, nowMs: number, nextRandom: () => string): Promise<LocalRunnerClaim | null> {
  const capability = localCapability(rawCapability, nowMs);
  await repository.runTransaction(async (transaction) => { await requireCapability(transaction, capability, nowMs); });
  const candidates = await repository.listQueuedCodePrepareJobs();
  for (const candidate of candidates) {
    const job = queuedCodeJob(candidate.data);
    if (!job) continue;
    const leaseToken = randomSecret(nextRandom, 'lease token');
    const claimed = await repository.runTransaction(async (transaction) => {
      const activeCapability = await requireCapability(transaction, capability, nowMs);
      const jobDocument = await transaction.get(jobPath(candidate.id));
      const freshJob = jobDocument ? queuedCodeJob(jobDocument.data) : null;
      if (!freshJob || freshJob.taskId !== job.taskId || freshJob.taskRevision !== job.taskRevision || freshJob.attempts >= freshJob.maxAttempts) return null;
      const taskDocument = await transaction.get(taskPath(freshJob.taskId));
      const task = taskDocument ? queuedCodeTask(taskDocument.data, freshJob) : null;
      if (!task) return null;
      const leaseUntilMs = nowMs + LEASE_TTL_MS;
      const existingLease = await transaction.get(leasePath(candidate.id));
      const existingData = existingLease?.data;
      if (existingData && typeof existingData.leaseUntilMs === 'number' && existingData.leaseUntilMs > nowMs && existingData.completedAtMs === null) return null;
      transaction.update(jobPath(candidate.id), { state: 'leased', attempts: freshJob.attempts + 1, leasedAtMs: nowMs, leaseUntilMs, updatedAtMs: nowMs });
      const leaseData = { schemaVersion: 1, jobId: candidate.id, capabilityId: activeCapability.capabilityId, tokenHash: hash(leaseToken), createdAtMs: nowMs, leaseUntilMs, completedAtMs: null };
      if (existingLease) transaction.update(leasePath(candidate.id), leaseData); else transaction.create(leasePath(candidate.id), leaseData);
      return Object.freeze({ jobId: candidate.id, taskId: task.taskId, taskRevision: task.revision, title: task.title, brief: task.brief, leaseToken, leaseUntilMs });
    });
    if (claimed) return claimed;
  }
  return null;
}

export async function submitLocalRunnerReview(repository: LocalRunnerRepository, input: Readonly<{ capability: LocalRunnerCredential; jobId: string; leaseToken: string; result: ManagerTaskResult }>, nowMs: number): Promise<Readonly<{ outcome: 'succeeded'; taskId: string }>> {
  const capability = localCapability(input.capability, nowMs);
  const jobId = identifier(input.jobId, 'jobId');
  const leaseToken = text(input.leaseToken, 'lease token', 8, 160);
  const result = parseManagerTaskResult(input.result);
  if (result.outcome !== 'needs_review') fail('local runner result must require review');
  return repository.runTransaction(async (transaction) => {
    const activeCapability = await requireCapability(transaction, capability, nowMs);
    const lease = await transaction.get(leasePath(jobId));
    const leaseData = lease?.data;
    if (!leaseData || leaseData.jobId !== jobId || leaseData.capabilityId !== activeCapability.capabilityId || leaseData.completedAtMs !== null
      || typeof leaseData.leaseUntilMs !== 'number' || leaseData.leaseUntilMs <= nowMs || !equalHash(leaseData.tokenHash, leaseToken)) fail('local runner lease is unavailable');
    const jobDocument = await transaction.get(jobPath(jobId));
    let job: ExecutionJob;
    try { job = parseExecutionJob(jobDocument?.data); } catch { fail('local runner lease is unavailable'); }
    if (job.state !== 'leased' || job.scope !== 'code_prepare' || job.leaseUntilMs === null || job.leaseUntilMs <= nowMs) fail('local runner lease is unavailable');
    const taskDocument = await transaction.get(taskPath(job.taskId));
    const task = taskDocument ? queuedCodeTask(taskDocument.data, job) : null;
    if (!task) fail('local runner lease is unavailable');
    const inProgressRevision = task.revision + 1;
    const reviewRevision = task.revision + 2;
    const outputHash = hash(`local-runner-review-v1:${job.taskId}:r${job.taskRevision}:${result.summary}`);
    transaction.update(taskPath(task.taskId), { status: 'needs_review', revision: reviewRevision, updatedAtMs: nowMs, result });
    transaction.create(`${EVENTS}/${task.taskId}__r${inProgressRevision}`, { schemaVersion: 1, eventId: `${task.taskId}__r${inProgressRevision}`, taskId: task.taskId, eventType: 'task_transitioned', fromStatus: 'queued', toStatus: 'in_progress', assignedAgentId: 'developer', taskRevision: inProgressRevision, occurredAtMs: nowMs, actorUid: `local_runner:${activeCapability.capabilityId}`, actorRole: 'system', piiClass: 'none' });
    transaction.create(`${EVENTS}/${task.taskId}__r${reviewRevision}`, { schemaVersion: 1, eventId: `${task.taskId}__r${reviewRevision}`, taskId: task.taskId, eventType: 'task_transitioned', fromStatus: 'in_progress', toStatus: 'needs_review', assignedAgentId: 'developer', taskRevision: reviewRevision, occurredAtMs: nowMs, actorUid: `local_runner:${activeCapability.capabilityId}`, actorRole: 'system', piiClass: 'none' });
    transaction.update(jobPath(jobId), { state: 'succeeded', leaseUntilMs: null, updatedAtMs: nowMs, finishedAtMs: nowMs, outputRef: `execution_output:${outputHash}`, outputHash });
    transaction.update(leasePath(jobId), { completedAtMs: nowMs });
    return Object.freeze({ outcome: 'succeeded' as const, taskId: task.taskId });
  });
}
