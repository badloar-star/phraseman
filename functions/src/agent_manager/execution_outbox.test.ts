import { issueExecutionJobForQueuedEvent, type ExecutionOutboxDocument, type ExecutionOutboxRepository, type ExecutionOutboxTransaction } from './execution_outbox';

class MemoryOutboxRepository implements ExecutionOutboxRepository {
  readonly documents = new Map<string, ExecutionOutboxDocument>();
  async runTransaction<T>(body: (transaction: ExecutionOutboxTransaction) => Promise<T>): Promise<T> {
    const staged = new Map(this.documents);
    const result = await body({
      get: async (path) => staged.get(path) ?? null,
      create: (path, data) => {
        if (staged.has(path)) throw new Error(`already exists: ${path}`);
        staged.set(path, { id: path.split('/').at(-1) || '', data: structuredClone(data) });
      },
    });
    this.documents.clear(); staged.forEach((value, key) => this.documents.set(key, value));
    return result;
  }
}

function queuedTask(overrides: Record<string, unknown> = {}) {
  return {
    taskId: 'task-001', status: 'queued', revision: 3, allowedScope: 'support_draft',
    title: 'Must never enter execution job', brief: 'User body must never enter execution job',
    sourceLinks: [{ sourceRef: 'support:sha256:never-copy' }], ...overrides,
  };
}

describe('agent-manager execution outbox', () => {
  test('creates one strict PII-free job for the matching queued support task', async () => {
    const repo = new MemoryOutboxRepository();
    repo.documents.set('agent_manager_tasks/task-001', { id: 'task-001', data: queuedTask() });

    const result = await issueExecutionJobForQueuedEvent(repo, { taskId: 'task-001', taskRevision: 3, toStatus: 'queued' }, 2_000_000_000_000);

    expect(result).toEqual({ created: true, jobId: 'task-001__r3' });
    const job = repo.documents.get('agent_manager_execution_jobs/task-001__r3')?.data;
    expect(job).toMatchObject({ taskId: 'task-001', taskRevision: 3, scope: 'support_draft', handlerVersion: 'support-draft-v1', state: 'queued', attempts: 0, maxAttempts: 2 });
    expect(Object.keys(job ?? {}).sort()).toEqual([
      'attempts', 'createdAtMs', 'finishedAtMs', 'handlerVersion', 'idempotencyKey', 'idempotencyKeyHash',
      'leaseUntilMs', 'leasedAtMs', 'maxAttempts', 'outputHash', 'outputRef', 'schemaVersion', 'scope', 'state',
      'taskId', 'taskRevision', 'updatedAtMs',
    ]);
    expect(JSON.stringify(job)).not.toMatch(/Must never|User body|sourceLinks|sourceRef|secret|token/i);
  });

  test('is idempotent for an event replay and does not overwrite the original job', async () => {
    const repo = new MemoryOutboxRepository();
    repo.documents.set('agent_manager_tasks/task-001', { id: 'task-001', data: queuedTask({ allowedScope: 'analysis_only' }) });
    await issueExecutionJobForQueuedEvent(repo, { taskId: 'task-001', taskRevision: 3, toStatus: 'queued' }, 2_000_000_000_000);

    const replay = await issueExecutionJobForQueuedEvent(repo, { taskId: 'task-001', taskRevision: 3, toStatus: 'queued' }, 2_000_000_000_999);

    expect(replay).toEqual({ created: false, jobId: 'task-001__r3' });
    expect(repo.documents.size).toBe(2);
    expect(repo.documents.get('agent_manager_execution_jobs/task-001__r3')?.data.createdAtMs).toBe(2_000_000_000_000);
  });

  test('creates a job for the maximum-length valid task id without exceeding the execution key contract', async () => {
    const taskId = `t${'a'.repeat(159)}`;
    const repo = new MemoryOutboxRepository();
    repo.documents.set(`agent_manager_tasks/${taskId}`, { id: taskId, data: queuedTask({ taskId }) });

    const result = await issueExecutionJobForQueuedEvent(repo, { taskId, taskRevision: 3, toStatus: 'queued' }, 2_000_000_000_000);

    expect(result).toEqual({ created: true, jobId: `${taskId}__r3` });
    const job = repo.documents.get(`agent_manager_execution_jobs/${taskId}__r3`)?.data;
    expect(String(job?.idempotencyKey)).toMatch(/^exec:[a-f0-9]{64}$/);
    expect(String(job?.idempotencyKey)).toHaveLength(69);
    expect(job?.idempotencyKeyHash).not.toBe(job?.idempotencyKey);
  });

  test.each([
    [{ taskId: 'task-001', taskRevision: 3, toStatus: 'planned' }, queuedTask()],
    [{ taskId: 'task-001', taskRevision: 3, toStatus: 'queued' }, queuedTask({ status: 'awaiting_approval' })],
    [{ taskId: 'task-001', taskRevision: 2, toStatus: 'queued' }, queuedTask()],
  ])('skips non-eligible events and tasks: %j', async (event, task) => {
    const repo = new MemoryOutboxRepository();
    repo.documents.set('agent_manager_tasks/task-001', { id: 'task-001', data: task });

    const result = await issueExecutionJobForQueuedEvent(repo, event, 2_000_000_000_000);

    expect(result).toEqual({ created: false, jobId: null });
    expect([...repo.documents.keys()]).toEqual(['agent_manager_tasks/task-001']);
  });

  test('excludes code_prepare from the generic execution outbox', async () => {
    const repo = new MemoryOutboxRepository();
    repo.documents.set('agent_manager_tasks/task-001', {
      id: 'task-001', data: queuedTask({ allowedScope: 'code_prepare' }),
    });

    const result = await issueExecutionJobForQueuedEvent(
      repo,
      { taskId: 'task-001', taskRevision: 3, toStatus: 'queued' },
      2_000_000_000_000,
    );

    expect(result).toEqual({ created: false, jobId: null });
    expect([...repo.documents.keys()]).toEqual(['agent_manager_tasks/task-001']);
  });

  test('trigger source is an event-only Firestore handler with no worker or side-effect APIs', () => {
    const source = require('node:fs').readFileSync(__dirname + '/execution_outbox.ts', 'utf8');
    expect(source).toContain("onDocumentCreated({ document: 'agent_manager_task_events/{eventId}'");
    expect(source).toContain("eventData.toStatus !== 'queued'");
    expect(source).not.toMatch(/onCall|onRequest|onSchedule|nodemailer|mailparser|fetch\(|child_process|deploy|report_repl/i);
  });
});
