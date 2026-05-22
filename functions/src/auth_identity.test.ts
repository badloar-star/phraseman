import { linkStableAuthUid } from './auth_identity';

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
      where: () => ({
        limit: () => ({
          get: async () => ({ empty: true, docs: [] }),
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
