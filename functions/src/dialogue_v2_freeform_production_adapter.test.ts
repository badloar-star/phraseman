import { readFileSync } from 'node:fs';
import path from 'node:path';
import { HttpsError } from 'firebase-functions/v2/https';

import { accountIdIndexDocId } from './account_id';
import { accountDeletePermanentDenialId } from './account_delete_job';
import * as adapterModuleExports from './dialogue_v2_freeform_production_adapter';
import {
  createDialogueV2FreeformProductionAuthorizationHandler,
  runDialogueV2FreeformProductionAuthorizationTransaction,
  type DialogueV2FreeformAuthorizedStartRepositoryFactory,
  type DialogueV2FreeformAuthorizedTurnRepositoryFactory,
} from './dialogue_v2_freeform_production_adapter';
import {
  createDialogueV2FreeformAtomicSessionStarter,
} from './dialogue_v2_freeform_session_start_callable';
import {
  createDialogueV2FreeformAtomicSessionTurner,
} from './dialogue_v2_freeform_session_turn_callable';
import type {
  DialogueV2FreeformSessionLedgerRecord,
  DialogueV2FreeformSessionLedgerRepository,
} from './dialogue_v2_freeform_session_ledger';

type DocData = Record<string, unknown>;
type Store = Record<string, Record<string, DocData | undefined>>;

type DocRef = Readonly<{
  kind: 'doc';
  collectionName: string;
  id: string;
  path: string;
  get(): Promise<never>;
}>;

type QueryRef = Readonly<{
  kind: 'query';
  collectionName: string;
  field: string;
  op: string;
  value: unknown;
  limitValue: number;
  get(): Promise<never>;
}>;

function makeHarness(
  initial: Store,
  beforeTransaction: (store: Store) => void = () => undefined,
) {
  const store: Store = Object.fromEntries(
    Object.entries(initial).map(([collectionName, documents]) => [
      collectionName,
      { ...documents },
    ]),
  );
  const reads: string[] = [];
  const writes: string[] = [];
  const creates: Readonly<{ path: string; value: Record<string, unknown> }>[] = [];
  let transactionCount = 0;

  const snapshot = (id: string, data: DocData | undefined) => ({
    id,
    exists: data !== undefined,
    data: () => data,
  });
  const collection = (collectionName: string) => ({
    doc: (id: string): DocRef => ({
      kind: 'doc',
      collectionName,
      id,
      path: `${collectionName}/${id}`,
      get: async () => { throw new Error('outside_transaction_read'); },
    }),
    where: (field: string, op: string, value: unknown) => ({
      limit: (limitValue: number): QueryRef => ({
        kind: 'query',
        collectionName,
        field,
        op,
        value,
        limitValue,
        get: async () => { throw new Error('outside_transaction_read'); },
      }),
    }),
  });
  const transaction = {
    get: jest.fn(async (target: DocRef | QueryRef) => {
      reads.push(target.kind === 'doc'
        ? target.path
        : `query:${target.collectionName}:${target.field}:${String(target.value)}`);
      if (target.kind === 'doc') {
        return snapshot(target.id, store[target.collectionName]?.[target.id]);
      }
      const readField = (data: DocData, fieldPath: string): unknown => fieldPath
        .split('.')
        .reduce<unknown>((value, segment) => (
          value && typeof value === 'object'
            ? (value as Record<string, unknown>)[segment]
            : undefined
        ), data);
      const docs = Object.entries(store[target.collectionName] ?? {})
        .filter(([, data]) => (
          data !== undefined
          && target.op === '=='
          && readField(data, target.field) === target.value
        ))
        .slice(0, target.limitValue)
        .map(([id, data]) => snapshot(id, data));
      return { empty: docs.length === 0, docs };
    }),
    getAll: jest.fn(async (...refs: DocRef[]) => refs.map((ref) => (
      snapshot(ref.id, store[ref.collectionName]?.[ref.id])
    ))),
    create: jest.fn((ref: DocRef, value: Record<string, unknown>) => {
      writes.push('create');
      creates.push(Object.freeze({ path: ref.path, value }));
    }),
    set: jest.fn((ref: DocRef, value: Record<string, unknown>) => {
      writes.push('set');
      store[ref.collectionName] ??= {};
      store[ref.collectionName][ref.id] = value;
    }),
    update: jest.fn(() => writes.push('update')),
    delete: jest.fn(() => writes.push('delete')),
  };
  const db = {
    collection,
    runTransaction: jest.fn(async <T>(operation: (tx: typeof transaction) => Promise<T>) => {
      transactionCount += 1;
      beforeTransaction(store);
      return operation(transaction);
    }),
  };

  return {
    db,
    store,
    reads,
    writes,
    creates,
    transaction,
    get transactionCount() { return transactionCount; },
  };
}

class FakeTimestamp {
  constructor(readonly millis: number) {}

  toMillis(): number {
    return this.millis;
  }
}

function atomicStarter(harness: ReturnType<typeof makeHarness>) {
  const generateSessionId = jest.fn(() => `d2fs_${'S'.repeat(32)}`);
  const start = createDialogueV2FreeformAtomicSessionStarter({
    db: harness.db as never,
    nowMs: () => 2_000_000_000_000,
    generateSessionId,
    generateClaimToken: () => `d2fc_${'C'.repeat(32)}`,
    bindOwner: () => 'a'.repeat(64),
    digestTurnRequest: () => 'b'.repeat(64),
    timestampFromMillis: (millis) => new FakeTimestamp(millis) as never,
  });
  return { start, generateSessionId };
}

function authorizedRepositoryRuntime(harness: ReturnType<typeof makeHarness>) {
  return {
    db: harness.db as never,
    nowMs: () => 2_000_000_000_000,
    bindOwner: () => 'a'.repeat(64),
    timestampFromMillis: (millis: number) => new FakeTimestamp(millis) as never,
  };
}

function authorizedRecord(): DialogueV2FreeformSessionLedgerRecord {
  const nowMs = 2_000_000_000_000;
  return Object.freeze({
    schemaVersion: 1,
    kind: 'dialogue_v2_plus_freeform',
    sessionId: `d2fs_${'E'.repeat(32)}`,
    ownerBinding: 'a'.repeat(64),
    studyTarget: 'en',
    createdAtMs: nowMs,
    expiresAtMs: nowMs + 24 * 60 * 60 * 1_000,
    revision: 1,
    turns: Object.freeze([]),
    receipts: Object.freeze([]),
  });
}

function activeStore(extra: Store = {}): Store {
  return {
    account_deletion_auth_markers: {},
    account_deletion_tombstones: {},
    account_deletion_permanent_denials: {},
    auth_links: {},
    users: {},
    account_id_index: {},
    ...extra,
  };
}

function createHandler(harness: ReturnType<typeof makeHarness>) {
  return Reflect.apply(
    createDialogueV2FreeformProductionAuthorizationHandler,
    undefined,
    [{ db: harness.db, nowMs: () => 2_000_000_000_000 }],
  ) as ReturnType<typeof createDialogueV2FreeformProductionAuthorizationHandler>;
}

async function captureError(work: () => Promise<unknown>): Promise<HttpsError> {
  try {
    await work();
  } catch (error) {
    expect(error).toBeInstanceOf(HttpsError);
    return error as HttpsError;
  }
  throw new Error('expected_error');
}

describe('Dialogue V2 freeform atomic production authorization adapter', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('does not export the active-authorization verifier', () => {
    const adapterExports = adapterModuleExports as unknown as Record<string, unknown>;

    expect(adapterExports).not.toHaveProperty(
      'requireActiveDialogueV2FreeformAuthorization',
    );
  });

  test('does not trust a verifier injected into mutable CommonJS exports', async () => {
    const adapterExports = adapterModuleExports as unknown as Record<string, unknown>;
    const exportName = 'requireActiveDialogueV2FreeformAuthorization';
    const original = adapterExports[exportName];
    const injectedVerifier = jest.fn(() => {
      throw new Error('forged_export_verifier_used');
    });
    adapterExports[exportName] = injectedVerifier;
    const harness = makeHarness(activeStore({
      auth_links: { 'auth-user': { stable_id: 'stable-user' } },
      users: {
        'stable-user': {
          firebaseAuthUid: 'auth-user',
          progress: { premium_plan: 'monthly', premium_expiry: '0' },
        },
      },
    }));

    try {
      const { start } = atomicStarter(harness);
      await expect(start('auth-user', { studyTarget: 'en' })).resolves.toEqual({
        sessionId: `d2fs_${'S'.repeat(32)}`,
        expiresAtMs: 2_000_000_000_000 + 24 * 60 * 60 * 1_000,
      });
      expect(injectedVerifier).not.toHaveBeenCalled();
    } finally {
      if (original === undefined) delete adapterExports[exportName];
      else adapterExports[exportName] = original;
    }
  });

  test.each(['en', 'es', 'fr', 'de'] as const)(
    'authorizes exact Plus %s selection using only one read-only transaction',
    async (studyTarget) => {
      const harness = makeHarness(activeStore({
        auth_links: { 'auth-user': { stable_id: 'stable-user' } },
        users: {
          'stable-user': {
            firebaseAuthUid: 'auth-user',
            progress: { premium_plan: 'monthly', premium_expiry: '0' },
          },
        },
      }));

      await expect(createHandler(harness)({
        auth: { uid: 'auth-user' },
        data: { studyTarget },
      })).resolves.toEqual({ ok: true, studyTarget });

      expect(harness.transactionCount).toBe(1);
      expect(harness.reads).toEqual(expect.arrayContaining([
        'auth_links/auth-user',
        'account_deletion_auth_markers/auth-user',
        `account_deletion_permanent_denials/${accountDeletePermanentDenialId('auth-user')}`,
        'account_deletion_tombstones/stable-user',
        `account_deletion_permanent_denials/${accountDeletePermanentDenialId('stable-user')}`,
        'users/stable-user',
      ]));
      expect(harness.writes).toEqual([]);
      expect(harness.transaction.create).not.toHaveBeenCalled();
      expect(harness.transaction.set).not.toHaveBeenCalled();
      expect(harness.transaction.update).not.toHaveBeenCalled();
      expect(harness.transaction.delete).not.toHaveBeenCalled();
    },
  );

  test('runs the authorized operation inside the same single transaction with canonical actor', async () => {
    const harness = makeHarness(activeStore({
      auth_links: { 'auth-user': { stable_id: 'stable-user' } },
      users: {
        'stable-user': {
          firebaseAuthUid: 'auth-user',
          progress: { premium_plan: 'monthly', premium_expiry: '0' },
        },
      },
    }));
    const operation = jest.fn(async (actor, _nowMs, createStartRepository) => {
      const repository = createStartRepository(authorizedRepositoryRuntime(harness));
      await repository.createIfAbsent(authorizedRecord());
      return actor;
    });

    await expect(runDialogueV2FreeformProductionAuthorizationTransaction(
      { db: harness.db as never, nowMs: () => 2_000_000_000_000 },
      'auth-user',
      operation,
    )).resolves.toEqual({ authUid: 'auth-user', stableAccountId: 'stable-user' });

    expect(harness.transactionCount).toBe(1);
    expect(operation).toHaveBeenCalledTimes(1);
    expect(harness.writes).toEqual(['create']);
  });

  test('mutates one freeform turn record inside the same authorization transaction', async () => {
    const session = authorizedRecord();
    const harness = makeHarness(activeStore({
      auth_links: { 'auth-user': { stable_id: 'stable-user' } },
      users: {
        'stable-user': {
          firebaseAuthUid: 'auth-user',
          progress: { premium_plan: 'monthly', premium_expiry: '0' },
        },
      },
      dialogue_v2_freeform_sessions: {
        [session.sessionId]: {
          schemaVersion: 1,
          kind: session.kind,
          sessionId: session.sessionId,
          ownerBinding: session.ownerBinding,
          studyTarget: session.studyTarget,
          createdAt: new FakeTimestamp(session.createdAtMs),
          expiresAt: new FakeTimestamp(session.expiresAtMs),
          revision: session.revision,
          turns: [],
          receipts: [],
        },
      },
    }));
    const operation = jest.fn(async (
      _actor,
      _nowMs,
      _createStartRepository,
      createTurnRepository,
    ) => createTurnRepository(authorizedRepositoryRuntime(harness)).mutate(
      session.sessionId,
      (current: unknown) => ({
        ...(current as DialogueV2FreeformSessionLedgerRecord),
        revision: (current as DialogueV2FreeformSessionLedgerRecord).revision + 1,
      }),
    ));

    await expect(runDialogueV2FreeformProductionAuthorizationTransaction(
      { db: harness.db as never, nowMs: () => 2_000_000_000_000 },
      'auth-user',
      operation,
    )).resolves.toMatchObject({ revision: 2 });

    expect(harness.transactionCount).toBe(1);
    expect(harness.reads.filter((value) => value === (
      `dialogue_v2_freeform_sessions/${session.sessionId}`
    ))).toHaveLength(1);
    expect(harness.writes).toEqual(['set']);
  });

  test('revokes an escaped turn repository before it can read or mutate', async () => {
    const harness = makeHarness(activeStore({
      auth_links: { 'auth-user': { stable_id: 'stable-user' } },
      users: {
        'stable-user': {
          firebaseAuthUid: 'auth-user',
          progress: { premium_plan: 'monthly', premium_expiry: '0' },
        },
      },
    }));
    let escapedFactory: DialogueV2FreeformAuthorizedTurnRepositoryFactory | undefined;
    let escapedRepository: DialogueV2FreeformSessionLedgerRepository | undefined;

    await runDialogueV2FreeformProductionAuthorizationTransaction(
      { db: harness.db as never, nowMs: () => 2_000_000_000_000 },
      'auth-user',
      async (_actor, _nowMs, _createStartRepository, createTurnRepository) => {
        escapedFactory = createTurnRepository;
        escapedRepository = createTurnRepository(authorizedRepositoryRuntime(harness));
      },
    );
    const readsBefore = [...harness.reads];

    expect(() => escapedFactory?.(authorizedRepositoryRuntime(harness)))
      .toThrow('dialogue_v2_freeform_repository_authorization_required');
    await expect(escapedRepository?.mutate(
      authorizedRecord().sessionId,
      (stored) => stored as DialogueV2FreeformSessionLedgerRecord,
    )).rejects.toThrow('dialogue_v2_freeform_repository_authorization_required');
    expect(harness.reads).toEqual(readsBefore);
    expect(harness.writes).toEqual([]);
  });

  test('rejects the authorized repository factory against a different Firestore database', async () => {
    const harness = makeHarness(activeStore({
      auth_links: { 'auth-user': { stable_id: 'stable-user' } },
      users: {
        'stable-user': {
          firebaseAuthUid: 'auth-user',
          progress: { premium_plan: 'monthly', premium_expiry: '0' },
        },
      },
    }));
    const otherHarness = makeHarness(activeStore());

    await runDialogueV2FreeformProductionAuthorizationTransaction(
      { db: harness.db as never, nowMs: () => 2_000_000_000_000 },
      'auth-user',
      async (_actor, _nowMs, createStartRepository) => {
        expect(() => createStartRepository(authorizedRepositoryRuntime(otherHarness)))
          .toThrow('dialogue_v2_freeform_repository_authorization_required');
      },
    );

    expect(otherHarness.reads).toEqual([]);
    expect(otherHarness.writes).toEqual([]);
  });

  test('rejects an escaped repository factory after the authorization callback returns', async () => {
    const harness = makeHarness(activeStore({
      auth_links: { 'auth-user': { stable_id: 'stable-user' } },
      users: {
        'stable-user': {
          firebaseAuthUid: 'auth-user',
          progress: { premium_plan: 'monthly', premium_expiry: '0' },
        },
      },
    }));
    let escapedFactory: DialogueV2FreeformAuthorizedStartRepositoryFactory | undefined;

    await runDialogueV2FreeformProductionAuthorizationTransaction(
      { db: harness.db as never, nowMs: () => 2_000_000_000_000 },
      'auth-user',
      async (_actor, _nowMs, createStartRepository) => {
        escapedFactory = createStartRepository;
      },
    );
    const readsBefore = [...harness.reads];

    expect(() => escapedFactory?.(authorizedRepositoryRuntime(harness)))
      .toThrow('dialogue_v2_freeform_repository_authorization_required');
    expect(harness.reads).toEqual(readsBefore);
    expect(harness.writes).toEqual([]);
  });

  test('revokes an escaped repository when the authorization callback throws', async () => {
    const harness = makeHarness(activeStore({
      auth_links: { 'auth-user': { stable_id: 'stable-user' } },
      users: {
        'stable-user': {
          firebaseAuthUid: 'auth-user',
          progress: { premium_plan: 'monthly', premium_expiry: '0' },
        },
      },
    }));
    let escapedRepository: DialogueV2FreeformSessionLedgerRepository | undefined;

    await expect(runDialogueV2FreeformProductionAuthorizationTransaction(
      { db: harness.db as never, nowMs: () => 2_000_000_000_000 },
      'auth-user',
      async (_actor, _nowMs, createStartRepository) => {
        escapedRepository = createStartRepository(authorizedRepositoryRuntime(harness));
        throw new Error('callback_failed');
      },
    )).rejects.toThrow('callback_failed');
    const readsBefore = [...harness.reads];

    await expect(escapedRepository?.createIfAbsent(authorizedRecord()))
      .rejects.toThrow('dialogue_v2_freeform_repository_authorization_required');
    expect(harness.reads).toEqual(readsBefore);
    expect(harness.writes).toEqual([]);
  });

  test('revokes an escaped repository before any operation can read or write', async () => {
    const harness = makeHarness(activeStore({
      auth_links: { 'auth-user': { stable_id: 'stable-user' } },
      users: {
        'stable-user': {
          firebaseAuthUid: 'auth-user',
          progress: { premium_plan: 'monthly', premium_expiry: '0' },
        },
      },
    }));
    let escapedRepository: DialogueV2FreeformSessionLedgerRepository | undefined;

    await runDialogueV2FreeformProductionAuthorizationTransaction(
      { db: harness.db as never, nowMs: () => 2_000_000_000_000 },
      'auth-user',
      async (_actor, _nowMs, createStartRepository) => {
        escapedRepository = createStartRepository(authorizedRepositoryRuntime(harness));
      },
    );
    const readsBefore = [...harness.reads];

    await expect(escapedRepository?.createIfAbsent(authorizedRecord()))
      .rejects.toThrow('dialogue_v2_freeform_repository_authorization_required');
    expect(harness.reads).toEqual(readsBefore);
    expect(harness.writes).toEqual([]);
  });

  test.each([
    ['Plus entitlement is revoked', (store: Store) => {
      store.users['stable-user'] = {
        firebaseAuthUid: 'auth-user',
        progress: {},
      };
    }],
    ['auth link is rebound to a non-Plus account', (store: Store) => {
      store.auth_links['auth-user'] = { stable_id: 'stable-rebound' };
      store.users['stable-user'] = {
        firebaseAuthUid: 'detached-auth',
        progress: { premium_plan: 'monthly', premium_expiry: '0' },
      };
    }],
  ] as const)(
    'does not run or write when %s immediately before the atomic transaction',
    async (_label, mutateAtTransactionBoundary) => {
      const harness = makeHarness(activeStore({
        auth_links: { 'auth-user': { stable_id: 'stable-user' } },
        users: {
          'stable-user': {
            firebaseAuthUid: 'auth-user',
            progress: { premium_plan: 'monthly', premium_expiry: '0' },
          },
          'stable-rebound': {
            firebaseAuthUid: 'auth-user',
            progress: {},
          },
        },
      }), mutateAtTransactionBoundary);
      const operation = jest.fn(async () => ({ ok: true }));

      await expect(runDialogueV2FreeformProductionAuthorizationTransaction(
        { db: harness.db as never, nowMs: () => 2_000_000_000_000 },
        'auth-user',
        operation,
      )).rejects.toMatchObject({ code: 'permission-denied' });

      expect(harness.transactionCount).toBe(1);
      expect(operation).not.toHaveBeenCalled();
      expect(harness.writes).toEqual([]);
    },
  );

  // зачем (бэклог 241, «сперва логи»): отказ «нужен Plus» называет, чей он и какая ветка решила, — без нового чтения базы.
  test('logs who was refused Plus and which branch decided, without an extra Firestore read', async () => {
    const harness = makeHarness(activeStore({
      auth_links: { 'auth-user': { stable_id: 'stable-user' } },
      users: {
        'stable-user': {
          firebaseAuthUid: 'auth-user',
          progress: { premium_plan: 'monthly', premium_expiry: '0', premium_rc_expiry_ms: String(2_000_000_000_000 - 100 * 3_600_000) },
        },
      },
    }));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      await expect(runDialogueV2FreeformProductionAuthorizationTransaction(
        { db: harness.db as never, nowMs: () => 2_000_000_000_000 },
        'auth-user',
        jest.fn(async () => ({ ok: true })),
      )).rejects.toMatchObject({ code: 'permission-denied' });
      const line = warn.mock.calls.find((call) => call[0] === '[FREEFORM-PLUS]' && call[1] === 'refused');
      expect(line).toBeDefined();
      const payload = JSON.parse(String(line?.[2]));
      expect(payload).toMatchObject({
        auth: 'auth-u', stable: 'stable', stableIsAuth: false, docExists: true, plan: 'monthly',
        expiryRaw0: true, rcExpiry: '-100h', branches: { store: false, admin: false, vip: false, gift: false },
      });
      expect(harness.reads.filter((read) => read === 'users/stable-user')).toHaveLength(1);
      expect(harness.writes).toEqual([]);
    } finally {
      warn.mockRestore();
    }
  });

  test('does not call the turn producer when Plus is revoked between actor lookup and claim', async () => {
    let transactionBoundary = 0;
    const session = authorizedRecord();
    const harness = makeHarness(activeStore({
      auth_links: { 'auth-user': { stable_id: 'stable-user' } },
      users: {
        'stable-user': {
          firebaseAuthUid: 'auth-user',
          progress: { premium_plan: 'monthly', premium_expiry: '0' },
        },
      },
      dialogue_v2_freeform_sessions: {
        [session.sessionId]: {
          schemaVersion: 1,
          kind: session.kind,
          sessionId: session.sessionId,
          ownerBinding: session.ownerBinding,
          studyTarget: session.studyTarget,
          createdAt: new FakeTimestamp(session.createdAtMs),
          expiresAt: new FakeTimestamp(session.expiresAtMs),
          revision: session.revision,
          turns: [],
          receipts: [],
        },
      },
    }), (store) => {
      transactionBoundary += 1;
      if (transactionBoundary === 2) {
        store.users['stable-user'] = {
          firebaseAuthUid: 'auth-user',
          progress: {},
        };
      }
    });
    const produceAssistant = jest.fn(async () => 'This must never be generated.');
    const turn = createDialogueV2FreeformAtomicSessionTurner({
      db: harness.db as never,
      nowMs: () => 2_000_000_000_000,
      generateClaimToken: () => `d2fc_${'C'.repeat(32)}`,
      bindOwner: () => 'a'.repeat(64),
      digestTurnRequest: () => 'b'.repeat(64),
      timestampFromMillis: (millis) => new FakeTimestamp(millis) as never,
      readLanguageBranchMemoryWithActor: jest.fn(async () => ({
        actor: { authUid: 'auth-user', stableAccountId: 'stable-user' },
        memory: null,
      })),
      produceAssistant,
    });

    await expect(turn('auth-user', {
      sessionId: session.sessionId,
      turnId: `d2ft_${'T'.repeat(16)}`,
      studyTarget: 'en',
      userMessage: 'Hello there.',
    })).rejects.toThrow();

    expect(harness.transactionCount).toBe(2);
    expect(produceAssistant).not.toHaveBeenCalled();
    expect(harness.writes).toEqual([]);
  });

  test('reads same-target memory after claim and passes only its draft to the producer', async () => {
    const session = authorizedRecord();
    const harness = makeHarness(activeStore({
      auth_links: { 'auth-user': { stable_id: 'stable-user' } },
      users: {
        'stable-user': {
          firebaseAuthUid: 'auth-user',
          progress: { premium_plan: 'monthly', premium_expiry: '0' },
        },
      },
      dialogue_v2_freeform_sessions: {
        [session.sessionId]: {
          schemaVersion: 1,
          kind: session.kind,
          sessionId: session.sessionId,
          ownerBinding: session.ownerBinding,
          studyTarget: session.studyTarget,
          createdAt: new FakeTimestamp(session.createdAtMs),
          expiresAt: new FakeTimestamp(session.expiresAtMs),
          revision: session.revision,
          turns: [],
          receipts: [],
        },
      },
    }));
    const readLanguageBranchMemoryWithActor = jest.fn(async () => ({
      actor: { authUid: 'auth-user', stableAccountId: 'stable-user' },
      memory: {
        schemaVersion: 1 as const,
        kind: 'dialogue_v2_plus_freeform_memory' as const,
        studyTarget: 'en' as const,
        revision: 2,
        updatedAtMs: 2_000_000_000_000,
        learnerProfile: {
          preferredRegister: 'neutral' as const,
          correctionStyle: 'gentle' as const,
          interests: ['urban gardening'],
        },
        recurringPatterns: [],
        recentTopics: ['neighbourhood hobbies'],
      },
    }));
    const produceAssistant = jest.fn(async (_input: unknown) => 'Tell me more about it.');
    const turn = createDialogueV2FreeformAtomicSessionTurner({
      db: harness.db as never,
      nowMs: () => 2_000_000_000_000,
      generateClaimToken: () => `d2fc_${'C'.repeat(32)}`,
      bindOwner: () => 'a'.repeat(64),
      digestTurnRequest: () => 'b'.repeat(64),
      timestampFromMillis: (millis) => new FakeTimestamp(millis) as never,
      readLanguageBranchMemoryWithActor,
      produceAssistant,
    });

    await expect(turn('auth-user', {
      sessionId: session.sessionId,
      turnId: `d2ft_${'T'.repeat(16)}`,
      studyTarget: 'en',
      userMessage: 'Hello there.',
    })).resolves.toMatchObject({
      ok: true,
      kind: 'new',
      assistantMessage: 'Tell me more about it.',
    });

    expect(readLanguageBranchMemoryWithActor).toHaveBeenCalledWith('auth-user', 'en');
    expect(produceAssistant).toHaveBeenCalledWith(expect.objectContaining({
      languageBranchMemory: {
        learnerProfile: {
          preferredRegister: 'neutral',
          correctionStyle: 'gentle',
          interests: ['urban gardening'],
        },
        recurringPatterns: [],
        recentTopics: ['neighbourhood hobbies'],
      },
    }));
    expect(JSON.stringify(produceAssistant.mock.calls[0]?.[0])).not.toMatch(
      /schemaVersion|dialogue_v2_plus_freeform_memory|revision|updatedAtMs/i,
    );
    const completionCreates = harness.creates.filter(({ path: createdPath }) => (
      createdPath.startsWith('users/stable-user/dialogue_v2_bot_voice_claims/completion_')
    ));
    expect(completionCreates).toHaveLength(1);
    expect(Object.keys(completionCreates[0]?.value ?? {}).sort()).toEqual([
      'completedAt', 'expiresAt', 'replyTextSha256', 'schemaVersion',
      'sessionId', 'studyTarget', 'turnId',
    ].sort());
    expect(JSON.stringify(completionCreates[0]?.value)).not.toMatch(
      /Tell me more|Hello there|audio|asset|uri|path|auth-user|stable-user/i,
    );
  });

  test.each([
    ['owner rebind', (store: Store) => {
      store.auth_links['auth-user'] = { stable_id: 'stable-rebound' };
      store.users['stable-user'] = {
        firebaseAuthUid: 'detached-auth',
        progress: { premium_plan: 'monthly', premium_expiry: '0' },
      };
      store.users['stable-rebound'] = {
        firebaseAuthUid: 'auth-user',
        progress: { premium_plan: 'monthly', premium_expiry: '0' },
      };
    }],
    ['Plus revocation', (store: Store) => {
      store.users['stable-user'] = {
        firebaseAuthUid: 'auth-user',
        progress: {},
      };
    }],
    ['account deletion', (store: Store) => {
      store.account_deletion_auth_markers['auth-user'] = { status: 'deleted' };
    }],
  ] as const)(
    'writes no completion evidence when %s lands immediately before finalization',
    async (_label, raceAtFinalization) => {
      let transactionBoundary = 0;
      const session = authorizedRecord();
      const harness = makeHarness(activeStore({
        auth_links: { 'auth-user': { stable_id: 'stable-user' } },
        users: {
          'stable-user': {
            firebaseAuthUid: 'auth-user',
            progress: { premium_plan: 'monthly', premium_expiry: '0' },
          },
          'stable-rebound': {
            firebaseAuthUid: 'detached-auth',
            progress: { premium_plan: 'monthly', premium_expiry: '0' },
          },
        },
        dialogue_v2_freeform_sessions: {
          [session.sessionId]: {
            schemaVersion: 1,
            kind: session.kind,
            sessionId: session.sessionId,
            ownerBinding: session.ownerBinding,
            studyTarget: session.studyTarget,
            createdAt: new FakeTimestamp(session.createdAtMs),
            expiresAt: new FakeTimestamp(session.expiresAtMs),
            revision: session.revision,
            turns: [],
            receipts: [],
          },
        },
      }), (store) => {
        transactionBoundary += 1;
        if (transactionBoundary === 4) raceAtFinalization(store);
      });
      const produceAssistant = jest.fn(async () => 'A generated answer that cannot commit.');
      const turn = createDialogueV2FreeformAtomicSessionTurner({
        db: harness.db as never,
        nowMs: () => 2_000_000_000_000,
        generateClaimToken: () => `d2fc_${'C'.repeat(32)}`,
        bindOwner: () => 'a'.repeat(64),
        digestTurnRequest: () => 'b'.repeat(64),
        timestampFromMillis: (millis) => new FakeTimestamp(millis) as never,
        readLanguageBranchMemoryWithActor: jest.fn(async () => ({
          actor: { authUid: 'auth-user', stableAccountId: 'stable-user' },
          memory: null,
        })),
        produceAssistant,
      });

      await expect(turn('auth-user', {
        sessionId: session.sessionId,
        turnId: `d2ft_${'T'.repeat(16)}`,
        studyTarget: 'en',
        userMessage: 'Please answer after the authorization race.',
      })).rejects.toThrow();

      expect(produceAssistant).toHaveBeenCalledTimes(1);
      expect(transactionBoundary).toBeGreaterThanOrEqual(4);
      expect(harness.creates.filter(({ path: createdPath }) => (
        createdPath.includes('/dialogue_v2_bot_voice_claims/completion_')
      ))).toEqual([]);
    },
  );

  test('rejects an A-B-A owner rebind after claim before rebound memory reaches producer', async () => {
    const session = authorizedRecord();
    const harness = makeHarness(activeStore({
      auth_links: { 'auth-user': { stable_id: 'stable-user' } },
      users: {
        'stable-user': {
          firebaseAuthUid: 'auth-user',
          progress: { premium_plan: 'monthly', premium_expiry: '0' },
        },
        'stable-rebound': {
          firebaseAuthUid: 'detached-auth',
          progress: { premium_plan: 'monthly', premium_expiry: '0' },
        },
      },
      dialogue_v2_freeform_sessions: {
        [session.sessionId]: {
          schemaVersion: 1,
          kind: session.kind,
          sessionId: session.sessionId,
          ownerBinding: session.ownerBinding,
          studyTarget: session.studyTarget,
          createdAt: new FakeTimestamp(session.createdAtMs),
          expiresAt: new FakeTimestamp(session.expiresAtMs),
          revision: session.revision,
          turns: [],
          receipts: [],
        },
      },
    }));
    const readLanguageBranchMemoryWithActor = jest.fn(async () => {
      harness.store.auth_links['auth-user'] = { stable_id: 'stable-rebound' };
      harness.store.users['stable-user'] = {
        firebaseAuthUid: 'detached-auth',
        progress: { premium_plan: 'monthly', premium_expiry: '0' },
      };
      harness.store.users['stable-rebound'] = {
        firebaseAuthUid: 'auth-user',
        progress: { premium_plan: 'monthly', premium_expiry: '0' },
      };
      const reboundEnvelope = {
        actor: { authUid: 'auth-user', stableAccountId: 'stable-rebound' },
        memory: {
          schemaVersion: 1 as const,
          kind: 'dialogue_v2_plus_freeform_memory' as const,
          studyTarget: 'en' as const,
          revision: 9,
          updatedAtMs: 2_000_000_000_000,
          learnerProfile: {
            preferredRegister: 'formal' as const,
            correctionStyle: 'direct' as const,
            interests: ['private rebound interest'],
          },
          recurringPatterns: [],
          recentTopics: [],
        },
      };
      harness.store.auth_links['auth-user'] = { stable_id: 'stable-user' };
      harness.store.users['stable-user'] = {
        firebaseAuthUid: 'auth-user',
        progress: { premium_plan: 'monthly', premium_expiry: '0' },
      };
      harness.store.users['stable-rebound'] = {
        firebaseAuthUid: 'detached-auth',
        progress: { premium_plan: 'monthly', premium_expiry: '0' },
      };
      return reboundEnvelope;
    });
    const produceAssistant = jest.fn(async (_input: unknown) => 'must not run');
    const turn = createDialogueV2FreeformAtomicSessionTurner({
      db: harness.db as never,
      nowMs: () => 2_000_000_000_000,
      generateClaimToken: () => `d2fc_${'C'.repeat(32)}`,
      bindOwner: () => 'a'.repeat(64),
      digestTurnRequest: () => 'b'.repeat(64),
      timestampFromMillis: (millis) => new FakeTimestamp(millis) as never,
      readLanguageBranchMemoryWithActor,
      produceAssistant,
    });

    await expect(turn('auth-user', {
      sessionId: session.sessionId,
      turnId: `d2ft_${'T'.repeat(16)}`,
      studyTarget: 'en',
      userMessage: 'Hello there.',
    })).rejects.toThrow();

    expect(readLanguageBranchMemoryWithActor).toHaveBeenCalledWith('auth-user', 'en');
    expect(produceAssistant).not.toHaveBeenCalled();
    expect(JSON.stringify(produceAssistant.mock.calls)).not.toContain(
      'private rebound interest',
    );
  });

  test('composes the real authorization adapter and repository in one transaction without duplicate authority reads', async () => {
    const harness = makeHarness(activeStore({
      auth_links: { 'auth-user': { stable_id: 'stable-user' } },
      users: {
        'stable-user': {
          firebaseAuthUid: 'auth-user',
          progress: { premium_plan: 'monthly', premium_expiry: '0' },
        },
      },
    }));
    const { start } = atomicStarter(harness);

    await expect(start('auth-user', { studyTarget: 'en' })).resolves.toEqual({
      sessionId: `d2fs_${'S'.repeat(32)}`,
      expiresAtMs: 2_000_000_000_000 + 24 * 60 * 60 * 1_000,
    });

    expect(harness.transactionCount).toBe(1);
    const documentReads = harness.reads.filter((read) => !read.startsWith('query:'));
    const readCounts = new Map<string, number>();
    for (const read of documentReads) {
      readCounts.set(read, (readCounts.get(read) ?? 0) + 1);
    }
    expect([...readCounts.entries()].filter(([, count]) => count !== 1)).toEqual([]);
    expect(documentReads).toEqual(expect.arrayContaining([
      'auth_links/auth-user',
      'account_deletion_auth_markers/auth-user',
      `account_deletion_permanent_denials/${accountDeletePermanentDenialId('auth-user')}`,
      'account_deletion_tombstones/stable-user',
      `account_deletion_permanent_denials/${accountDeletePermanentDenialId('stable-user')}`,
      'users/stable-user',
      `dialogue_v2_freeform_sessions/d2fs_${'S'.repeat(32)}`,
    ]));
    expect(harness.writes).toEqual(['create']);
    expect(harness.creates).toHaveLength(1);
    expect(harness.creates[0]?.path).toBe(
      `dialogue_v2_freeform_sessions/d2fs_${'S'.repeat(32)}`,
    );
  });

  test.each([
    ['Plus entitlement is revoked', (store: Store) => {
      store.users['stable-user'] = {
        firebaseAuthUid: 'auth-user',
        progress: {},
      };
    }],
    ['auth link is rebound to a non-Plus account', (store: Store) => {
      store.auth_links['auth-user'] = { stable_id: 'stable-rebound' };
      store.users['stable-user'] = {
        firebaseAuthUid: 'detached-auth',
        progress: { premium_plan: 'monthly', premium_expiry: '0' },
      };
    }],
  ] as const)(
    'actual composed start has no session callback or write when %s at transaction boundary',
    async (_label, mutateAtTransactionBoundary) => {
      const harness = makeHarness(activeStore({
        auth_links: { 'auth-user': { stable_id: 'stable-user' } },
        users: {
          'stable-user': {
            firebaseAuthUid: 'auth-user',
            progress: { premium_plan: 'monthly', premium_expiry: '0' },
          },
          'stable-rebound': {
            firebaseAuthUid: 'auth-user',
            progress: {},
          },
        },
      }), mutateAtTransactionBoundary);
      const { start, generateSessionId } = atomicStarter(harness);

      await expect(start('auth-user', { studyTarget: 'en' }))
        .rejects.toMatchObject({ code: 'permission-denied' });

      expect(harness.transactionCount).toBe(1);
      expect(generateSessionId).not.toHaveBeenCalled();
      expect(harness.writes).toEqual([]);
      expect(harness.creates).toEqual([]);
    },
  );

  test('denies a non-Plus account after canonical transactional reads', async () => {
    const harness = makeHarness(activeStore({
      auth_links: { 'auth-free': { stable_id: 'stable-free' } },
      users: { 'stable-free': { firebaseAuthUid: 'auth-free', progress: {} } },
    }));

    const error = await captureError(() => createHandler(harness)({
      auth: { uid: 'auth-free' },
      data: { studyTarget: 'en' },
    }));

    expect(error).toMatchObject({
      code: 'permission-denied',
      message: 'dialogue_v2_freeform_plus_required',
    });
    expect(harness.transactionCount).toBe(1);
    expect(harness.writes).toEqual([]);
  });

  test.each([
    [
      'auth deletion marker',
      activeStore({
        account_deletion_auth_markers: { 'auth-retired': { status: 'deleted' } },
      }),
      'auth-retired',
    ],
    [
      'stable tombstone',
      activeStore({
        auth_links: { 'auth-deleted': { stable_id: 'stable-deleted' } },
        users: { 'stable-deleted': { firebaseAuthUid: 'auth-deleted' } },
        account_deletion_tombstones: { 'stable-deleted': { status: 'deleted' } },
      }),
      'auth-deleted',
    ],
    [
      'stable permanent denial',
      activeStore({
        auth_links: { 'auth-denied': { stable_id: 'stable-denied' } },
        users: { 'stable-denied': { firebaseAuthUid: 'auth-denied' } },
        account_deletion_permanent_denials: {
          [accountDeletePermanentDenialId('stable-denied')]: { denied: true },
        },
      }),
      'auth-denied',
    ],
  ] as const)('fails closed for %s without exposing identity', async (_label, store, authUid) => {
    const harness = makeHarness(store);

    const error = await captureError(() => createHandler(harness)({
      auth: { uid: authUid },
      data: { studyTarget: 'en' },
    }));

    expect(error).toMatchObject({
      code: 'failed-precondition',
      message: 'dialogue_v2_freeform_identity_unavailable',
    });
    expect(JSON.stringify(error)).not.toContain(authUid);
    expect(JSON.stringify(error)).not.toContain('auth-retired');
    expect(JSON.stringify(error)).not.toContain('stable-deleted');
    expect(JSON.stringify(error)).not.toContain('stable-denied');
    expect(harness.writes).toEqual([]);
  });

  test('ignores a poisoned alias and authorizes only the canonical owned Plus account', async () => {
    const authUid = 'auth-owner';
    const poisonedAccountId = 'acc_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
    const harness = makeHarness(activeStore({
      auth_links: {},
      users: {
        victim: {
          firebaseAuthUid: 'victim-auth',
          accountId: poisonedAccountId,
          progress: { premium_plan: 'monthly', premium_expiry: '0' },
        },
        owner: {
          firebaseAuthUid: authUid,
          accountId: 'acc_owner',
          progress: { premium_plan: 'monthly', premium_expiry: '0' },
        },
      },
      account_id_index: {
        [accountIdIndexDocId(authUid)]: {
          stableId: 'victim',
          accountId: poisonedAccountId,
          kind: 'auth',
        },
      },
    }));

    await expect(createHandler(harness)({
      auth: { uid: authUid },
      data: { studyTarget: 'de' },
    })).resolves.toEqual({ ok: true, studyTarget: 'de' });

    expect(harness.reads).toContain(`query:users:firebaseAuthUid:${authUid}`);
    expect(harness.writes).toEqual([]);
  });

  test.each([
    { studyTarget: 'en', stableAccountId: 'victim' },
    { studyTarget: 'en', isPremium: true },
    { studyTarget: 'en', transaction: 'client-token' },
    { studyTarget: 'en', path: 'users/victim' },
  ])('rejects client authority input before opening a transaction %#', async (data) => {
    const harness = makeHarness(activeStore());

    const error = await captureError(() => createHandler(harness)({
      auth: { uid: 'auth-user' },
      data,
    }));

    expect(error).toMatchObject({
      code: 'invalid-argument',
      message: 'dialogue_v2_freeform_request_invalid',
    });
    expect(harness.transactionCount).toBe(0);
    expect(harness.reads).toEqual([]);
    expect(harness.writes).toEqual([]);
  });

  test('remains internal, non-callable and unreferenced by production', () => {
    const source = readFileSync(
      path.join(__dirname, 'dialogue_v2_freeform_production_adapter.ts'),
      'utf8',
    );
    const indexSource = readFileSync(path.join(__dirname, 'index.ts'), 'utf8');

    expect(source).not.toMatch(/onCall\s*\(/);
    expect(source).not.toMatch(/OPENAI|fetch\s*\(/i);
    expect(indexSource).not.toContain('dialogue_v2_freeform_production_adapter');
    expect(indexSource).not.toContain('createDialogueV2FreeformProductionAuthorizationHandler');
  });
});
