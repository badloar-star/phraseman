/**
 * Behavioral tests for friendLookupUser — the "add a friend by nickname" search.
 *
 * These lock in the fix for the long-standing "finds some players but not others"
 * bug. The search must succeed via THREE paths, in priority order:
 *   1. exact hit in name_index/{nameLower}         (fast path)
 *   2. legacy fallback (users.progress / leaderboard) for accounts NOT in name_index,
 *      and it must SELF-HEAL name_index on such a hit
 *   3. prefix match ("Vitalii" → "Vitalii Virchyk")
 * Plus: a cold-start searcher whose own identity is unknown must still be able to
 * search (we no longer throw failed-precondition on the reader).
 */
export {}; // изолируем область видимости файла (иначе top-level currentDb/makeDbStub

// коллидируют с другими *.test.ts при общей компиляции tsc). Совпадает с league_groups_name.test.ts.

type DocData = Record<string, unknown>;
type Store = Record<string, Record<string, DocData | undefined>>;
type DbFailures = {
  docReads?: string[];
  queries?: string[];
};

let currentDb: any = null;

jest.mock('firebase-admin', () => ({
  firestore: Object.assign(() => currentDb, {
    FieldValue: { delete: () => ({ __delete: true }) },
  }),
}));

// The searcher-identity resolver is exercised separately in auth tests; here we just
// need it to be a no-op that never blocks the read path.
jest.mock('./auth_identity', () => ({
  resolveStableUidForAuth: jest.fn(async () => 'searcher-stable'),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { friendLookupUser } = require('./friend_lookup');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { resolveStableUidForAuth } = require('./auth_identity');

function readField(data: DocData, path: string): unknown {
  let cur: unknown = data;
  for (const part of path.split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

function makeDbStub(initial: Store = {}, failures: DbFailures = {}) {
  const docReadCounts: Record<string, number> = {};
  const store: Store = {
    users: { ...(initial.users ?? {}) },
    banned_users: { ...(initial.banned_users ?? {}) },
    leaderboard: { ...(initial.leaderboard ?? {}) },
    name_index: { ...(initial.name_index ?? {}) },
  };

  const snapFor = (id: string, data: DocData | undefined) => ({
    id,
    exists: !!data,
    data: () => data,
  });

  // Query builder supporting chained .where (== and range), .orderBy, .limit, .get.
  const makeQuery = (name: string) => {
    const filters: { field: string; op: string; value: unknown }[] = [];
    const api: any = {
      where: (field: string, op: string, value: unknown) => {
        filters.push({ field, op, value });
        return api;
      },
      orderBy: () => api,
      limit: (n: number) => ({
        get: async () => {
          const firstFilter = filters[0];
          const queryKey = firstFilter ? `${name}:${firstFilter.field}:${firstFilter.op}` : name;
          if (failures.queries?.includes(queryKey)) throw new Error(`firestore_query_failed:${queryKey}`);
          let rows = Object.entries(store[name] ?? {}).filter(([, d]) => !!d) as [string, DocData][];
          for (const f of filters) {
            rows = rows.filter(([, d]) => {
              const v = readField(d, f.field);
              if (f.op === '==') return v === f.value;
              if (f.op === '>=') return typeof v === 'string' && v >= (f.value as string);
              if (f.op === '<') return typeof v === 'string' && v < (f.value as string);
              return false;
            });
          }
          const docs = rows.slice(0, n).map(([id, d]) => snapFor(id, d));
          return { empty: docs.length === 0, docs };
        },
      }),
      // Some callers .get() a query without .limit(); support that too.
      get: async () => {
        const docs = (Object.entries(store[name] ?? {}).filter(([, d]) => !!d) as [string, DocData][])
          .map(([id, d]) => snapFor(id, d));
        return { empty: docs.length === 0, docs };
      },
    };
    return api;
  };

  const db: any = {
    collection: (name: string) => ({
      doc: (id: string) => ({
        get: async () => {
          const docPath = `${name}/${id}`;
          docReadCounts[docPath] = (docReadCounts[docPath] ?? 0) + 1;
          if (failures.docReads?.includes(docPath)) throw new Error(`firestore_read_failed:${docPath}`);
          return snapFor(id, store[name]?.[id]);
        },
        set: async (data: DocData, opts?: { merge?: boolean }) => {
          store[name] = store[name] ?? {};
          store[name][id] = opts?.merge ? { ...(store[name][id] ?? {}), ...data } : { ...data };
        },
      }),
      where: (field: string, op: string, value: unknown) => makeQuery(name).where(field, op, value),
    }),
  };

  currentDb = db;
  return { db, store, docReadCounts };
}

function run(fn: any, data: DocData, authUid: string | null) {
  const req = { auth: authUid ? { uid: authUid, token: {} } : undefined, data, rawRequest: { headers: {} }, app: {} };
  if (typeof fn.run === 'function') return fn.run(req);
  return fn(req);
}

const VISIBLE = (name: string, xp = 100, level = 5) => ({
  progress: { user_name: name, user_name_lower: name.toLowerCase(), user_total_xp: String(xp), user_level: String(level) },
});

describe('friendLookupUser — finds players across all storage paths', () => {
  beforeEach(() => {
    (resolveStableUidForAuth as jest.Mock).mockClear();
    jest.spyOn(Date, 'now').mockReturnValue(1_777_000_000_000);
  });
  afterEach(() => jest.restoreAllMocks());

  it('rejects an unauthenticated request', async () => {
    makeDbStub();
    await expect(run(friendLookupUser, { query: 'Roma' }, null)).rejects.toMatchObject({ code: 'unauthenticated' });
  });

  it('finds a user via the fast name_index path', async () => {
    makeDbStub({
      name_index: { roma: { uid: 'u-roma', name: 'Roma', nameLower: 'roma' } },
      users: { 'u-roma': VISIBLE('Roma', 4200, 12) },
    });
    const res: any = await run(friendLookupUser, { query: '  @Roma ' }, 'searcher-auth');
    expect(res.user).toMatchObject({ uid: 'u-roma', name: 'Roma', level: 12, totalXp: 4200, source: 'name_index' });
  });

  it('finds a legacy user who is NOT in name_index (via users.progress) and self-heals the index', async () => {
    const { store, docReadCounts } = makeDbStub({
      users: { 'u-old': VISIBLE('Olga') },
      // name_index intentionally empty — the old bug returned "not found" here.
    });
    const res: any = await run(friendLookupUser, { query: 'Olga' }, 'searcher-auth');
    expect(res.user).toMatchObject({ uid: 'u-old', name: 'Olga' });
    // Self-heal: the index now has the entry so next search hits the fast path.
    expect(store.name_index['olga']).toMatchObject({ uid: 'u-old', nameLower: 'olga' });
    expect(docReadCounts['users/u-old']).toBe(1);
    expect(docReadCounts['banned_users/u-old']).toBe(1);
  });

  it('finds a legacy user present only in leaderboard', async () => {
    makeDbStub({
      users: { 'u-lb': { progress: { user_name: 'Boris', user_total_xp: '900' } } },
      leaderboard: { 'u-lb': { name: 'Boris', nameLower: 'boris' } },
    });
    const res: any = await run(friendLookupUser, { query: 'Boris' }, 'searcher-auth');
    expect(res.user).toMatchObject({ uid: 'u-lb', name: 'Boris' });
  });

  it('finds a user by name prefix ("Vitalii" → "Vitalii Virchyk")', async () => {
    const { docReadCounts } = makeDbStub({
      users: { 'u-vit': VISIBLE('Vitalii Virchyk') },
    });
    const res: any = await run(friendLookupUser, { query: 'Vitalii' }, 'searcher-auth');
    expect(res.user).toMatchObject({ uid: 'u-vit', name: 'Vitalii Virchyk' });
    expect(docReadCounts['users/u-vit']).toBe(1);
    expect(docReadCounts['banned_users/u-vit']).toBe(1);
  });

  it('does not return banned or hidden targets', async () => {
    makeDbStub({
      name_index: { troll: { uid: 'u-troll', name: 'Troll', nameLower: 'troll' } },
      users: { 'u-troll': { ...VISIBLE('Troll'), identityHidden: true } },
    });
    const res: any = await run(friendLookupUser, { query: 'Troll' }, 'searcher-auth');
    expect(res.user).toBeNull();
  });

  it('returns null (not an error) for a genuinely unknown name', async () => {
    makeDbStub({ users: { 'u-x': VISIBLE('Someone') } });
    const res: any = await run(friendLookupUser, { query: 'Nobody' }, 'searcher-auth');
    expect(res).toEqual({ ok: true, user: null });
  });

  it('does not turn a users document read failure into a not-found response', async () => {
    makeDbStub(
      {
        name_index: { roma: { uid: 'u-roma', name: 'Roma', nameLower: 'roma' } },
        users: { 'u-roma': VISIBLE('Roma') },
      },
      { docReads: ['users/u-roma'] },
    );

    await expect(run(friendLookupUser, { query: 'Roma' }, 'searcher-auth'))
      .rejects.toMatchObject({ code: 'unavailable', message: 'friend_lookup_unavailable' });
  });

  it('fails closed when the banned_users status cannot be read', async () => {
    makeDbStub(
      {
        name_index: { roma: { uid: 'u-roma', name: 'Roma', nameLower: 'roma' } },
        users: { 'u-roma': VISIBLE('Roma') },
      },
      { docReads: ['banned_users/u-roma'] },
    );

    await expect(run(friendLookupUser, { query: 'Roma' }, 'searcher-auth'))
      .rejects.toMatchObject({ code: 'unavailable', message: 'friend_lookup_unavailable' });
  });

  it('does not turn a legacy exact-name query failure into a not-found response', async () => {
    makeDbStub(
      {},
      { queries: ['users:progress.user_name_lower:=='] },
    );

    await expect(run(friendLookupUser, { query: 'Olga' }, 'searcher-auth'))
      .rejects.toMatchObject({ code: 'unavailable', message: 'friend_lookup_unavailable' });
  });

  it('does not turn a prefix query failure into a not-found response', async () => {
    makeDbStub(
      {},
      { queries: ['users:progress.user_name_lower:>='] },
    );

    await expect(run(friendLookupUser, { query: 'Vitalii' }, 'searcher-auth'))
      .rejects.toMatchObject({ code: 'unavailable', message: 'friend_lookup_unavailable' });
  });

  it('does not resolve the searcher identity before an authenticated public lookup', async () => {
    // The target lookup needs request.auth, not a second identity-resolution chain.
    (resolveStableUidForAuth as jest.Mock).mockRejectedValueOnce(new Error('stable_id_required'));
    makeDbStub({
      name_index: { roma: { uid: 'u-roma', name: 'Roma', nameLower: 'roma' } },
      users: { 'u-roma': VISIBLE('Roma') },
    });
    const res: any = await run(friendLookupUser, { query: 'Roma' }, 'fresh-auth');
    expect(res.user).toMatchObject({ uid: 'u-roma', name: 'Roma' });
    expect(resolveStableUidForAuth).not.toHaveBeenCalled();
  });
});
