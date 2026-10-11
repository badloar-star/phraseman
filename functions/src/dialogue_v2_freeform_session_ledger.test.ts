import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  DIALOGUE_V2_FREEFORM_OWNER_HMAC_NAMESPACE,
  DIALOGUE_V2_FREEFORM_SESSION_MAX_RAW_BYTES,
  DIALOGUE_V2_FREEFORM_SESSION_MAX_RAW_TURNS,
  DIALOGUE_V2_FREEFORM_SESSION_TTL_MS,
  DIALOGUE_V2_FREEFORM_TURN_HMAC_NAMESPACE,
  DialogueV2FreeformSessionLedgerError,
  createDialogueV2FreeformSessionLedger,
  type DialogueV2FreeformSessionLedgerDependencies,
  type DialogueV2FreeformSessionLedgerRecord,
  type DialogueV2FreeformSessionLedgerRepository,
} from './dialogue_v2_freeform_session_ledger';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

class MemoryRepository implements DialogueV2FreeformSessionLedgerRepository {
  readonly records = new Map<string, DialogueV2FreeformSessionLedgerRecord>();

  async createIfAbsent(record: DialogueV2FreeformSessionLedgerRecord): Promise<unknown | null> {
    if (this.records.has(record.sessionId)) return null;
    this.records.set(record.sessionId, clone(record));
    return clone(record);
  }

  async mutate(
    sessionId: string,
    transition: (stored: unknown) => DialogueV2FreeformSessionLedgerRecord,
  ): Promise<unknown | null> {
    const current = this.records.get(sessionId);
    if (!current) return null;
    const next = transition(clone(current));
    this.records.set(sessionId, clone(next));
    return clone(next);
  }
}

const ACTOR = Object.freeze({ authUid: 'auth-user', stableAccountId: 'stable-user' });
const TARGET = Object.freeze({ studyTarget: 'es' as const });

function turnId(index: number): string {
  return `d2ft_${String(index).padStart(16, 'T')}`;
}

function harness(repository: MemoryRepository = new MemoryRepository()) {
  let nowMs = Date.UTC(2026, 8, 27, 12, 0, 0);
  let sessionSequence = 0;
  let claimSequence = 0;
  const ownerNamespaces: string[] = [];
  const digestNamespaces: string[] = [];
  const dependencies: DialogueV2FreeformSessionLedgerDependencies = {
    repository,
    nowMs: () => nowMs,
    generateSessionId: () => `d2fs_${String(++sessionSequence).padStart(32, 'S')}`,
    generateClaimToken: () => `d2fc_${String(++claimSequence).padStart(32, 'C')}`,
    bindOwner: ({ namespace, actor }) => {
      ownerNamespaces.push(namespace);
      return createHash('sha256')
        .update(`${namespace}\u0000${actor.authUid}\u0000${actor.stableAccountId}`)
        .digest('hex');
    },
    digestTurnRequest: ({ namespace, request }) => {
      digestNamespaces.push(namespace);
      return createHash('sha256')
        .update(`${namespace}\u0000${JSON.stringify(request)}`)
        .digest('hex');
    },
  };
  return {
    repository,
    service: createDialogueV2FreeformSessionLedger(dependencies),
    ownerNamespaces,
    digestNamespaces,
    now: () => nowMs,
    advance: (deltaMs: number) => { nowMs += deltaMs; },
  };
}

function request(sessionId: string, index = 1, overrides: Record<string, unknown> = {}) {
  return {
    sessionId,
    turnId: turnId(index),
    studyTarget: 'es',
    userMessage: `Mensaje ${index}`,
    ...overrides,
  };
}

describe('Dialogue V2 Plus freeform session ledger', () => {
  it('keeps the portable shared parser outside the authoritative trust gate', () => {
    const source = fs.readFileSync(
      path.join(__dirname, 'dialogue_v2_freeform_session_ledger.ts'),
      'utf8',
    );

    expect(source).toContain('function parseStartAtServerBoundary');
    expect(source).toContain('function parseTurnAtServerBoundary');
    expect(source).not.toContain('export function parseStartAtServerBoundary');
    expect(source).not.toContain('export function parseTurnAtServerBoundary');
    expect(source).toMatch(/nodeTypes\.isProxy\(value\)[\s\S]*parseDialogueV2FreeformSessionStartShape/);
    expect(source).toMatch(/nodeTypes\.isProxy\(value\)[\s\S]*parseDialogueV2FreeformSessionTurnShape/);
    expect(source).not.toMatch(/const start = parseDialogueV2FreeformSessionStartShape\(startInput\)/);
    expect(source).not.toMatch(/const input = parseDialogueV2FreeformSessionTurnShape\(requestInput\)/);
  });

  it('rejects transparent proxy payloads at the server boundary', async () => {
    const h = harness();

    await expect(h.service.createSession(
      ACTOR,
      new Proxy({ studyTarget: 'es' }, {}),
    )).rejects.toEqual(new DialogueV2FreeformSessionLedgerError('request_invalid'));

    const created = await h.service.createSession(ACTOR, TARGET);
    const producer = jest.fn(async () => 'Entendido.');
    await expect(h.service.runTurn(
      ACTOR,
      new Proxy(request(created.sessionId), {}),
      producer,
    )).rejects.toEqual(new DialogueV2FreeformSessionLedgerError('request_invalid'));
    expect(producer).not.toHaveBeenCalled();
  });

  it('creates a distinct opaque owner-bound record with bounded TTL and no scenario fields', async () => {
    const h = harness();

    const created = await h.service.createSession(ACTOR, TARGET);

    expect(created).toEqual({
      sessionId: expect.stringMatching(/^d2fs_[A-Za-z0-9_-]{32,96}$/),
      expiresAtMs: h.now() + DIALOGUE_V2_FREEFORM_SESSION_TTL_MS,
    });
    expect(h.ownerNamespaces).toEqual([DIALOGUE_V2_FREEFORM_OWNER_HMAC_NAMESPACE]);
    expect(DIALOGUE_V2_FREEFORM_OWNER_HMAC_NAMESPACE).not.toBe('dialogue-v2-owner.v1');
    const stored = h.repository.records.get(created.sessionId);
    expect(stored).toEqual(expect.objectContaining({
      schemaVersion: 1,
      kind: 'dialogue_v2_plus_freeform',
      sessionId: created.sessionId,
      studyTarget: 'es',
      createdAtMs: h.now(),
      expiresAtMs: h.now() + 24 * 60 * 60 * 1_000,
      revision: 1,
      turns: [],
      receipts: [],
    }));
    expect(Object.keys(stored ?? {}).sort()).toEqual([
      'createdAtMs', 'expiresAtMs', 'kind', 'ownerBinding', 'receipts',
      'revision', 'schemaVersion', 'sessionId', 'studyTarget', 'turns',
    ].sort());
    expect(JSON.stringify(stored)).not.toContain(ACTOR.authUid);
    expect(JSON.stringify(stored)).not.toContain(ACTOR.stableAccountId);
    expect(JSON.stringify(stored)).not.toMatch(/scenario|task|rank|completion|persona|model|history|path|audio/i);
  });

  it('rejects scenario-mode identifiers and records before producing', async () => {
    const h = harness();
    const created = await h.service.createSession(ACTOR, TARGET);
    const producer = jest.fn(async () => 'Entendido.');

    await expect(h.service.runTurn(
      ACTOR,
      { ...request(created.sessionId), sessionId: `d2s_${'S'.repeat(32)}` },
      producer,
    )).rejects.toEqual(new DialogueV2FreeformSessionLedgerError('request_invalid'));
    await expect(h.service.runTurn(
      ACTOR,
      { ...request(created.sessionId), turnId: `d2t_${'T'.repeat(16)}` },
      producer,
    )).rejects.toEqual(new DialogueV2FreeformSessionLedgerError('request_invalid'));

    h.repository.records.set(created.sessionId, {
      schemaVersion: 1,
      sessionId: created.sessionId,
      ownerBinding: 'a'.repeat(64),
      studyTarget: 'es',
      scenarioId: 'work_01',
      createdAtMs: h.now(),
      expiresAtMs: h.now() + DIALOGUE_V2_FREEFORM_SESSION_TTL_MS,
      revision: 1,
      turns: [],
      receipts: [],
    } as unknown as DialogueV2FreeformSessionLedgerRecord);
    await expect(h.service.runTurn(ACTOR, request(created.sessionId), producer))
      .rejects.toEqual(new DialogueV2FreeformSessionLedgerError('ledger_unavailable'));
    expect(producer).not.toHaveBeenCalled();
  });

  it('rejects owner and immutable study-target mismatches before producing', async () => {
    const h = harness();
    const created = await h.service.createSession(ACTOR, TARGET);
    const producer = jest.fn(async () => 'Entendido.');

    await expect(h.service.runTurn(
      { authUid: 'other-auth', stableAccountId: 'other-stable' },
      request(created.sessionId),
      producer,
    )).rejects.toEqual(new DialogueV2FreeformSessionLedgerError('access_denied'));
    await expect(h.service.runTurn(
      ACTOR,
      request(created.sessionId, 1, { studyTarget: 'de' }),
      producer,
    )).rejects.toEqual(new DialogueV2FreeformSessionLedgerError('selection_mismatch'));
    expect(producer).not.toHaveBeenCalled();
  });

  it('replays the exact completed turn once and rejects conflicting reuse', async () => {
    const h = harness();
    const created = await h.service.createSession(ACTOR, TARGET);
    const producer = jest.fn(async () => 'Claro, seguimos desde aquí.');
    const input = request(created.sessionId);

    const first = await h.service.runTurn(ACTOR, input, producer);
    const replay = await h.service.runTurn(ACTOR, input, producer);

    expect(first).toEqual({
      ok: true,
      kind: 'new',
      sessionId: created.sessionId,
      turnId: turnId(1),
      assistantMessage: 'Claro, seguimos desde aquí.',
      expiresAtMs: created.expiresAtMs,
    });
    expect(replay).toEqual({ ...first, kind: 'replay' });
    expect(producer).toHaveBeenCalledTimes(1);
    expect(h.digestNamespaces).toEqual([
      DIALOGUE_V2_FREEFORM_TURN_HMAC_NAMESPACE,
      DIALOGUE_V2_FREEFORM_TURN_HMAC_NAMESPACE,
    ]);
    expect(DIALOGUE_V2_FREEFORM_TURN_HMAC_NAMESPACE).not.toBe('dialogue-v2-turn.v1');

    await expect(h.service.runTurn(
      ACTOR,
      request(created.sessionId, 1, { userMessage: 'Otro contenido.' }),
      producer,
    )).rejects.toEqual(new DialogueV2FreeformSessionLedgerError('turn_conflict'));
    expect(producer).toHaveBeenCalledTimes(1);
  });

  it('passes only bounded same-session raw turns and expires at the TTL boundary', async () => {
    const h = harness();
    const created = await h.service.createSession(ACTOR, TARGET);
    for (let index = 1; index <= 9; index += 1) {
      await h.service.runTurn(ACTOR, request(created.sessionId, index), async (input) => {
        expect(input.priorTurns.length).toBeLessThanOrEqual(DIALOGUE_V2_FREEFORM_SESSION_MAX_RAW_TURNS);
        expect(Buffer.byteLength(JSON.stringify(input.priorTurns), 'utf8'))
          .toBeLessThanOrEqual(DIALOGUE_V2_FREEFORM_SESSION_MAX_RAW_BYTES);
        return `Respuesta ${index}`;
      });
    }
    const stored = h.repository.records.get(created.sessionId);
    expect(stored?.turns).toHaveLength(8);
    expect(stored?.turns.map((turn) => turn.turnId)).toEqual(
      Array.from({ length: 8 }, (_, offset) => turnId(offset + 2)),
    );
    expect(Buffer.byteLength(JSON.stringify(stored?.turns), 'utf8'))
      .toBeLessThanOrEqual(DIALOGUE_V2_FREEFORM_SESSION_MAX_RAW_BYTES);

    await expect(h.service.runTurn(ACTOR, request(created.sessionId, 1), async () => 'No.'))
      .rejects.toEqual(new DialogueV2FreeformSessionLedgerError('turn_replay_expired'));

    h.advance(DIALOGUE_V2_FREEFORM_SESSION_TTL_MS);
    await expect(h.service.runTurn(ACTOR, request(created.sessionId, 10), async () => 'No.'))
      .rejects.toEqual(new DialogueV2FreeformSessionLedgerError('session_expired'));
  });

  it('evicts by serialized byte size and exposes only coded errors', async () => {
    const h = harness();
    const created = await h.service.createSession(ACTOR, TARGET);
    const large = 'a'.repeat(1_450);
    for (let index = 1; index <= 6; index += 1) {
      await h.service.runTurn(
        ACTOR,
        request(created.sessionId, index, { userMessage: `${index}${large}` }),
        async () => `${index}${large}`,
      );
    }
    const stored = h.repository.records.get(created.sessionId);
    expect((stored?.turns.length ?? 0)).toBeLessThan(6);
    expect(Buffer.byteLength(JSON.stringify(stored?.turns), 'utf8'))
      .toBeLessThanOrEqual(DIALOGUE_V2_FREEFORM_SESSION_MAX_RAW_BYTES);

    const secret = 'do-not-leak-this-message';
    let caught: unknown;
    try {
      await h.service.runTurn(
        ACTOR,
        request(created.sessionId, 7, { userMessage: secret }),
        async () => { throw new Error(secret); },
      );
    } catch (error) {
      caught = error;
    }
    expect(caught).toEqual(new DialogueV2FreeformSessionLedgerError('turn_execution_failed'));
    expect(JSON.stringify(caught)).not.toContain(secret);
    expect(String(caught)).not.toContain(secret);
  });
});
