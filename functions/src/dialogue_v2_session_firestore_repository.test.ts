import {
  createDialogueV2FirestoreSessionRepository,
} from './dialogue_v2_session_firestore_repository';
import type { DialogueV2SessionLedgerRecord } from './dialogue_v2_session_ledger';

class FakeTimestamp {
  constructor(private readonly millis: number) {}

  toMillis(): number {
    return this.millis;
  }
}

type FakeRef = Readonly<{ path: string }>;

class FakeFirestore {
  readonly documents = new Map<string, Record<string, unknown>>();

  collection(collectionPath: string) {
    return {
      doc: (id: string): FakeRef => ({ path: `${collectionPath}/${id}` }),
    };
  }

  async runTransaction<T>(operation: (transaction: {
    get(ref: FakeRef): Promise<Readonly<{ exists: boolean; data(): unknown }>>;
    create(ref: FakeRef, value: Record<string, unknown>): void;
    set(ref: FakeRef, value: Record<string, unknown>): void;
  }) => Promise<T>): Promise<T> {
    const staged = new Map<string, Record<string, unknown>>();
    const result = await operation({
      get: async (ref) => ({
        exists: this.documents.has(ref.path),
        data: () => this.documents.get(ref.path),
      }),
      create: (ref, value) => { staged.set(ref.path, { ...value }); },
      set: (ref, value) => { staged.set(ref.path, { ...value }); },
    });
    for (const [path, value] of staged) this.documents.set(path, value);
    return result;
  }
}

const RECORD: DialogueV2SessionLedgerRecord = Object.freeze({
  schemaVersion: 1,
  sessionId: `d2s_${'S'.repeat(32)}`,
  ownerBinding: 'a'.repeat(64),
  studyTarget: 'de',
  scenarioId: 'work_01',
  createdAtMs: Date.UTC(2026, 8, 27, 12, 0, 0),
  expiresAtMs: Date.UTC(2026, 8, 28, 12, 0, 0),
  revision: 1,
  groupState: Object.freeze({
    schemaVersion: 1 as const,
    turnCount: 0,
    lastSpeakerId: null,
    relevanceByPersonaId: Object.freeze({}),
  }),
  turns: Object.freeze([]),
  receipts: Object.freeze([]),
});

describe('Dialogue V2 Firestore session repository adapter', () => {
  it('stores only the reviewed physical fields and Timestamp-based 24h expiry', async () => {
    const db = new FakeFirestore();
    const repository = createDialogueV2FirestoreSessionRepository({
      db: db as never,
      timestampFromMillis: (millis) => new FakeTimestamp(millis) as never,
    });

    await expect(repository.createIfAbsent(RECORD)).resolves.toEqual(RECORD);

    const stored = db.documents.get(`dialogue_v2_sessions/${RECORD.sessionId}`);
    expect(Object.keys(stored ?? {}).sort()).toEqual([
      'createdAt', 'expiresAt', 'ownerBinding', 'receipts', 'revision',
      'scenarioId', 'schemaVersion', 'sessionId', 'studyTarget', 'turns', 'groupState',
    ].sort());
    expect(stored?.createdAt).toBeInstanceOf(FakeTimestamp);
    expect(stored?.expiresAt).toBeInstanceOf(FakeTimestamp);
    expect((stored?.expiresAt as FakeTimestamp).toMillis()).toBe(RECORD.expiresAtMs);
    expect(stored).not.toHaveProperty('createdAtMs');
    expect(stored).not.toHaveProperty('expiresAtMs');
    expect(JSON.stringify(stored)).not.toContain('auth-user');
    expect(JSON.stringify(stored)).not.toContain('stable-user');
  });

  it('atomically decodes, transitions, and re-encodes a record without extending TTL', async () => {
    const db = new FakeFirestore();
    const repository = createDialogueV2FirestoreSessionRepository({
      db: db as never,
      timestampFromMillis: (millis) => new FakeTimestamp(millis) as never,
    });
    await repository.createIfAbsent(RECORD);

    const committed = await repository.mutate(RECORD.sessionId, (current) => ({
      ...(current as DialogueV2SessionLedgerRecord),
      revision: 2,
    }));

    expect(committed).toMatchObject({ revision: 2, expiresAtMs: RECORD.expiresAtMs });
    const stored = db.documents.get(`dialogue_v2_sessions/${RECORD.sessionId}`);
    expect((stored?.expiresAt as FakeTimestamp).toMillis()).toBe(RECORD.expiresAtMs);
    expect(stored?.revision).toBe(2);
  });

  it('upgrades a strict legacy record without group state to the safe initial state on mutation', async () => {
    const db = new FakeFirestore();
    const repository = createDialogueV2FirestoreSessionRepository({
      db: db as never,
      timestampFromMillis: (millis) => new FakeTimestamp(millis) as never,
    });
    const path = `dialogue_v2_sessions/${RECORD.sessionId}`;
    db.documents.set(path, {
      schemaVersion: 1,
      sessionId: RECORD.sessionId,
      ownerBinding: RECORD.ownerBinding,
      studyTarget: RECORD.studyTarget,
      scenarioId: RECORD.scenarioId,
      createdAt: new FakeTimestamp(RECORD.createdAtMs),
      expiresAt: new FakeTimestamp(RECORD.expiresAtMs),
      revision: 1,
      turns: [],
      receipts: [],
    });

    const committed = await repository.mutate(RECORD.sessionId, (current) => ({
      ...(current as DialogueV2SessionLedgerRecord),
      revision: 2,
    }));

    expect((committed as DialogueV2SessionLedgerRecord).groupState).toEqual({
      schemaVersion: 1,
      turnCount: 0,
      lastSpeakerId: null,
      relevanceByPersonaId: {},
    });
    expect(db.documents.get(path)?.groupState).toEqual({
      schemaVersion: 1,
      turnCount: 0,
      lastSpeakerId: null,
      relevanceByPersonaId: {},
    });
  });

  it('round-trips canonical hyphenated persona IDs in current scheduling state', async () => {
    const db = new FakeFirestore();
    const repository = createDialogueV2FirestoreSessionRepository({
      db: db as never,
      timestampFromMillis: (millis) => new FakeTimestamp(millis) as never,
    });
    await repository.createIfAbsent({
      ...RECORD,
      groupState: {
        schemaVersion: 1,
        turnCount: 1,
        lastSpeakerId: 'team-lead',
        relevanceByPersonaId: { 'team-lead': 3 },
      },
    });

    await expect(repository.mutate(RECORD.sessionId, (current) => current as never))
      .resolves.toMatchObject({
        groupState: {
          lastSpeakerId: 'team-lead',
          relevanceByPersonaId: { 'team-lead': 3 },
        },
      });
  });

  it('rejects every mutation atomically once the authoritative terminal marker exists', async () => {
    const db = new FakeFirestore();
    const repository = createDialogueV2FirestoreSessionRepository({
      db: db as never,
      timestampFromMillis: (millis) => new FakeTimestamp(millis) as never,
    });
    await repository.createIfAbsent(RECORD);
    db.documents.set(`dialogue_v2_session_terminals/${RECORD.sessionId}`, {
      schemaVersion: 1,
      state: 'pending',
    });

    await expect(repository.mutate(RECORD.sessionId, (current) => {
      const record = current as DialogueV2SessionLedgerRecord;
      return { ...record, revision: record.revision + 1 };
    })).rejects.toMatchObject({ code: 'session_completed' });
    expect(db.documents.get(`dialogue_v2_sessions/${RECORD.sessionId}`)?.revision).toBe(1);
  });

  it('fails closed on collision, absence, malformed timestamps, or unknown stored fields', async () => {
    const db = new FakeFirestore();
    const repository = createDialogueV2FirestoreSessionRepository({
      db: db as never,
      timestampFromMillis: (millis) => new FakeTimestamp(millis) as never,
    });
    await repository.createIfAbsent(RECORD);
    await expect(repository.createIfAbsent(RECORD)).resolves.toBeNull();
    await expect(repository.mutate(`d2s_${'X'.repeat(32)}`, (value) => value as never))
      .resolves.toBeNull();

    const path = `dialogue_v2_sessions/${RECORD.sessionId}`;
    db.documents.set(path, {
      ...(db.documents.get(path) ?? {}),
      expiresAt: 'not-a-timestamp',
    });
    await expect(repository.mutate(RECORD.sessionId, (value) => value as never))
      .rejects.toThrow('dialogue_v2_session_storage_invalid');

    db.documents.set(path, {
      schemaVersion: 1,
      sessionId: RECORD.sessionId,
      ownerBinding: RECORD.ownerBinding,
      studyTarget: RECORD.studyTarget,
      scenarioId: RECORD.scenarioId,
      createdAt: new FakeTimestamp(RECORD.createdAtMs),
      expiresAt: new FakeTimestamp(RECORD.expiresAtMs),
      revision: 1,
      turns: [],
      receipts: [],
      leakedHistory: [],
    });
    await expect(repository.mutate(RECORD.sessionId, (value) => value as never))
      .rejects.toThrow('dialogue_v2_session_storage_invalid');
  });
});
