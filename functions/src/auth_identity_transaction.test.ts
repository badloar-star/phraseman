import { accountIdIndexDocId } from './account_id';
import { accountDeletePermanentDenialId } from './account_delete_job';
import { resolveStableUidForAuthInTransaction } from './auth_identity';

type TypesEqual<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends
  (<Value>() => Value extends Right ? 1 : 2)
    ? (<Value>() => Value extends Right ? 1 : 2) extends
      (<Value>() => Value extends Left ? 1 : 2)
      ? true
      : false
    : false;

const fullTransactionTypeContract: TypesEqual<
  Parameters<typeof resolveStableUidForAuthInTransaction>[1],
  FirebaseFirestore.Transaction
> = true;

void fullTransactionTypeContract;

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
  initial: Store = {},
  failAtPath?: string,
) {
  const store: Store = Object.fromEntries(
    Object.entries(initial).map(([collection, docs]) => [collection, { ...docs }]),
  );
  const reads: string[] = [];
  const writes: string[] = [];

  const snap = (id: string, data: DocData | undefined) => ({
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

  const db = { collection };
  const transaction = {
    get: jest.fn(async (target: DocRef | QueryRef) => {
      const key = target.kind === 'doc'
        ? target.path
        : `query:${target.collectionName}:${target.field}:${String(target.value)}`;
      reads.push(key);
      if (key === failAtPath) throw new Error(`private:${key}`);
      if (target.kind === 'doc') {
        return snap(target.id, store[target.collectionName]?.[target.id]);
      }
      const readField = (data: DocData, path: string): unknown => path
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
        .map(([id, data]) => snap(id, data));
      return { empty: docs.length === 0, docs };
    }),
    getAll: jest.fn(async (...refs: DocRef[]) => refs.map((ref) => (
      snap(ref.id, store[ref.collectionName]?.[ref.id])
    ))),
    create: jest.fn(() => writes.push('create')),
    set: jest.fn(() => writes.push('set')),
    update: jest.fn(() => writes.push('update')),
    delete: jest.fn(() => writes.push('delete')),
  };
  return { db, transaction, reads, writes };
}

function resolveWithHarness(
  db: object,
  transaction: object,
  authUid: unknown,
): Promise<string> {
  return Reflect.apply(
    resolveStableUidForAuthInTransaction,
    undefined,
    [db, transaction, authUid],
  );
}

function activeDeletionCollections(): Store {
  return {
    account_deletion_auth_markers: {},
    account_deletion_tombstones: {},
    account_deletion_permanent_denials: {},
  };
}

describe('transaction-aware canonical stable identity resolution', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('rejects a forged get-only reader before it can perform an identity read', async () => {
    const forgedReader = { get: jest.fn(async () => ({ exists: false, data: () => undefined })) };
    const { db } = makeHarness(activeDeletionCollections());

    await expect(Reflect.apply(
      resolveStableUidForAuthInTransaction,
      undefined,
      [db, forgedReader, 'auth-forged-reader'],
    )).rejects.toMatchObject({
      code: 'failed-precondition',
      message: 'identity_transaction_required',
    });
    expect(forgedReader.get).not.toHaveBeenCalled();
  });

  test('uses the exact live auth link before a divergent alias and performs every read in the caller transaction', async () => {
    const authUid = 'auth-live';
    const { db, transaction, reads, writes } = makeHarness({
      ...activeDeletionCollections(),
      auth_links: { [authUid]: { stable_id: 'stable-live' } },
      users: {
        'stable-live': { firebaseAuthUid: authUid },
        'stable-stale': { firebaseAuthUid: authUid, accountId: 'acc_stale' },
      },
      account_id_index: {
        [accountIdIndexDocId(authUid)]: {
          stableId: 'stable-stale', accountId: 'acc_stale', kind: 'auth',
        },
      },
    });

    await expect(resolveWithHarness(db, transaction, authUid)).resolves.toBe('stable-live');

    expect(reads).toContain(`auth_links/${authUid}`);
    expect(reads).not.toContain(`account_id_index/${accountIdIndexDocId(authUid)}`);
    expect(writes).toEqual([]);
  });

  test('follows an owned hidden auth-link anchor to its live canonical account and fences both stable identities', async () => {
    const authUid = 'auth-hidden';
    const hidden = 'stable-hidden';
    const canonical = 'stable-canonical';
    const { db, transaction, reads, writes } = makeHarness({
      ...activeDeletionCollections(),
      auth_links: { [authUid]: { stable_id: hidden } },
      users: {
        [hidden]: {
          firebaseAuthUid: authUid,
          identityHidden: true,
          canonicalStableId: canonical,
        },
        [canonical]: { firebaseAuthUid: authUid },
      },
    });

    await expect(resolveWithHarness(db, transaction, authUid)).resolves.toBe(canonical);

    expect(reads).toEqual(expect.arrayContaining([
      `account_deletion_tombstones/${hidden}`,
      `account_deletion_tombstones/${canonical}`,
      `users/${hidden}`,
      `users/${canonical}`,
    ]));
    expect(writes).toEqual([]);
  });

  test('accepts an alias only when its account id and authoritative owner both match', async () => {
    const authUid = 'auth-alias';
    const stableUid = 'stable-alias';
    const accountId = 'acc_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const { db, transaction, reads, writes } = makeHarness({
      ...activeDeletionCollections(),
      auth_links: {},
      users: { [stableUid]: { firebaseAuthUid: authUid, accountId } },
      account_id_index: {
        [accountIdIndexDocId(authUid)]: {
          stableId: stableUid, accountId, kind: 'auth',
        },
      },
    });

    await expect(resolveWithHarness(db, transaction, authUid)).resolves.toBe(stableUid);

    expect(reads).toContain(`account_id_index/${accountIdIndexDocId(authUid)}`);
    expect(reads).not.toContain(`query:users:firebaseAuthUid:${authUid}`);
    expect(writes).toEqual([]);
  });

  test('ignores a poisoned alias and falls through to the canonical authoritative owner query', async () => {
    const authUid = 'auth-owner';
    const accountId = 'acc_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
    const { db, transaction, writes } = makeHarness({
      ...activeDeletionCollections(),
      auth_links: {},
      users: {
        victim: { firebaseAuthUid: 'victim-auth', accountId },
        owner: { firebaseAuthUid: authUid, accountId: 'acc_owner' },
      },
      account_id_index: {
        [accountIdIndexDocId(authUid)]: {
          stableId: 'victim', accountId, kind: 'auth',
        },
      },
    });

    await expect(resolveWithHarness(db, transaction, authUid)).resolves.toBe('owner');
    expect(writes).toEqual([]);
  });

  test('does not use retired XP fields to choose between equivalent owner candidates', async () => {
    const authUid = 'auth-xp-conflict';
    const { db, transaction, writes } = makeHarness({
      ...activeDeletionCollections(),
      auth_links: {},
      account_id_index: {},
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

    await expect(resolveWithHarness(db, transaction, authUid))
      .resolves.toBe('stable-new-empty');
    expect(writes).toEqual([]);
  });

  test('uses the stable id as the deterministic final tie-break for equivalent owner candidates', async () => {
    const authUid = 'auth-exact-tie';
    const equivalent = {
      firebaseAuthUid: authUid,
      progress: { user_total_xp: '42' },
      updatedAt: 500,
    };
    const resolve = async (users: Store['users']) => {
      const { db, transaction, writes } = makeHarness({
        ...activeDeletionCollections(),
        auth_links: {},
        account_id_index: {},
        users,
      });
      await expect(resolveWithHarness(db, transaction, authUid)).resolves.toBe('stable-a');
      expect(writes).toEqual([]);
    };

    await resolve({
      'stable-z': { ...equivalent },
      'stable-a': { ...equivalent },
    });
    await resolve({
      'stable-a': { ...equivalent },
      'stable-z': { ...equivalent },
    });
  });

  test('treats a provider binding as discovery only and rejects it without canonical owner proof', async () => {
    const authUid = 'auth-hint-only';
    const stableUid = 'stable-hint-only';
    const { db, transaction, writes } = makeHarness({
      ...activeDeletionCollections(),
      auth_links: {},
      users: {
        [stableUid]: {
          linkedAuth: { providerUid: authUid },
          updatedAt: 100,
        },
      },
      account_id_index: {},
    });

    let caught: unknown;
    try {
      await resolveWithHarness(db, transaction, authUid);
    } catch (error) {
      caught = error;
    }

    expect(caught).toMatchObject({
      code: 'permission-denied',
      message: 'stable_id_mismatch',
    });
    expect(JSON.stringify(caught)).not.toContain(authUid);
    expect(JSON.stringify(caught)).not.toContain(stableUid);
    expect(writes).toEqual([]);
  });

  test.each([
    [
      'auth deletion',
      {
        account_deletion_auth_markers: {
          'auth-deleted': { status: 'deleted' },
        },
      },
      'auth-deleted',
      'identity_retired',
    ],
    [
      'stable tombstone',
      {
        auth_links: { 'auth-stable-deleted': { stable_id: 'stable-deleted' } },
        users: { 'stable-deleted': { firebaseAuthUid: 'auth-stable-deleted' } },
        account_deletion_tombstones: {
          'stable-deleted': { status: 'deleted' },
        },
      },
      'auth-stable-deleted',
      'identity_retired',
    ],
    [
      'stable permanent denial',
      {
        auth_links: { 'auth-denied': { stable_id: 'stable-denied' } },
        users: { 'stable-denied': { firebaseAuthUid: 'auth-denied' } },
        account_deletion_permanent_denials: {
          [accountDeletePermanentDenialId('stable-denied')]: { denied: true },
        },
      },
      'auth-denied',
      'identity_retired',
    ],
  ] as const)('fails closed for %s without leaking either identity in the error', async (
    _case,
    extra,
    authUid,
    expectedMessage,
  ) => {
    const { db, transaction, writes } = makeHarness({
      ...activeDeletionCollections(),
      ...extra,
    });

    let caught: unknown;
    try {
      await resolveWithHarness(db, transaction, authUid);
    } catch (error) {
      caught = error;
    }

    expect(caught).toMatchObject({
      code: 'failed-precondition',
      message: expectedMessage,
    });
    const serialized = JSON.stringify(caught);
    expect(serialized).not.toContain(authUid);
    expect(serialized).not.toContain('stable-deleted');
    expect(serialized).not.toContain('stable-denied');
    expect(writes).toEqual([]);
  });

  test.each([
    undefined,
    null,
    '',
    ' ',
    'users/victim',
    'line\nbreak',
    'x'.repeat(129),
    { uid: 'auth-user' },
  ])('rejects non-exact server auth uid input before any transaction read: %#', async (authUid) => {
    const { db, transaction, reads, writes } = makeHarness(activeDeletionCollections());

    await expect(resolveWithHarness(db, transaction, authUid))
      .rejects.toMatchObject({ code: 'invalid-argument', message: 'auth_uid_invalid' });
    expect(reads).toEqual([]);
    expect(writes).toEqual([]);
  });

  test('maps a transaction read failure to one generic error without exposing its private path', async () => {
    const authUid = 'auth-read-failure';
    const privatePath = `auth_links/${authUid}`;
    const { db, transaction, writes } = makeHarness(
      activeDeletionCollections(),
      privatePath,
    );

    let caught: unknown;
    try {
      await resolveWithHarness(db, transaction, authUid);
    } catch (error) {
      caught = error;
    }

    expect(caught).toMatchObject({
      code: 'unavailable',
      message: 'identity_check_unavailable',
    });
    expect(JSON.stringify(caught)).not.toContain(privatePath);
    expect(JSON.stringify(caught)).not.toContain(authUid);
    expect(writes).toEqual([]);
  });
});
