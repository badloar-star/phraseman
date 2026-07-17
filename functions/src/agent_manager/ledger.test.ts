import { HttpsError } from 'firebase-functions/v2/https';
import {
  AgentManagerLedger,
  type AgentManagerDocument,
  type AgentManagerQuery,
  type AgentManagerRepository,
  type AgentManagerTransaction,
} from './ledger';
import { managerTelegramTokenHash } from './telegram_contracts';

const OWNER = { uid: 'owner-uid', token: { admin: true, adminRole: 'owner' } };

class MemoryRepository implements AgentManagerRepository {
  readonly documents = new Map<string, AgentManagerDocument>();
  readonly writes: Array<{ operation: 'create' | 'update'; path: string }> = [];

  constructor(private readonly enforceReadBeforeWrite = false) {}

  async get(path: string): Promise<AgentManagerDocument | null> { return this.documents.get(path) ?? null; }
  async query(input: AgentManagerQuery): Promise<readonly AgentManagerDocument[]> {
    return [...this.documents.entries()]
      .filter(([path]) => path.startsWith(`${input.collection}/`))
      .map(([, row]) => row)
      .sort((a, b) => Number(b.data[input.orderBy]) - Number(a.data[input.orderBy]) || b.id.localeCompare(a.id))
      .slice(0, input.limit);
  }
  async runTransaction<T>(body: (transaction: AgentManagerTransaction) => Promise<T>): Promise<T> {
    const staged = new Map(this.documents);
    const writes: Array<{ operation: 'create' | 'update'; path: string }> = [];
    let wrote = false;
    const result = await body({
      get: async (path) => {
        if (this.enforceReadBeforeWrite && wrote) throw new Error('Firestore transactions require all reads before writes');
        return staged.get(path) ?? null;
      },
      create: (path, data) => {
        if (staged.has(path)) throw new HttpsError('already-exists', 'document already exists');
        staged.set(path, { id: path.split('/').at(-1) || '', data: structuredClone(data) });
        wrote = true;
        writes.push({ operation: 'create', path });
      },
      update: (path, data) => {
        const current = staged.get(path);
        if (!current) throw new HttpsError('not-found', 'document missing');
        staged.set(path, { ...current, data: { ...current.data, ...structuredClone(data) } });
        wrote = true;
        writes.push({ operation: 'update', path });
      },
    });
    this.documents.clear(); staged.forEach((value, key) => this.documents.set(key, value)); this.writes.push(...writes);
    return result;
  }
}

function createInput(overrides: Record<string, unknown> = {}) {
  return {
    taskId: 'task-001', title: 'Проверить рост ошибок',
    brief: 'Проверить динамику ошибок после релиза и подготовить безопасный план.',
    priority: 'high', deadlineAtMs: null, allowedScope: 'analysis_only',
    sourceLinks: [{ sourceType: 'analytics', sourceRef: `analytics:sha256:${'a'.repeat(64)}` }],
    ...overrides,
  };
}

describe('Agent Manager task ledger', () => {
  test('initializes the bounded specialist roster without credentials or execution settings', async () => {
    const repo = new MemoryRepository(true);
    const ledger = new AgentManagerLedger(repo, () => 2_000_000_000_000);

    const result = await ledger.initializeRoster(OWNER);

    expect(result).toMatchObject({ ok: true, created: 7 });
    expect(repo.documents.get('agent_manager_agents/manager')?.data).toMatchObject({ role: 'manager', enabled: true });
    expect(JSON.stringify([...repo.documents.values()])).not.toMatch(/token|secret|command/i);
  });

  test('lists every registered specialist after roster initialization, including QA', async () => {
    const repo = new MemoryRepository();
    const ledger = new AgentManagerLedger(repo, () => 2_000_000_000_000);

    await ledger.initializeRoster(OWNER);

    await expect(ledger.listAgents(OWNER, { limit: 20 })).resolves.toMatchObject({
      ok: true,
      items: expect.arrayContaining([expect.objectContaining({ agentId: 'qa', role: 'qa' })]),
    });
  });

  test('creates an owner task for the manager, with immutable audit event and no execution command', async () => {
    const repo = new MemoryRepository();
    const ledger = new AgentManagerLedger(repo, () => 2_000_000_000_000);

    const result = await ledger.createTask(OWNER, createInput());

    expect(result).toMatchObject({ ok: true, item: { taskId: 'task-001', status: 'planned', assignedAgentId: 'manager', revision: 1 } });
    expect(repo.documents.get('agent_manager_tasks/task-001')?.data).toMatchObject({ createdByUid: 'owner-uid', allowedScope: 'analysis_only' });
    expect(JSON.stringify(repo.documents.get('agent_manager_tasks/task-001')?.data)).not.toMatch(/command|token|secret/i);
    expect(repo.writes.map((write) => write.path)).toEqual(expect.arrayContaining([
      'agent_manager_tasks/task-001', 'agent_manager_task_events/task-001__r1',
    ]));
    expect(repo.documents.get('agent_manager_task_events/task-001__r1')?.data).toMatchObject({ actorUid: 'owner-uid', actorRole: 'owner', piiClass: 'none' });
  });

  test('requires an explicit owner-approved lifecycle and exact revision before entering the queue', async () => {
    const repo = new MemoryRepository();
    const ledger = new AgentManagerLedger(repo, () => 2_000_000_000_000);
    await ledger.initializeRoster(OWNER);
    await ledger.createTask(OWNER, createInput());

    await expect(ledger.transitionTask(OWNER, { taskId: 'task-001', expectedRevision: 1, status: 'queued' })).rejects.toThrow('planned -> queued');
    const planned = await ledger.transitionTask(OWNER, { taskId: 'task-001', expectedRevision: 1, status: 'awaiting_approval' });
    expect(planned.item).toMatchObject({ assignedAgentId: 'analytics', status: 'awaiting_approval' });
    await expect(ledger.transitionTask(OWNER, { taskId: 'task-001', expectedRevision: 1, status: 'queued' })).rejects.toThrow('stale task revision');
    const queued = await ledger.transitionTask(OWNER, { taskId: 'task-001', expectedRevision: 2, status: 'queued' });
    expect(queued.item).toMatchObject({ status: 'queued', revision: 3 });
    expect(repo.documents.get('agent_manager_approvals/task-001__r3')?.data).toMatchObject({
      taskId: 'task-001', approvedByUid: 'owner-uid', fromStatus: 'awaiting_approval', toStatus: 'queued', piiClass: 'none',
    });
  });

  test('refuses to assign a plan until the specialist roster is initialized', async () => {
    const repo = new MemoryRepository();
    const ledger = new AgentManagerLedger(repo, () => 2_000_000_000_000);
    await ledger.createTask(OWNER, createInput());

    await expect(ledger.transitionTask(OWNER, { taskId: 'task-001', expectedRevision: 1, status: 'awaiting_approval' })).rejects.toThrow('assigned agent is unavailable');
  });

  test('requires a bounded specialist result before review and completion', async () => {
    const repo = new MemoryRepository();
    const ledger = new AgentManagerLedger(repo, () => 2_000_000_000_000);
    await ledger.initializeRoster(OWNER);
    await ledger.createTask(OWNER, createInput());
    await ledger.transitionTask(OWNER, { taskId: 'task-001', expectedRevision: 1, status: 'awaiting_approval' });
    await ledger.transitionTask(OWNER, { taskId: 'task-001', expectedRevision: 2, status: 'queued' });
    await ledger.transitionTask(OWNER, { taskId: 'task-001', expectedRevision: 3, status: 'in_progress' });

    await expect(ledger.transitionTask(OWNER, { taskId: 'task-001', expectedRevision: 4, status: 'needs_review' })).rejects.toThrow('task result is required');
    const review = await ledger.transitionTask(OWNER, { taskId: 'task-001', expectedRevision: 4, status: 'needs_review', result: { summary: 'Проверка завершена, подготовлен безопасный план исправления.', outcome: 'needs_review' } });
    expect(review.item).toMatchObject({ status: 'needs_review', result: { summary: expect.any(String) } });
    const completed = await ledger.transitionTask(OWNER, { taskId: 'task-001', expectedRevision: 5, status: 'completed' });
    expect(completed.item).toMatchObject({ status: 'completed', result: { summary: expect.any(String) } });
  });

  test('does not allow non-owner roles to create or dispatch tasks', async () => {
    const repo = new MemoryRepository();
    const ledger = new AgentManagerLedger(repo, () => 2_000_000_000_000);
    const admin = { uid: 'admin-uid', token: { admin: true, adminRole: 'admin' } };

    await expect(ledger.createTask(admin, createInput())).rejects.toMatchObject({ code: 'permission-denied' });
    expect(repo.writes).toHaveLength(0);
  });

  test('creates an idempotent PII-free task from an opaque support intake link', async () => {
    const repo = new MemoryRepository();
    const ledger = new AgentManagerLedger(repo, () => 2_000_000_000_000);
    const input = { sourceType: 'support' as const, sourceRef: `support:sha256:${'b'.repeat(64)}`, reportSource: null, sourceDocumentId: `m_${'b'.repeat(64)}` };

    const created = await ledger.createInboxTask(OWNER, input);
    const replayed = await ledger.createInboxTask(OWNER, input);

    expect(created).toMatchObject({ ok: true, replayed: false, item: { allowedScope: 'support_draft', assignedAgentId: 'manager' } });
    expect(replayed).toMatchObject({ ok: true, replayed: true, item: { taskId: created.item.taskId } });
    const taskJson = JSON.stringify(repo.documents.get(`agent_manager_tasks/${created.item.taskId}`)?.data);
    expect(taskJson).not.toMatch(/mail@example|subject|bodyText|token|secret|sourceDocumentId/i);
    expect(repo.documents.get(`agent_manager_inbox_links/${'b'.repeat(64)}`)?.data).toMatchObject({ sourceCollection: 'support_inbox', sourceDocumentId: `m_${'b'.repeat(64)}` });
    expect([...repo.documents.keys()].filter((path) => path.startsWith('agent_manager_tasks/'))).toHaveLength(1);
  });

  test('routes a PII-free report intake link to the reports specialist after approval', async () => {
    const repo = new MemoryRepository();
    const ledger = new AgentManagerLedger(repo, () => 2_000_000_000_000);
    await ledger.initializeRoster(OWNER);
    const created = await ledger.createInboxTask(OWNER, { sourceType: 'report', sourceRef: `report:sha256:${'c'.repeat(64)}`, reportSource: 'app_errors', sourceDocumentId: 'report-001' });

    const pending = await ledger.transitionTask(OWNER, { taskId: created.item.taskId, expectedRevision: 1, status: 'awaiting_approval' });

    expect(pending.item).toMatchObject({ assignedAgentId: 'reports', allowedScope: 'report_triage' });
    expect(JSON.stringify(pending.item)).not.toContain('report-001');
    expect(repo.documents.get(`agent_manager_inbox_links/${'c'.repeat(64)}`)?.data).toMatchObject({ sourceCollection: 'app_errors', sourceDocumentId: 'report-001' });
  });

  test('projects a fixed read-only FAQ for owners without storage reads or sensitive fields', async () => {
    const repo = new MemoryRepository();
    const ledger = new AgentManagerLedger(repo, () => 2_000_000_000_000);

    const result = await ledger.listRunbooks(OWNER);

    expect(result.items.map((item) => item.runbookId)).toEqual([
      'task-status-flow', 'approval-limits', 'mail-report-handoff', 'telegram-approval-boundary', 'archive',
    ]);
    expect(result.items.every((item) => item.title && item.summary && item.steps.length > 0)).toBe(true);
    expect(JSON.stringify(result.items)).not.toMatch(/token|secret|password|email|phone|command/i);
    expect(repo.documents.size).toBe(0);
    expect(repo.writes).toHaveLength(0);
  });

  test('does not project runbooks to non-owner roles', async () => {
    const ledger = new AgentManagerLedger(new MemoryRepository());
    const admin = { uid: 'admin-uid', token: { admin: true, adminRole: 'admin' } };

    await expect(ledger.listRunbooks(admin)).rejects.toMatchObject({ code: 'permission-denied' });
  });

  test('atomically consumes a verified Telegram approval and queues only the bound task revision', async () => {
    const repo = new MemoryRepository();
    const ledger = new AgentManagerLedger(repo, () => 2_000_000_000_000);
    await ledger.initializeRoster(OWNER);
    await ledger.createTask(OWNER, createInput());
    await ledger.transitionTask(OWNER, { taskId: 'task-001', expectedRevision: 1, status: 'awaiting_approval' });
    const nonce = 'n'.repeat(32); const tokenIdHash = managerTelegramTokenHash(nonce);
    repo.documents.set(`agent_manager_telegram_tokens/${tokenIdHash}`, { id: tokenIdHash, data: {
      schemaVersion: 1, tokenIdHash, status: 'active', ownerUid: 'owner-uid', telegramChatId: '70000001', telegramUserId: '70000001',
      taskId: 'task-001', expectedRevision: 2, permittedDecision: 'approve', projectionHash: 'd'.repeat(64),
      issuedAtMs: 1_999_999_999_000, validUntilMs: 2_000_000_000_500, consumedAtMs: null, consumedDecisionId: null, consumedUpdateIdHash: null,
    } });

    const result = await ledger.decideTelegramTask(OWNER, { token: repo.documents.get(`agent_manager_telegram_tokens/${tokenIdHash}`)!.data as never, decision: 'approve', updateIdHash: 'e'.repeat(64) });

    expect(result).toMatchObject({ ok: true, idempotent: false, decision: 'approve', item: { status: 'queued', revision: 3 } });
    expect(repo.documents.get(`agent_manager_telegram_tokens/${tokenIdHash}`)?.data).toMatchObject({ status: 'consumed', consumedUpdateIdHash: 'e'.repeat(64) });
    expect(JSON.stringify(repo.documents.get(`agent_manager_approvals/${repo.documents.get(`agent_manager_telegram_tokens/${tokenIdHash}`)?.data.consumedDecisionId}`)?.data)).not.toMatch(/nonce|token|secret/i);
  });

  test('Telegram rejection atomically cancels only the token-bound task', async () => {
    const repo = new MemoryRepository();
    const ledger = new AgentManagerLedger(repo, () => 2_000_000_000_000);
    await ledger.initializeRoster(OWNER);
    await ledger.createTask(OWNER, createInput());
    await ledger.transitionTask(OWNER, { taskId: 'task-001', expectedRevision: 1, status: 'awaiting_approval' });
    const tokenIdHash = managerTelegramTokenHash('r'.repeat(32));
    repo.documents.set(`agent_manager_telegram_tokens/${tokenIdHash}`, { id: tokenIdHash, data: {
      schemaVersion: 1, tokenIdHash, status: 'active', ownerUid: 'owner-uid', telegramChatId: '70000001', telegramUserId: '70000001',
      taskId: 'task-001', expectedRevision: 2, permittedDecision: 'reject', projectionHash: 'f'.repeat(64),
      issuedAtMs: 1_999_999_999_000, validUntilMs: 2_000_000_000_500, consumedAtMs: null, consumedDecisionId: null, consumedUpdateIdHash: null,
    } });

    const result = await ledger.decideTelegramTask(OWNER, { token: repo.documents.get(`agent_manager_telegram_tokens/${tokenIdHash}`)!.data as never, decision: 'reject', updateIdHash: '1'.repeat(64) });

    expect(result).toMatchObject({ ok: true, idempotent: false, decision: 'reject', item: { status: 'cancelled', revision: 3 } });
    expect(repo.documents.get(`agent_manager_approvals/${repo.documents.get(`agent_manager_telegram_tokens/${tokenIdHash}`)?.data.consumedDecisionId}`)?.data).toMatchObject({ decision: 'reject', toStatus: 'cancelled', origin: 'telegram' });
  });

  test('projects only a bounded execution preparation status for the task queue', async () => {
    const repo = new MemoryRepository();
    const ledger = new AgentManagerLedger(repo, () => 2_000_000_000_000);
    await ledger.initializeRoster(OWNER);
    await ledger.createTask(OWNER, createInput());
    await ledger.transitionTask(OWNER, { taskId: 'task-001', expectedRevision: 1, status: 'awaiting_approval' });
    await ledger.transitionTask(OWNER, { taskId: 'task-001', expectedRevision: 2, status: 'queued' });
    await ledger.transitionTask(OWNER, { taskId: 'task-001', expectedRevision: 3, status: 'in_progress' });
    await ledger.transitionTask(OWNER, { taskId: 'task-001', expectedRevision: 4, status: 'needs_review', result: { summary: 'Подготовленный результат ждёт проверки.', outcome: 'needs_review' } });
    repo.documents.set('agent_manager_execution_jobs/task-001__r3', { id: 'task-001__r3', data: {
      schemaVersion: 1, taskId: 'task-001', taskRevision: 3, scope: 'analysis_only', handlerVersion: 'analysis-only-v1',
      state: 'succeeded', attempts: 1, maxAttempts: 2, leaseUntilMs: null,
      idempotencyKey: `exec:${'a'.repeat(64)}`, idempotencyKeyHash: 'b'.repeat(64),
      createdAtMs: 2_000_000_000_000, updatedAtMs: 2_000_000_000_500, leasedAtMs: 2_000_000_000_100,
      finishedAtMs: 2_000_000_000_500, outputRef: `execution_output:${'c'.repeat(64)}`, outputHash: 'c'.repeat(64),
    } });

    const result = await ledger.listTasks(OWNER, { limit: 10 });

    expect(result.items[0]).toMatchObject({ taskId: 'task-001', execution: {
      state: 'succeeded', attempts: 1, maxAttempts: 2, updatedAtMs: 2_000_000_000_500, finishedAtMs: 2_000_000_000_500,
    } });
    expect(Object.keys(result.items[0].execution ?? {}).sort()).toEqual(['attempts', 'finishedAtMs', 'maxAttempts', 'state', 'updatedAtMs']);
    expect(JSON.stringify(result.items[0].execution)).not.toMatch(/jobId|taskRevision|outputRef|outputHash|idempotency|source|email|secret/i);
  });

  test('retains a cancelled execution status after a queued task advances one manual revision', async () => {
    const repo = new MemoryRepository();
    const ledger = new AgentManagerLedger(repo, () => 2_000_000_000_000);
    await ledger.initializeRoster(OWNER);
    await ledger.createTask(OWNER, createInput());
    await ledger.transitionTask(OWNER, { taskId: 'task-001', expectedRevision: 1, status: 'awaiting_approval' });
    await ledger.transitionTask(OWNER, { taskId: 'task-001', expectedRevision: 2, status: 'queued' });
    await ledger.transitionTask(OWNER, { taskId: 'task-001', expectedRevision: 3, status: 'cancelled' });
    repo.documents.set('agent_manager_execution_jobs/task-001__r3', { id: 'task-001__r3', data: {
      schemaVersion: 1, taskId: 'task-001', taskRevision: 3, scope: 'report_triage', handlerVersion: 'report-triage-v1',
      state: 'cancelled', attempts: 1, maxAttempts: 2, leaseUntilMs: null,
      idempotencyKey: `exec:${'d'.repeat(64)}`, idempotencyKeyHash: 'e'.repeat(64),
      createdAtMs: 2_000_000_000_000, updatedAtMs: 2_000_000_000_100, leasedAtMs: 2_000_000_000_010,
      finishedAtMs: 2_000_000_000_100, outputRef: null, outputHash: null,
    } });
    const result = await ledger.listTasks(OWNER, { limit: 10 });
    expect(result.items[0].execution).toEqual({ state: 'cancelled', attempts: 1, maxAttempts: 2, updatedAtMs: 2_000_000_000_100, finishedAtMs: 2_000_000_000_100 });
  });
});
