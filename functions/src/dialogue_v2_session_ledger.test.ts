import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  DIALOGUE_V2_SESSION_MAX_RAW_BYTES,
  DIALOGUE_V2_SESSION_MAX_RAW_TURNS,
  DIALOGUE_V2_SESSION_PENDING_CLAIM_TTL_MS,
  DIALOGUE_V2_SESSION_TTL_MS,
  DialogueV2SessionLedgerError,
  createDialogueV2SessionLedger,
  type DialogueV2SessionLedgerDependencies,
  type DialogueV2SessionLedgerRecord,
  type DialogueV2SessionLedgerRepository,
} from './dialogue_v2_session_ledger';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

class MemoryRepository implements DialogueV2SessionLedgerRepository {
  readonly records = new Map<string, DialogueV2SessionLedgerRecord>();

  async createIfAbsent(record: DialogueV2SessionLedgerRecord): Promise<unknown | null> {
    if (this.records.has(record.sessionId)) return null;
    const stored = clone(record);
    this.records.set(record.sessionId, stored);
    return clone(stored);
  }

  async mutate(
    sessionId: string,
    transition: (stored: unknown) => DialogueV2SessionLedgerRecord,
  ): Promise<unknown | null> {
    const stored = this.records.get(sessionId);
    if (!stored) return null;
    const next = transition(clone(stored));
    this.records.set(sessionId, clone(next));
    return clone(next);
  }
}

class CompletionFailureRepository extends MemoryRepository {
  private failed = false;

  constructor(private readonly mode: 'before_write' | 'after_write') {
    super();
  }

  override async mutate(
    sessionId: string,
    transition: (stored: unknown) => DialogueV2SessionLedgerRecord,
  ): Promise<unknown | null> {
    const stored = this.records.get(sessionId);
    if (!stored) return null;
    const next = transition(clone(stored));
    const completesPending = !this.failed
      && stored.receipts.some((receipt) => receipt.state === 'pending')
      && next.receipts.some((receipt) => receipt.state === 'completed');
    if (completesPending) {
      this.failed = true;
      if (this.mode === 'after_write') this.records.set(sessionId, clone(next));
      throw new Error('simulated final commit failure');
    }
    this.records.set(sessionId, clone(next));
    return clone(next);
  }
}

class CompletionAndRecoveryFailureRepository extends MemoryRepository {
  private recoveryMustFail = false;
  private completionFailed = false;

  override async mutate(
    sessionId: string,
    transition: (stored: unknown) => DialogueV2SessionLedgerRecord,
  ): Promise<unknown | null> {
    if (this.recoveryMustFail) {
      this.recoveryMustFail = false;
      throw new Error('simulated recovery outage');
    }
    const stored = this.records.get(sessionId);
    if (!stored) return null;
    const next = transition(clone(stored));
    const completesPending = !this.completionFailed
      && stored.receipts.some((receipt) => receipt.state === 'pending')
      && next.receipts.some((receipt) => receipt.state === 'completed');
    if (completesPending) {
      this.completionFailed = true;
      this.recoveryMustFail = true;
      throw new Error('simulated final commit outage');
    }
    this.records.set(sessionId, clone(next));
    return clone(next);
  }
}

class AfterWriteCompletionAndRecoveryFailureRepository extends MemoryRepository {
  private recoveryMustFail = false;
  private completionFailed = false;

  override async mutate(
    sessionId: string,
    transition: (stored: unknown) => DialogueV2SessionLedgerRecord,
  ): Promise<unknown | null> {
    if (this.recoveryMustFail) {
      this.recoveryMustFail = false;
      throw new Error('simulated recovery outage');
    }
    const stored = this.records.get(sessionId);
    if (!stored) return null;
    const next = transition(clone(stored));
    const completesPending = !this.completionFailed
      && stored.receipts.some((receipt) => receipt.state === 'pending')
      && next.receipts.some((receipt) => receipt.state === 'completed');
    if (completesPending) {
      this.completionFailed = true;
      this.recoveryMustFail = true;
      this.records.set(sessionId, clone(next));
      throw new Error('simulated ambiguous after-write outage');
    }
    this.records.set(sessionId, clone(next));
    return clone(next);
  }
}

const ACTOR = Object.freeze({ authUid: 'auth-user', stableAccountId: 'stable-user' });
const SELECTION = Object.freeze({ studyTarget: 'de' as const, scenarioId: 'work_01' });

function turnId(index: number): string {
  return `d2t_${String(index).padStart(16, '0')}`;
}

function harness(repository: MemoryRepository = new MemoryRepository()) {
  let nowMs = Date.UTC(2026, 8, 27, 12, 0, 0);
  let sessionSequence = 0;
  let claimSequence = 0;
  const dependencies: DialogueV2SessionLedgerDependencies = {
    repository,
    nowMs: () => nowMs,
    generateSessionId: () => `d2s_${String(++sessionSequence).padStart(32, 'A')}`,
    generateClaimToken: () => `d2c_${String(++claimSequence).padStart(32, 'C')}`,
    bindOwner: ({ authUid, stableAccountId }) => createHash('sha256')
      .update(`${authUid}\u0000${stableAccountId}`)
      .digest('hex'),
    digestTurnRequest: ({ userText }) => createHash('sha256')
      .update(userText)
      .digest('hex'),
  };
  const service = createDialogueV2SessionLedger(dependencies);
  return {
    dependencies,
    repository,
    service,
    now: () => nowMs,
    advance: (deltaMs: number) => { nowMs += deltaMs; },
  };
}

async function createSession(h: ReturnType<typeof harness>) {
  return h.service.createSession(ACTOR, SELECTION);
}

function request(
  sessionId: string,
  id = turnId(1),
  overrides: Record<string, unknown> = {},
) {
  return {
    sessionId,
    turnId: id,
    studyTarget: 'de',
    scenarioId: 'work_01',
    userText: 'Können wir die Aufgabe gemeinsam planen?',
    ...overrides,
  };
}

const assistantReply = Object.freeze([
  Object.freeze({ personaId: 'host', text: 'Ja, wir können mit dem ersten Schritt beginnen.' }),
]);

describe('Dialogue V2 operational session ledger', () => {
  it('creates an opaque server-owned session bound to owner, immutable selection, and 24h TTL', async () => {
    const h = harness();

    const created = await createSession(h);

    expect(created).toEqual({
      sessionId: expect.stringMatching(/^d2s_[A-Za-z0-9_-]{32,96}$/),
      expiresAtMs: h.now() + DIALOGUE_V2_SESSION_TTL_MS,
    });
    expect(created.sessionId).not.toContain(ACTOR.authUid);
    expect(created.sessionId).not.toContain(ACTOR.stableAccountId);
    const stored = h.repository.records.get(created.sessionId);
    expect(stored).toMatchObject({
      schemaVersion: 1,
      sessionId: created.sessionId,
      studyTarget: 'de',
      scenarioId: 'work_01',
      createdAtMs: h.now(),
      expiresAtMs: h.now() + 24 * 60 * 60 * 1_000,
      revision: 1,
      groupState: {
        schemaVersion: 1,
        turnCount: 0,
        lastSpeakerId: null,
        relevanceByPersonaId: {},
      },
      turns: [],
      receipts: [],
    });
    expect(JSON.stringify(stored)).not.toContain(ACTOR.authUid);
    expect(JSON.stringify(stored)).not.toContain(ACTOR.stableAccountId);
  });

  it('rejects cross-account access without invoking the server turn producer', async () => {
    const h = harness();
    const session = await createSession(h);
    const produce = jest.fn(async (_input: Record<string, unknown>) => assistantReply);

    await expect(h.service.runTurn(
      { authUid: 'other-auth', stableAccountId: 'other-stable' },
      request(session.sessionId),
      produce,
    )).rejects.toEqual(new DialogueV2SessionLedgerError('access_denied'));

    expect(produce).not.toHaveBeenCalled();
    expect(h.repository.records.get(session.sessionId)?.turns).toEqual([]);
  });

  it('rejects an expired session before append or server turn execution', async () => {
    const h = harness();
    const session = await createSession(h);
    h.advance(DIALOGUE_V2_SESSION_TTL_MS);
    const produce = jest.fn(async (_input: Record<string, unknown>) => assistantReply);

    await expect(h.service.runTurn(
      ACTOR,
      request(session.sessionId),
      produce,
    )).rejects.toEqual(new DialogueV2SessionLedgerError('session_expired'));

    expect(produce).not.toHaveBeenCalled();
  });

  it.each([
    [{ studyTarget: 'en' }, 'selection_mismatch'],
    [{ scenarioId: 'work_02' }, 'selection_mismatch'],
  ])('keeps study target and scenario immutable for %j', async (override, code) => {
    const h = harness();
    const session = await createSession(h);
    const produce = jest.fn(async () => assistantReply);

    await expect(h.service.runTurn(
      ACTOR,
      request(session.sessionId, turnId(1), override),
      produce,
    )).rejects.toEqual(new DialogueV2SessionLedgerError(code as 'selection_mismatch'));
    expect(produce).not.toHaveBeenCalled();
  });

  it('returns an exact completed replay for the same turnId without append or charge twice', async () => {
    const h = harness();
    const session = await createSession(h);
    const chargeAndProduce = jest.fn(async () => assistantReply);
    const turnRequest = request(session.sessionId);

    const first = await h.service.runTurn(ACTOR, turnRequest, chargeAndProduce);
    const replay = await h.service.runTurn(ACTOR, turnRequest, chargeAndProduce);

    expect(first).toEqual({
      ok: true,
      kind: 'new',
      sessionId: session.sessionId,
      turnId: turnId(1),
      replies: assistantReply,
    });
    expect(replay).toEqual({ ...first, kind: 'replay' });
    expect(chargeAndProduce).toHaveBeenCalledTimes(1);
    const stored = h.repository.records.get(session.sessionId);
    expect(stored?.turns).toHaveLength(1);
    expect(stored?.receipts).toHaveLength(1);

    await expect(h.service.runTurn(
      ACTOR,
      request(session.sessionId, turnId(1), { userText: 'Ein anderer Inhalt.' }),
      chargeAndProduce,
    )).rejects.toEqual(new DialogueV2SessionLedgerError('turn_conflict'));
    expect(chargeAndProduce).toHaveBeenCalledTimes(1);
  });

  it('passes only validated prior turns from the same authorized session to the producer', async () => {
    const h = harness();
    const session = await createSession(h);
    await h.service.runTurn(
      ACTOR,
      request(session.sessionId, turnId(1), { userText: 'Erste Nachricht.' }),
      async () => assistantReply,
    );
    const produce = jest.fn(async (_input: Record<string, unknown>) => assistantReply);

    await h.service.runTurn(
      ACTOR,
      request(session.sessionId, turnId(2), { userText: 'Zweite Nachricht.' }),
      produce,
    );

    const producerInput = produce.mock.calls[0][0] as Record<string, unknown>;
    expect(producerInput).toEqual({
      sessionId: session.sessionId,
      turnId: turnId(2),
      studyTarget: 'de',
      scenarioId: 'work_01',
      userText: 'Zweite Nachricht.',
      sessionExpiresAtMs: session.expiresAtMs,
      groupState: {
        schemaVersion: 1,
        turnCount: 1,
        lastSpeakerId: 'host',
        relevanceByPersonaId: { host: 3 },
      },
      priorTurns: [{
        turnId: turnId(1),
        userText: 'Erste Nachricht.',
        assistantReplies: assistantReply,
      }],
    });
    expect(Object.isFrozen(producerInput.priorTurns)).toBe(true);
    expect(Object.isFrozen((producerInput.priorTurns as readonly unknown[])[0])).toBe(true);
  });

  it('stores and replays an intentional server-owned group silence', async () => {
    const h = harness();
    const session = await createSession(h);
    const produceSilence = jest.fn(async () => []);
    const turnRequest = request(session.sessionId);

    const first = await h.service.runTurn(ACTOR, turnRequest, produceSilence);
    const replay = await h.service.runTurn(ACTOR, turnRequest, produceSilence);

    expect(first).toMatchObject({ kind: 'new', replies: [] });
    expect(replay).toMatchObject({ kind: 'replay', replies: [] });
    expect(produceSilence).toHaveBeenCalledTimes(1);
  });

  it('advances minimal server-owned group scheduling state only after a successful turn', async () => {
    const h = harness();
    const session = await createSession(h);
    const firstProducer = jest.fn(async (input: Record<string, unknown>) => {
      expect(input.groupState).toEqual({
        schemaVersion: 1,
        turnCount: 0,
        lastSpeakerId: null,
        relevanceByPersonaId: {},
      });
      return [{ personaId: 'anna', text: 'Wir können damit anfangen.' }];
    });

    await h.service.runTurn(
      ACTOR,
      request(session.sessionId, turnId(1)),
      firstProducer,
    );

    expect(h.repository.records.get(session.sessionId)?.groupState).toEqual({
      schemaVersion: 1,
      turnCount: 1,
      lastSpeakerId: 'anna',
      relevanceByPersonaId: { anna: 3 },
    });

    const secondProducer = jest.fn(async (input: Record<string, unknown>) => {
      expect(input.groupState).toEqual({
        schemaVersion: 1,
        turnCount: 1,
        lastSpeakerId: 'anna',
        relevanceByPersonaId: { anna: 3 },
      });
      return [{ personaId: 'ben', text: 'Ich übernehme den nächsten Punkt.' }];
    });
    await h.service.runTurn(
      ACTOR,
      request(session.sessionId, turnId(2)),
      secondProducer,
    );

    expect(h.repository.records.get(session.sessionId)?.groupState).toEqual({
      schemaVersion: 1,
      turnCount: 2,
      lastSpeakerId: 'ben',
      relevanceByPersonaId: { anna: 4, ben: 3 },
    });
  });

  it('accepts the canonical hyphenated persona IDs used by released language packs', async () => {
    const h = harness();
    const session = await createSession(h);

    await expect(h.service.runTurn(
      ACTOR,
      request(session.sessionId),
      async () => [{ personaId: 'team-lead', text: 'Wir beginnen mit dem ersten Punkt.' }],
    )).resolves.toMatchObject({
      kind: 'new',
      replies: [{ personaId: 'team-lead' }],
    });
    expect(h.repository.records.get(session.sessionId)?.groupState).toMatchObject({
      lastSpeakerId: 'team-lead',
      relevanceByPersonaId: { 'team-lead': 3 },
    });
  });

  it('does not double-advance scheduling state when a completed turn is replayed', async () => {
    const h = harness();
    const session = await createSession(h);
    const turnRequest = request(session.sessionId);
    const producer = jest.fn(async () => [
      { personaId: 'anna', text: 'Ich antworte einmal.' },
    ]);

    await h.service.runTurn(ACTOR, turnRequest, producer);
    const afterFirst = clone(h.repository.records.get(session.sessionId)?.groupState);
    await h.service.runTurn(ACTOR, turnRequest, producer);

    expect(h.repository.records.get(session.sessionId)?.groupState).toEqual(afterFirst);
    expect(producer).toHaveBeenCalledTimes(1);
  });

  it('records a successful silence without inventing a speaker and recovers bounded relevance', async () => {
    const h = harness();
    const session = await createSession(h);
    await h.service.runTurn(
      ACTOR,
      request(session.sessionId, turnId(1)),
      async () => [{ personaId: 'anna', text: 'Ich bin kurz dabei.' }],
    );

    await h.service.runTurn(
      ACTOR,
      request(session.sessionId, turnId(2), { userText: 'Danke.' }),
      async () => [],
    );

    expect(h.repository.records.get(session.sessionId)?.groupState).toEqual({
      schemaVersion: 1,
      turnCount: 2,
      lastSpeakerId: 'anna',
      relevanceByPersonaId: { anna: 4 },
    });
  });

  it('keeps pending idempotency state free of raw user text until safe output exists', async () => {
    const h = harness();
    const session = await createSession(h);
    let releaseProducer: ((value: typeof assistantReply) => void) | null = null;
    const produce = jest.fn(() => new Promise<typeof assistantReply>((resolve) => {
      releaseProducer = resolve;
    }));

    const pending = h.service.runTurn(
      ACTOR,
      request(session.sessionId),
      produce,
    );
    await Promise.resolve();
    await Promise.resolve();

    const duringProvider = h.repository.records.get(session.sessionId);
    expect(duringProvider?.turns).toEqual([]);
    expect(duringProvider?.receipts).toHaveLength(1);
    expect(JSON.stringify(duringProvider)).not.toContain(
      'Können wir die Aufgabe gemeinsam planen?',
    );

    const duplicateProducer = jest.fn(async () => assistantReply);
    await expect(h.service.runTurn(
      ACTOR,
      request(session.sessionId),
      duplicateProducer,
    )).rejects.toEqual(new DialogueV2SessionLedgerError('turn_in_progress'));
    expect(duplicateProducer).not.toHaveBeenCalled();

    const differentTurnProducer = jest.fn(async () => assistantReply);
    await expect(h.service.runTurn(
      ACTOR,
      request(session.sessionId, turnId(2)),
      differentTurnProducer,
    )).rejects.toEqual(new DialogueV2SessionLedgerError('turn_in_progress'));
    expect(differentTurnProducer).not.toHaveBeenCalled();

    const release = releaseProducer as ((value: typeof assistantReply) => void) | null;
    if (!release) throw new Error('producer was not started');
    release(assistantReply);
    await expect(pending).resolves.toMatchObject({ kind: 'new' });
    expect(h.repository.records.get(session.sessionId)?.turns).toHaveLength(1);
  });

  it('abandons a failed-before-write final commit so the exact turn can retry safely', async () => {
    const h = harness(new CompletionFailureRepository('before_write'));
    const session = await createSession(h);
    const firstProducer = jest.fn(async () => assistantReply);

    await expect(h.service.runTurn(
      ACTOR,
      request(session.sessionId),
      firstProducer,
    )).rejects.toEqual(new DialogueV2SessionLedgerError('completion_absent'));
    expect(firstProducer).toHaveBeenCalledTimes(1);
    expect(h.repository.records.get(session.sessionId)?.receipts).toEqual([]);

    const retryProducer = jest.fn(async () => assistantReply);
    await expect(h.service.runTurn(
      ACTOR,
      request(session.sessionId),
      retryProducer,
    )).resolves.toMatchObject({ kind: 'new', replies: assistantReply });
    expect(retryProducer).toHaveBeenCalledTimes(1);
  });

  it('reconciles an ambiguous after-write failure to the durable reply without duplicate work', async () => {
    const h = harness(new CompletionFailureRepository('after_write'));
    const session = await createSession(h);
    const producer = jest.fn(async () => assistantReply);

    await expect(h.service.runTurn(
      ACTOR,
      request(session.sessionId),
      producer,
    )).resolves.toMatchObject({ kind: 'new', replies: assistantReply });
    await expect(h.service.runTurn(
      ACTOR,
      request(session.sessionId),
      producer,
    )).resolves.toMatchObject({ kind: 'replay', replies: assistantReply });
    expect(producer).toHaveBeenCalledTimes(1);
  });

  it('recovers a stranded pending claim after its bounded lease expires', async () => {
    const h = harness(new CompletionAndRecoveryFailureRepository());
    const session = await createSession(h);

    await expect(h.service.runTurn(
      ACTOR,
      request(session.sessionId),
      async () => assistantReply,
    )).rejects.toEqual(new DialogueV2SessionLedgerError('completion_unknown'));
    expect(h.repository.records.get(session.sessionId)?.receipts)
      .toEqual([expect.objectContaining({ state: 'pending' })]);

    h.advance(DIALOGUE_V2_SESSION_PENDING_CLAIM_TTL_MS);
    const retryProducer = jest.fn(async () => assistantReply);
    await expect(h.service.runTurn(
      ACTOR,
      request(session.sessionId),
      retryProducer,
    )).resolves.toMatchObject({ kind: 'new', replies: assistantReply });
    expect(retryProducer).toHaveBeenCalledTimes(1);
  });

  it('reports an unknown outcome after an ambiguous after-write plus recovery outage, then replays the durable result', async () => {
    const h = harness(new AfterWriteCompletionAndRecoveryFailureRepository());
    const session = await createSession(h);
    const producer = jest.fn(async () => assistantReply);

    await expect(h.service.runTurn(
      ACTOR,
      request(session.sessionId),
      producer,
    )).rejects.toEqual(new DialogueV2SessionLedgerError('completion_unknown'));
    expect(producer).toHaveBeenCalledTimes(1);

    await expect(h.service.runTurn(
      ACTOR,
      request(session.sessionId),
      producer,
    )).resolves.toMatchObject({ kind: 'replay', replies: assistantReply });
    expect(producer).toHaveBeenCalledTimes(1);
  });

  it('bounds raw storage to eight turn pairs and 12KB while retaining no-charge receipts', async () => {
    const h = harness();
    const session = await createSession(h);
    const produce = jest.fn(async () => [
      { personaId: 'host', text: `Antwort ${'ü'.repeat(1_300)}` },
    ]);

    for (let index = 1; index <= 10; index += 1) {
      await h.service.runTurn(
        ACTOR,
        request(session.sessionId, turnId(index), {
          userText: `Nachricht ${index} ${'x'.repeat(900)}`,
        }),
        produce,
      );
    }

    const stored = h.repository.records.get(session.sessionId);
    if (!stored) throw new Error('missing stored session');
    expect(stored.turns.length).toBeLessThanOrEqual(DIALOGUE_V2_SESSION_MAX_RAW_TURNS);
    expect(Buffer.byteLength(JSON.stringify(stored.turns), 'utf8'))
      .toBeLessThanOrEqual(DIALOGUE_V2_SESSION_MAX_RAW_BYTES);
    expect(stored.receipts).toHaveLength(10);
    expect(stored.receipts.some((receipt) => receipt.state === 'evicted')).toBe(true);

    const callsBeforeReplay = produce.mock.calls.length;
    await expect(h.service.runTurn(
      ACTOR,
      request(session.sessionId, turnId(1), {
        userText: `Nachricht 1 ${'x'.repeat(900)}`,
      }),
      produce,
    )).rejects.toEqual(new DialogueV2SessionLedgerError('turn_replay_expired'));
    expect(produce).toHaveBeenCalledTimes(callsBeforeReplay);

    let boundedContext: unknown;
    await h.service.runTurn(
      ACTOR,
      request(session.sessionId, turnId(11), { userText: 'Nächste Nachricht.' }),
      async (input) => {
        boundedContext = input.priorTurns;
        return assistantReply;
      },
    );
    expect(boundedContext).toEqual(expect.any(Array));
    expect((boundedContext as readonly unknown[]).length)
      .toBeLessThanOrEqual(DIALOGUE_V2_SESSION_MAX_RAW_TURNS);
    expect(Buffer.byteLength(JSON.stringify(boundedContext), 'utf8'))
      .toBeLessThanOrEqual(DIALOGUE_V2_SESSION_MAX_RAW_BYTES);
  });

  it('rejects client assistant transcript fields, unsafe shapes, controls, and oversized text', async () => {
    const h = harness();
    const session = await createSession(h);
    const produce = jest.fn(async () => assistantReply);
    const getter = jest.fn(() => 'de');
    const accessor = Object.defineProperty({
      sessionId: session.sessionId,
      turnId: turnId(1),
      scenarioId: 'work_01',
      userText: 'Hallo',
    }, 'studyTarget', { enumerable: true, get: getter });
    const invalid = [
      request(session.sessionId, turnId(1), { assistantText: 'client-forged' }),
      request(session.sessionId, turnId(1), { assistantReplies: assistantReply }),
      request(session.sessionId, turnId(1), { userText: 'Hallo\u0000Welt' }),
      request(session.sessionId, turnId(1), { userText: 'ж'.repeat(1_100) }),
      accessor,
      new Proxy(request(session.sessionId), {}),
    ];

    for (const value of invalid) {
      await expect(h.service.runTurn(ACTOR, value, produce))
        .rejects.toEqual(new DialogueV2SessionLedgerError('request_invalid'));
    }
    expect(getter).not.toHaveBeenCalled();
    expect(produce).not.toHaveBeenCalled();
  });

  it('accepts assistant text only from the server callback and fails closed on its shape', async () => {
    const h = harness();
    const session = await createSession(h);

    await expect(h.service.runTurn(
      ACTOR,
      request(session.sessionId),
      async () => [{ personaId: 'host', text: 'Antwort', role: 'system' }] as never,
    )).rejects.toEqual(new DialogueV2SessionLedgerError('assistant_response_invalid'));

    const storedAfterFailure = h.repository.records.get(session.sessionId);
    expect(storedAfterFailure?.turns).toEqual([]);
    expect(storedAfterFailure?.receipts).toEqual([]);
  });

  it('fails closed on malformed repository state and contains no logging calls', async () => {
    const h = harness();
    const session = await createSession(h);
    h.repository.records.set(session.sessionId, {
      ...(h.repository.records.get(session.sessionId) as DialogueV2SessionLedgerRecord),
      ownerBinding: 'attacker-corruption',
      unknownAuthority: true,
    } as DialogueV2SessionLedgerRecord);

    await expect(h.service.runTurn(
      ACTOR,
      request(session.sessionId),
      async () => assistantReply,
    )).rejects.toEqual(new DialogueV2SessionLedgerError('ledger_unavailable'));

    const source = fs.readFileSync(
      path.join(__dirname, 'dialogue_v2_session_ledger.ts'),
      'utf8',
    );
    expect(source).not.toMatch(/console\.|logger\.|functions\.logger/);
  });

  it.each(['digest', 'claim'] as const)(
    'maps a failing %s dependency to ledger_unavailable without leaking its error',
    async (failure) => {
      const h = harness();
      const session = await createSession(h);
      const broken = createDialogueV2SessionLedger({
        ...h.dependencies,
        ...(failure === 'digest'
          ? { digestTurnRequest: () => { throw new Error('private digest failure'); } }
          : { generateClaimToken: () => { throw new Error('private claim failure'); } }),
      });

      await expect(broken.runTurn(
        ACTOR,
        request(session.sessionId),
        async () => assistantReply,
      )).rejects.toEqual(new DialogueV2SessionLedgerError('ledger_unavailable'));
    },
  );
});
