import { HttpsError } from 'firebase-functions/v2/https';
import type {
  AgentOfficeDocument,
  AgentOfficeQuery,
  AgentOfficeRepository,
  AgentOfficeTransaction,
} from './ledger';

interface RunnerModule {
  runAgentOfficeObservation(
    repository: AgentOfficeRepository,
    input: Record<string, unknown>,
    now?: () => number,
  ): Promise<Readonly<{ receipt: Record<string, unknown>; idempotent: boolean }>>;
}

function loadRunner(): RunnerModule | null {
  try {
    return require('./observation_runner') as RunnerModule;
  } catch {
    return null;
  }
}

class MemoryRepository implements AgentOfficeRepository {
  readonly documents = new Map<string, AgentOfficeDocument>();
  readonly writes: Array<{ operation: 'create' | 'update' | 'set'; path: string }> = [];
  retryNextTransaction = false;
  onRetry: (() => void) | null = null;

  seed(path: string, data: Record<string, unknown>): void {
    this.documents.set(path, { id: path.split('/').at(-1) || '', data: structuredClone(data) });
  }

  async get(path: string): Promise<AgentOfficeDocument | null> {
    return this.documents.get(path) ?? null;
  }

  async query(_input: AgentOfficeQuery): Promise<readonly AgentOfficeDocument[]> {
    throw new Error('observation runner must not query live collections');
  }

  async runTransaction<T>(body: (transaction: AgentOfficeTransaction) => Promise<T>): Promise<T> {
    const attempts = this.retryNextTransaction ? 2 : 1;
    this.retryNextTransaction = false;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const staged = new Map(this.documents);
      const pending: Array<{ operation: 'create' | 'update' | 'set'; path: string }> = [];
      const transaction: AgentOfficeTransaction = {
        get: async (path) => staged.get(path) ?? null,
        create: (path, data) => {
          if (staged.has(path)) throw new HttpsError('already-exists', 'document exists');
          staged.set(path, { id: path.split('/').at(-1) || '', data: structuredClone(data) });
          pending.push({ operation: 'create', path });
        },
        update: () => { throw new Error('observation receipts are create-only'); },
        set: () => { throw new Error('observation receipts are create-only'); },
      };
      const result = await body(transaction);
      if (attempt + 1 < attempts) {
        this.onRetry?.();
        continue;
      }
      this.documents.clear();
      staged.forEach((value, key) => this.documents.set(key, value));
      this.writes.push(...pending);
      return result;
    }
    throw new Error('unreachable');
  }
}

const VALID_CONTROL = Object.freeze({
  schemaVersion: 1,
  controlId: 'global',
  killSwitchEnabled: false,
  revision: 4,
  lastChangedAtMs: 1_000,
  lastChangedByUid: 'owner-sensitive-uid',
  lastIdempotencyKeyHash: 'a'.repeat(64),
  lastPayloadHash: 'b'.repeat(64),
});

function sufficientInput(): Record<string, unknown> {
  return {
    observedAtMs: 2_000,
    sourceHealth: [
      { source: 'analytics', state: 'ready', count: 1, truncated: false },
      { source: 'reports', state: 'ready', count: 3, truncated: false },
      { source: 'audit', state: 'empty', count: 0, truncated: false },
    ],
    rows: [
      { source: 'error_reports', category: 'audio', screen: 'lesson' },
      { source: 'error_reports', category: 'audio', screen: 'lesson' },
      { source: 'error_reports', category: 'audio', screen: 'lesson' },
    ],
  };
}

function requireRunner(): RunnerModule | null {
  const runner = loadRunner();
  expect(runner).not.toBeNull();
  return runner;
}

describe('Agent Office internal observation runner', () => {
  test('sufficient sanitized evidence creates one bounded prepare-only draft receipt and nothing else', async () => {
    const runner = requireRunner();
    if (!runner) return;
    const repository = new MemoryRepository();
    repository.seed('agent_office_control/global', VALID_CONTROL);

    const result = await runner.runAgentOfficeObservation(repository, sufficientInput(), () => 3_000);

    expect(repository.writes).toEqual([
      { operation: 'create', path: expect.stringMatching(/^agent_observation_receipts\/observation_[a-f0-9]{64}$/) },
    ]);
    expect(result).toMatchObject({
      idempotent: false,
      receipt: {
        schemaVersion: 1,
        receiptType: 'observation',
        outcome: 'draft_prepared',
        reason: 'sufficient_evidence',
        scope: 'prepare_only',
        piiClass: 'none',
        externalEffect: 'none',
        controlRevision: 4,
        draft: {
          signal: 'report_incident',
          actionType: 'analysis_prepare',
          scope: 'prepare_only',
        },
      },
    });
    const serialized = JSON.stringify(result.receipt);
    expect(serialized.length).toBeLessThan(2_000);
    expect(serialized).not.toMatch(/owner-sensitive-uid|sourceRef|actorUid|userId|reportId|idempotency|raw report/i);
  });

  test.each([
    ['partial', { source: 'analytics', state: 'partial', count: 1, truncated: false }],
    ['truncated', { source: 'reports', state: 'ready', count: 3, truncated: true }],
    ['invalid', { source: 'audit', state: 'ready', count: '1', truncated: false }],
  ])('%s evidence creates only an immutable no-action receipt', async (_name, replacement) => {
    const runner = requireRunner();
    if (!runner) return;
    const repository = new MemoryRepository();
    repository.seed('agent_office_control/global', VALID_CONTROL);
    const input = sufficientInput();
    input.sourceHealth = (input.sourceHealth as Record<string, unknown>[]).map((health) =>
      health.source === replacement.source ? replacement : health);

    const result = await runner.runAgentOfficeObservation(repository, input, () => 3_000);

    expect(repository.writes).toHaveLength(1);
    expect(result.receipt).toMatchObject({ outcome: 'no_action', reason: 'insufficient_evidence', draft: null });
  });

  test.each([
    ['missing', null],
    ['malformed', { killSwitchEnabled: false }],
    ['enabled', { ...VALID_CONTROL, killSwitchEnabled: true }],
  ])('kill switch %s state fails closed with a no-action receipt', async (_name, control) => {
    const runner = requireRunner();
    if (!runner) return;
    const repository = new MemoryRepository();
    if (control) repository.seed('agent_office_control/global', control);

    const result = await runner.runAgentOfficeObservation(repository, sufficientInput(), () => 3_000);

    expect(repository.writes).toHaveLength(1);
    expect(result.receipt).toMatchObject({ outcome: 'no_action', draft: null, externalEffect: 'none' });
    expect(result.receipt.reason).toMatch(/^control_(missing|invalid|enabled)$/);
  });

  test('rechecks control on transaction retry and never creates a draft after the switch becomes enabled', async () => {
    const runner = requireRunner();
    if (!runner) return;
    const repository = new MemoryRepository();
    repository.seed('agent_office_control/global', VALID_CONTROL);
    repository.retryNextTransaction = true;
    repository.onRetry = () => repository.seed('agent_office_control/global', { ...VALID_CONTROL, killSwitchEnabled: true, revision: 5 });

    const result = await runner.runAgentOfficeObservation(repository, sufficientInput(), () => 3_000);

    expect(repository.writes).toHaveLength(1);
    expect(result.receipt).toMatchObject({ outcome: 'no_action', reason: 'control_enabled', controlRevision: 5, draft: null });
    expect([...repository.documents.keys()].filter((path) => path.startsWith('agent_cases/') || path.startsWith('agent_recommendations/') || path.startsWith('agent_tasks/'))).toEqual([]);
  });

  test('exact replay returns the immutable receipt without a second write', async () => {
    const runner = requireRunner();
    if (!runner) return;
    const repository = new MemoryRepository();
    repository.seed('agent_office_control/global', VALID_CONTROL);
    let nowMs = 3_000;

    const first = await runner.runAgentOfficeObservation(repository, sufficientInput(), () => nowMs);
    nowMs = 4_000;
    const replay = await runner.runAgentOfficeObservation(repository, sufficientInput(), () => nowMs);

    expect(repository.writes).toHaveLength(1);
    expect(replay).toEqual({ receipt: first.receipt, idempotent: true });
  });
});
