import { ensureAuthLinkDoc, linkStableAuthUid, resolveStableUidForAuth } from './auth_identity';

type DocData = Record<string, unknown>;
type Store = Record<string, Record<string, DocData | undefined>>;

function makeDbStub(initial: Store = {}) {
  const store: Store = {
    users: { ...(initial.users ?? {}) },
    auth_links: { ...(initial.auth_links ?? {}) },
    leaderboard: { ...(initial.leaderboard ?? {}) },
    league_groups: { ...(initial.league_groups ?? {}) },
    identity_cleanup_candidates: { ...(initial.identity_cleanup_candidates ?? {}) },
  };
  const sets: Array<{ path: string; data: DocData; options: unknown }> = [];

  const snapFor = (id: string, data: DocData | undefined) => ({
    id,
    exists: !!data,
    data: () => data,
  });

  const db = {
    collection: (name: string) => ({
      doc: (id: string) => ({
        get: async () => snapFor(id, store[name]?.[id]),
        set: async (data: DocData, options: unknown) => {
          sets.push({ path: `${name}/${id}`, data, options });
          store[name] = store[name] ?? {};
          store[name][id] = { ...(store[name][id] ?? {}), ...data };
        },
      }),
      where: (field: string, op: string, value: unknown) => ({
        limit: () => ({
          get: async () => {
            const docs = Object.entries(store[name] ?? {})
              .filter(([, data]) => data && op === '==' && data[field] === value)
              .map(([id, data]) => snapFor(id, data));
            return { empty: docs.length === 0, docs };
          },
        }),
      }),
    }),
  };

  return { db, store, sets };
}

describe('linkStableAuthUid', () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(1_777_000_000_000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('writes the stable user auth uid when the user doc is missing', async () => {
    const { db, store, sets } = makeDbStub();

    await linkStableAuthUid(db as any, 'stable-1', 'auth-1');

    expect(store.users['stable-1']).toEqual({
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
        'stable-1': { firebaseAuthUid: 'old-auth', updatedAt: 111 },
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
});

describe('ensureAuthLinkDoc', () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(1_777_000_000_000);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates auth_links/{authUid} for an anonymous user that has none (referral fix)', async () => {
    const { db, store } = makeDbStub();

    await ensureAuthLinkDoc(db as any, 'auth-1', 'stable-1');

    expect(store.auth_links['auth-1']).toEqual({
      stable_id: 'stable-1',
      updatedAt: 1_777_000_000_000,
    });
  });

  it('rewrites stable_id when the link points to a different stable id', async () => {
    const { db, store } = makeDbStub({
      auth_links: { 'auth-1': { stable_id: 'old-stable', updatedAt: 1 } },
    });

    await ensureAuthLinkDoc(db as any, 'auth-1', 'stable-1');

    expect(store.auth_links['auth-1']).toMatchObject({ stable_id: 'stable-1' });
  });

  it('does not write when the link already matches (keeps provider/email via no-op)', async () => {
    const { db, store } = makeDbStub({
      auth_links: { 'auth-1': { stable_id: 'stable-1', provider: 'google', email: 'a@b.c' } },
    });

    await ensureAuthLinkDoc(db as any, 'auth-1', 'stable-1');

    expect(store.auth_links['auth-1']).toEqual({
      stable_id: 'stable-1',
      provider: 'google',
      email: 'a@b.c',
    });
  });
});

describe('resolveStableUidForAuth', () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(1_777_000_000_000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('allows provider sign-in to repair a stable id still linked to the old anonymous auth uid', async () => {
    const { db, store } = makeDbStub({
      users: {
        'stable-1': { firebaseAuthUid: 'old-anon-auth', updatedAt: 111 },
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

  it('does not let a provider auth uid already linked to another user take over this stable id', async () => {
    const { db } = makeDbStub({
      users: {
        'stable-1': { firebaseAuthUid: 'old-anon-auth', updatedAt: 111 },
        'stable-2': { firebaseAuthUid: 'google-auth-1', updatedAt: 222 },
      },
    });

    await expect(
      resolveStableUidForAuth(db as any, 'google-auth-1', 'stable-1', { allowProviderRelink: true }),
    ).rejects.toMatchObject({
      code: 'permission-denied',
      message: 'stable_id_mismatch',
    });
  });
});
