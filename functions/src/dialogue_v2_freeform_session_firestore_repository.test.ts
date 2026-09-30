import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { types as nodeTypes } from 'node:util';
import { ModuleKind, ScriptTarget, transpileModule } from 'typescript';

import {
  createDialogueV2FreeformAuthorizedStartRepository,
  createDialogueV2FreeformAuthorizedTurnRepository,
  createDialogueV2FreeformSessionFirestoreRepository,
} from './dialogue_v2_freeform_session_firestore_repository';
import {
  DIALOGUE_V2_FREEFORM_OWNER_HMAC_NAMESPACE,
  DIALOGUE_V2_FREEFORM_TURN_HMAC_NAMESPACE,
  createDialogueV2FreeformSessionLedger,
  DialogueV2FreeformSessionLedgerError,
  type DialogueV2FreeformSessionActor,
  type DialogueV2FreeformSessionLedgerRecord,
} from './dialogue_v2_freeform_session_ledger';

const NOW_MS = Date.UTC(2026, 8, 27, 12, 0, 0);
const ACTOR: DialogueV2FreeformSessionActor = Object.freeze({
  authUid: 'auth-user',
  stableAccountId: 'stable-user',
});
const OTHER_ACTOR: DialogueV2FreeformSessionActor = Object.freeze({
  authUid: 'auth-other',
  stableAccountId: 'stable-other',
});
const SESSION_ID = `d2fs_${'S'.repeat(32)}`;
const TURN_ID = `d2ft_${'T'.repeat(16)}`;
const COLLECTION = 'dialogue_v2_freeform_sessions';
const REPLY_TEXT = 'Claro, empecemos con una presentación breve.';
const completionOperationId = createHash('sha256')
  .update(SESSION_ID, 'utf8')
  .update('\u0000')
  .update(TURN_ID, 'utf8')
  .digest('hex');
const COMPLETION_PATH = (
  `users/${ACTOR.stableAccountId}/dialogue_v2_bot_voice_claims/`
  + `completion_${completionOperationId}`
);

class FakeTimestamp {
  constructor(private readonly millis: number) {}

  toMillis(): number {
    return this.millis;
  }
}

type FakeRef = Readonly<{ path: string }>;
type Stored = Record<string, unknown>;

class FakeFirestore {
  readonly documents = new Map<string, Stored>();
  readonly transactionReads: string[][] = [];
  readonly transactionWrites: string[][] = [];

  collection(collectionPath: string) {
    return {
      doc: (id: string): FakeRef => ({ path: `${collectionPath}/${id}` }),
    };
  }

  async runTransaction<T>(operation: (transaction: {
    get(ref: FakeRef): Promise<Readonly<{ exists: boolean; data(): unknown }>>;
    create(ref: FakeRef, value: Stored): void;
    set(ref: FakeRef, value: Stored): void;
  }) => Promise<T>): Promise<T> {
    const reads: string[] = [];
    const writes: string[] = [];
    const staged = new Map<string, Stored>();
    try {
      const result = await operation({
        get: async (ref) => {
          reads.push(ref.path);
          const value = this.documents.get(ref.path);
          return { exists: value !== undefined, data: () => value };
        },
        create: (ref, value) => {
          if (this.documents.has(ref.path) || staged.has(ref.path)) {
            throw new Error('already_exists');
          }
          writes.push(`create:${ref.path}`);
          staged.set(ref.path, { ...value });
        },
        set: (ref, value) => {
          writes.push(`set:${ref.path}`);
          staged.set(ref.path, { ...value });
        },
      });
      for (const [path, value] of staged) this.documents.set(path, value);
      return result;
    } finally {
      this.transactionReads.push(reads);
      this.transactionWrites.push(writes);
    }
  }
}

function ownerBinding(actor: DialogueV2FreeformSessionActor): string {
  return createHash('sha256')
    .update(DIALOGUE_V2_FREEFORM_OWNER_HMAC_NAMESPACE)
    .update('\u0000')
    .update(actor.authUid)
    .update('\u0000')
    .update(actor.stableAccountId)
    .digest('hex');
}

function seedActiveAccount(db: FakeFirestore, actor = ACTOR): void {
  db.documents.set(`auth_links/${actor.authUid}`, { stable_id: actor.stableAccountId });
  db.documents.set(`users/${actor.stableAccountId}`, { firebaseAuthUid: actor.authUid });
}

function makeRepository(
  db: FakeFirestore,
  actor = ACTOR,
  nowMs = () => NOW_MS,
) {
  return createDialogueV2FreeformSessionFirestoreRepository({
    db: db as never,
    nowMs,
    bindOwner: ({ namespace, actor: candidate }) => {
      expect(namespace).toBe(DIALOGUE_V2_FREEFORM_OWNER_HMAC_NAMESPACE);
      return ownerBinding(candidate);
    },
    timestampFromMillis: (millis) => new FakeTimestamp(millis) as never,
  }, actor);
}

function record(
  actor = ACTOR,
  overrides: Partial<DialogueV2FreeformSessionLedgerRecord> = {},
): DialogueV2FreeformSessionLedgerRecord {
  return Object.freeze({
    schemaVersion: 1,
    kind: 'dialogue_v2_plus_freeform',
    sessionId: SESSION_ID,
    ownerBinding: ownerBinding(actor),
    studyTarget: 'es',
    createdAtMs: NOW_MS,
    expiresAtMs: NOW_MS + 24 * 60 * 60 * 1_000,
    revision: 1,
    turns: Object.freeze([]),
    receipts: Object.freeze([]),
    ...overrides,
  });
}

function storedRecord(value: DialogueV2FreeformSessionLedgerRecord): Stored {
  return {
    schemaVersion: value.schemaVersion,
    kind: value.kind,
    sessionId: value.sessionId,
    ownerBinding: value.ownerBinding,
    studyTarget: value.studyTarget,
    createdAt: new FakeTimestamp(value.createdAtMs),
    expiresAt: new FakeTimestamp(value.expiresAtMs),
    revision: value.revision,
    turns: value.turns,
    receipts: value.receipts,
  };
}

function pendingRecord(): DialogueV2FreeformSessionLedgerRecord {
  return record(ACTOR, {
    revision: 2,
    receipts: Object.freeze([{
      turnId: TURN_ID,
      requestDigest: 'b'.repeat(64),
      claimToken: `d2fc_${'C'.repeat(32)}`,
      claimExpiresAtMs: NOW_MS + 30_000,
      state: 'pending',
    }]),
  });
}

function finalizePendingTurn(
  current: DialogueV2FreeformSessionLedgerRecord,
): DialogueV2FreeformSessionLedgerRecord {
  return Object.freeze({
    ...current,
    revision: current.revision + 1,
    turns: Object.freeze([...current.turns, Object.freeze({
      turnId: TURN_ID,
      userMessage: '¿Podemos practicar una conversación informal?',
      assistantMessage: REPLY_TEXT,
    })]),
    receipts: Object.freeze(current.receipts.map((receipt) => (
      receipt.turnId === TURN_ID
        ? Object.freeze({ ...receipt, state: 'completed' as const })
        : receipt
    ))),
  });
}

async function runAuthorizedFinalization(
  db: FakeFirestore,
  transition: (
    current: DialogueV2FreeformSessionLedgerRecord,
  ) => DialogueV2FreeformSessionLedgerRecord = finalizePendingTurn,
) {
  return db.runTransaction(async (transaction) => {
    let active = true;
    const repository = createDialogueV2FreeformAuthorizedTurnRepository({
      db: db as never,
      nowMs: () => NOW_MS,
      bindOwner: ({ actor }) => ownerBinding(actor),
      timestampFromMillis: (millis) => new FakeTimestamp(millis) as never,
    }, () => {
      if (!active) {
        throw new Error('dialogue_v2_freeform_repository_authorization_required');
      }
      return {
        actor: ACTOR,
        transaction: transaction as never,
        nowMs: NOW_MS,
      };
    });
    try {
      return await repository.mutate(
        SESSION_ID,
        (stored) => transition(stored as DialogueV2FreeformSessionLedgerRecord),
      );
    } finally {
      active = false;
    }
  });
}

describe('Dialogue V2 freeform Firestore session repository', () => {
  it('captures crypto and proxy primitives once at module load', () => {
    const source = readFileSync(
      path.join(__dirname, 'dialogue_v2_freeform_session_firestore_repository.ts'),
      'utf8',
    );
    const emitted = transpileModule(source, {
      compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2020 },
    }).outputText;

    expect(emitted).toMatch(/const createSha256Hash = node_crypto_1\.createHash;/);
    expect(emitted.match(/node_crypto_1\.createHash/g)).toHaveLength(1);
    expect(emitted).toMatch(/const isProxyObject = node_util_1\.types\.isProxy;/);
    expect(emitted.match(/node_util_1\.types\.isProxy/g)).toHaveLength(1);
    expect(emitted).toMatch(
      /const freeformStudyTargets = Object\.freeze\(\[\.\.\.dialogue_v2_language_pack_contract_1\.DIALOGUE_V2_STUDY_TARGETS\]\);/,
    );
    expect(emitted.match(
      /dialogue_v2_language_pack_contract_1\.DIALOGUE_V2_STUDY_TARGETS/g,
    )).toHaveLength(1);
    expect(emitted).toMatch(
      /const freeformOwnerHmacNamespace = dialogue_v2_freeform_session_ledger_1\.DIALOGUE_V2_FREEFORM_OWNER_HMAC_NAMESPACE;/,
    );
    expect(emitted.match(
      /dialogue_v2_freeform_session_ledger_1\.DIALOGUE_V2_FREEFORM_OWNER_HMAC_NAMESPACE/g,
    )).toHaveLength(1);
  });

  it('ignores a hostile post-load replacement of the proxy primitive', async () => {
    const mutableTypes = nodeTypes as unknown as Record<string, unknown>;
    const originalIsProxy = mutableTypes.isProxy;
    const injectedIsProxy = jest.fn(() => true);
    const db = new FakeFirestore();
    db.documents.set(`${COLLECTION}/${SESSION_ID}`, storedRecord(pendingRecord()));
    mutableTypes.isProxy = injectedIsProxy;

    try {
      await expect(runAuthorizedFinalization(db)).resolves.toMatchObject({ revision: 3 });
      expect(injectedIsProxy).not.toHaveBeenCalled();
    } finally {
      mutableTypes.isProxy = originalIsProxy;
    }
  });

  it('atomically creates exact trusted completion evidence with the final turn commit', async () => {
    const db = new FakeFirestore();
    db.documents.set(`${COLLECTION}/${SESSION_ID}`, storedRecord(pendingRecord()));

    await expect(runAuthorizedFinalization(db)).resolves.toMatchObject({
      revision: 3,
      receipts: [expect.objectContaining({ turnId: TURN_ID, state: 'completed' })],
    });

    expect(db.transactionReads).toEqual([[
      `${COLLECTION}/${SESSION_ID}`,
      COMPLETION_PATH,
    ]]);
    expect(db.transactionWrites).toEqual([[
      `create:${COMPLETION_PATH}`,
      `set:${COLLECTION}/${SESSION_ID}`,
    ]]);
    const evidence = db.documents.get(COMPLETION_PATH);
    expect(Object.keys(evidence ?? {}).sort()).toEqual([
      'completedAt', 'expiresAt', 'replyTextSha256', 'schemaVersion',
      'sessionId', 'studyTarget', 'turnId',
    ].sort());
    expect(evidence).toEqual({
      schemaVersion: 1,
      sessionId: SESSION_ID,
      turnId: TURN_ID,
      studyTarget: 'es',
      replyTextSha256: createHash('sha256').update(REPLY_TEXT, 'utf8').digest('hex'),
      completedAt: expect.any(FakeTimestamp),
      expiresAt: expect.any(FakeTimestamp),
    });
    expect((evidence?.completedAt as FakeTimestamp).toMillis()).toBe(NOW_MS);
    expect((evidence?.expiresAt as FakeTimestamp).toMillis())
      .toBe(pendingRecord().expiresAtMs);
    expect(JSON.stringify(evidence)).not.toMatch(
      /Claro|Podemos|audio|asset|uri|path|auth-user|stable-user/i,
    );
  });

  it('accepts the same durable proof idempotently and never rewrites it', async () => {
    const db = new FakeFirestore();
    db.documents.set(`${COLLECTION}/${SESSION_ID}`, storedRecord(pendingRecord()));
    const exactEvidence = {
      schemaVersion: 1,
      sessionId: SESSION_ID,
      turnId: TURN_ID,
      studyTarget: 'es',
      replyTextSha256: createHash('sha256').update(REPLY_TEXT, 'utf8').digest('hex'),
      completedAt: new FakeTimestamp(NOW_MS),
      expiresAt: new FakeTimestamp(pendingRecord().expiresAtMs),
    };
    db.documents.set(COMPLETION_PATH, exactEvidence);

    await expect(runAuthorizedFinalization(db)).resolves.toMatchObject({ revision: 3 });

    expect(db.transactionWrites[0]).toEqual([`set:${COLLECTION}/${SESSION_ID}`]);
    expect(db.documents.get(COMPLETION_PATH)).toBe(exactEvidence);
  });

  it.each([
    ['digest mismatch', { replyTextSha256: 'f'.repeat(64) }],
    ['expiry mismatch', { expiresAt: new FakeTimestamp(pendingRecord().expiresAtMs - 1) }],
    ['widened evidence', { rawAssistantText: REPLY_TEXT }],
  ] as const)('fails closed without any write for existing %s', async (_label, poison) => {
    const db = new FakeFirestore();
    const sessionBefore = storedRecord(pendingRecord());
    db.documents.set(`${COLLECTION}/${SESSION_ID}`, sessionBefore);
    const evidenceBefore = {
      schemaVersion: 1,
      sessionId: SESSION_ID,
      turnId: TURN_ID,
      studyTarget: 'es',
      replyTextSha256: createHash('sha256').update(REPLY_TEXT, 'utf8').digest('hex'),
      completedAt: new FakeTimestamp(NOW_MS),
      expiresAt: new FakeTimestamp(pendingRecord().expiresAtMs),
      ...poison,
    };
    db.documents.set(COMPLETION_PATH, evidenceBefore);

    await expect(runAuthorizedFinalization(db))
      .rejects.toThrow('dialogue_v2_freeform_completion_evidence_conflict');

    expect(db.transactionWrites[0]).toEqual([]);
    expect(db.documents.get(`${COLLECTION}/${SESSION_ID}`)).toBe(sessionBefore);
    expect(db.documents.get(COMPLETION_PATH)).toBe(evidenceBefore);
  });

  it.each([
    ['pending claim refresh', (current: DialogueV2FreeformSessionLedgerRecord) => ({
      ...current,
      revision: current.revision + 1,
      receipts: current.receipts.map((receipt) => ({
        ...receipt,
        claimExpiresAtMs: receipt.claimExpiresAtMs + 1_000,
      })),
    })],
    ['failed claim removal', (current: DialogueV2FreeformSessionLedgerRecord) => ({
      ...current,
      revision: current.revision + 1,
      receipts: [],
    })],
  ] as const)('writes no completion evidence for %s', async (_label, transition) => {
    const db = new FakeFirestore();
    db.documents.set(`${COLLECTION}/${SESSION_ID}`, storedRecord(pendingRecord()));

    await expect(runAuthorizedFinalization(
      db,
      transition as (current: DialogueV2FreeformSessionLedgerRecord) => (
        DialogueV2FreeformSessionLedgerRecord
      ),
    )).resolves.toBeDefined();

    expect(db.documents.has(COMPLETION_PATH)).toBe(false);
    expect(db.transactionReads[0]).toEqual([`${COLLECTION}/${SESSION_ID}`]);
    expect(db.transactionWrites[0]).toEqual([`set:${COLLECTION}/${SESSION_ID}`]);
  });

  it('creates a distinct bounded server-only record after all authority fences', async () => {
    const db = new FakeFirestore();
    seedActiveAccount(db);
    const repository = makeRepository(db);

    await expect(repository.createIfAbsent(record())).resolves.toEqual(record());

    const path = `${COLLECTION}/${SESSION_ID}`;
    const stored = db.documents.get(path);
    expect(Object.keys(stored ?? {}).sort()).toEqual([
      'createdAt', 'expiresAt', 'kind', 'ownerBinding', 'receipts', 'revision',
      'schemaVersion', 'sessionId', 'studyTarget', 'turns',
    ].sort());
    expect(stored?.createdAt).toBeInstanceOf(FakeTimestamp);
    expect(stored?.expiresAt).toBeInstanceOf(FakeTimestamp);
    expect(JSON.stringify(stored)).not.toContain(ACTOR.authUid);
    expect(JSON.stringify(stored)).not.toContain(ACTOR.stableAccountId);
    for (const forbidden of [
      'audioUri', 'clientPath', 'scenarioId', 'taskId', 'rank', 'completion', 'terminal',
    ]) {
      expect(stored).not.toHaveProperty(forbidden);
    }
    expect(db.documents.has(`dialogue_v2_sessions/${SESSION_ID}`)).toBe(false);
    expect(db.transactionReads).toEqual([expect.arrayContaining([
      path,
      `auth_links/${ACTOR.authUid}`,
      `users/${ACTOR.stableAccountId}`,
      `account_deletion_auth_markers/${ACTOR.authUid}`,
      `account_deletion_tombstones/${ACTOR.stableAccountId}`,
    ])]);
    expect(db.transactionReads[0]).toHaveLength(7);
    expect(db.transactionWrites[0]).toEqual([`create:${path}`]);
  });

  it('rejects a non-verifier authorization input before any session read or write', () => {
    const db = new FakeFirestore();
    seedActiveAccount(db);

    expect(() => createDialogueV2FreeformAuthorizedStartRepository({
      db: db as never,
      nowMs: () => NOW_MS,
      bindOwner: ({ actor }) => ownerBinding(actor),
      timestampFromMillis: (millis) => new FakeTimestamp(millis) as never,
    }, {
      actor: ACTOR,
      transaction: {},
      nowMs: NOW_MS,
      isForDatabase: () => true,
    } as never)).toThrow('dialogue_v2_freeform_repository_authorization_required');
    expect(db.transactionReads).toEqual([]);
    expect(db.transactionWrites).toEqual([]);
  });

  it('runs the reviewed ledger with exact replay and no second producer or replay write', async () => {
    const db = new FakeFirestore();
    seedActiveAccount(db);
    let claimCounter = 0;
    const service = createDialogueV2FreeformSessionLedger({
      repository: makeRepository(db),
      nowMs: () => NOW_MS,
      generateSessionId: () => SESSION_ID,
      generateClaimToken: () => `d2fc_${String(++claimCounter).padStart(32, 'C')}`,
      bindOwner: ({ namespace, actor }) => {
        expect(namespace).toBe(DIALOGUE_V2_FREEFORM_OWNER_HMAC_NAMESPACE);
        return ownerBinding(actor);
      },
      digestTurnRequest: ({ namespace, request }) => {
        expect(namespace).toBe(DIALOGUE_V2_FREEFORM_TURN_HMAC_NAMESPACE);
        return createHash('sha256').update(JSON.stringify(request)).digest('hex');
      },
    });
    await service.createSession(ACTOR, { studyTarget: 'es' });
    const request = Object.freeze({
      sessionId: SESSION_ID,
      turnId: TURN_ID,
      studyTarget: 'es' as const,
      userMessage: '¿Podemos practicar una conversación informal?',
    });
    const producer = jest.fn(async () => 'Claro, empecemos con una presentación breve.');

    const first = await service.runTurn(ACTOR, request, producer);
    const writesAfterFirst = db.transactionWrites.flat().length;
    const replay = await service.runTurn(ACTOR, request, producer);

    expect(first).toMatchObject({ kind: 'new', sessionId: SESSION_ID, turnId: TURN_ID });
    expect(replay).toEqual({ ...first, kind: 'replay' });
    expect(producer).toHaveBeenCalledTimes(1);
    expect(db.transactionWrites.flat()).toHaveLength(writesAfterFirst);
    expect(db.transactionWrites.at(-1)).toEqual([]);
    for (const reads of db.transactionReads) {
      expect(reads).toHaveLength(7);
      expect(reads).toEqual(expect.arrayContaining([
        `${COLLECTION}/${SESSION_ID}`,
        `auth_links/${ACTOR.authUid}`,
        `users/${ACTOR.stableAccountId}`,
        `account_deletion_auth_markers/${ACTOR.authUid}`,
        `account_deletion_tombstones/${ACTOR.stableAccountId}`,
      ]));
    }
  });

  it('fails closed on turn conflict, wrong owner, wrong target, and expiry', async () => {
    const db = new FakeFirestore();
    seedActiveAccount(db);
    seedActiveAccount(db, OTHER_ACTOR);
    const repository = makeRepository(db);
    await repository.createIfAbsent(record());

    await expect(repository.mutate(SESSION_ID, (current) => ({
      ...(current as DialogueV2FreeformSessionLedgerRecord),
      revision: 2,
      studyTarget: 'de',
    }))).rejects.toThrow('dialogue_v2_freeform_storage_invalid');
    await expect(makeRepository(db, OTHER_ACTOR).mutate(SESSION_ID, (current) => (
      current as DialogueV2FreeformSessionLedgerRecord
    ))).rejects.toEqual(new DialogueV2FreeformSessionLedgerError('access_denied'));
    await expect(makeRepository(db, ACTOR, () => record().expiresAtMs).mutate(
      SESSION_ID,
      (current) => current as DialogueV2FreeformSessionLedgerRecord,
    )).rejects.toEqual(new DialogueV2FreeformSessionLedgerError('session_expired'));

    const service = createDialogueV2FreeformSessionLedger({
      repository,
      nowMs: () => NOW_MS,
      generateSessionId: () => `d2fs_${'N'.repeat(32)}`,
      generateClaimToken: () => `d2fc_${'C'.repeat(32)}`,
      bindOwner: ({ actor }) => ownerBinding(actor),
      digestTurnRequest: ({ request }) => createHash('sha256')
        .update(JSON.stringify(request)).digest('hex'),
    });
    const firstRequest = {
      sessionId: SESSION_ID,
      turnId: TURN_ID,
      studyTarget: 'es',
      userMessage: 'Primer mensaje.',
    } as const;
    const wrongTargetProducer = jest.fn(async () => 'No debe ejecutarse.');
    await expect(service.runTurn(ACTOR, {
      ...firstRequest,
      studyTarget: 'de',
    }, wrongTargetProducer)).rejects.toEqual(
      new DialogueV2FreeformSessionLedgerError('selection_mismatch'),
    );
    expect(wrongTargetProducer).not.toHaveBeenCalled();
    await service.runTurn(ACTOR, firstRequest, async () => 'Primera respuesta.');
    await expect(service.runTurn(ACTOR, {
      ...firstRequest,
      userMessage: 'Contenido distinto.',
    }, async () => 'No debe ejecutarse.')).rejects.toEqual(
      new DialogueV2FreeformSessionLedgerError('turn_conflict'),
    );
  });

  it.each([
    ['missing auth link', (db: FakeFirestore) => db.documents.delete(
      `auth_links/${ACTOR.authUid}`,
    )],
    ['wrong auth link', (db: FakeFirestore) => db.documents.set(
      `auth_links/${ACTOR.authUid}`,
      { stable_id: 'stable-other' },
    )],
    ['wrong canonical owner', (db: FakeFirestore) => db.documents.set(
      `users/${ACTOR.stableAccountId}`,
      { firebaseAuthUid: 'auth-other' },
    )],
    ['auth deletion marker', (db: FakeFirestore) => db.documents.set(
      `account_deletion_auth_markers/${ACTOR.authUid}`,
      { status: 'deleted' },
    )],
    ['stable tombstone', (db: FakeFirestore) => db.documents.set(
      `account_deletion_tombstones/${ACTOR.stableAccountId}`,
      { status: 'deleted' },
    )],
  ] as const)('performs no write when %s fails its transaction fence', async (_label, poison) => {
    const db = new FakeFirestore();
    seedActiveAccount(db);
    poison(db);

    await expect(makeRepository(db).createIfAbsent(record())).rejects.toThrow();
    expect(db.transactionWrites.flat()).toEqual([]);
    expect(db.documents.has(`${COLLECTION}/${SESSION_ID}`)).toBe(false);
  });

  it('rejects client-like paths and malformed or widened stored records before writing', async () => {
    const db = new FakeFirestore();
    seedActiveAccount(db);
    const repository = makeRepository(db);
    await repository.createIfAbsent(record());
    const transactionCount = db.transactionReads.length;

    await expect(repository.mutate('users/victim', (value) => (
      value as DialogueV2FreeformSessionLedgerRecord
    ))).rejects.toThrow('dialogue_v2_freeform_repository_request_invalid');
    expect(db.transactionReads).toHaveLength(transactionCount);

    const path = `${COLLECTION}/${SESSION_ID}`;
    db.documents.set(path, {
      ...(db.documents.get(path) ?? {}),
      audioUri: 'file:///private/voice.m4a',
    });
    await expect(repository.mutate(SESSION_ID, (value) => (
      value as DialogueV2FreeformSessionLedgerRecord
    ))).rejects.toThrow('dialogue_v2_freeform_storage_invalid');
    expect(db.transactionWrites.at(-1)).toEqual([]);
  });
});
