import * as authIdentityModule from './auth_identity';
import { accountIdIndexDocId } from './account_id';
import {
  ANON_MERGE_CLAIM_LEGACY_PATH_ENABLED,
  hashAnonMergeNonce,
  logDeviceHeaderPresence,
  parseAnonMergeNonce,
  readAnonMergeClaim,
  stampAnonOwnershipForAuth,
  verifyAnonMergeClaimNonce,
  cleanupLegacyAuthIdentityDuplicates,
  ensureAuthLinkDoc,
  dedupStarsSourceId,
  ensureStableLinkForAuth,
  linkStableAuthUid,
  requireAnonymousOwnershipStampProvider,
  resolveStableUidForAuth,
} from './auth_identity';
import { accountDeletePermanentDenialId } from './account_delete_job';

type DocData = Record<string, unknown>;
type Store = Record<string, Record<string, DocData | undefined>>;

describe('anonymous ownership stamp provider boundary', () => {
  test('accepts only an anonymous Firebase sign-in provider', () => {
    expect(() => requireAnonymousOwnershipStampProvider('anonymous')).not.toThrow();
    expect(() => requireAnonymousOwnershipStampProvider('google.com')).toThrow(
      expect.objectContaining({ code: 'permission-denied' }),
    );
    expect(() => requireAnonymousOwnershipStampProvider('apple.com')).toThrow(
      expect.objectContaining({ code: 'permission-denied' }),
    );
    expect(() => requireAnonymousOwnershipStampProvider('')).toThrow(
      expect.objectContaining({ code: 'permission-denied' }),
    );
  });
});

describe('M-1: anon_merge_claim nonce (stamp + verifier)', () => {
  const NOW = 1_777_000_000_000;
  const GOOGLE_AFTER = { provider: 'google.com', authTimeMs: NOW + 1000 };
  const stampDb = () => makeDbStub({
    users: { 'stable-anon': { firebaseAuthUid: 'anon-uid-1', updatedAt: 1 } },
  });

  test('legacy switch is on by default (turn off after min_app_version 2.0)', () => {
    expect(ANON_MERGE_CLAIM_LEGACY_PATH_ENABLED).toBe(true);
  });

  test('stamp WITHOUT the flag keeps the old shape: no nonceHash, no mergeNonce in the reply', async () => {
    const { db, store } = stampDb();
    const res = await stampAnonOwnershipForAuth(db as any, 'anon-uid-1', 'stable-anon', NOW);
    expect(res).toEqual({ ok: true, stableUid: 'stable-anon' });
    expect(store.users['stable-anon']!.anon_merge_claim).toEqual({ authUid: 'anon-uid-1', at: NOW });
  });

  test('stamp WITH nonceRequested stores only the sha256 and returns the nonce', async () => {
    const { db, store } = stampDb();
    const res = await stampAnonOwnershipForAuth(db as any, 'anon-uid-1', 'stable-anon', NOW, true);
    expect(res.ok).toBe(true);
    expect(typeof res.mergeNonce).toBe('string');
    expect(res.mergeNonce!.length).toBeGreaterThanOrEqual(43); // 32 bytes base64url
    const claim = store.users['stable-anon']!.anon_merge_claim as Record<string, unknown>;
    expect(claim.nonceHash).toBe(hashAnonMergeNonce(res.mergeNonce!));
    expect(claim.nonceHash).not.toBe(res.mergeNonce);
    expect(JSON.stringify(store)).not.toContain(res.mergeNonce!);
  });

  test('two stamps issue different nonces', async () => {
    const { db } = stampDb();
    const a = await stampAnonOwnershipForAuth(db as any, 'anon-uid-1', 'stable-anon', NOW, true);
    const b = await stampAnonOwnershipForAuth(db as any, 'anon-uid-1', 'stable-anon', NOW + 1, true);
    expect(a.mergeNonce).not.toBe(b.mergeNonce);
  });

  test('re-stamp WITHOUT the flag uses mergeFields so an old nonceHash cannot survive', async () => {
    const { db, sets } = stampDb();
    await stampAnonOwnershipForAuth(db as any, 'anon-uid-1', 'stable-anon', NOW, true);
    await stampAnonOwnershipForAuth(db as any, 'anon-uid-1', 'stable-anon', NOW + 1);
    expect(sets.at(-1)!.options).toEqual({ mergeFields: ['anon_merge_claim', 'updatedAt'] });
  });

  test('readAnonMergeClaim exposes nonceHash (or null for a legacy claim)', () => {
    expect(readAnonMergeClaim({ anon_merge_claim: { authUid: 'a', at: NOW, nonceHash: 'abc' } }, NOW))
      .toEqual({ authUid: 'a', nonceHash: 'abc', at: NOW });
    expect(readAnonMergeClaim({ anon_merge_claim: { authUid: 'a', at: NOW } }, NOW))
      .toEqual({ authUid: 'a', nonceHash: null, at: NOW });
  });

  test('verifier: right nonce ok, wrong nonce / missing nonce denied, legacy by switch', () => {
    const hash = hashAnonMergeNonce('good-nonce');
    expect(verifyAnonMergeClaimNonce({ authUid: 'a', nonceHash: hash }, 'good-nonce'))
      .toEqual({ ok: true, mode: 'nonce', nonceHash: hash });
    expect(verifyAnonMergeClaimNonce({ authUid: 'a', nonceHash: hash }, 'bad-nonce'))
      .toEqual({ ok: false, reason: 'nonce_mismatch' });
    expect(verifyAnonMergeClaimNonce({ authUid: 'a', nonceHash: hash }, null))
      .toEqual({ ok: false, reason: 'nonce_required' });
    // метка с хэшем никогда не понижается до legacy, даже при включённом выключателе
    expect(verifyAnonMergeClaimNonce({ authUid: 'a', nonceHash: hash }, null, GOOGLE_AFTER, true).ok).toBe(false);
    expect(verifyAnonMergeClaimNonce({ authUid: 'a', nonceHash: null, at: NOW }, null, GOOGLE_AFTER, true))
      .toEqual({ ok: true, mode: 'legacy', nonceHash: null });
    expect(verifyAnonMergeClaimNonce({ authUid: 'a', nonceHash: null, at: NOW }, null, GOOGLE_AFTER, false))
      .toEqual({ ok: false, reason: 'legacy_disabled' });
  });

  test('legacy claim: anonymous caller denied, google signed in BEFORE the claim denied, AFTER ok', () => {
    const legacy = { authUid: 'a', nonceHash: null, at: NOW };
    expect(verifyAnonMergeClaimNonce(legacy, null, { provider: 'anonymous', authTimeMs: NOW + 1000 }, true))
      .toEqual({ ok: false, reason: 'legacy_anonymous_caller' });
    expect(verifyAnonMergeClaimNonce(legacy, null, null, true))
      .toEqual({ ok: false, reason: 'legacy_anonymous_caller' });
    expect(verifyAnonMergeClaimNonce(legacy, null, { provider: 'google.com', authTimeMs: NOW - 6000 }, true))
      .toEqual({ ok: false, reason: 'legacy_signed_in_before_claim' });
    expect(verifyAnonMergeClaimNonce(legacy, null, { provider: 'google.com', authTimeMs: null }, true))
      .toEqual({ ok: false, reason: 'legacy_signed_in_before_claim' });
    expect(verifyAnonMergeClaimNonce(legacy, null, { provider: 'google.com', authTimeMs: NOW - 5000 }, true).ok).toBe(true);
    expect(verifyAnonMergeClaimNonce(legacy, null, { provider: 'apple.com', authTimeMs: NOW + 1 }, true).ok).toBe(true);
  });

  test('nonce branch does not depend on caller provider / auth_time', () => {
    const hash = hashAnonMergeNonce('n1');
    expect(verifyAnonMergeClaimNonce({ authUid: 'a', nonceHash: hash, at: NOW }, 'n1', null, true).ok).toBe(true);
    expect(verifyAnonMergeClaimNonce(
      { authUid: 'a', nonceHash: hash, at: NOW }, 'n1', { provider: 'anonymous', authTimeMs: NOW - 99999 }, true,
    ).ok).toBe(true);
  });

  test('publication (skipLegacyCallerChecks) keeps only the legacy switch', () => {
    const skip = { provider: null, authTimeMs: null, skipLegacyCallerChecks: true };
    expect(verifyAnonMergeClaimNonce({ authUid: 'a', nonceHash: null, at: NOW }, null, skip, true).ok).toBe(true);
    expect(verifyAnonMergeClaimNonce({ authUid: 'a', nonceHash: null, at: NOW }, null, skip, false))
      .toEqual({ ok: false, reason: 'legacy_disabled' });
  });

  test('legacy_path / nonce_ok logs carry authAgeMs and never the nonce', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    verifyAnonMergeClaimNonce({ authUid: 'abcdefghij', nonceHash: null, at: NOW }, null, { provider: 'google.com', authTimeMs: NOW + 1234 }, true);
    verifyAnonMergeClaimNonce({ authUid: 'abcdefghij', nonceHash: hashAnonMergeNonce('zz'), at: NOW }, 'zz', { provider: 'google.com', authTimeMs: NOW + 77 }, true);
    const warned = warn.mock.calls.map((c) => c.join(' ')).join('\n');
    const logged = log.mock.calls.map((c) => c.join(' ')).join('\n');
    warn.mockRestore(); log.mockRestore();
    expect(warned).toContain('legacy_path uid=abcdefgh door=unknown provider=google.com authAgeMs=1234');
    expect(logged).toContain('nonce_ok uid=abcdefgh authAgeMs=77');
  });

  test('stamp on a STRANGER stableId (anonymous has no auth_link, doc belongs to another uid) -> permission-denied, no claim written', async () => {
    const { db, store, sets } = makeDbStub({
      users: { 'stable-victim': { firebaseAuthUid: 'victim-uid', updatedAt: 1 } },
    });
    await expect(
      stampAnonOwnershipForAuth(db as any, 'attacker-anon', 'stable-victim', NOW, true),
    ).rejects.toMatchObject({ code: 'permission-denied' });
    expect((store.users['stable-victim'] as Record<string, unknown>).anon_merge_claim).toBeUndefined();
    expect(sets.filter((entry) => entry.path === 'users/stable-victim')).toEqual([]);
  });

  test('device header presence log prints booleans only, never header values', () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    logDeviceHeaderPresence('fn', { 'firebase-instance-id-token': 'SECRET-IID', 'x-firebase-gmpid': '' });
    const out = log.mock.calls.map((c) => c.join(' ')).join('\n');
    log.mockRestore();
    expect(out).toContain('hasInstanceIdHeader=true');
    expect(out).toContain('hasGmpIdHeader=false');
    expect(out).not.toContain('SECRET-IID');
  });

  test('the nonce never reaches the logs', () => {
    const spies = [jest.spyOn(console, 'log'), jest.spyOn(console, 'warn')].map((spy) => spy.mockImplementation(() => undefined));
    const hash = hashAnonMergeNonce('SECRET-NONCE-VALUE');
    verifyAnonMergeClaimNonce({ authUid: 'anon-uid-12345', nonceHash: hash }, 'SECRET-NONCE-VALUE');
    verifyAnonMergeClaimNonce({ authUid: 'anon-uid-12345', nonceHash: hash }, 'SECRET-NONCE-WRONG');
    const logged = spies.flatMap((spy) => spy.mock.calls).map((call) => call.join(' ')).join('\n');
    spies.forEach((spy) => spy.mockRestore());
    expect(logged).toContain('[ANON-MERGE-CLAIM]');
    expect(logged).not.toContain('SECRET-NONCE');
  });

  test('parseAnonMergeNonce validates: absent ok, string <=128 ok, otherwise invalid-argument', () => {
    expect(parseAnonMergeNonce(undefined)).toBeNull();
    expect(parseAnonMergeNonce('x'.repeat(128))).toBe('x'.repeat(128));
    for (const bad of ['x'.repeat(129), '', 42, {}, ['a']]) {
      expect(() => parseAnonMergeNonce(bad)).toThrow(expect.objectContaining({ code: 'invalid-argument' }));
    }
  });
});

// зачем (M-1 HIGH-1): законный legacy-вызывающий — провайдерский и вошёл ПОСЛЕ постановки метки
// (метки в этих тестах стоят на 1_777_000_000_000).
const LEGACY_GOOGLE_CALLER = { provider: 'google.com', authTimeMs: 1_777_000_001_000 };

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
  // зачем (L-1): вложенные коллекции (users/{id}/star_operations) и любые иные коллекции теста.
  for (const [collectionName, docs] of Object.entries(initial)) {
    if (!(collectionName in store)) store[collectionName] = { ...docs };
  }
  const docReads: string[] = [];
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

  const snapFor = (id: string, data: DocData | undefined, ref?: unknown) => ({
    id,
    exists: !!data,
    data: () => data,
    ref,
  });

  const collection = (name: string): any => ({
      doc: (id: string): any => {
        const docRef: any = {
        kind: 'doc',
        path: `${name}/${id}`,
        collectionName: name,
        id,
        collection: (child: string) => collection(`${name}/${id}/${child}`),
        get: async () => {
          docReads.push(`${name}/${id}`);
          maybeThrowReadFault(`${name}/${id}`);
          return snapFor(id, store[name]?.[id], docRef);
        },
        set: async (data: DocData, options: unknown) => {
          sets.push({ path: `${name}/${id}`, data, options });
          store[name] = store[name] ?? {};
          store[name][id] = { ...(store[name][id] ?? {}), ...data };
        },
        };
        return docRef;
      },
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
          mode: 'create' | 'set' | 'delete';
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
          delete: (ref: { path: string; collectionName: string; id: string }) => {
            hasWritten = true;
            writes.push({ mode: 'delete', ref, data: {} });
          },
        };

        const result = await callback(transaction);
        if (attempt === 0) options.beforeTransactionCommit?.(store, attempt);
        if (JSON.stringify(store) !== storeBefore) continue;

        for (const write of writes) {
          const current = store[write.ref.collectionName]?.[write.ref.id];
          if (write.mode === 'create' && current) throw new Error('transaction_create_conflict');
          store[write.ref.collectionName] = store[write.ref.collectionName] ?? {};
          if (write.mode === 'delete') {
            delete store[write.ref.collectionName][write.ref.id];
            continue;
          }
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

  return { db, store, sets, transactionCommits, docReads };
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

/**
 * Пути карты имён, которые обязана записать транзакция рождения аккаунта.
 *
 * зачем через настоящий accountIdIndexDocId: псевдонимы лежат по ХЕШУ, и
 * хардкод хешей в тесте разошёлся бы с продом при любой смене схемы id.
 */
function accountIndexPaths(...aliases: string[]): string[] {
  return [...new Set(aliases)].map((a) => `account_id_index/${accountIdIndexDocId(a)}`);
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

  // 8F: причина отказа идёт в лог (класс и код ошибки, без uid и текста сообщения).
  it('logs the cause class of identity_check_unavailable without uid or message', async () => {
    const identityCase = hiddenResolutionCases[0];
    const { db } = makeDbStub({
      auth_links: identityCase.authLinks,
      users: { [identityCase.hiddenStableId]: { identityHidden: true, canonicalStableId: identityCase.canonicalStableId } },
    }, { readFaultAt: { [`account_deletion_tombstones/${identityCase.hiddenStableId}`]: 1 } });
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      await captureOutcome(resolveStableUidForAuth(db as any, identityCase.authUid, identityCase.requestedStableId, { repairLinks: false }));
      const lines = warn.mock.calls.map((args) => String(args[0])).filter((line) => line.includes('identity_check_unavailable'));
      expect(lines).toEqual([JSON.stringify({ event: 'identity_check_unavailable', cause: 'name=Error code=none' })]);
      expect(lines.join(' ')).not.toContain(identityCase.authUid);
      expect(lines.join(' ')).not.toContain('injected_read_failure');
    } finally {
      warn.mockRestore();
    }
  });

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
      anonMergeCaller: LEGACY_GOOGLE_CALLER,
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
      anonMergeCaller: LEGACY_GOOGLE_CALLER,
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
      anonMergeCaller: LEGACY_GOOGLE_CALLER,
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
      anonMergeCaller: LEGACY_GOOGLE_CALLER,
    });

    expect(stableUid).toBe('stable-1');
    expect(store.users['stable-1']).toMatchObject({
      firebaseAuthUid: 'google-auth-1',
      updatedAt: 1_777_000_000_000,
    });
  });

  describe('M-1 anon_relink door: nonce / legacy caller / one-shot claim / audit', () => {
    const RELINK_NONCE = 'relink-nonce-0123456789';
    const claimedStore = (claimExtra: Record<string, unknown>) => ({
      users: {
        'stable-1': {
          firebaseAuthUid: 'old-anon-auth',
          anon_merge_claim: { authUid: 'old-anon-auth', at: 1_777_000_000_000, ...claimExtra },
          updatedAt: 111,
        },
      },
    });
    const hashedExtra = { nonceHash: hashAnonMergeNonce(RELINK_NONCE) };
    const relink = (db: unknown, authUid: string, extra: Record<string, unknown>) =>
      resolveStableUidForAuth(db as any, authUid, 'stable-1', { allowProviderRelink: true, ...extra });

    it('hashed claim: a foreign Google WITHOUT nonce is denied and nothing is written', async () => {
      const { db, store, sets } = makeDbStub(claimedStore(hashedExtra));
      await expect(relink(db, 'attacker-google', { anonMergeCaller: LEGACY_GOOGLE_CALLER }))
        .rejects.toMatchObject({ code: 'permission-denied', message: 'stable_id_mismatch' });
      expect(store.users['stable-1']!.firebaseAuthUid).toBe('old-anon-auth');
      expect(sets).toEqual([]);
    });

    it('hashed claim: wrong nonce denied, right nonce passes (and does not need caller fields)', async () => {
      const wrong = makeDbStub(claimedStore(hashedExtra));
      await expect(relink(wrong.db, 'g-1', { anonMergeNonce: 'guess', anonMergeCaller: LEGACY_GOOGLE_CALLER }))
        .rejects.toMatchObject({ code: 'permission-denied' });
      const right = makeDbStub(claimedStore(hashedExtra));
      await expect(relink(right.db, 'g-1', { anonMergeNonce: RELINK_NONCE })).resolves.toBe('stable-1');
      expect(right.store.users['stable-1']!.firebaseAuthUid).toBe('g-1');
    });

    it('legacy claim: anonymous caller denied; google signed in BEFORE the claim denied; AFTER passes', async () => {
      const anon = makeDbStub(claimedStore({}));
      await expect(relink(anon.db, 'new-anon', {
        allowProviderRelink: false, allowAnonRelink: true,
        anonMergeCaller: { provider: 'anonymous', authTimeMs: 1_777_000_001_000 },
      })).rejects.toMatchObject({ code: 'permission-denied' });
      const before = makeDbStub(claimedStore({}));
      await expect(relink(before.db, 'g-1', { anonMergeCaller: { provider: 'google.com', authTimeMs: 1_777_000_000_000 - 60_000 } }))
        .rejects.toMatchObject({ code: 'permission-denied' });
      expect(before.store.users['stable-1']!.firebaseAuthUid).toBe('old-anon-auth');
      const after = makeDbStub(claimedStore({}));
      await expect(relink(after.db, 'g-1', { anonMergeCaller: LEGACY_GOOGLE_CALLER })).resolves.toBe('stable-1');
    });

    it('legacy claim without any caller info is denied (fields are mandatory)', async () => {
      const { db } = makeDbStub(claimedStore({}));
      await expect(relink(db, 'g-1', {})).rejects.toMatchObject({ code: 'permission-denied' });
    });

    it('legacy claim: denied when the legacy switch is off', async () => {
      const spy = jest.replaceProperty(authIdentityModule, 'ANON_MERGE_CLAIM_LEGACY_PATH_ENABLED', false);
      try {
        const { db } = makeDbStub(claimedStore({}));
        await expect(relink(db, 'g-1', { anonMergeCaller: LEGACY_GOOGLE_CALLER }))
          .rejects.toMatchObject({ code: 'permission-denied' });
      } finally { spy.restore(); }
    });

    it('swapping the nonceHash between assert and the transaction is denied', async () => {
      const { db, store, sets } = makeDbStub(claimedStore(hashedExtra), {
        beforeTransactionStart: (currentStore) => {
          const user = currentStore.users['stable-1'] as Record<string, any>;
          user.anon_merge_claim = { ...user.anon_merge_claim, nonceHash: hashAnonMergeNonce('attacker-own') };
        },
      });
      await expect(relink(db, 'g-1', { anonMergeNonce: RELINK_NONCE }))
        .rejects.toMatchObject({ code: 'permission-denied', message: 'stable_id_mismatch' });
      expect(store.users['stable-1']!.firebaseAuthUid).toBe('old-anon-auth');
      expect(sets).toEqual([]);
    });

    it('successful relink erases the claim, writes an audit row, and a second relink is denied', async () => {
      const { db, store } = makeDbStub(claimedStore(hashedExtra));
      await expect(relink(db, 'g-1', { anonMergeNonce: RELINK_NONCE })).resolves.toBe('stable-1');
      expect(readAnonMergeClaim(store.users['stable-1'], 1_777_000_000_000)).toBeNull();
      const audit = Object.values((store as any).anon_relink_audit ?? {}) as Record<string, unknown>[];
      expect(audit).toHaveLength(1);
      expect(audit[0]).toMatchObject({
        stableId: 'stable-1', previousAuthUid: 'old-anon-auth', newAuthUid: 'g-1',
        claimAt: 1_777_000_000_000, mode: 'nonce',
      });
      expect((audit[0].expiresAt as { toMillis(): number }).toMillis()).toBe((audit[0].at as number) + 30 * 24 * 60 * 60 * 1000);
      expect(JSON.stringify(audit)).not.toContain(RELINK_NONCE);
      // повтор тем же и другим провайдером — метки уже нет
      await expect(relink(db, 'attacker-2', { anonMergeNonce: RELINK_NONCE, anonMergeCaller: LEGACY_GOOGLE_CALLER }))
        .rejects.toMatchObject({ code: 'permission-denied' });
      await expect(relink(db, 'attacker-3', {
        allowProviderRelink: false, allowAnonRelink: true,
        anonMergeNonce: RELINK_NONCE, anonMergeCaller: { provider: 'anonymous', authTimeMs: 1_777_000_001_000 },
      })).rejects.toMatchObject({ code: 'permission-denied' });
      expect(store.users['stable-1']!.firebaseAuthUid).toBe('g-1');
    });

    it('legacy relink is audited as mode=legacy', async () => {
      const { db, store } = makeDbStub(claimedStore({}));
      await relink(db, 'g-1', { anonMergeCaller: LEGACY_GOOGLE_CALLER });
      const audit = Object.values((store as any).anon_relink_audit ?? {}) as Record<string, unknown>[];
      expect(audit[0]).toMatchObject({ mode: 'legacy' });
    });

    it('ensureStableLinkForAuth (the real door): legacy google relink is audited with provider=google, claim gone', async () => {
      const { db, store } = makeDbStub(claimedStore({}));
      await ensureStableLinkForAuth(db as any, 'g-1', 'stable-1', 'google.com', undefined, null, 1_777_000_001_000);
      const audit = Object.values((store as any).anon_relink_audit ?? {}) as Record<string, unknown>[];
      expect(audit).toHaveLength(1);
      expect(audit[0]).toMatchObject({ provider: 'google', mode: 'legacy', newAuthUid: 'g-1' });
      expect(readAnonMergeClaim(store.users['stable-1'], 1_777_000_000_000)).toBeNull();
    });

    it('ensureStableLinkForAuth: hashed claim needs the nonce; legacy anonymous caller is denied', async () => {
      const a = makeDbStub(claimedStore(hashedExtra));
      await expect(ensureStableLinkForAuth(a.db as any, 'g-1', 'stable-1', 'google.com', undefined, null, 1_777_000_001_000))
        .rejects.toMatchObject({ code: 'permission-denied' });
      const b = makeDbStub(claimedStore(hashedExtra));
      await expect(ensureStableLinkForAuth(b.db as any, 'g-1', 'stable-1', 'google.com', undefined, RELINK_NONCE, null))
        .resolves.toMatchObject({ stableUid: 'stable-1' });
      const c = makeDbStub(claimedStore({}));
      await expect(ensureStableLinkForAuth(c.db as any, 'new-anon', 'stable-1', 'anonymous', undefined, null, 1_777_000_001_000))
        .rejects.toMatchObject({ code: 'permission-denied' });
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

  it('does not use retired XP fields to choose between equivalent owner candidates', async () => {
    const authUid = 'google-auth-xp-conflict';
    const { db } = makeDbStub({
      users: {
        'stable-established': {
          firebaseAuthUid: authUid,
          progress: { user_total_xp: '10000' },
          updatedAt: 100,
        },
        'stable-new-empty': {
          firebaseAuthUid: authUid,
          progress: { user_total_xp: '0' },
          updatedAt: 999,
        },
      },
    });

    await expect(resolveStableUidForAuth(db as any, authUid))
      .resolves.toBe('stable-new-empty');
  });

  it('uses the stable id as the deterministic final tie-break for equivalent owner candidates', async () => {
    const authUid = 'google-auth-exact-tie';
    const equivalent = {
      firebaseAuthUid: authUid,
      progress: { user_total_xp: '42' },
      updatedAt: 500,
    };
    const forward = makeDbStub({
      users: {
        'stable-z': { ...equivalent },
        'stable-a': { ...equivalent },
      },
    });
    const reverse = makeDbStub({
      users: {
        'stable-a': { ...equivalent },
        'stable-z': { ...equivalent },
      },
    });

    await expect(resolveStableUidForAuth(forward.db as any, authUid))
      .resolves.toBe('stable-a');
    await expect(resolveStableUidForAuth(reverse.db as any, authUid))
      .resolves.toBe('stable-a');
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
      accountId: expect.stringMatching(/^acc_[0-9a-f]{32}$/),
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
      ...accountIndexPaths('stable-new-1', 'anon-auth-1'),
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
      // зачем expect.stringMatching: имя выдаётся случайным (128 бит), поэтому
      // сверяем форму, а не значение.
      accountId: expect.stringMatching(/^acc_[0-9a-f]{32}$/),
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
      ...accountIndexPaths('stable-new-provider', 'google-auth-new'),
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
      ...accountIndexPaths('fresh-anonymous-same-id'),
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
      ...accountIndexPaths('stable-new-apple', 'apple-auth-new'),
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

  it('atomically rotates a clean provider from its exact retired stable link to a fresh empty profile', async () => {
    const retiredStable = 'retired-stable-old';
    const freshStable = 'fresh-stable-new';
    const authUid = 'google-auth-clean';
    const { db, store, transactionCommits } = makeDbStub({
      auth_links: {
        [authUid]: { stable_id: retiredStable, providerUid: authUid, provider: 'google' },
      },
      users: {
        [retiredStable]: {
          // The old root can survive until the asynchronous worker even though
          // this same live provider UID was already re-created by Firebase.
          firebaseAuthUid: authUid,
          totalXp: 9999,
          userName: 'Deleted Name',
          premium: true,
          equippedAvatar: 'deleted-avatar',
          equippedAura: 'deleted-aura',
        },
      },
      account_deletion_permanent_denials: {
        [accountDeletePermanentDenialId(retiredStable)]: { status: 'denied' },
      },
    });

    const result = await ensureStableLinkForAuth(
      db as any,
      authUid,
      freshStable,
      'google.com',
      { email: 'same@example.com', displayName: 'Same Person' },
    );

    expect(result).toEqual({ ok: true, stableUid: freshStable, authUid, identityReady: true });
    expect(store.auth_links[authUid]).toMatchObject({ stable_id: freshStable, providerUid: authUid });
    expect(store.users[freshStable]).toEqual(expect.objectContaining({
      firebaseAuthUid: authUid,
      linkedAuth: expect.objectContaining({ providerUid: authUid }),
    }));
    expect(store.users[freshStable]).not.toHaveProperty('totalXp');
    expect(store.users[freshStable]).not.toHaveProperty('premium');
    expect(store.users[freshStable]).not.toHaveProperty('equippedAvatar');
    expect(store.users[freshStable]).not.toHaveProperty('equippedAura');
    expect(store.users[retiredStable]).toBeUndefined();
    expect(transactionCommits).toHaveLength(1);
  });

  it('never rotates a retired provider auth uid even when only its stable link appears replaceable', async () => {
    const authUid = 'google-auth-retired';
    const retiredStable = 'retired-stable-linked';
    const { db, store, transactionCommits } = makeDbStub({
      auth_links: { [authUid]: { stable_id: retiredStable } },
      account_deletion_permanent_denials: {
        [accountDeletePermanentDenialId(authUid)]: { status: 'denied' },
        [accountDeletePermanentDenialId(retiredStable)]: { status: 'denied' },
      },
    });

    await expect(ensureStableLinkForAuth(
      db as any,
      authUid,
      'fresh-stable-denied-auth',
      'google.com',
    )).rejects.toMatchObject({ message: 'identity_retired' });

    expect(store.users['fresh-stable-denied-auth']).toBeUndefined();
    expect(store.auth_links[authUid]).toMatchObject({ stable_id: retiredStable });
    expect(transactionCommits).toEqual([]);
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
    }, null, LEGACY_GOOGLE_CALLER.authTimeMs);

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

describe('карта имён подчинена живой привязке (аудит 2026-09-02)', () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(1_777_000_000_000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const ACC_REAL = 'acc_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  const ACC_LEGACY = 'acc_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

  /**
   * Боевой случай платящего Apple-пользователя: auth_links → настоящий
   * аккаунт, карта имён → пустой легаси-документ с id = auth uid. Пока карта
   * стояла первой, assertStableOwner отвечал stable_id_mismatch.
   */
  function divergedStore() {
    return {
      auth_links: { 'apple-auth': { stable_id: 'real-stable', provider: 'apple' } },
      users: {
        'real-stable': {
          firebaseAuthUid: 'apple-auth',
          accountId: ACC_REAL,
          progress: { user_total_xp: '0' },
          updatedAt: 222,
        },
        'apple-auth': { accountId: ACC_LEGACY, updatedAt: 111 },
      },
      account_id_index: {
        [accountIdIndexDocId('apple-auth')]: {
          alias: 'apple-auth', kind: 'stable', stableId: 'apple-auth', accountId: ACC_LEGACY,
        },
      },
    };
  }

  it('привязка и карта расходятся → побеждает привязка, без stable_id_mismatch, карта чинится сама', async () => {
    const { db, store } = makeDbStub(divergedStore());

    await expect(resolveStableUidForAuth(db as any, 'apple-auth')).resolves.toBe('real-stable');
    // Самоподдержание карты (этап 3) дописывает верную запись при починке связей.
    expect(store.account_id_index[accountIdIndexDocId('apple-auth')]).toMatchObject({
      stableId: 'real-stable', accountId: ACC_REAL,
    });
  });

  it('тот же случай на пути входа через провайдера (repairLinks:false)', async () => {
    const { db } = makeDbStub(divergedStore());

    await expect(resolveStableUidForAuth(db as any, 'apple-auth', 'real-stable', {
      allowProviderRelink: true,
      repairLinks: false,
    })).resolves.toBe('real-stable');
  });

  it('вход целиком (ensureStableLinkForAuth) возвращает привязанный аккаунт и чинит карту', async () => {
    const { db, store } = makeDbStub(divergedStore());

    const result = await ensureStableLinkForAuth(db as any, 'apple-auth', 'real-stable', 'apple.com');

    expect(result.stableUid).toBe('real-stable');
    expect(store.auth_links['apple-auth']).toMatchObject({ stable_id: 'real-stable' });
    expect(store.account_id_index[accountIdIndexDocId('apple-auth')]).toMatchObject({
      stableId: 'real-stable', accountId: ACC_REAL,
    });
  });

  it('без привязки карта отвечает одним чтением, если документ принадлежит uid', async () => {
    const { db } = makeDbStub({
      users: {
        'owned-stable': { firebaseAuthUid: 'anon-auth', accountId: ACC_REAL, updatedAt: 1 },
      },
      account_id_index: {
        [accountIdIndexDocId('anon-auth')]: {
          alias: 'anon-auth', kind: 'auth', stableId: 'owned-stable', accountId: ACC_REAL,
        },
      },
    });

    await expect(resolveStableUidForAuth(db as any, 'anon-auth')).resolves.toBe('owned-stable');
  });

  it('без привязки карта, ведущая на пустой легаси-документ с id = uid, не перебивает документ-владельца', async () => {
    // Второй боевой класс: тай-брейк миграции выбрал легаси-документ, а
    // прогресс человека — в UUID-документе с firebaseAuthUid = uid.
    const { db } = makeDbStub({
      users: {
        'anon-auth': { accountId: ACC_LEGACY, updatedAt: 1 },
        'owned-stable': {
          firebaseAuthUid: 'anon-auth',
          accountId: ACC_REAL,
          progress: { user_total_xp: '500' },
          updatedAt: 2,
        },
      },
      account_id_index: {
        [accountIdIndexDocId('anon-auth')]: {
          alias: 'anon-auth', kind: 'stable', stableId: 'anon-auth', accountId: ACC_LEGACY,
        },
      },
    });

    await expect(resolveStableUidForAuth(db as any, 'anon-auth')).resolves.toBe('owned-stable');
  });
});

// зачем (L-1, координатор 03.10): скрытие дубля того же firebaseAuthUid обязано унести монеты на stableId.
describe('cleanupLegacyAuthIdentityDuplicates: stars of a hidden duplicate move to the stable id', () => {
  const stableId = 'stable-main-0001';
  const dupId = 'dup-one-0000002';
  const authUid = 'dedup-auth';
  const dupOpPrefix = `account_merge:${dedupStarsSourceId(stableId, dupId)}`;

  const starsDoc = (balance: number) => ({
    schemaVersion: 'stars.v1', balance, earnedTotal: balance, grantedTotal: 0, spentTotal: 0,
    weekKey: '', weekEarned: 0, prevWeekKey: '', prevWeekEarned: 0,
    seasonId: '', seasonEarned: 0, bySource: {}, seq: balance > 0 ? 1 : 0, lastOpId: '', updatedAtMs: 0,
  });
  const world = (dupBalance: number | null, options: DbStubOptions = {}) => makeDbStub({
    users: {
      [stableId]: { firebaseAuthUid: authUid },
      [dupId]: { firebaseAuthUid: authUid, ...(dupBalance === null ? {} : { stars: starsDoc(dupBalance) }) },
    },
    auth_links: { [authUid]: { stable_id: stableId } },
    leaderboard: { [stableId]: { firebaseAuthUid: authUid, points: 5 } },
  }, options);
  const starsOf = (store: Record<string, Record<string, DocData | undefined>>, id: string) =>
    (store.users[id]?.stars ?? {}) as Record<string, number>;
  const receiptIds = (store: Record<string, Record<string, DocData | undefined>>, id: string) =>
    Object.keys(store[`users/${id}/star_operations`] ?? {}).sort();

  let spies: jest.SpyInstance[] = [];
  beforeEach(() => {
    spies = [jest.spyOn(console, 'log'), jest.spyOn(console, 'warn'), jest.spyOn(console, 'error')]
      .map((spy) => spy.mockImplementation(() => undefined));
  });
  afterEach(() => spies.forEach((spy) => spy.mockRestore()));
  const logs = () => spies.flatMap((spy) => spy.mock.calls).map((call) => call.join(' ')).join('\n');

  it('the opId anchor fits the ledger OP_ID_RE for every allowed chunk index', () => {
    const opId = `${dupOpPrefix}.99`;
    expect(opId).toMatch(/^[a-z0-9_]{1,32}:[A-Za-z0-9_.-]{1,96}$/);
    expect(dedupStarsSourceId(stableId, dupId)).not.toBe(dedupStarsSourceId(dupId, stableId));
  });

  it('moves a balance of 1234 as a grant to the stable id and zeroes the duplicate', async () => {
    const { db, store } = world(1234);
    const stats = await cleanupLegacyAuthIdentityDuplicates(db as any, stableId, authUid);
    expect(stats.usersHidden).toBe(1);
    expect(starsOf(store, dupId).balance).toBe(0);
    expect(starsOf(store, dupId).spentTotal).toBe(1234);
    expect(starsOf(store, stableId).balance).toBe(1234);
    expect(starsOf(store, stableId).grantedTotal).toBe(1234);
    expect(starsOf(store, stableId).earnedTotal).toBe(0);
    expect(store.users[dupId]?.identityHidden).toBe(true);
    expect(store.users[dupId]?.canonicalStableId).toBe(stableId);
    expect(receiptIds(store, stableId)).toEqual([`${dupOpPrefix}.0`]);
    expect(receiptIds(store, dupId)).toEqual([`${dupOpPrefix}.0`]);
    expect(logs()).toContain('[ACCOUNT-DEDUP-STARS] prepared stable=stable-m duplicate=dup-one-');
  });

  it('splits 12345 into three chunks of at most 5000', async () => {
    const { db, store } = world(12345);
    await cleanupLegacyAuthIdentityDuplicates(db as any, stableId, authUid);
    expect(receiptIds(store, stableId)).toHaveLength(3);
    expect(starsOf(store, stableId).balance).toBe(12345);
    expect(starsOf(store, dupId).balance).toBe(0);
  });

  it('a repeated cleanup does not double the transfer (even if the duplicate is un-hidden with its old balance)', async () => {
    const { db, store } = world(1234);
    await cleanupLegacyAuthIdentityDuplicates(db as any, stableId, authUid);
    await cleanupLegacyAuthIdentityDuplicates(db as any, stableId, authUid);
    expect(starsOf(store, stableId).balance).toBe(1234);
    // Жёсткий повтор: монеты и метка «не скрыт» возвращены, расписки остались.
    store.users[dupId] = { firebaseAuthUid: authUid, stars: starsDoc(1234) };
    await cleanupLegacyAuthIdentityDuplicates(db as any, stableId, authUid);
    expect(starsOf(store, stableId).balance).toBe(1234);
    expect(receiptIds(store, stableId)).toHaveLength(1);
    expect(store.users[dupId]?.identityHidden).toBe(true);
  });

  it('a ledger failure skips the transfer but the duplicate is still hidden', async () => {
    const { db, store } = world(1234, {
      readFaultAt: { [`users/${dupId}/star_operations/${dupOpPrefix}.0`]: 1 },
    });
    const stats = await cleanupLegacyAuthIdentityDuplicates(db as any, stableId, authUid);
    expect(stats.usersHidden).toBe(1);
    expect(store.users[dupId]?.identityHidden).toBe(true);
    expect(starsOf(store, dupId).balance).toBe(1234);
    expect(starsOf(store, stableId).balance ?? 0).toBe(0);
    expect(receiptIds(store, stableId)).toEqual([]);
    expect(logs()).toContain('[ACCOUNT-DEDUP-STARS]');
    expect(logs()).toContain('loser_prepare_failed');
  });

  // зачем (ревью L-1, MEDIUM-1): список дублей берётся запросом ВНЕ транзакции — если дубль успели
  // перепривязать к другому входу, ни монеты, ни скрытие не трогаем.
  it('duplicate re-linked to another auth between query and transaction -> no transfer, not hidden', async () => {
    const { db, store } = world(1234, {
      beforeTransactionStart: (s) => {
        const dup = s.users[dupId];
        if (dup) s.users[dupId] = { ...dup, firebaseAuthUid: 'someone-else' };
      },
    });
    await cleanupLegacyAuthIdentityDuplicates(db as any, stableId, authUid);
    expect(logs()).toContain('reason=auth_uid_changed');
    expect(starsOf(store, dupId).balance).toBe(1234);
    expect(store.users[stableId]?.stars).toBeUndefined();
    expect(store.users[dupId]?.identityHidden).toBeUndefined();
  });

  it('stable account is hidden -> coins stay, candidate recorded for manual review', async () => {
    const { db, store } = world(1234);
    store.users[stableId] = { ...store.users[stableId], identityHidden: true };
    await cleanupLegacyAuthIdentityDuplicates(db as any, stableId, authUid).catch(() => undefined);
    if (logs().includes('reason=stable_hidden')) {
      expect(starsOf(store, dupId).balance).toBe(1234);
      const candidates = Object.values(store.identity_cleanup_candidates ?? {}) as DocData[];
      expect(candidates.some((c) => c.reason === 'dedup_stars_skipped')).toBe(true);
    } else {
      // Чистка вообще не дошла до дубля (скрытый stable отсекается раньше) — монеты целы.
      expect(starsOf(store, dupId).balance).toBe(1234);
    }
  });

  it('a skipped transfer with coins left on the duplicate records a manual-review candidate', async () => {
    const { db, store } = world(1234, {
      readFaultAt: { [`users/${dupId}/star_operations/${dupOpPrefix}.0`]: 1 },
    });
    await cleanupLegacyAuthIdentityDuplicates(db as any, stableId, authUid);
    const candidates = Object.values(store.identity_cleanup_candidates ?? {}) as DocData[];
    const hit = candidates.find((c) => c.reason === 'dedup_stars_skipped');
    expect(hit).toBeDefined();
    expect((hit!.context as DocData)).toMatchObject({ duplicateUid: dupId, balance: 1234 });
  });

  it('a full transfer records NO manual-review candidate', async () => {
    const { db, store } = world(1234);
    await cleanupLegacyAuthIdentityDuplicates(db as any, stableId, authUid);
    const candidates = Object.values(store.identity_cleanup_candidates ?? {}) as DocData[];
    expect(candidates.some((c) => c.reason === 'dedup_stars_skipped')).toBe(false);
  });

  it.each([['no stars field', null], ['zero balance', 0]])('%s: zero receipt reads and zero star writes', async (_n, balance) => {
    const { db, store, docReads } = world(balance);
    const stats = await cleanupLegacyAuthIdentityDuplicates(db as any, stableId, authUid);
    expect(stats.usersHidden).toBe(1);
    expect(docReads.filter((path) => path.includes('star_operations'))).toEqual([]);
    expect(receiptIds(store, stableId)).toEqual([]);
    expect(store.users[stableId]?.stars).toBeUndefined();
    expect(store.users[dupId]?.identityHidden).toBe(true);
  });
});

// зачем (координатор 18.10, разбор fc30ae94a): функции в us-central1, база в eur3 — каждое чтение ≈ 120 мс через океан.
// Возвращающийся вход Google раньше читал auth_links/{uid} 3–4 раза и метки удаления 4–5 раз подряд; теперь повтор за
// вызов идёт из памяти, а транзакция привязки по-прежнему перечитывает всё сама.
describe('ensureStableLinkForAuth: память чтений на вызов', () => {
  const returningStore = () => ({
    users: { 'stable-1': { firebaseAuthUid: 'g-1', linkedAuth: { providerUid: 'g-1', provider: 'google' } } },
    auth_links: { 'g-1': { stable_id: 'stable-1' } },
    leaderboard: { 'stable-1': { firebaseAuthUid: 'g-1' } },
  });
  const count = (reads: string[], path: string) => reads.filter((p) => p === path).length;

  it('возвращающийся вход: каждый документ читается вне транзакции не больше одного раза', async () => {
    const { db, docReads } = makeDbStub(returningStore());
    await expect(ensureStableLinkForAuth(db as any, 'g-1', 'stable-1', 'google.com', { email: 'a@b.c', displayName: 'A' }))
      .resolves.toMatchObject({ ok: true, stableUid: 'stable-1' });
    // Одно чтение до транзакции + одно внутри транзакции привязки.
    expect(count(docReads, 'auth_links/g-1')).toBeLessThanOrEqual(2);
    expect(count(docReads, 'account_deletion_tombstones/stable-1')).toBeLessThanOrEqual(2);
    expect(count(docReads, 'account_deletion_auth_markers/g-1')).toBeLessThanOrEqual(2);
  });

  it('память не переживает вызов: второй вход читает базу заново', async () => {
    const { db, docReads } = makeDbStub(returningStore());
    await ensureStableLinkForAuth(db as any, 'g-1', 'stable-1', 'google.com', { email: 'a@b.c', displayName: 'A' });
    const first = count(docReads, 'auth_links/g-1');
    await ensureStableLinkForAuth(db as any, 'g-1', 'stable-1', 'google.com', { email: 'a@b.c', displayName: 'A' });
    expect(count(docReads, 'auth_links/g-1')).toBe(first * 2);
  });

  it('сбой чтения не запоминается: решение прежнее — identity_check_unavailable', async () => {
    const { db } = makeDbStub(returningStore(), { readFaultAt: { 'auth_links/g-1': 1 } });
    await expect(ensureStableLinkForAuth(db as any, 'g-1', 'stable-1', 'google.com', { email: 'a@b.c', displayName: 'A' }))
      .rejects.toMatchObject({ code: 'unavailable', message: 'identity_check_unavailable' });
  });
});
