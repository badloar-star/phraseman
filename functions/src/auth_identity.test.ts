import {
  cleanupLegacyAuthIdentityDuplicates,
  ensureAuthLinkDoc,
  ensureStableLinkForAuth,
  linkStableAuthUid,
  resolveStableUidForAuth,
} from './auth_identity';
import { accountDeletePermanentDenialId } from './account_delete_job';

type DocData = Record<string, unknown>;
type Store = Record<string, Record<string, DocData | undefined>>;

type DbStubOptions = {
  beforeTransactionStart?: (store: Store) => void;
  beforeTransactionCommit?: (store: Store, attempt: number) => void;
  readFaultAt?: Record<string, number>;
};

function makeDbStub(initial: Store = {}, options: DbStubOptions = {}) {
  const store: Store = {
    users: { ...(initial.users ?? {}) },
    auth_links: { ...(initial.auth_links ?? {}) },
    leaderboard: { ...(initial.leaderboard ?? {}) },
    league_groups: { ...(initial.league_groups ?? {}) },
    identity_cleanup_candidates: { ...(initial.identity_cleanup_candidates ?? {}) },
    account_deletion_auth_markers: { ...(initial.account_deletion_auth_markers ?? {}) },
    account_deletion_tombstones: { ...(initial.account_deletion_tombstones ?? {}) },
    account_deletion_permanent_denials: { ...(initial.account_deletion_permanent_denials ?? {}) },
    jarvis_growth_daily: { ...(initial.jarvis_growth_daily ?? {}) },
  };
  const sets: { path: string; data: DocData; options: unknown }[] = [];
  const transactionCommits: string[][] = [];
  const readCounts = new Map<string, number>();

  const maybeThrowReadFault = (target: string) => {
    const count = (readCounts.get(target) ?? 0) + 1;
    readCounts.set(target, count);
    if (options.readFaultAt?.[target] === count) {
      throw new Error(`injected_read_failure:${target}:${count}`);
    }
  };

  const snapFor = (id: string, data: DocData | undefined) => ({
    id,
    exists: !!data,
    data: () => data,
  });

  const collection = (name: string) => ({
      doc: (id: string) => ({
        kind: 'doc',
        path: `${name}/${id}`,
        collectionName: name,
        id,
        get: async () => {
          maybeThrowReadFault(`${name}/${id}`);
          return snapFor(id, store[name]?.[id]);
        },
        set: async (data: DocData, options: unknown) => {
          sets.push({ path: `${name}/${id}`, data, options });
          store[name] = store[name] ?? {};
          store[name][id] = { ...(store[name][id] ?? {}), ...data };
        },
      }),
      where: (field: unknown, op: string, value: unknown) => ({
        limit: () => ({
          kind: 'query',
          collectionName: name,
          field,
          op,
          value,
          get: async () => {
            const fieldKey = typeof field === 'string' ? field : 'membersUid';
            maybeThrowReadFault(`query:${name}:${fieldKey}:${String(value)}`);
            const readField = (data: DocData, fieldPath: string): unknown =>
              fieldPath.split('.').reduce<unknown>((current, key) => (
                current && typeof current === 'object'
                  ? (current as Record<string, unknown>)[key]
                  : undefined
              ), data);
            const docs = Object.entries(store[name] ?? {})
              .filter(([, data]) => {
                if (!data || op !== '==') return false;
                if (typeof field === 'string') return readField(data, field) === value;
                const members = data.members;
                return Boolean(members && typeof members === 'object' && Object.values(members).some(
                  (member) => member && typeof member === 'object'
                    && (member as Record<string, unknown>).uid === value,
                ));
              })
              .map(([id, data]) => ({
                ...snapFor(id, data),
                ref: collection(name).doc(id),
              }));
            return { empty: docs.length === 0, docs };
          },
        }),
      }),
    });

  const db = {
    collection,
    batch: () => {
      const writes: Array<{ ref: { path: string; collectionName: string; id: string }; data: DocData; options?: unknown }> = [];
      return {
        set: (ref: { path: string; collectionName: string; id: string }, data: DocData, writeOptions?: unknown) => {
          writes.push({ ref, data, options: writeOptions });
        },
        commit: async () => {
          for (const write of writes) {
            store[write.ref.collectionName] = store[write.ref.collectionName] ?? {};
            store[write.ref.collectionName][write.ref.id] = write.options
              ? { ...(store[write.ref.collectionName][write.ref.id] ?? {}), ...write.data }
              : { ...write.data };
            sets.push({ path: write.ref.path, data: write.data, options: write.options });
          }
        },
      };
    },
    runTransaction: async (callback: (transaction: any) => Promise<unknown>) => {
      options.beforeTransactionStart?.(store);
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const storeBefore = JSON.stringify(store);
        const writes: Array<{
          mode: 'create' | 'set';
          ref: { path: string; collectionName: string; id: string };
          data: DocData;
          options?: unknown;
        }> = [];
        let hasWritten = false;
        const transaction = {
          get: async (target: { get: () => Promise<unknown> }) => {
            if (hasWritten) throw new Error('transaction_read_after_write');
            return target.get();
          },
          create: (ref: { path: string; collectionName: string; id: string }, data: DocData) => {
            hasWritten = true;
            writes.push({ mode: 'create', ref, data });
          },
          set: (
            ref: { path: string; collectionName: string; id: string },
            data: DocData,
            writeOptions?: unknown,
          ) => {
            hasWritten = true;
            writes.push({ mode: 'set', ref, data, options: writeOptions });
          },
        };

        const result = await callback(transaction);
        if (attempt === 0) options.beforeTransactionCommit?.(store, attempt);
        if (JSON.stringify(store) !== storeBefore) continue;

        for (const write of writes) {
          const current = store[write.ref.collectionName]?.[write.ref.id];
          if (write.mode === 'create' && current) throw new Error('transaction_create_conflict');
          store[write.ref.collectionName] = store[write.ref.collectionName] ?? {};
          store[write.ref.collectionName][write.ref.id] = write.mode === 'set' && write.options
            ? { ...(current ?? {}), ...write.data }
            : { ...write.data };
          sets.push({
            path: write.ref.path,
            data: write.data,
            options: write.mode === 'create' ? { create: true } : write.options,
          });
        }
        transactionCommits.push(writes.map((write) => write.ref.path));
        return result;
      }
      throw new Error('transaction_conflict');
    },
  };

  return { db, store, sets, transactionCommits };
}

async function captureOutcome(promise: Promise<unknown>): Promise<{
  status: 'resolved' | 'rejected';
  code?: unknown;
  message?: unknown;
}> {
  try {
    await promise;
    return { status: 'resolved' };
  } catch (error) {
    return {
      status: 'rejected',
      code: (error as { code?: unknown })?.code,
      message: (error as { message?: unknown })?.message,
    };
  }
}

function expectSingleTransactionPaths(commits: string[][], expectedPaths: string[]): void {
  expect(commits).toHaveLength(1);
  expect(commits[0]).toHaveLength(expectedPaths.length);
  expect([...commits[0]].sort()).toEqual([...expectedPaths].sort());
}

const IDENTITY_CHECK_UNAVAILABLE = {
  status: 'rejected',
  code: 'unavailable',
  message: 'identity_check_unavailable',
} as const;

describe('linkStableAuthUid', () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(1_777_000_000_000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not create a missing user outside the bootstrap transaction', async () => {
    const { db, store, sets } = makeDbStub();

    await expect(linkStableAuthUid(db as any, 'stable-1', 'auth-1')).rejects.toMatchObject({
      code: 'permission-denied',
      message: 'stable_id_mismatch',
    });

    expect(store.users['stable-1']).toBeUndefined();
    expect(sets).toEqual([]);
  });

  it('skips Firestore writes when user and leaderboard are already linked', async () => {
    const { db, sets } = makeDbStub({
      users: {
        'stable-1': { firebaseAuthUid: 'auth-1', updatedAt: 111 },
      },
      leaderboard: {
        'stable-1': { firebaseAuthUid: 'auth-1', updatedAt: 222 },
      },
    });

    await linkStableAuthUid(db as any, 'stable-1', 'auth-1');

    expect(sets).toEqual([]);
  });

  it('keeps the corrective path for a stale user auth uid', async () => {
    const { db, store, sets } = makeDbStub({
      users: {
        'stable-1': {
          firebaseAuthUid: 'old-auth',
          linkedAuth: { providerUid: 'auth-1' },
          updatedAt: 111,
        },
      },
    });

    await linkStableAuthUid(db as any, 'stable-1', 'auth-1');

    expect(store.users['stable-1']).toMatchObject({
      firebaseAuthUid: 'auth-1',
      updatedAt: 1_777_000_000_000,
    });
    expect(sets).toEqual([
      {
        path: 'users/stable-1',
        data: { firebaseAuthUid: 'auth-1', updatedAt: 1_777_000_000_000 },
        options: { merge: true },
      },
    ]);
  });

  it('repairs an existing leaderboard doc without creating a missing one', async () => {
    const present = makeDbStub({
      users: {
        'stable-1': { firebaseAuthUid: 'auth-1', updatedAt: 111 },
      },
      leaderboard: {
        'stable-1': { firebaseAuthUid: 'old-auth', updatedAt: 222 },
      },
    });

    await linkStableAuthUid(present.db as any, 'stable-1', 'auth-1');

    expect(present.sets).toEqual([
      {
        path: 'leaderboard/stable-1',
        data: { firebaseAuthUid: 'auth-1', updatedAt: 1_777_000_000_000 },
        options: { merge: true },
      },
    ]);

    const missing = makeDbStub({
      users: {
        'stable-2': { firebaseAuthUid: 'auth-2', updatedAt: 333 },
      },
    });

    await linkStableAuthUid(missing.db as any, 'stable-2', 'auth-2');

    expect(missing.sets).toEqual([]);
    expect(missing.store.leaderboard['stable-2']).toBeUndefined();
  });

  it.each([
    ['auth marker', 'account_deletion_auth_markers', 'auth-user-race'],
    ['stable tombstone', 'account_deletion_tombstones', 'stable-user-race'],
  ])('fails closed when a deletion %s appears before the user-only repair commits', async (
    _label,
    collectionName,
    documentId,
  ) => {
    const { db, store, sets, transactionCommits } = makeDbStub({
      users: {
        'stable-user-race': {
          firebaseAuthUid: 'old-auth',
          linkedAuth: { providerUid: 'auth-user-race' },
          updatedAt: 111,
        },
      },
    }, {
      beforeTransactionCommit: (currentStore) => {
        currentStore[collectionName][documentId] = { status: 'pending' };
      },
    });

    await expect(linkStableAuthUid(
      db as any,
      'stable-user-race',
      'auth-user-race',
    )).rejects.toMatchObject({
      code: 'failed-precondition',
      message: 'identity_retired',
    });
    expect(store.users['stable-user-race']).toEqual({
      firebaseAuthUid: 'old-auth',
      linkedAuth: { providerUid: 'auth-user-race' },
      updatedAt: 111,
    });
    expect(store.auth_links['auth-user-race']).toBeUndefined();
    expect(sets).toEqual([]);
    expect(transactionCommits).toEqual([]);
  });

  it('never writes auth_links from the public user-only repair API', async () => {
    const originalLink = { stable_id: 'stable-other', provider: 'google', updatedAt: 111 };
    const { db, store, transactionCommits } = makeDbStub({
      users: { 'stable-user-only': { firebaseAuthUid: 'old-auth', updatedAt: 111 } },
      auth_links: { 'auth-user-only': { ...originalLink, stable_id: 'stable-user-only' } },
    });

    await linkStableAuthUid(db as any, 'stable-user-only', 'auth-user-only');

    expect(store.auth_links['auth-user-only']).toEqual({ ...originalLink, stable_id: 'stable-user-only' });
    expect(transactionCommits).toEqual([['users/stable-user-only']]);
  });

  it('does not overwrite a user owner that changes before the user-only commit', async () => {
    const { db, store, sets, transactionCommits } = makeDbStub({
      users: {
        'stable-owner-race': {
          firebaseAuthUid: 'previous-auth',
          linkedAuth: { providerUid: 'requested-auth' },
          updatedAt: 111,
        },
      },
    }, {
      beforeTransactionCommit: (currentStore) => {
        currentStore.users['stable-owner-race'] = {
          firebaseAuthUid: 'concurrent-foreign-auth',
          updatedAt: 222,
        };
      },
    });

    await expect(linkStableAuthUid(
      db as any,
      'stable-owner-race',
      'requested-auth',
    )).rejects.toMatchObject({
      code: 'permission-denied',
      message: 'stable_id_mismatch',
    });
    expect(store.users['stable-owner-race']).toEqual({
      firebaseAuthUid: 'concurrent-foreign-auth',
      updatedAt: 222,
    });
    expect(sets).toEqual([]);
    expect(transactionCommits).toEqual([]);
  });

  it('does not recreate a selected existing user that disappears before commit', async () => {
    const { db, store, sets, transactionCommits } = makeDbStub({
      users: {
        'stable-disappears': {
          firebaseAuthUid: 'old-auth',
          linkedAuth: { providerUid: 'new-auth' },
          updatedAt: 111,
        },
      },
    }, {
      beforeTransactionCommit: (currentStore) => {
        delete currentStore.users['stable-disappears'];
      },
    });

    await expect(linkStableAuthUid(
      db as any,
      'stable-disappears',
      'new-auth',
    )).rejects.toMatchObject({
      code: 'permission-denied',
      message: 'stable_id_mismatch',
    });
    expect(store.users['stable-disappears']).toBeUndefined();
    expect(sets).toEqual([]);
    expect(transactionCommits).toEqual([]);
  });

  it('allows a safe retry when unrelated state changes but identity proof stays unchanged', async () => {
    const { db, store, transactionCommits } = makeDbStub({
      users: {
        'stable-safe-retry': {
          firebaseAuthUid: 'old-safe-auth',
          linkedAuth: { providerUid: 'new-safe-auth' },
          updatedAt: 111,
        },
      },
    }, {
      beforeTransactionCommit: (currentStore) => {
        currentStore.identity_cleanup_candidates.unrelated = { updatedAt: 222 };
      },
    });

    await linkStableAuthUid(db as any, 'stable-safe-retry', 'new-safe-auth');

    expect(store.users['stable-safe-retry']).toMatchObject({ firebaseAuthUid: 'new-safe-auth' });
    expect(transactionCommits).toEqual([['users/stable-safe-retry']]);
  });
});

describe('cleanupLegacyAuthIdentityDuplicates read-failure boundary', () => {
  const stableId = 'stable-cleanup';
  const authUid = 'legacy-auth';

  it('fails closed when the stable-member week query is unavailable and performs zero writes', async () => {
    const { db, store, sets, transactionCommits } = makeDbStub({
      users: {
        [stableId]: { firebaseAuthUid: authUid },
      },
      auth_links: {
        [authUid]: { stable_id: stableId },
      },
      leaderboard: {
        [stableId]: { firebaseAuthUid: authUid, points: 900, name: 'Stable Profile' },
      },
      league_groups: {
        'legacy-group': {
          weekId: '2026-W30',
          members: {
            [authUid]: { uid: authUid, points: 12, name: 'Legacy Profile' },
          },
        },
        'stable-group': {
          weekId: '2026-W30',
          members: {
            [stableId]: { uid: stableId, points: 120, name: 'Stable Profile' },
          },
        },
      },
    }, {
      readFaultAt: { 'query:league_groups:weekId:2026-W30': 1 },
    });
    const before = JSON.stringify(store);

    await expect(cleanupLegacyAuthIdentityDuplicates(db as any, stableId, authUid))
      .rejects.toMatchObject({ code: 'unavailable', message: 'identity_check_unavailable' });
    expect(JSON.stringify(store)).toBe(before);
    expect(sets).toEqual([]);
    expect(transactionCommits).toEqual([]);
  });

  it.each([
    ['stable leaderboard', `leaderboard/${stableId}`],
    ['auth-link anchor', `auth_links/${authUid}`],
  ])('fails closed when the authoritative %s read is unavailable and never merges legacy data', async (_case, faultPath) => {
    const { db, store, sets, transactionCommits } = makeDbStub({
      users: {
        [stableId]: { firebaseAuthUid: authUid },
      },
      auth_links: {
        [authUid]: { stable_id: stableId },
      },
      leaderboard: {
        [stableId]: { firebaseAuthUid: authUid, points: 900, name: 'Stable Profile' },
        [authUid]: { firebaseAuthUid: authUid, points: 10, name: 'Legacy Lower Profile' },
      },
    }, {
      readFaultAt: { [faultPath]: 1 },
    });
    const before = JSON.stringify(store);

    await expect(cleanupLegacyAuthIdentityDuplicates(db as any, stableId, authUid))
      .rejects.toMatchObject({ code: 'unavailable', message: 'identity_check_unavailable' });
    expect(JSON.stringify(store)).toBe(before);
    expect(sets).toEqual([]);
    expect(transactionCommits).toEqual([]);
  });
});

describe('ensureAuthLinkDoc', () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(1_777_000_000_000);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates auth_links/{authUid} for an anonymous user that has none (referral fix)', async () => {
    const { db, store } = makeDbStub({
      users: { 'stable-1': { firebaseAuthUid: 'auth-1' } },
    });

    await ensureAuthLinkDoc(db as any, 'auth-1', 'stable-1');

    expect(store.auth_links['auth-1']).toEqual({
      stable_id: 'stable-1',
      updatedAt: 1_777_000_000_000,
    });
  });

  it('creates a provider-shaped auth link during provider sign-in', async () => {
    const { db, store } = makeDbStub({
      users: { 'stable-1': { firebaseAuthUid: 'google-auth-1' } },
    });

    await ensureAuthLinkDoc(db as any, 'google-auth-1', 'stable-1', 'google');

    expect(store.auth_links['google-auth-1']).toEqual({
      stable_id: 'stable-1',
      updatedAt: 1_777_000_000_000,
      providerUid: 'google-auth-1',
      provider: 'google',
      linkedAt: 1_777_000_000_000,
      lastSignInAt: 1_777_000_000_000,
    });
  });

  it('backfills provider fields on an existing minimal provider link', async () => {
    const { db, store } = makeDbStub({
      users: { 'stable-1': { firebaseAuthUid: 'google-auth-1' } },
      auth_links: { 'google-auth-1': { stable_id: 'stable-1', updatedAt: 1 } },
    });

    await ensureAuthLinkDoc(db as any, 'google-auth-1', 'stable-1', 'google');

    expect(store.auth_links['google-auth-1']).toEqual({
      stable_id: 'stable-1',
      updatedAt: 1_777_000_000_000,
      providerUid: 'google-auth-1',
      provider: 'google',
      linkedAt: 1_777_000_000_000,
      lastSignInAt: 1_777_000_000_000,
    });
  });

  it('rewrites stable_id when the link points to a different stable id', async () => {
    const { db, store } = makeDbStub({
      users: { 'stable-1': { firebaseAuthUid: 'auth-1' } },
      auth_links: { 'auth-1': { stable_id: 'old-stable', updatedAt: 1 } },
    });

    await ensureAuthLinkDoc(db as any, 'auth-1', 'stable-1');

    expect(store.auth_links['auth-1']).toMatchObject({ stable_id: 'stable-1' });
  });

  it('does not write when the link already matches (keeps provider/email via no-op)', async () => {
    const { db, store } = makeDbStub({
      users: { 'stable-1': { firebaseAuthUid: 'auth-1' } },
      auth_links: { 'auth-1': { stable_id: 'stable-1', provider: 'google', email: 'a@b.c' } },
    });

    await ensureAuthLinkDoc(db as any, 'auth-1', 'stable-1');

    expect(store.auth_links['auth-1']).toEqual({
      stable_id: 'stable-1',
      provider: 'google',
      email: 'a@b.c',
    });
  });

  it('fails closed when the pre-write auth_links read is unavailable', async () => {
    const { db, sets } = makeDbStub({}, {
      readFaultAt: { 'auth_links/auth-read-fault': 1 },
    });

    const outcome = await captureOutcome(
      ensureAuthLinkDoc(db as any, 'auth-read-fault', 'stable-read-fault', 'google'),
    );

    expect(sets).toEqual([]);
    expect(outcome).toEqual(IDENTITY_CHECK_UNAVAILABLE);
  });

  it.each([
    ['auth marker', 'account_deletion_auth_markers', 'auth-link-race'],
    ['stable tombstone', 'account_deletion_tombstones', 'stable-link-race'],
  ])('fails closed when a deletion %s appears before the link-only repair commits', async (
    _label,
    collectionName,
    documentId,
  ) => {
    const { db, store, sets, transactionCommits } = makeDbStub({
      users: { 'stable-link-race': { firebaseAuthUid: 'auth-link-race', updatedAt: 111 } },
    }, {
      beforeTransactionCommit: (currentStore) => {
        currentStore[collectionName][documentId] = { status: 'pending' };
      },
    });

    await expect(ensureAuthLinkDoc(
      db as any,
      'auth-link-race',
      'stable-link-race',
    )).rejects.toMatchObject({
      code: 'failed-precondition',
      message: 'identity_retired',
    });
    expect(store.auth_links['auth-link-race']).toBeUndefined();
    expect(sets).toEqual([]);
    expect(transactionCommits).toEqual([]);
  });

  it('does not overwrite an auth_link target that changes before the link-only commit', async () => {
    const { db, store, sets, transactionCommits } = makeDbStub({
      users: { 'stable-link-target': { firebaseAuthUid: 'auth-link-owner', updatedAt: 111 } },
      auth_links: { 'auth-link-owner': { stable_id: 'previous-stable', updatedAt: 111 } },
    }, {
      beforeTransactionCommit: (currentStore) => {
        currentStore.auth_links['auth-link-owner'] = {
          stable_id: 'concurrent-foreign-stable',
          updatedAt: 222,
        };
      },
    });

    await expect(ensureAuthLinkDoc(
      db as any,
      'auth-link-owner',
      'stable-link-target',
    )).rejects.toMatchObject({
      code: 'permission-denied',
      message: 'stable_id_mismatch',
    });
    expect(store.auth_links['auth-link-owner']).toEqual({
      stable_id: 'concurrent-foreign-stable',
      updatedAt: 222,
    });
    expect(sets).toEqual([]);
    expect(transactionCommits).toEqual([]);
  });

  it.each([
    ['deleted', 'delete'],
    ['cleared', 'clear'],
  ])('does not recreate an auth_link that is %s before the link-only commit', async (_label, mutation) => {
    const { db, store, sets, transactionCommits } = makeDbStub({
      users: { 'stable-link-delete-race': { firebaseAuthUid: 'auth-link-delete-race' } },
      auth_links: {
        'auth-link-delete-race': { stable_id: 'previous-stable', updatedAt: 111 },
      },
    }, {
      beforeTransactionCommit: (currentStore) => {
        if (mutation === 'delete') {
          delete currentStore.auth_links['auth-link-delete-race'];
        } else {
          currentStore.auth_links['auth-link-delete-race'] = { updatedAt: 222 };
        }
      },
    });

    await expect(ensureAuthLinkDoc(
      db as any,
      'auth-link-delete-race',
      'stable-link-delete-race',
    )).rejects.toMatchObject({
      code: 'permission-denied',
      message: 'stable_id_mismatch',
    });
    if (mutation === 'delete') {
      expect(store.auth_links['auth-link-delete-race']).toBeUndefined();
    } else {
      expect(store.auth_links['auth-link-delete-race']).toEqual({ updatedAt: 222 });
    }
    expect(sets).toEqual([]);
    expect(transactionCommits).toEqual([]);
  });
});

describe('resolveStableUidForAuth', () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(1_777_000_000_000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const hiddenResolutionCases = [
    {
      label: 'auth_links anchor',
      authUid: 'hidden-anchor-owner',
      hiddenStableId: 'hidden-anchor-h',
      canonicalStableId: 'hidden-anchor-c',
      requestedStableId: undefined,
      authLinks: { 'hidden-anchor-owner': { stable_id: 'hidden-anchor-h' } },
      hiddenOwner: 'hidden-anchor-owner',
      canonicalOwner: 'hidden-anchor-owner',
    },
    {
      label: 'requested hidden user',
      authUid: 'hidden-requested-c',
      hiddenStableId: 'hidden-requested-h',
      canonicalStableId: 'hidden-requested-c',
      requestedStableId: 'hidden-requested-h',
      authLinks: {},
      hiddenOwner: undefined,
      canonicalOwner: undefined,
    },
    {
      label: 'provider owner query',
      authUid: 'hidden-provider-c',
      hiddenStableId: 'hidden-provider-h',
      canonicalStableId: 'hidden-provider-c',
      requestedStableId: undefined,
      authLinks: {},
      hiddenOwner: 'hidden-provider-c',
      canonicalOwner: undefined,
    },
  ] as const;

  it.each([true, false])(
    'rejects an exact requested orphan auth_links anchor with repairLinks=%s and performs zero writes',
    async (repairLinks) => {
      const authUid = `direct-orphan-auth-${repairLinks}`;
      const stableId = `direct-orphan-stable-${repairLinks}`;
      const originalLink = { stable_id: stableId, provider: 'google', updatedAt: 111 };
      const { db, store, sets, transactionCommits } = makeDbStub({
        auth_links: { [authUid]: originalLink },
      });

      await expect(resolveStableUidForAuth(db as any, authUid, stableId, {
        repairLinks,
      })).rejects.toMatchObject({
        code: 'permission-denied',
        message: 'stable_id_mismatch',
      });
      expect(store.auth_links[authUid]).toEqual(originalLink);
      expect(store.users[stableId]).toBeUndefined();
      expect(sets).toEqual([]);
      expect(transactionCommits).toEqual([]);
    },
  );

  it.each(hiddenResolutionCases.flatMap((identityCase) => [
    [identityCase.label, 'hidden source H', identityCase, identityCase.hiddenStableId],
    [identityCase.label, 'effective canonical C', identityCase, identityCase.canonicalStableId],
  ] as const))(
    'rejects %s when %s has an account-deletion tombstone',
    async (_pathLabel, _targetLabel, identityCase, tombstonedStableId) => {
      const { db, sets } = makeDbStub({
        auth_links: identityCase.authLinks,
        users: {
          [identityCase.hiddenStableId]: {
            ...(identityCase.hiddenOwner ? { firebaseAuthUid: identityCase.hiddenOwner } : {}),
            identityHidden: true,
            canonicalStableId: identityCase.canonicalStableId,
          },
          [identityCase.canonicalStableId]: {
            ...(identityCase.canonicalOwner ? { firebaseAuthUid: identityCase.canonicalOwner } : {}),
          },
        },
        account_deletion_tombstones: {
          [tombstonedStableId]: { status: 'pending' },
        },
      });

      await expect(resolveStableUidForAuth(
        db as any,
        identityCase.authUid,
        identityCase.requestedStableId,
        { repairLinks: false },
      )).rejects.toMatchObject({
        code: 'failed-precondition',
        message: 'identity_retired',
      });
      expect(sets).toEqual([]);
    },
  );

  it.each(hiddenResolutionCases.flatMap((identityCase) => [
    [identityCase.label, 'hidden source H', identityCase, identityCase.hiddenStableId],
    [identityCase.label, 'effective canonical C', identityCase, identityCase.canonicalStableId],
  ] as const))(
    'maps %s %s tombstone read faults to identity_check_unavailable',
    async (_pathLabel, _targetLabel, identityCase, faultedStableId) => {
      const { db, sets } = makeDbStub({
        auth_links: identityCase.authLinks,
        users: {
          [identityCase.hiddenStableId]: {
            ...(identityCase.hiddenOwner ? { firebaseAuthUid: identityCase.hiddenOwner } : {}),
            identityHidden: true,
            canonicalStableId: identityCase.canonicalStableId,
          },
          [identityCase.canonicalStableId]: {
            ...(identityCase.canonicalOwner ? { firebaseAuthUid: identityCase.canonicalOwner } : {}),
          },
        },
      }, {
        readFaultAt: { [`account_deletion_tombstones/${faultedStableId}`]: 1 },
      });

      const outcome = await captureOutcome(resolveStableUidForAuth(
        db as any,
        identityCase.authUid,
        identityCase.requestedStableId,
        { repairLinks: false },
      ));
      expect(sets).toEqual([]);
      expect(outcome).toEqual(IDENTITY_CHECK_UNAVAILABLE);
    },
  );

  it.each([
    ['removed anon claim', 'remove_claim'],
    ['expired anon claim', 'expire_claim'],
    ['new provider link', 'add_provider_link'],
  ])('rejects provider relink when its %s changes before commit', async (_label, mutation) => {
    const stableId = 'stable-relink-proof-race';
    const oldAuthUid = 'old-anon-proof-owner';
    const newAuthUid = 'new-provider-proof-owner';
    const { db, store, sets, transactionCommits } = makeDbStub({
      users: {
        [stableId]: {
          firebaseAuthUid: oldAuthUid,
          anon_merge_claim: { authUid: oldAuthUid, at: 1_777_000_000_000 },
          updatedAt: 111,
        },
      },
    }, {
      beforeTransactionCommit: (currentStore) => {
        const current = currentStore.users[stableId] ?? {};
        if (mutation === 'remove_claim') {
          const { anon_merge_claim: _removed, ...withoutClaim } = current;
          currentStore.users[stableId] = withoutClaim;
        } else if (mutation === 'expire_claim') {
          currentStore.users[stableId] = {
            ...current,
            anon_merge_claim: { authUid: oldAuthUid, at: 1_776_000_000_000 },
          };
        } else {
          currentStore.users[stableId] = {
            ...current,
            linkedAuth: { provider: 'apple', providerUid: 'foreign-provider-auth' },
          };
        }
      },
    });

    await expect(resolveStableUidForAuth(db as any, newAuthUid, stableId, {
      allowProviderRelink: true,
    })).rejects.toMatchObject({
      code: 'permission-denied',
      message: 'stable_id_mismatch',
    });
    expect(store.users[stableId]?.firebaseAuthUid).toBe(oldAuthUid);
    expect(sets).toEqual([]);
    expect(transactionCommits).toEqual([]);
  });

  it('rejects a foreign owner inserted after ownership preflight but before the repair transaction', async () => {
    const stableId = 'stable-preflight-gap';
    const oldAuthUid = 'old-preflight-owner';
    const newAuthUid = 'new-preflight-owner';
    const { db, store, sets, transactionCommits } = makeDbStub({
      users: {
        [stableId]: {
          firebaseAuthUid: oldAuthUid,
          anon_merge_claim: { authUid: oldAuthUid, at: 1_777_000_000_000 },
        },
      },
    }, {
      beforeTransactionStart: (currentStore) => {
        currentStore.users[stableId] = {
          firebaseAuthUid: 'foreign-owner-after-preflight',
        };
      },
    });

    await expect(resolveStableUidForAuth(db as any, newAuthUid, stableId, {
      allowProviderRelink: true,
    })).rejects.toMatchObject({
      code: 'permission-denied',
      message: 'stable_id_mismatch',
    });
    expect(store.users[stableId]).toEqual({ firebaseAuthUid: 'foreign-owner-after-preflight' });
    expect(sets).toEqual([]);
    expect(transactionCommits).toEqual([]);
  });

  it('rejects relink when another user becomes authoritative for the caller before commit', async () => {
    const stableId = 'stable-relink-other-owner-race';
    const oldAuthUid = 'old-anon-other-owner';
    const newAuthUid = 'new-provider-other-owner';
    const { db, store, sets, transactionCommits } = makeDbStub({
      users: {
        [stableId]: {
          firebaseAuthUid: oldAuthUid,
          anon_merge_claim: { authUid: oldAuthUid, at: 1_777_000_000_000 },
          updatedAt: 111,
        },
      },
    }, {
      beforeTransactionCommit: (currentStore) => {
        currentStore.users['concurrent-authoritative-user'] = {
          firebaseAuthUid: newAuthUid,
          updatedAt: 222,
        };
      },
    });

    await expect(resolveStableUidForAuth(db as any, newAuthUid, stableId, {
      allowProviderRelink: true,
    })).rejects.toMatchObject({
      code: 'permission-denied',
      message: 'stable_id_mismatch',
    });
    expect(store.users[stableId]?.firebaseAuthUid).toBe(oldAuthUid);
    expect(store.users['concurrent-authoritative-user']?.firebaseAuthUid).toBe(newAuthUid);
    expect(sets).toEqual([]);
    expect(transactionCommits).toEqual([]);
  });

  it('fails closed when the account-deletion marker read is unavailable', async () => {
    const authUid = 'marker-read-fault';
    const { db, sets } = makeDbStub({}, {
      readFaultAt: { [`account_deletion_auth_markers/${authUid}`]: 1 },
    });

    const outcome = await captureOutcome(resolveStableUidForAuth(db as any, authUid, authUid));

    expect(sets).toEqual([]);
    expect(outcome).toEqual(IDENTITY_CHECK_UNAVAILABLE);
  });

  it('fails closed when the auth_links anchor read is unavailable', async () => {
    const authUid = 'anchor-read-fault';
    const { db, sets } = makeDbStub({}, {
      readFaultAt: { [`auth_links/${authUid}`]: 1 },
    });

    const outcome = await captureOutcome(resolveStableUidForAuth(db as any, authUid, authUid));

    expect(sets).toEqual([]);
    expect(outcome).toEqual(IDENTITY_CHECK_UNAVAILABLE);
  });

  it('fails closed when the authoritative owner query fails even if a linkedAuth hint exists', async () => {
    const authUid = 'authoritative-query-fault';
    const { db, sets } = makeDbStub({
      users: {
        'hint-only-stable': { linkedAuth: { providerUid: authUid }, updatedAt: 999 },
      },
    }, {
      readFaultAt: { [`query:users:firebaseAuthUid:${authUid}`]: 1 },
    });

    const outcome = await captureOutcome(resolveStableUidForAuth(db as any, authUid));

    expect(sets).toEqual([]);
    expect(outcome).toEqual(IDENTITY_CHECK_UNAVAILABLE);
  });

  it('fails closed when the linkedAuth hint query is unavailable', async () => {
    const authUid = 'hint-query-fault';
    const { db, sets } = makeDbStub({}, {
      readFaultAt: { [`query:users:linkedAuth.providerUid:${authUid}`]: 1 },
    });

    const outcome = await captureOutcome(resolveStableUidForAuth(db as any, authUid));

    expect(sets).toEqual([]);
    expect(outcome).toEqual(IDENTITY_CHECK_UNAVAILABLE);
  });

  it('checks the tombstone for selected anchor S1 instead of requested S2', async () => {
    const authUid = 'anchored-auth';
    const { db, sets } = makeDbStub({
      auth_links: { [authUid]: { stable_id: 'stable-s1' } },
      users: { 'stable-s1': { firebaseAuthUid: authUid } },
      account_deletion_tombstones: { 'stable-s1': { deletedAt: 123 } },
    });

    const outcome = await captureOutcome(resolveStableUidForAuth(db as any, authUid, 'stable-s2'));

    expect(sets).toEqual([]);
    expect(outcome).toEqual({
      status: 'rejected',
      code: 'failed-precondition',
      message: 'identity_retired',
    });
  });

  it('checks the tombstone for selected canonical C behind hidden anchor H', async () => {
    const authUid = 'hidden-anchor-auth';
    const { db, sets } = makeDbStub({
      auth_links: { [authUid]: { stable_id: 'stable-hidden-h' } },
      users: {
        'stable-hidden-h': {
          firebaseAuthUid: authUid,
          identityHidden: true,
          canonicalStableId: 'stable-canonical-c',
        },
        'stable-canonical-c': { firebaseAuthUid: authUid },
      },
      account_deletion_tombstones: { 'stable-canonical-c': { deletedAt: 456 } },
    });

    const outcome = await captureOutcome(resolveStableUidForAuth(db as any, authUid, 'stable-requested'));

    expect(sets).toEqual([]);
    expect(outcome).toEqual({
      status: 'rejected',
      code: 'failed-precondition',
      message: 'identity_retired',
    });
  });

  it('fails closed when the selected stable tombstone read is unavailable', async () => {
    const authUid = 'tombstone-read-fault';
    const { db, sets } = makeDbStub({
      auth_links: { [authUid]: { stable_id: 'stable-selected' } },
      users: { 'stable-selected': { firebaseAuthUid: authUid } },
    }, {
      readFaultAt: { 'account_deletion_tombstones/stable-selected': 1 },
    });

    const outcome = await captureOutcome(resolveStableUidForAuth(db as any, authUid, 'stable-requested'));

    expect(sets).toEqual([]);
    expect(outcome).toEqual(IDENTITY_CHECK_UNAVAILABLE);
  });

  it('fails closed when the canonical user read behind a hidden anchor is unavailable', async () => {
    const authUid = 'canonical-read-fault';
    const { db, sets } = makeDbStub({
      auth_links: { [authUid]: { stable_id: 'stable-hidden' } },
      users: {
        'stable-hidden': {
          firebaseAuthUid: authUid,
          identityHidden: true,
          canonicalStableId: 'stable-canonical',
        },
        'stable-canonical': { firebaseAuthUid: authUid },
      },
    }, {
      readFaultAt: { 'users/stable-canonical': 1 },
    });

    const outcome = await captureOutcome(resolveStableUidForAuth(db as any, authUid));

    expect(sets).toEqual([]);
    expect(outcome).toEqual(IDENTITY_CHECK_UNAVAILABLE);
  });

  it('allows provider sign-in to repair a stable id still linked to the old anonymous auth uid', async () => {
    const { db, store } = makeDbStub({
      users: {
        'stable-1': {
          firebaseAuthUid: 'old-anon-auth',
          anon_merge_claim: { authUid: 'old-anon-auth', at: 1_777_000_000_000 },
          updatedAt: 111,
        },
      },
    });

    const stableUid = await resolveStableUidForAuth(db as any, 'google-auth-1', 'stable-1', {
      allowProviderRelink: true,
    });

    expect(stableUid).toBe('stable-1');
    expect(store.users['stable-1']).toMatchObject({
      firebaseAuthUid: 'google-auth-1',
      updatedAt: 1_777_000_000_000,
    });
  });

  it('does not let an anonymous auth session take over a stable id linked to a different auth uid', async () => {
    const { db } = makeDbStub({
      users: {
        'stable-1': { firebaseAuthUid: 'old-anon-auth', updatedAt: 111 },
      },
    });

    await expect(resolveStableUidForAuth(db as any, 'new-anon-auth', 'stable-1')).rejects.toMatchObject({
      code: 'permission-denied',
      message: 'stable_id_mismatch',
    });
  });

  it('routes a provider auth uid back to its authoritative owner instead of the requested stable id', async () => {
    const { db } = makeDbStub({
      users: {
        'stable-1': {
          firebaseAuthUid: 'old-anon-auth',
          anon_merge_claim: { authUid: 'old-anon-auth', at: 1_777_000_000_000 },
          updatedAt: 111,
        },
        'stable-2': { firebaseAuthUid: 'google-auth-1', updatedAt: 222 },
      },
    });

    await expect(
      resolveStableUidForAuth(db as any, 'google-auth-1', 'stable-1', { allowProviderRelink: true }),
    ).resolves.toBe('stable-2');
  });

  it('chooses a stable id by deterministic identity ranking across multiple linked user docs', async () => {
    const { db } = makeDbStub({
      users: {
        'stable-old': {
          firebaseAuthUid: 'google-auth-1',
          progress: { user_total_xp: '1200' },
          updatedAt: 111,
          identityHidden: true,
          canonicalStableId: 'stable-main',
        },
        'stable-main': {
          firebaseAuthUid: 'google-auth-1',
          progress: { user_total_xp: '3400' },
          updatedAt: 222,
        },
        'stable-noise': {
          firebaseAuthUid: 'google-auth-1',
          progress: { user_total_xp: '9999' },
          updatedAt: 333,
        },
      },
    });

    const stableUid = await resolveStableUidForAuth(db as any, 'google-auth-1');

    expect(stableUid).toBe('stable-noise');
  });

  it('returns canonical stable id when the direct document is hidden', async () => {
    const { db } = makeDbStub({
      users: {
        'stable-hidden': {
          firebaseAuthUid: 'google-auth-2',
          identityHidden: true,
          canonicalStableId: 'stable-visible',
          updatedAt: 111,
        },
        'stable-visible': {
          firebaseAuthUid: 'google-auth-2',
          progress: { user_total_xp: '50' },
          updatedAt: 222,
        },
      },
    });

    const stableUid = await resolveStableUidForAuth(db as any, 'google-auth-2');

    expect(stableUid).toBe('stable-visible');
  });

  it('falls back to the live provider-owned document when its canonical target is missing', async () => {
    const { db } = makeDbStub({
      users: {
        'stable-hidden': {
          firebaseAuthUid: 'google-auth-orphan',
          linkedAuth: { providerUid: 'google-auth-orphan' },
          identityHidden: true,
          canonicalStableId: 'stable-missing',
          progress: { user_total_xp: '500' },
          updatedAt: 333,
        },
      },
    });

    const stableUid = await resolveStableUidForAuth(db as any, 'google-auth-orphan');

    expect(stableUid).toBe('stable-hidden');
  });

  it('falls back to direct auth uid when no owner is resolvable', async () => {
    const { db } = makeDbStub({
      users: {
        'google-auth-3': { progress: { user_total_xp: '7' }, updatedAt: 111 },
      },
    });

    const stableUid = await resolveStableUidForAuth(db as any, 'google-auth-3');

    expect(stableUid).toBe('google-auth-3');
  });

  it('returns the direct auth uid without creating a user when requireKnownIdentity is false', async () => {
    const { db, sets } = makeDbStub({
      users: {},
    });

    await expect(resolveStableUidForAuth(db as any, 'google-auth-4')).resolves.toBe('google-auth-4');
    expect(sets).toEqual([]);
  });

  it('repairs a canonical user through an auth_link that still points to hidden source H', async () => {
    const { db, store } = makeDbStub({
      auth_links: { 'hidden-default-owner': { stable_id: 'hidden-default-h' } },
      users: {
        'hidden-default-h': {
          identityHidden: true,
          canonicalStableId: 'hidden-default-c',
        },
        'hidden-default-c': { firebaseAuthUid: 'hidden-default-owner' },
      },
    });

    await expect(resolveStableUidForAuth(db as any, 'hidden-default-owner')).resolves.toBe(
      'hidden-default-c',
    );
    expect(store.users['hidden-default-c']).toMatchObject({ firebaseAuthUid: 'hidden-default-owner' });
  });

  it('rejects a poisoned direct canonical pointer without authoritative ownership proof', async () => {
    const { db, store } = makeDbStub({
      users: {
        'attacker-auth': {
          firebaseAuthUid: 'attacker-auth',
          linkedAuth: { providerUid: 'attacker-auth' },
          identityHidden: true,
          canonicalStableId: 'victim-stable',
          updatedAt: 111,
        },
        'victim-stable': {
          firebaseAuthUid: 'victim-auth',
          linkedAuth: { providerUid: 'victim-auth' },
          progress: { user_total_xp: '9000' },
          updatedAt: 222,
        },
      },
    });

    await expect(
      ensureStableLinkForAuth(db as any, 'attacker-auth', undefined, 'anonymous'),
    ).rejects.toMatchObject({
      code: 'permission-denied',
      message: 'stable_id_mismatch',
    });
    expect(store.auth_links['attacker-auth']).toBeUndefined();
    expect(store.users['victim-stable']).toMatchObject({ firebaseAuthUid: 'victim-auth' });
  });

  it('keeps the authoritative auth_links anchor when its canonical pointer is not owned', async () => {
    const { db } = makeDbStub({
      auth_links: {
        'attacker-auth': { stable_id: 'anchored-stable', providerUid: 'attacker-auth' },
      },
      users: {
        'anchored-stable': {
          firebaseAuthUid: 'attacker-auth',
          identityHidden: true,
          canonicalStableId: 'victim-stable',
          updatedAt: 111,
        },
        'victim-stable': {
          firebaseAuthUid: 'victim-auth',
          progress: { user_total_xp: '9000' },
          updatedAt: 222,
        },
      },
    });

    await expect(resolveStableUidForAuth(db as any, 'attacker-auth')).resolves.toBe('anchored-stable');
  });

  it('treats linkedAuth.providerUid as discovery only when auth_links is missing', async () => {
    const { db, store } = makeDbStub({
      users: {
        'hinted-stable': {
          linkedAuth: { providerUid: 'attacker-auth' },
          progress: { user_total_xp: '9000' },
          updatedAt: 222,
        },
      },
    });

    await expect(
      ensureStableLinkForAuth(db as any, 'attacker-auth', undefined, 'google.com'),
    ).rejects.toMatchObject({
      code: 'permission-denied',
      message: 'stable_id_mismatch',
    });
    expect(store.auth_links['attacker-auth']).toBeUndefined();
    expect(store.users['hinted-stable']?.firebaseAuthUid).toBeUndefined();
  });

  it('always prefers an authoritative firebaseAuthUid owner over a newer linkedAuth hint and request', async () => {
    const { db, store } = makeDbStub({
      users: {
        'stable-authoritative': {
          firebaseAuthUid: 'provider-auth-mixed',
          progress: { user_total_xp: '1' },
          updatedAt: 10,
        },
        'stable-hint-only': {
          linkedAuth: {
            provider: 'google',
            providerUid: 'provider-auth-mixed',
          },
          progress: { user_total_xp: '999999' },
          updatedAt: 9_999_999,
        },
      },
    });

    const stableUid = await resolveStableUidForAuth(
      db as any,
      'provider-auth-mixed',
      'stable-hint-only',
      { allowProviderRelink: true },
    );

    expect(stableUid).toBe('stable-authoritative');
    expect(store.users['stable-authoritative']).toMatchObject({
      firebaseAuthUid: 'provider-auth-mixed',
    });
    expect(store.users['stable-hint-only']?.firebaseAuthUid).toBeUndefined();
  });
});

describe('ensureStableLinkForAuth', () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(1_777_000_000_000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('atomically bootstraps a fresh anonymous identity without client Firestore writes', async () => {
    const { db, store, transactionCommits } = makeDbStub();

    const result = await ensureStableLinkForAuth(db as any, 'anon-auth-1', 'stable-new-1', 'anonymous');

    expect(result).toEqual({
      ok: true,
      stableUid: 'stable-new-1',
      authUid: 'anon-auth-1',
      identityReady: true,
    });
    expect(store.users['stable-new-1']).toEqual({
      firebaseAuthUid: 'anon-auth-1',
      updatedAt: 1_777_000_000_000,
    });
    expect(store.auth_links['anon-auth-1']).toEqual({
      stable_id: 'stable-new-1',
      updatedAt: 1_777_000_000_000,
    });
    expectSingleTransactionPaths(transactionCommits, [
      'users/stable-new-1',
      'auth_links/anon-auth-1',
      'jarvis_growth_daily/2026-04-24',
    ]);
  });

  it('atomically bootstraps a fresh provider identity with server-owned provider metadata', async () => {
    const { db, store, transactionCommits } = makeDbStub();

    const result = await ensureStableLinkForAuth(
      db as any,
      'google-auth-new',
      'stable-new-provider',
      'google.com',
      {
        email: 'new@example.com',
        displayName: 'New User',
        lastSignInAt: 1_777_000_001_234,
        devicePlatform: 'android',
      },
    );

    expect(result).toEqual({
      ok: true,
      stableUid: 'stable-new-provider',
      authUid: 'google-auth-new',
      identityReady: true,
    });
    expect(store.users['stable-new-provider']).toEqual({
      firebaseAuthUid: 'google-auth-new',
      linkedAuth: {
        provider: 'google',
        providerUid: 'google-auth-new',
        email: 'new@example.com',
        displayName: 'New User',
        linkedAt: 1_777_000_000_000,
        lastSignInAt: 1_777_000_001_234,
        devicePlatform: 'android',
      },
      updatedAt: 1_777_000_000_000,
    });
    expect(store.auth_links['google-auth-new']).toEqual({
      stable_id: 'stable-new-provider',
      updatedAt: 1_777_000_000_000,
      providerUid: 'google-auth-new',
      provider: 'google',
      linkedAt: 1_777_000_000_000,
      lastSignInAt: 1_777_000_001_234,
      devicePlatform: 'android',
      email: 'new@example.com',
      displayName: 'New User',
    });
    expectSingleTransactionPaths(transactionCommits, [
      'users/stable-new-provider',
      'auth_links/google-auth-new',
      'jarvis_growth_daily/2026-04-24',
    ]);
  });

  it('atomically bootstraps the fresh anonymous S === A identity', async () => {
    const { db, store, transactionCommits } = makeDbStub();

    const result = await ensureStableLinkForAuth(
      db as any,
      'fresh-anonymous-same-id',
      'fresh-anonymous-same-id',
      'anonymous',
    );

    expect(result).toEqual({
      ok: true,
      stableUid: 'fresh-anonymous-same-id',
      authUid: 'fresh-anonymous-same-id',
      identityReady: true,
    });
    expect(store.users['fresh-anonymous-same-id']).toMatchObject({
      firebaseAuthUid: 'fresh-anonymous-same-id',
    });
    expect(store.auth_links['fresh-anonymous-same-id']).toMatchObject({
      stable_id: 'fresh-anonymous-same-id',
    });
    expectSingleTransactionPaths(transactionCommits, [
      'users/fresh-anonymous-same-id',
      'auth_links/fresh-anonymous-same-id',
      'jarvis_growth_daily/2026-04-24',
    ]);
  });

  it('atomically bootstraps a fresh Apple identity', async () => {
    const { db, store, transactionCommits } = makeDbStub();

    const result = await ensureStableLinkForAuth(
      db as any,
      'apple-auth-new',
      'stable-new-apple',
      'apple.com',
      {
        email: 'apple-owner@example.invalid',
        displayName: 'Apple Fixture',
        devicePlatform: 'ios',
      },
    );

    expect(result).toEqual({
      ok: true,
      stableUid: 'stable-new-apple',
      authUid: 'apple-auth-new',
      identityReady: true,
    });
    expect(store.users['stable-new-apple']).toMatchObject({
      firebaseAuthUid: 'apple-auth-new',
      linkedAuth: { provider: 'apple', providerUid: 'apple-auth-new' },
    });
    expect(store.auth_links['apple-auth-new']).toMatchObject({
      stable_id: 'stable-new-apple',
      provider: 'apple',
      providerUid: 'apple-auth-new',
    });
    expectSingleTransactionPaths(transactionCommits, [
      'users/stable-new-apple',
      'auth_links/apple-auth-new',
      'jarvis_growth_daily/2026-04-24',
    ]);
  });

  it.each([
    ['google.com', 'google'],
    ['apple.com', 'apple'],
  ])('fails closed for an orphan %s auth_links anchor even when requested stableId matches', async (
    signInProvider,
    provider,
  ) => {
    const authUid = `${provider}-auth-orphan`;
    const stableId = `${provider}-stable-orphan`;
    const originalLink = {
      stable_id: stableId,
      providerUid: authUid,
      provider,
      updatedAt: 111,
    };
    const { db, store, transactionCommits } = makeDbStub({
      auth_links: { [authUid]: originalLink },
    });

    await expect(ensureStableLinkForAuth(
      db as any,
      authUid,
      stableId,
      signInProvider,
      { email: `${provider}-owner@example.invalid`, displayName: `${provider} fixture` },
    )).rejects.toMatchObject({
      code: 'permission-denied',
      message: 'stable_id_mismatch',
    });
    expect(store.users[stableId]).toBeUndefined();
    expect(store.auth_links[authUid]).toEqual(originalLink);
    expect(transactionCommits).toEqual([]);
  });

  it('does not bootstrap over an existing target document', async () => {
    const { db, store, transactionCommits } = makeDbStub({
      users: {
        'stable-existing': { progress: { user_total_xp: '25' }, updatedAt: 111 },
      },
    });

    await expect(
      ensureStableLinkForAuth(db as any, 'anon-auth-new', 'stable-existing', 'anonymous'),
    ).rejects.toMatchObject({ code: 'permission-denied', message: 'stable_id_mismatch' });
    expect(store.users['stable-existing']).toEqual({
      progress: { user_total_xp: '25' },
      updatedAt: 111,
    });
    expect(store.auth_links['anon-auth-new']).toBeUndefined();
    expect(transactionCommits).toEqual([[]]);
  });

  it('fails closed when the requested target appears during the bootstrap transaction', async () => {
    let raceInjected = 0;
    const { db, store, transactionCommits } = makeDbStub({}, {
      beforeTransactionCommit: (currentStore) => {
        raceInjected += 1;
        currentStore.users['stable-race'] = {
          firebaseAuthUid: 'other-auth',
          progress: { user_total_xp: '99' },
          updatedAt: 222,
        };
      },
    });

    await expect(
      ensureStableLinkForAuth(db as any, 'anon-auth-race', 'stable-race', 'anonymous'),
    ).rejects.toMatchObject({ code: 'permission-denied', message: 'stable_id_mismatch' });
    expect(raceInjected).toBe(1);
    expect(store.users['stable-race']).toEqual({
      firebaseAuthUid: 'other-auth',
      progress: { user_total_xp: '99' },
      updatedAt: 222,
    });
    expect(store.auth_links['anon-auth-race']).toBeUndefined();
    expect(transactionCommits).toEqual([]);
  });

  it('returns an auth_links anchor that appears during the bootstrap transaction', async () => {
    const { db, store, transactionCommits } = makeDbStub({}, {
      beforeTransactionCommit: (currentStore) => {
        currentStore.users['stable-authoritative'] = {
          firebaseAuthUid: 'google-auth-race',
          updatedAt: 222,
        };
        currentStore.auth_links['google-auth-race'] = {
          stable_id: 'stable-authoritative',
          providerUid: 'google-auth-race',
          provider: 'google',
          updatedAt: 222,
        };
      },
    });

    const result = await ensureStableLinkForAuth(
      db as any,
      'google-auth-race',
      'stable-requested',
      'google.com',
      { email: 'race@example.com', displayName: 'Race User' },
    );

    expect(result).toEqual({
      ok: true,
      stableUid: 'stable-authoritative',
      authUid: 'google-auth-race',
      identityReady: true,
    });
    expect(store.users['stable-requested']).toBeUndefined();
    expect(store.auth_links['google-auth-race']).toMatchObject({
      stable_id: 'stable-authoritative',
    });
    expect(transactionCommits).toEqual([[]]);
  });

  it.each([
    ['auth marker', 'account_deletion_auth_markers', 'anon-auth-deleting'],
    ['stable tombstone', 'account_deletion_tombstones', 'stable-deleting'],
  ])('does not bootstrap when a deletion %s exists', async (_label, collectionName, documentId) => {
    const initial: Store = {
      [collectionName]: {
        [documentId]: { status: 'pending' },
      },
    };
    const { db, store, transactionCommits } = makeDbStub(initial);

    await expect(
      ensureStableLinkForAuth(db as any, 'anon-auth-deleting', 'stable-deleting', 'anonymous'),
    ).rejects.toMatchObject({
      code: 'failed-precondition',
      message: 'identity_retired',
    });
    expect(store.users['stable-deleting']).toBeUndefined();
    expect(store.auth_links['anon-auth-deleting']).toBeUndefined();
    expect(transactionCommits).toEqual([]);
  });

  it.each([
    ['auth marker', 'account_deletion_auth_markers', 'anon-auth-race-delete'],
    ['stable tombstone', 'account_deletion_tombstones', 'stable-race-delete'],
  ])('fails closed when a deletion %s appears during bootstrap', async (_label, collectionName, documentId) => {
    const { db, store, transactionCommits } = makeDbStub({}, {
      beforeTransactionCommit: (currentStore) => {
        currentStore[collectionName][documentId] = { status: 'pending' };
      },
    });

    await expect(
      ensureStableLinkForAuth(
        db as any,
        'anon-auth-race-delete',
        'stable-race-delete',
        'anonymous',
      ),
    ).rejects.toMatchObject({
      code: 'failed-precondition',
      message: 'identity_retired',
    });
    expect(store.users['stable-race-delete']).toBeUndefined();
    expect(store.auth_links['anon-auth-race-delete']).toBeUndefined();
    expect(transactionCommits).toEqual([]);
  });

  it('preserves an existing provider auth link when the client requests a new local stable id', async () => {
    const { db, store } = makeDbStub({
      auth_links: {
        'google-auth-1': {
          stable_id: 'remote-stable',
          providerUid: 'google-auth-1',
          provider: 'google',
          linkedAt: 111,
        },
      },
      users: {
        'remote-stable': { firebaseAuthUid: 'old-auth', updatedAt: 222 },
      },
    });

    const result = await ensureStableLinkForAuth(db as any, 'google-auth-1', 'local-stable', 'google.com');

    expect(result).toEqual({
      ok: true,
      stableUid: 'remote-stable',
      authUid: 'google-auth-1',
      identityReady: true,
    });
    expect(store.auth_links['google-auth-1']).toMatchObject({
      stable_id: 'remote-stable',
      providerUid: 'google-auth-1',
      provider: 'google',
      linkedAt: 111,
    });
    expect(store.users['remote-stable']).toMatchObject({
      firebaseAuthUid: 'google-auth-1',
      updatedAt: 1_777_000_000_000,
    });
    expect(store.users['local-stable']).toBeUndefined();
  });

  it('canonicalizes a provider pair when auth_links still anchors hidden source H', async () => {
    const { db, store, transactionCommits } = makeDbStub({
      auth_links: {
        'google-hidden-owner': {
          stable_id: 'google-hidden-h',
          providerUid: 'google-hidden-owner',
          provider: 'google',
        },
      },
      users: {
        'google-hidden-h': {
          identityHidden: true,
          canonicalStableId: 'google-hidden-c',
        },
        'google-hidden-c': { firebaseAuthUid: 'google-hidden-owner' },
      },
    });

    const result = await ensureStableLinkForAuth(
      db as any,
      'google-hidden-owner',
      'new-local-stable',
      'google.com',
    );

    expect(result).toEqual({
      ok: true,
      stableUid: 'google-hidden-c',
      authUid: 'google-hidden-owner',
      identityReady: true,
    });
    expect(store.auth_links['google-hidden-owner']).toMatchObject({
      stable_id: 'google-hidden-c',
      providerUid: 'google-hidden-owner',
      provider: 'google',
    });
    expect(store.users['google-hidden-c']).toMatchObject({
      firebaseAuthUid: 'google-hidden-owner',
      linkedAuth: { providerUid: 'google-hidden-owner', provider: 'google' },
    });
    expectSingleTransactionPaths(transactionCommits, [
      'users/google-hidden-c',
      'auth_links/google-hidden-owner',
    ]);
  });

  it('accepts a retry when another transaction fully canonicalizes hidden H to C first', async () => {
    const authUid = 'google-hidden-race-owner';
    const hiddenStableId = 'google-hidden-race-h';
    const canonicalStableId = 'google-hidden-race-c';
    const { db, store, transactionCommits } = makeDbStub({
      auth_links: {
        [authUid]: { stable_id: hiddenStableId, providerUid: authUid, provider: 'google' },
      },
      users: {
        [hiddenStableId]: {
          identityHidden: true,
          canonicalStableId,
        },
        [canonicalStableId]: { firebaseAuthUid: authUid },
      },
    }, {
      beforeTransactionCommit: (currentStore) => {
        currentStore.users[canonicalStableId] = {
          firebaseAuthUid: authUid,
          linkedAuth: { provider: 'google', providerUid: authUid },
        };
        currentStore.auth_links[authUid] = {
          stable_id: canonicalStableId,
          providerUid: authUid,
          provider: 'google',
        };
      },
    });

    await expect(ensureStableLinkForAuth(
      db as any,
      authUid,
      'new-local-race-stable',
      'google.com',
    )).resolves.toEqual({ ok: true, stableUid: canonicalStableId, authUid, identityReady: true });
    expect(store.users[canonicalStableId]).toMatchObject({
      firebaseAuthUid: authUid,
      linkedAuth: { providerUid: authUid, provider: 'google' },
    });
    expect(store.auth_links[authUid]).toMatchObject({
      stable_id: canonicalStableId,
      providerUid: authUid,
      provider: 'google',
    });
    expectSingleTransactionPaths(transactionCommits, [
      `users/${canonicalStableId}`,
      `auth_links/${authUid}`,
    ]);
  });

  it.each([
    [
      'foreign firebaseAuthUid with target linkedAuth',
      { firebaseAuthUid: 'foreign-firebase-owner', linkedAuth: { provider: 'google', providerUid: 'google-hidden-strict-owner' } },
    ],
    [
      'target firebaseAuthUid with foreign linkedAuth',
      { firebaseAuthUid: 'google-hidden-strict-owner', linkedAuth: { provider: 'google', providerUid: 'foreign-linked-owner' } },
    ],
    [
      'incomplete firebaseAuthUid-only target',
      { firebaseAuthUid: 'google-hidden-strict-owner' },
    ],
  ])('rejects hidden H to C retry with %s', async (_label, concurrentUser) => {
    const authUid = 'google-hidden-strict-owner';
    const hiddenStableId = 'google-hidden-strict-h';
    const canonicalStableId = 'google-hidden-strict-c';
    const { db, store, sets, transactionCommits } = makeDbStub({
      auth_links: {
        [authUid]: { stable_id: hiddenStableId, providerUid: authUid, provider: 'google' },
      },
      users: {
        [hiddenStableId]: { identityHidden: true, canonicalStableId },
        [canonicalStableId]: { firebaseAuthUid: authUid },
      },
    }, {
      beforeTransactionCommit: (currentStore) => {
        currentStore.users[canonicalStableId] = concurrentUser;
        currentStore.auth_links[authUid] = {
          stable_id: canonicalStableId,
          providerUid: authUid,
          provider: 'google',
        };
      },
    });

    await expect(ensureStableLinkForAuth(
      db as any,
      authUid,
      'new-local-strict-stable',
      'google.com',
    )).rejects.toMatchObject({
      code: 'permission-denied',
      message: 'stable_id_mismatch',
    });
    expect(store.users[canonicalStableId]).toEqual(concurrentUser);
    expect(store.auth_links[authUid]).toMatchObject({ stable_id: canonicalStableId });
    expect(sets).toEqual([]);
    expect(transactionCommits).toEqual([]);
  });

  it('rejects provider-null hidden H to C retry with firebaseAuthUid-only ownership', async () => {
    const authUid = 'anon-hidden-strict-owner';
    const hiddenStableId = 'anon-hidden-strict-h';
    const canonicalStableId = 'anon-hidden-strict-c';
    const { db, store, sets, transactionCommits } = makeDbStub({
      auth_links: { [authUid]: { stable_id: hiddenStableId } },
      users: {
        [hiddenStableId]: { identityHidden: true, canonicalStableId },
        [canonicalStableId]: { firebaseAuthUid: authUid },
      },
    }, {
      beforeTransactionCommit: (currentStore) => {
        currentStore.users[canonicalStableId] = { firebaseAuthUid: authUid };
        currentStore.auth_links[authUid] = { stable_id: canonicalStableId };
      },
    });

    await expect(ensureStableLinkForAuth(
      db as any,
      authUid,
      'new-local-anon-strict-stable',
      'anonymous',
    )).rejects.toMatchObject({
      code: 'permission-denied',
      message: 'stable_id_mismatch',
    });
    expect(store.users[canonicalStableId]).toEqual({ firebaseAuthUid: authUid });
    expect(store.auth_links[authUid]).toEqual({ stable_id: canonicalStableId });
    expect(sets).toEqual([]);
    expect(transactionCommits).toEqual([]);
  });

  it('recovers an existing provider-owned user when auth_links is missing', async () => {
    const { db, store } = makeDbStub({
      users: {
        'remote-stable': {
          firebaseAuthUid: 'google-auth-1',
          linkedAuth: { providerUid: 'google-auth-1' },
          progress: { user_total_xp: '123' },
          updatedAt: 222,
        },
      },
    });

    const result = await ensureStableLinkForAuth(db as any, 'google-auth-1', 'local-stable', 'google.com');

    expect(result).toEqual({
      ok: true,
      stableUid: 'remote-stable',
      authUid: 'google-auth-1',
      identityReady: true,
    });
    expect(store.auth_links['google-auth-1']).toMatchObject({
      stable_id: 'remote-stable',
      providerUid: 'google-auth-1',
      provider: 'google',
      linkedAt: 1_777_000_000_000,
    });
    expect(store.users['local-stable']).toBeUndefined();
  });

  it('writes provider linkedAuth and auth_link metadata on the server', async () => {
    const { db, store } = makeDbStub({
      users: {
        'stable-1': {
          firebaseAuthUid: 'old-anon-auth',
          anon_merge_claim: { authUid: 'old-anon-auth', at: 1_777_000_000_000 },
          updatedAt: 111,
        },
      },
    });

    const result = await ensureStableLinkForAuth(db as any, 'google-auth-1', 'stable-1', 'google.com', {
      email: 'user@example.com',
      displayName: 'User Name',
      lastSignInAt: 1_777_000_001_234,
      devicePlatform: 'android',
    });

    expect(result).toEqual({
      ok: true,
      stableUid: 'stable-1',
      authUid: 'google-auth-1',
      identityReady: true,
    });
    expect(store.auth_links['google-auth-1']).toMatchObject({
      stable_id: 'stable-1',
      providerUid: 'google-auth-1',
      provider: 'google',
      email: 'user@example.com',
      displayName: 'User Name',
      lastSignInAt: 1_777_000_001_234,
      devicePlatform: 'android',
    });
    expect(store.users['stable-1']).toMatchObject({
      firebaseAuthUid: 'google-auth-1',
      linkedAuth: {
        provider: 'google',
        providerUid: 'google-auth-1',
        email: 'user@example.com',
        displayName: 'User Name',
        linkedAt: 1_777_000_000_000,
        lastSignInAt: 1_777_000_001_234,
        devicePlatform: 'android',
      },
      updatedAt: 1_777_000_000_000,
    });
  });

  it.each([
    ['auth marker', 'account_deletion_auth_markers', 'provider-auth-race'],
    ['stable tombstone', 'account_deletion_tombstones', 'stable-provider-race'],
  ])('fails closed when a deletion %s appears before the provider pair commits', async (
    _label,
    collectionName,
    documentId,
  ) => {
    const { db, store, sets, transactionCommits } = makeDbStub({
      users: {
        'stable-provider-race': { firebaseAuthUid: 'provider-auth-race', updatedAt: 111 },
      },
    }, {
      beforeTransactionCommit: (currentStore) => {
        currentStore[collectionName][documentId] = { status: 'pending' };
      },
    });

    await expect(ensureStableLinkForAuth(
      db as any,
      'provider-auth-race',
      'stable-provider-race',
      'google.com',
      { email: 'race@example.invalid' },
    )).rejects.toMatchObject({
      code: 'failed-precondition',
      message: 'identity_retired',
    });
    expect(store.users['stable-provider-race']).toEqual({
      firebaseAuthUid: 'provider-auth-race',
      updatedAt: 111,
    });
    expect(store.auth_links['provider-auth-race']).toBeUndefined();
    expect(sets).toEqual([]);
    expect(transactionCommits).toEqual([]);
  });

  it('commits an existing provider user and auth_link together in one transaction', async () => {
    const { db, store, sets, transactionCommits } = makeDbStub({
      users: {
        'stable-provider-atomic': { firebaseAuthUid: 'provider-auth-atomic', updatedAt: 111 },
      },
    });

    const result = await ensureStableLinkForAuth(
      db as any,
      'provider-auth-atomic',
      'stable-provider-atomic',
      'google.com',
      { email: 'atomic@example.invalid' },
    );

    expect(result).toEqual({
      ok: true,
      stableUid: 'stable-provider-atomic',
      authUid: 'provider-auth-atomic',
      identityReady: true,
    });
    expect(store.users['stable-provider-atomic']).toMatchObject({
      firebaseAuthUid: 'provider-auth-atomic',
      linkedAuth: { provider: 'google', providerUid: 'provider-auth-atomic' },
    });
    expect(store.auth_links['provider-auth-atomic']).toMatchObject({
      stable_id: 'stable-provider-atomic',
      provider: 'google',
      providerUid: 'provider-auth-atomic',
    });
    expectSingleTransactionPaths(transactionCommits, [
      'users/stable-provider-atomic',
      'auth_links/provider-auth-atomic',
      'jarvis_growth_daily/2026-04-24',
    ]);
    const identitySets = sets.filter(({ path }) => (
      path === 'users/stable-provider-atomic' || path === 'auth_links/provider-auth-atomic'
    ));
    expect(identitySets).toHaveLength(2);
    expect(identitySets.map(({ path }) => path).sort()).toEqual([
      'users/stable-provider-atomic',
      'auth_links/provider-auth-atomic',
    ].sort());
  });

  it.each([
    ['user owner', 'users'],
    ['auth_link target', 'auth_links'],
  ])('does not overwrite a concurrent foreign %s during the provider-pair retry', async (
    _label,
    changedCollection,
  ) => {
    const { db, store, sets, transactionCommits } = makeDbStub({
      users: {
        'stable-provider-owner-race': {
          firebaseAuthUid: 'provider-owner-race',
          updatedAt: 111,
        },
      },
    }, {
      beforeTransactionCommit: (currentStore) => {
        if (changedCollection === 'users') {
          currentStore.users['stable-provider-owner-race'] = {
            firebaseAuthUid: 'concurrent-foreign-auth',
            updatedAt: 222,
          };
        } else {
          currentStore.auth_links['provider-owner-race'] = {
            stable_id: 'concurrent-foreign-stable',
            updatedAt: 222,
          };
        }
      },
    });

    await expect(ensureStableLinkForAuth(
      db as any,
      'provider-owner-race',
      'stable-provider-owner-race',
      'google.com',
      { email: 'owner-race@example.invalid' },
    )).rejects.toMatchObject({
      code: 'permission-denied',
      message: 'stable_id_mismatch',
    });
    if (changedCollection === 'users') {
      expect(store.users['stable-provider-owner-race']).toEqual({
        firebaseAuthUid: 'concurrent-foreign-auth',
        updatedAt: 222,
      });
      expect(store.auth_links['provider-owner-race']).toBeUndefined();
    } else {
      expect(store.users['stable-provider-owner-race']).toEqual({
        firebaseAuthUid: 'provider-owner-race',
        updatedAt: 111,
      });
      expect(store.auth_links['provider-owner-race']).toEqual({
        stable_id: 'concurrent-foreign-stable',
        updatedAt: 222,
      });
    }
    expect(sets).toEqual([]);
    expect(transactionCommits).toEqual([]);
  });

  it('does not recreate identity documents for an auth session marked for account deletion', async () => {
    const { db, sets } = makeDbStub({
      account_deletion_auth_markers: {
        'deleted-auth': { status: 'pending' },
      },
    });

    await expect(
      ensureStableLinkForAuth(db as any, 'deleted-auth', 'deleted-auth', 'google.com'),
    ).rejects.toMatchObject({
      code: 'failed-precondition',
      message: 'identity_retired',
    });
    expect(sets).toEqual([]);
  });

  it.each([
    [
      'auth marker',
      'auth' as const,
      'retired-auth-marker',
      'retired-stable-marker',
      'account_deletion_auth_markers',
      'retired-auth-marker',
    ],
    [
      'auth permanent denial',
      'auth' as const,
      'retired-auth-denial',
      'retired-stable-auth-denial',
      'account_deletion_permanent_denials',
      accountDeletePermanentDenialId('retired-auth-denial'),
    ],
    [
      'stable tombstone',
      'stable' as const,
      'retired-auth-tombstone',
      'retired-stable-tombstone',
      'account_deletion_tombstones',
      'retired-stable-tombstone',
    ],
    [
      'stable permanent denial',
      'stable' as const,
      'retired-auth-stable-denial',
      'retired-stable-denial',
      'account_deletion_permanent_denials',
      accountDeletePermanentDenialId('retired-stable-denial'),
    ],
  ])('returns a structured identity_retired error for a %s', async (
    _label,
    subject,
    authUid,
    stableUid,
    collectionName,
    documentId,
  ) => {
    const { db, sets } = makeDbStub({
      [collectionName]: {
        [documentId]: { status: 'permanent' },
      },
    });

    let caught: unknown;
    try {
      await ensureStableLinkForAuth(db as any, authUid, stableUid, 'anonymous');
    } catch (error) {
      caught = error;
    }

    expect(caught).toMatchObject({
      code: 'failed-precondition',
      message: 'identity_retired',
      details: {
        subject,
        recovery: 'create_fresh_anonymous',
      },
    });
    const details = (caught as { details?: unknown })?.details;
    expect(details).toEqual({ subject, recovery: 'create_fresh_anonymous' });
    expect(JSON.stringify(details)).not.toContain(authUid);
    expect(JSON.stringify(details)).not.toContain(stableUid);
    expect(sets).toEqual([]);
  });

  it('reports identityReady only after the exact user and auth-link identity pair exists', async () => {
    const authUid = 'ready-auth';
    const stableUid = 'ready-stable';
    const { db, store } = makeDbStub({
      users: {
        [stableUid]: { firebaseAuthUid: authUid, updatedAt: 111 },
      },
    });

    const result = await ensureStableLinkForAuth(
      db as any,
      authUid,
      stableUid,
      'google.com',
    );

    expect(store.users[stableUid]).toMatchObject({ firebaseAuthUid: authUid });
    expect(store.auth_links[authUid]).toMatchObject({ stable_id: stableUid });
    expect(result).toEqual({ ok: true, stableUid, authUid, identityReady: true });
  });
});
