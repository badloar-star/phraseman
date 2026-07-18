import * as admin from 'firebase-admin';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { sha256 } from '../agent_office/contracts';
import { parseExecutionJob, type ExecutionJobScope } from './execution_contracts';

const TASKS = 'agent_manager_tasks';
const JOBS = 'agent_manager_execution_jobs';
const REGION = 'us-central1';

export interface ExecutionOutboxDocument { readonly id: string; readonly data: Record<string, unknown>; }
export interface ExecutionOutboxTransaction {
  get(path: string): Promise<ExecutionOutboxDocument | null>;
  create(path: string, data: Record<string, unknown>): void;
}
export interface ExecutionOutboxRepository {
  runTransaction<T>(body: (transaction: ExecutionOutboxTransaction) => Promise<T>): Promise<T>;
}

type QueuedTaskEvent = Readonly<{ taskId: string; taskRevision: number; toStatus: 'queued' }>;
type IssueResult = Readonly<{ created: boolean; jobId: string | null }>;

function safeTaskId(value: unknown): string | null {
  return typeof value === 'string' && /^[A-Za-z][A-Za-z0-9._:-]{2,159}$/.test(value) ? value : null;
}

function safeRevision(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 1 ? value : null;
}

function queuedEvent(value: unknown): QueuedTaskEvent | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const event = value as Record<string, unknown>;
  const taskId = safeTaskId(event.taskId);
  const taskRevision = safeRevision(event.taskRevision);
  if (!taskId || !taskRevision || event.toStatus !== 'queued') return null;
  return Object.freeze({ taskId, taskRevision, toStatus: 'queued' });
}

function executionScope(value: unknown): ExecutionJobScope | null {
  return value === 'support_draft' || value === 'analysis_only' || value === 'report_triage' ? value : null;
}

function taskMatchesQueuedEvent(value: unknown, event: QueuedTaskEvent): ExecutionJobScope | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const task = value as Record<string, unknown>;
  if (task.taskId !== event.taskId || task.status !== 'queued' || task.revision !== event.taskRevision) return null;
  return executionScope(task.allowedScope);
}

function jobId(taskId: string, taskRevision: number): string { return `${taskId}__r${taskRevision}`; }

function buildExecutionJob(taskId: string, taskRevision: number, scope: ExecutionJobScope, nowMs: number): Record<string, unknown> {
  const idempotencyKey = `exec:${sha256(`${taskId}:r${taskRevision}`)}`;
  return parseExecutionJob({
    schemaVersion: 1, taskId, taskRevision, scope, handlerVersion: `${scope.replace('_', '-')}-v1`,
    state: 'queued', attempts: 0, maxAttempts: 2, leaseUntilMs: null,
    idempotencyKey, idempotencyKeyHash: sha256(idempotencyKey), createdAtMs: nowMs, updatedAtMs: nowMs,
    leasedAtMs: null, finishedAtMs: null, outputRef: null, outputHash: null,
  }) as unknown as Record<string, unknown>;
}

/** Creates exactly one bounded, server-only job after an immutable task event enters the queue. */
export async function issueExecutionJobForQueuedEvent(repository: ExecutionOutboxRepository, rawEvent: unknown, nowMs: number): Promise<IssueResult> {
  const event = queuedEvent(rawEvent);
  if (!event) return Object.freeze({ created: false, jobId: null });
  const id = jobId(event.taskId, event.taskRevision);
  return repository.runTransaction(async (transaction) => {
    const task = await transaction.get(`${TASKS}/${event.taskId}`);
    const scope = task ? taskMatchesQueuedEvent(task.data, event) : null;
    if (!scope) return Object.freeze({ created: false, jobId: null });
    const path = `${JOBS}/${id}`;
    if (await transaction.get(path)) return Object.freeze({ created: false, jobId: id });
    transaction.create(path, buildExecutionJob(event.taskId, event.taskRevision, scope, nowMs));
    return Object.freeze({ created: true, jobId: id });
  });
}

function firestoreRepository(db: FirebaseFirestore.Firestore): ExecutionOutboxRepository {
  return {
    runTransaction: (body) => db.runTransaction(async (transaction) => body({
      get: async (path) => {
        const snapshot = await transaction.get(db.doc(path));
        return snapshot.exists ? { id: snapshot.id, data: snapshot.data() ?? {} } : null;
      },
      create: (path, data) => transaction.create(db.doc(path), data),
    })),
  };
}

export const agentManagerIssueExecutionJob = onDocumentCreated({ document: 'agent_manager_task_events/{eventId}', region: REGION, timeoutSeconds: 30, memory: '256MiB', maxInstances: 3 }, async (event) => {
  const eventData = event.data?.data() ?? {};
  if (eventData.toStatus !== 'queued') return;
  await issueExecutionJobForQueuedEvent(firestoreRepository(admin.firestore()), eventData, Date.now());
});
