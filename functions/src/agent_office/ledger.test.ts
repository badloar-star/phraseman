import { HttpsError } from 'firebase-functions/v2/https';
import { AGENT_OFFICE_SCHEMA_VERSION, approvalDocumentId } from './contracts';
import {
  AgentOfficeLedger,
  type AgentOfficeDocument,
  type AgentOfficeQuery,
  type AgentOfficeRepository,
  type AgentOfficeTransaction,
} from './ledger';

const HASH = 'a'.repeat(64);
const OWNER = { uid: 'owner-uid', token: { admin: true, adminRole: 'owner' } };

class MemoryRepository implements AgentOfficeRepository {
  readonly documents = new Map<string, AgentOfficeDocument>();
  readonly writes: Array<{ operation: 'create' | 'update' | 'set'; path: string }> = [];
  transactionCount = 0;

  seed(path: string, data: Record<string, unknown>) {
    this.documents.set(path, { id: path.split('/').at(-1) || '', data: structuredClone(data) });
  }

  async get(path: string): Promise<AgentOfficeDocument | null> {
    return this.documents.get(path) ?? null;
  }

  async query(input: AgentOfficeQuery): Promise<readonly AgentOfficeDocument[]> {
    return [...this.documents.entries()]
      .filter(([path]) => path.startsWith(`${input.collection}/`))
      .map(([, row]) => row)
      .filter((row) => !input.caseId || row.data.caseId === input.caseId)
      .sort((a, b) => Number(b.data[input.orderBy]) - Number(a.data[input.orderBy]) || b.id.localeCompare(a.id))
      .filter((row) => !input.cursor
        || Number(row.data[input.orderBy]) < input.cursor.value
        || (Number(row.data[input.orderBy]) === input.cursor.value && row.id < input.cursor.id))
      .slice(0, input.limit);
  }

  async runTransaction<T>(body: (transaction: AgentOfficeTransaction) => Promise<T>): Promise<T> {
    this.transactionCount += 1;
    const staged = new Map(this.documents);
    const pendingWrites: Array<{ operation: 'create' | 'update' | 'set'; path: string }> = [];
    const transaction: AgentOfficeTransaction = {
      get: async (path) => staged.get(path) ?? null,
      create: (path, data) => {
        if (staged.has(path)) throw new HttpsError('already-exists', 'document already exists');
        staged.set(path, { id: path.split('/').at(-1) || '', data: structuredClone(data) });
        pendingWrites.push({ operation: 'create', path });
      },
      update: (path, data) => {
        const current = staged.get(path);
        if (!current) throw new HttpsError('not-found', 'document missing');
        staged.set(path, { ...current, data: { ...current.data, ...structuredClone(data) } });
        pendingWrites.push({ operation: 'update', path });
      },
      set: (path, data) => {
        staged.set(path, { id: path.split('/').at(-1) || '', data: structuredClone(data) });
        pendingWrites.push({ operation: 'set', path });
      },
    };
    const result = await body(transaction);
    this.documents.clear();
    staged.forEach((value, key) => this.documents.set(key, value));
    this.writes.push(...pendingWrites);
    return result;
  }
}

function seedDecision(repo: MemoryRepository, nowMs = 2_000_000_000_000) {
  repo.seed('agent_cases/case-1', {
    schemaVersion: 1,
    caseId: 'case-1',
    revision: 3,
    status: 'awaiting_decision',
    summary: 'Redacted case summary.',
    sourceHealth: [{ source: 'analytics', state: 'ready', observedAtMs: nowMs - 1000 }],
    confidence: { score: 0.8, basis: 'complete window', insufficientEvidence: false },
    sourceRefs: [{ source: 'analytics', ref: 'cohort:opaque-123' }],
    currentRecommendation: { recommendationId: 'rec-1', revision: 2, contentHash: HASH },
    createdAtMs: nowMs - 10_000,
    updatedAtMs: nowMs - 1_000,
    retentionUntilMs: nowMs + 10_000_000,
  });
  repo.seed('agent_recommendations/case-1__r2', {
    schemaVersion: 1,
    recommendationId: 'rec-1',
    caseId: 'case-1',
    revision: 2,
    contentHash: HASH,
    evidence: [{ summary: 'Bounded evidence.', sourceRef: 'cohort:opaque-123', observedAtMs: nowMs - 1000 }],
    risk: { level: 'low', summary: 'Preparation only.' },
    cost: { currency: 'EUR', estimatedMinor: 0, summary: 'No spend.' },
    rollback: { possible: true, plan: 'Discard prepared branch.' },
    actionType: 'code_change_prepare',
    scope: 'prepare_only',
    validUntilMs: nowMs + 100_000,
    createdAtMs: nowMs - 1000,
  });
}

function decisionInput(overrides: Record<string, unknown> = {}) {
  return {
    caseId: 'case-1',
    expectedCaseRevision: 3,
    recommendationId: 'rec-1',
    recommendationRevision: 2,
    recommendationContentHash: HASH,
    decision: 'approve',
    reason: 'Prepare the isolated change.',
    idempotencyKey: 'decision-key-12345678',
    ...overrides,
  };
}

describe('Agent Office owner decision transaction', () => {
  test('binds approval to the exact current case/recommendation and produces no task or production action', async () => {
    const repo = new MemoryRepository();
    seedDecision(repo);
    const ledger = new AgentOfficeLedger(repo, () => 2_000_000_000_000);

    const result = await ledger.decideRecommendation(OWNER, decisionInput());

    const approvalId = approvalDocumentId('case-1', 'rec-1', 2);
    expect(result).toMatchObject({ ok: true, idempotent: false, approvalId, enqueuedTaskId: null, scope: 'prepare_only' });
    expect(repo.documents.get(`agent_approvals/${approvalId}`)?.data).toMatchObject({
      decision: 'approve',
      ownerUid: 'owner-uid',
      recommendationRevision: 2,
      recommendationContentHash: HASH,
      caseRevisionBefore: 3,
      caseRevisionAfter: 4,
      scope: 'prepare_only',
      enqueuedTaskId: null,
    });
    expect(repo.documents.get('agent_cases/case-1')?.data).toMatchObject({ revision: 4, status: 'approved' });
    const writtenPaths = repo.writes.map((write) => write.path);
    expect(writtenPaths).toHaveLength(3);
    expect(writtenPaths).toEqual(expect.arrayContaining([`agent_approvals/${approvalId}`, 'agent_cases/case-1']));
    expect(writtenPaths.filter((path) => /^agent_audit_events\/decision_[a-f0-9]{64}$/.test(path))).toHaveLength(1);
    expect([...repo.documents.keys()].some((path) => path.startsWith('agent_tasks/'))).toBe(false);
    expect([...repo.documents.keys()].some((path) => /remote_config|mail|telegram|production/i.test(path))).toBe(false);
  });

  test('denies non-owner roles before opening a transaction', async () => {
    const repo = new MemoryRepository();
    seedDecision(repo);
    const ledger = new AgentOfficeLedger(repo, () => 2_000_000_000_000);

    await expect(ledger.decideRecommendation(
      { uid: 'admin-uid', token: { admin: true, adminRole: 'admin' } },
      decisionInput(),
    )).rejects.toMatchObject({ code: 'permission-denied' });
    expect(repo.transactionCount).toBe(0);
  });

  test.each([
    ['stale case revision', { expectedCaseRevision: 2 }, 'case revision'],
    ['stale recommendation revision', { recommendationRevision: 1 }, 'recommendation revision'],
    ['content hash mismatch', { recommendationContentHash: 'b'.repeat(64) }, 'contentHash'],
  ])('rejects %s without writes', async (_name, overrides, message) => {
    const repo = new MemoryRepository();
    seedDecision(repo);
    const ledger = new AgentOfficeLedger(repo, () => 2_000_000_000_000);

    await expect(ledger.decideRecommendation(OWNER, decisionInput(overrides))).rejects.toThrow(message);
    expect(repo.writes).toHaveLength(0);
  });

  test('rejects an expired recommendation', async () => {
    const repo = new MemoryRepository();
    seedDecision(repo);
    const recommendation = repo.documents.get('agent_recommendations/case-1__r2');
    if (!recommendation) throw new Error('fixture missing');
    recommendation.data.validUntilMs = 1_999_999_999_999;
    const ledger = new AgentOfficeLedger(repo, () => 2_000_000_000_000);

    await expect(ledger.decideRecommendation(OWNER, decisionInput())).rejects.toThrow('recommendation expired');
    expect(repo.writes).toHaveLength(0);
  });

  test('returns the immutable result for an exact replay and rejects conflicting reuse', async () => {
    const repo = new MemoryRepository();
    seedDecision(repo);
    const ledger = new AgentOfficeLedger(repo, () => 2_000_000_000_000);

    const first = await ledger.decideRecommendation(OWNER, decisionInput());
    const writeCount = repo.writes.length;
    const replay = await ledger.decideRecommendation(OWNER, decisionInput());
    expect(replay).toEqual({ ...first, idempotent: true });
    expect(repo.writes).toHaveLength(writeCount);

    await expect(ledger.decideRecommendation(OWNER, decisionInput({ decision: 'decline' }))).rejects.toThrow('idempotency key conflict');
    expect(repo.writes).toHaveLength(writeCount);
  });

  test('creates the audit event once and cannot overwrite it', async () => {
    const repo = new MemoryRepository();
    seedDecision(repo);
    const ledger = new AgentOfficeLedger(repo, () => 2_000_000_000_000);
    await ledger.decideRecommendation(OWNER, decisionInput());

    const auditWrites = repo.writes.filter((write) => write.path.startsWith('agent_audit_events/'));
    expect(auditWrites).toHaveLength(1);
    expect(auditWrites[0].operation).toBe('create');
    const audit = repo.documents.get(auditWrites[0].path)?.data;
    expect(audit).toMatchObject({ eventType: 'recommendation_decided', piiClass: 'none', actorRole: 'owner' });
    expect(audit).not.toHaveProperty('actorUid');
  });
});

describe('Agent Office global kill switch', () => {
  test('reads missing or malformed control fail-closed', async () => {
    const repo = new MemoryRepository();
    const ledger = new AgentOfficeLedger(repo, () => 2_000_000_000_000);
    await expect(ledger.getControl(OWNER)).resolves.toEqual({
      ok: true,
      control: { controlId: 'global', killSwitchEnabled: true, revision: 0, state: 'missing_fail_closed', lastChangedAtMs: null },
    });

    repo.seed('agent_office_control/global', { killSwitchEnabled: false, revision: 'bad' });
    await expect(ledger.getControl(OWNER)).resolves.toEqual({
      ok: true,
      control: { controlId: 'global', killSwitchEnabled: true, revision: 0, state: 'invalid_fail_closed', lastChangedAtMs: null },
    });
  });

  test('requires safe initialization and exact expectedRevision', async () => {
    const repo = new MemoryRepository();
    const ledger = new AgentOfficeLedger(repo, () => 2_000_000_000_000);

    await expect(ledger.setKillSwitch(OWNER, {
      enabled: false,
      expectedRevision: 0,
      reason: 'unsafe initial disable',
      idempotencyKey: 'control-key-12345678',
    })).rejects.toThrow('control uninitialized');

    await expect(ledger.setKillSwitch(OWNER, {
      enabled: true,
      expectedRevision: 1,
      reason: 'wrong revision',
      idempotencyKey: 'control-key-22345678',
    })).rejects.toThrow('control revision');
    expect(repo.writes).toHaveLength(0);
  });

  test('is monotonic, idempotent and rejects conflicting replay', async () => {
    const repo = new MemoryRepository();
    const ledger = new AgentOfficeLedger(repo, () => 2_000_000_000_000);
    const input = {
      enabled: true,
      expectedRevision: 0,
      reason: 'Initialize in stopped state.',
      idempotencyKey: 'control-key-12345678',
    };

    const first = await ledger.setKillSwitch(OWNER, input);
    expect(first).toMatchObject({ ok: true, idempotent: false, control: { killSwitchEnabled: true, revision: 1 } });
    const writeCount = repo.writes.length;
    await expect(ledger.setKillSwitch(OWNER, input)).resolves.toEqual({ ...first, idempotent: true });
    expect(repo.writes).toHaveLength(writeCount);
    expect(repo.writes.filter((write) => write.path.startsWith('agent_audit_events/'))).toEqual([
      expect.objectContaining({ operation: 'create' }),
    ]);

    await expect(ledger.setKillSwitch(OWNER, { ...input, enabled: false })).rejects.toThrow('idempotency key conflict');
    await expect(ledger.setKillSwitch(OWNER, { ...input, idempotencyKey: 'control-key-32345678' })).rejects.toThrow('control revision');
  });

  test('replays an older immutable control result after a newer control revision', async () => {
    const repo = new MemoryRepository();
    const ledger = new AgentOfficeLedger(repo, () => 2_000_000_000_000);
    const firstInput = {
      enabled: true,
      expectedRevision: 0,
      reason: 'Initialize stopped.',
      idempotencyKey: 'control-key-old-1234',
    };
    const first = await ledger.setKillSwitch(OWNER, firstInput);
    await ledger.setKillSwitch(OWNER, {
      enabled: false,
      expectedRevision: 1,
      reason: 'Owner explicitly resumes observation.',
      idempotencyKey: 'control-key-new-1234',
    });
    const writeCount = repo.writes.length;

    await expect(ledger.setKillSwitch(OWNER, firstInput)).resolves.toEqual({ ...first, idempotent: true });
    expect(repo.writes).toHaveLength(writeCount);
  });
});

describe('Agent Office safe list/get ledger', () => {
  test('returns only projected cases, recommendations, tasks and audit rows', async () => {
    const repo = new MemoryRepository();
    seedDecision(repo);
    repo.seed('agent_tasks/task-1', {
      schemaVersion: AGENT_OFFICE_SCHEMA_VERSION,
      taskId: 'task-1',
      caseId: 'case-1',
      approvalId: 'a'.repeat(64),
      taskType: 'code_change_prepare',
      status: 'pending',
      scope: 'prepare_only',
      createdAtMs: 2_000_000_000_000,
      expiresAtMs: 2_000_100_000_000,
      command: 'forbidden internal command',
    });
    repo.seed('agent_audit_events/audit-1', {
      schemaVersion: 1,
      eventId: 'audit-1',
      eventType: 'kill_switch_changed',
      controlRevision: 1,
      killSwitchEnabled: true,
      actorRole: 'owner',
      idempotencyKeyHash: 'b'.repeat(64),
      payloadHash: 'c'.repeat(64),
      occurredAtMs: 2_000_000_000_000,
      piiClass: 'none',
      actorUid: 'owner-uid',
    });
    const ledger = new AgentOfficeLedger(repo, () => 2_000_000_000_000);

    const cases = await ledger.listCases(OWNER, { limit: 20, cursor: '' });
    const singleCase = await ledger.getCase(OWNER, { caseId: 'case-1' });
    const recommendations = await ledger.listRecommendations(OWNER, { caseId: 'case-1', limit: 20, cursor: '' });
    const tasks = await ledger.listTasks(OWNER, { limit: 20, cursor: '' });
    const audit = await ledger.listAuditEvents(OWNER, { caseId: '', limit: 20, cursor: '' });

    expect(cases.items).toHaveLength(1);
    expect(singleCase.item).toMatchObject({ caseId: 'case-1' });
    expect(recommendations.items).toHaveLength(1);
    expect(JSON.stringify(tasks)).not.toContain('command');
    expect(JSON.stringify(audit)).not.toContain('owner-uid');
  });

  test('uses a query-bound cursor to advance to the next page', async () => {
    const repo = new MemoryRepository();
    seedDecision(repo);
    const firstCase = repo.documents.get('agent_cases/case-1');
    if (!firstCase) throw new Error('fixture missing');
    repo.seed('agent_cases/case-2', { ...structuredClone(firstCase.data), caseId: 'case-2', updatedAtMs: 1_999_999_998_000 });
    repo.seed('agent_cases/case-3', { ...structuredClone(firstCase.data), caseId: 'case-3', updatedAtMs: 1_999_999_997_000 });
    const ledger = new AgentOfficeLedger(repo, () => 2_000_000_000_000);

    const first = await ledger.listCases(OWNER, { limit: 2, cursor: '' });
    expect(first.items.map((item) => item.caseId)).toEqual(['case-1', 'case-2']);
    expect(first.nextCursor).toEqual(expect.any(String));

    const second = await ledger.listCases(OWNER, { limit: 2, cursor: first.nextCursor });
    expect(second.items.map((item) => item.caseId)).toEqual(['case-3']);
    expect(second.nextCursor).toBeNull();
  });
});
