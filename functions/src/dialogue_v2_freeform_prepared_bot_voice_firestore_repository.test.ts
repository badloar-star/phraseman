import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { types as nodeTypes } from 'node:util';
import { ModuleKind, ScriptTarget, transpileModule } from 'typescript';

import { accountDeletePermanentDenialId } from './account_delete_job';
import {
  createDialogueV2FreeformPreparedBotVoiceFirestoreRepository,
} from './dialogue_v2_freeform_prepared_bot_voice_firestore_repository';

const NOW_MS = Date.UTC(2026, 8, 27, 12, 0, 0);
const AUTH_UID = 'auth-user';
const STABLE_ID = 'stable-user';
const SESSION_ID = `d2fs_${'S'.repeat(32)}`;
const TURN_ID = `d2ft_${'T'.repeat(16)}`;
const REPLY_TEXT = 'You expressed that very clearly.';
const OWNER_BINDING = 'o'.repeat(64);

const sha256 = (value: string): string => (
  createHash('sha256').update(value, 'utf8').digest('hex')
);
const operationId = sha256(`${SESSION_ID}\u0000${TURN_ID}`);
const completionPath = `users/${STABLE_ID}/dialogue_v2_bot_voice_claims/completion_${operationId}`;
const selectionPath = `users/${STABLE_ID}/dialogue_v2_bot_voice_claims/turn_${operationId}`;
const dailyPath = `users/${STABLE_ID}/dialogue_v2_bot_voice_claims/daily`;

class FakeTimestamp {
  constructor(readonly millis: number) {}

  toMillis(): number {
    return this.millis;
  }
}

type DocData = Record<string, unknown>;
type DocRef = Readonly<{ kind: 'doc'; path: string; id: string; collectionName: string }>;
type QueryRef = Readonly<{
  kind: 'query';
  collectionName: string;
  field: string;
  op: string;
  value: unknown;
  limitValue: number;
}>;

class FakeFirestore {
  readonly documents = new Map<string, DocData>();

  readonly transactionReads: string[][] = [];

  readonly transactionWrites: string[][] = [];

  transactionCount = 0;

  beforeTransaction: () => void = () => undefined;

  collection(collectionName: string) {
    return {
      doc: (id: string): DocRef => ({
        kind: 'doc',
        path: `${collectionName}/${id}`,
        id,
        collectionName,
      }),
      where: (field: string, op: string, value: unknown) => ({
        limit: (limitValue: number): QueryRef => ({
          kind: 'query', collectionName, field, op, value, limitValue,
        }),
      }),
    };
  }

  async runTransaction<T>(operation: (transaction: {
    get(reference: DocRef | QueryRef): Promise<unknown>;
    getAll(...references: DocRef[]): Promise<unknown[]>;
    create(reference: DocRef, value: DocData): void;
    set(reference: DocRef, value: DocData): void;
    update(reference: DocRef, value: DocData): void;
    delete(reference: DocRef): void;
  }) => Promise<T>): Promise<T> {
    this.transactionCount += 1;
    this.beforeTransaction();
    const reads: string[] = [];
    const staged = new Map<string, DocData>();
    const snapshot = (ref: DocRef) => ({
      id: ref.id,
      exists: this.documents.has(ref.path),
      data: () => this.documents.get(ref.path),
      ref,
    });
    const get = async (reference: DocRef | QueryRef) => {
      if (reference.kind === 'doc') {
        reads.push(reference.path);
        return snapshot(reference);
      }
      reads.push(`query:${reference.collectionName}:${reference.field}:${String(reference.value)}`);
      const prefix = `${reference.collectionName}/`;
      const docs = [...this.documents.entries()]
        .filter(([path, data]) => (
          path.startsWith(prefix)
          && !path.slice(prefix.length).includes('/')
          && reference.op === '=='
          && reference.field.split('.').reduce<unknown>((current, segment) => (
            current && typeof current === 'object'
              ? (current as Record<string, unknown>)[segment]
              : undefined
          ), data) === reference.value
        ))
        .slice(0, reference.limitValue)
        .map(([path]) => snapshot({
          kind: 'doc', path, id: path.slice(prefix.length), collectionName: reference.collectionName,
        }));
      return { empty: docs.length === 0, docs };
    };
    try {
      const result = await operation({
        get,
        getAll: async (...references) => Promise.all(references.map((reference) => get(reference))),
        create: (reference, value) => {
          if (this.documents.has(reference.path) || staged.has(reference.path)) {
            throw new Error('already_exists');
          }
          staged.set(reference.path, { ...value });
        },
        set: (reference, value) => staged.set(reference.path, { ...value }),
        update: (reference, value) => staged.set(reference.path, { ...value }),
        delete: (reference) => staged.delete(reference.path),
      });
      this.transactionReads.push(reads);
      this.transactionWrites.push([...staged.keys()]);
      for (const [path, value] of staged) this.documents.set(path, value);
      return result;
    } catch (error) {
      this.transactionReads.push(reads);
      this.transactionWrites.push([]);
      throw error;
    }
  }
}

function releaseSha256(releaseId: string, entries: readonly Record<string, unknown>[]): string {
  return sha256(JSON.stringify([
    'dialogue_v2_freeform_prepared_bot_voice_catalog.v1',
    releaseId,
    entries.map((entry) => [
      entry.studyTarget, entry.voiceStyleId, entry.preparedResponseId, entry.responseKind,
      entry.replyText, entry.replyTextSha256, entry.assetKey, entry.assetSha256,
      entry.assetBytes, entry.durationMs, entry.mime,
    ]),
  ]));
}

function catalog() {
  const entries = [{
    studyTarget: 'en',
    voiceStyleId: 'warm_tutor_en',
    preparedResponseId: 'milestone_en_01',
    responseKind: 'milestone',
    replyText: REPLY_TEXT,
    replyTextSha256: sha256(REPLY_TEXT),
    assetKey: 'freeform_milestone_en_01',
    assetSha256: 'a'.repeat(64),
    assetBytes: 4_096,
    durationMs: 1_250,
    mime: 'audio/mpeg',
  }];
  const releaseId = 'freeform_voice_2026_09_27_01';
  return {
    schemaVersion: 'dialogue_v2_freeform_prepared_bot_voice_catalog.v1',
    releaseId,
    releaseSha256: releaseSha256(releaseId, entries),
    entries,
  };
}

function sessionDocument(receiptState = 'completed') {
  return {
    schemaVersion: 1,
    kind: 'dialogue_v2_plus_freeform',
    sessionId: SESSION_ID,
    ownerBinding: OWNER_BINDING,
    studyTarget: 'en',
    createdAt: new FakeTimestamp(NOW_MS - 60_000),
    expiresAt: new FakeTimestamp(NOW_MS + 60_000),
    revision: 2,
    turns: [{ turnId: TURN_ID, userMessage: 'Learner message.', assistantMessage: REPLY_TEXT }],
    receipts: [{
      turnId: TURN_ID,
      requestDigest: 'b'.repeat(64),
      claimToken: `d2fc_${'C'.repeat(32)}`,
      claimExpiresAtMs: NOW_MS + 30_000,
      state: receiptState,
    }],
  };
}

function activeDocuments(): Readonly<Record<string, DocData>> {
  return {
    [`auth_links/${AUTH_UID}`]: { stable_id: STABLE_ID },
    [`users/${STABLE_ID}`]: {
      firebaseAuthUid: AUTH_UID,
      progress: { premium_plan: 'monthly', premium_expiry: '0' },
    },
    [`dialogue_v2_freeform_sessions/${SESSION_ID}`]: sessionDocument(),
    [completionPath]: {
      schemaVersion: 1,
      sessionId: SESSION_ID,
      turnId: TURN_ID,
      studyTarget: 'en',
      replyTextSha256: sha256(REPLY_TEXT),
      completedAt: new FakeTimestamp(NOW_MS - 1_000),
      expiresAt: new FakeTimestamp(NOW_MS + 60_000),
    },
  };
}

function setup(
  serverCatalog: unknown = catalog(),
  bindOwner: (input: Readonly<{ namespace: string }>) => string = () => OWNER_BINDING,
) {
  const db = new FakeFirestore();
  for (const [path, value] of Object.entries(activeDocuments())) db.documents.set(path, value);
  const repository = createDialogueV2FreeformPreparedBotVoiceFirestoreRepository({
    db: db as never,
    nowMs: () => NOW_MS,
    bindOwner: bindOwner as never,
    computeEligibilityHmac: () => '0'.repeat(64),
    timestampFromMillis: (millis: number) => new FakeTimestamp(millis) as never,
    serverCatalog,
  });
  return { db, repository };
}

const request = Object.freeze({ sessionId: SESSION_ID, turnId: TURN_ID, studyTarget: 'en' });

describe('Dialogue V2 Freeform prepared bot voice Firestore repository', () => {
  it('declares Firestore TTL cleanup for expiring completion and selection documents', () => {
    const indexes = JSON.parse(readFileSync(
      path.resolve(__dirname, '../../firestore.indexes.json'),
      'utf8',
    )) as Readonly<{ fieldOverrides?: readonly unknown[] }>;

    expect(indexes.fieldOverrides).toEqual(expect.arrayContaining([{
      collectionGroup: 'dialogue_v2_bot_voice_claims',
      fieldPath: 'expiresAt',
      ttl: true,
      indexes: [],
    }]));
  });

  it('uses one transaction and writes no selection or daily claim with the default null catalog', async () => {
    const { db, repository } = setup(null);

    await expect(repository.resolveAfterCommittedTurn(AUTH_UID, request)).resolves.toBeNull();

    expect(db.transactionCount).toBe(1);
    expect(db.transactionWrites).toEqual([[]]);
    expect(db.documents.has(selectionPath)).toBe(false);
    expect(db.documents.has(dailyPath)).toBe(false);
  });

  it('atomically selects from a future reviewed catalog using separate trusted timing evidence', async () => {
    const { db, repository } = setup();

    const selection = await repository.resolveAfterCommittedTurn(AUTH_UID, request);

    expect(selection).toMatchObject({
      sessionId: SESSION_ID,
      turnId: TURN_ID,
      studyTarget: 'en',
      replyTextSha256: sha256(REPLY_TEXT),
    });
    expect(db.transactionWrites[0]).toEqual(expect.arrayContaining([selectionPath, dailyPath]));
    const persisted = JSON.stringify(db.documents.get(selectionPath));
    expect(persisted).not.toContain(REPLY_TEXT);
    expect(persisted).not.toMatch(/asset|audio|uri|path|auth-user|stable-user/i);
  });

  it('replays the exact persisted selection without rewriting or reclaiming', async () => {
    const { db, repository } = setup();
    const first = await repository.resolveAfterCommittedTurn(AUTH_UID, request);

    const replay = await repository.resolveAfterCommittedTurn(AUTH_UID, request);

    expect(replay).toEqual(first);
    expect(db.transactionWrites[1]).toEqual([]);
  });

  it('shares the scenario daily claim namespace and leaves a later Freeform turn text-only', async () => {
    const { db, repository } = setup();
    db.documents.set(dailyPath, {
      schemaVersion: 1,
      state: {
        dayKey: '2026-09-27',
        claimedCount: 1,
        claimedRequestId: 'scenario:already-claimed',
        claimedOperationFingerprint: 'd'.repeat(64),
      },
    });

    await expect(repository.resolveAfterCommittedTurn(AUTH_UID, request)).resolves.toBeNull();
    expect(db.transactionWrites).toEqual([[]]);
    expect(db.documents.has(selectionPath)).toBe(false);
  });

  it('fails closed on malformed shared daily state even while the catalog is disabled', async () => {
    const { db, repository } = setup(null);
    db.documents.set(dailyPath, {
      schemaVersion: 1,
      state: {
        dayKey: '2026-09-27',
        claimedCount: 2,
        claimedRequestId: 'scenario:bad-state',
        claimedOperationFingerprint: 'd'.repeat(64),
      },
    });

    await expect(repository.resolveAfterCommittedTurn(AUTH_UID, request))
      .rejects.toThrow('dialogue_v2_freeform_bot_voice_unavailable');
    expect(db.transactionWrites).toEqual([[]]);
  });

  it.each([
    ['owner rebind', (db: FakeFirestore) => {
      db.documents.set(`auth_links/${AUTH_UID}`, { stable_id: 'other-stable' });
      db.documents.set('users/other-stable', { firebaseAuthUid: AUTH_UID, progress: {} });
      db.documents.set(`users/${STABLE_ID}`, {
        firebaseAuthUid: 'detached-auth',
        progress: { premium_plan: 'monthly', premium_expiry: '0' },
      });
    }],
    ['Plus revoke', (db: FakeFirestore) => {
      db.documents.set(`users/${STABLE_ID}`, { firebaseAuthUid: AUTH_UID, progress: {} });
    }],
    ['auth deletion', (db: FakeFirestore) => {
      db.documents.set(`account_deletion_auth_markers/${AUTH_UID}`, { status: 'deleted' });
    }],
    ['stable deletion', (db: FakeFirestore) => {
      db.documents.set(`account_deletion_tombstones/${STABLE_ID}`, { status: 'deleted' });
    }],
  ] as const)('fails closed with no writes when %s races at the transaction boundary', async (
    _label,
    mutate,
  ) => {
    const { db, repository } = setup();
    db.beforeTransaction = () => mutate(db);

    await expect(repository.resolveAfterCommittedTurn(AUTH_UID, request))
      .rejects.toThrow('dialogue_v2_freeform_bot_voice_unavailable');
    expect(db.transactionCount).toBe(1);
    expect(db.transactionWrites).toEqual([[]]);
  });

  it.each([
    ['wrong target', { ...request, studyTarget: 'de' }],
    ['missing session', { ...request, sessionId: `d2fs_${'M'.repeat(32)}` }],
  ] as const)('fails closed for %s without a selection write', async (_label, input) => {
    const { db, repository } = setup();

    await expect(repository.resolveAfterCommittedTurn(AUTH_UID, input))
      .rejects.toThrow('dialogue_v2_freeform_bot_voice_unavailable');
    expect(db.transactionWrites).toEqual([[]]);
  });

  it.each(['pending', 'evicted'])(
    'rejects a %s receipt even when the turn text exists',
    async (state) => {
      const { db, repository } = setup();
      db.documents.set(`dialogue_v2_freeform_sessions/${SESSION_ID}`, sessionDocument(state));

      await expect(repository.resolveAfterCommittedTurn(AUTH_UID, request))
        .rejects.toThrow('dialogue_v2_freeform_bot_voice_unavailable');
      expect(db.transactionWrites).toEqual([[]]);
    },
  );

  it('keeps the current v1 turn text-only when trusted completion timing is absent', async () => {
    const { db, repository } = setup();
    db.documents.delete(completionPath);

    await expect(repository.resolveAfterCommittedTurn(AUTH_UID, request)).resolves.toBeNull();
    expect(db.transactionWrites).toEqual([[]]);
  });

  it('fails closed when trusted completion expiry differs from the committed session', async () => {
    const { db, repository } = setup();
    db.documents.set(completionPath, {
      ...db.documents.get(completionPath),
      expiresAt: new FakeTimestamp(NOW_MS + 59_999),
    });

    await expect(repository.resolveAfterCommittedTurn(AUTH_UID, request))
      .rejects.toThrow('dialogue_v2_freeform_bot_voice_unavailable');
    expect(db.transactionWrites).toEqual([[]]);
  });

  it('emits one load-time crypto capture instead of live CommonJS property reads', () => {
    const source = readFileSync(
      path.join(__dirname, 'dialogue_v2_freeform_prepared_bot_voice_firestore_repository.ts'),
      'utf8',
    );
    const emitted = transpileModule(source, {
      compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2020 },
    }).outputText;

    expect(emitted).toMatch(
      /const createSha256Hash = node_crypto_1\.createHash;/,
    );
    expect(emitted.match(/node_crypto_1\.createHash/g)).toHaveLength(1);
  });

  it('uses the load-time proxy primitive after a hostile post-load CJS replacement', async () => {
    const mutableTypes = nodeTypes as unknown as Record<string, unknown>;
    const originalIsProxy = mutableTypes.isProxy;
    const injectedIsProxy = jest.fn(() => true);
    const { repository } = setup();
    mutableTypes.isProxy = injectedIsProxy;

    try {
      await expect(repository.resolveAfterCommittedTurn(AUTH_UID, request))
        .resolves.toMatchObject({ sessionId: SESSION_ID, turnId: TURN_ID });
      expect(injectedIsProxy).not.toHaveBeenCalled();
    } finally {
      mutableTypes.isProxy = originalIsProxy;
    }
  });

  it('uses the load-time owner HMAC namespace after a hostile post-load CJS replacement', async () => {
    const ledgerExports = jest.requireActual<Record<string, unknown>>(
      './dialogue_v2_freeform_session_ledger',
    );
    const exportName = 'DIALOGUE_V2_FREEFORM_OWNER_HMAC_NAMESPACE';
    const original = ledgerExports[exportName];
    const bindOwner = jest.fn((input: Readonly<{ namespace: string }>) => {
      if (input.namespace !== 'dialogue_v2_plus_freeform_owner_v1') {
        throw new Error('forged_owner_namespace_used');
      }
      return OWNER_BINDING;
    });
    const { repository } = setup(catalog(), bindOwner);
    ledgerExports[exportName] = 'forged_owner_namespace_v999';

    try {
      await expect(repository.resolveAfterCommittedTurn(AUTH_UID, request))
        .resolves.toMatchObject({ sessionId: SESSION_ID, turnId: TURN_ID });
      expect(bindOwner).toHaveBeenCalledWith({
        namespace: 'dialogue_v2_plus_freeform_owner_v1',
        actor: { authUid: AUTH_UID, stableAccountId: STABLE_ID },
      });
    } finally {
      ledgerExports[exportName] = original;
    }
  });

  it('reads all authority, deletion, entitlement, session, completion and shared claim state together', async () => {
    const { db, repository } = setup(null);

    await repository.resolveAfterCommittedTurn(AUTH_UID, request);

    expect(db.transactionReads).toHaveLength(1);
    expect(db.transactionReads[0]).toEqual(expect.arrayContaining([
      `auth_links/${AUTH_UID}`,
      `users/${STABLE_ID}`,
      `account_deletion_auth_markers/${AUTH_UID}`,
      `account_deletion_permanent_denials/${accountDeletePermanentDenialId(AUTH_UID)}`,
      `account_deletion_tombstones/${STABLE_ID}`,
      `account_deletion_permanent_denials/${accountDeletePermanentDenialId(STABLE_ID)}`,
      `dialogue_v2_freeform_sessions/${SESSION_ID}`,
      completionPath,
      selectionPath,
      dailyPath,
    ]));
  });
});
