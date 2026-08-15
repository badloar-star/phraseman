export {};

type DocData = Record<string, unknown>;

type FakeRef = {
  id: string;
  path: string;
  get: () => Promise<FakeSnap>;
  set: (data: DocData, opts?: { merge?: boolean }) => Promise<void>;
  collection: (name: string) => FakeCollection;
};

type FakeCollection = {
  doc: (id?: string) => FakeRef;
  get: () => Promise<{ docs: FakeSnap[]; size: number }>;
};

let autoId = 0;

function collectionFor(path: string): FakeCollection {
  const depth = path.split('/').length + 1;
  return {
    doc: (id?: string) => refFor(`${path}/${id || `auto_${++autoId}`}`),
    get: async () => {
      const children = [...docs.keys()]
        .filter((k) => k.startsWith(`${path}/`) && k.split('/').length === depth)
        .map((k) => snapFor(k));
      return { docs: children, size: children.length };
    },
  };
}

type FakeSnap = {
  id: string;
  exists: boolean;
  data: () => DocData | undefined;
};

const docs = new Map<string, DocData>();

function deepMerge(target: DocData, source: DocData): DocData {
  // Mirrors Firestore { merge: true }: nested plain objects are deep-merged so writing
  // progress.profile_card_level keeps sibling progress.* keys intact.
  const result = { ...target };
  for (const [key, value] of Object.entries(source)) {
    const existing = target[key];
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      existing &&
      typeof existing === 'object' &&
      !Array.isArray(existing)
    ) {
      result[key] = deepMerge(existing as DocData, value as DocData);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function refFor(path: string): FakeRef {
  const id = path.split('/').pop() || path;
  return {
    id,
    path,
    get: async () => snapFor(path),
    set: async (data: DocData, opts?: { merge?: boolean }) => {
      docs.set(path, opts?.merge ? deepMerge(docs.get(path) ?? {}, data) : { ...data });
    },
    collection: (name: string) => collectionFor(`${path}/${name}`),
  };
}

function snapFor(path: string): FakeSnap {
  const data = docs.get(path);
  return {
    id: path.split('/').pop() || path,
    exists: data !== undefined,
    data: () => data,
  };
}

function fakeDb() {
  return {
    collection: (name: string) => ({
      doc: (id?: string) => refFor(`${name}/${id || 'auto'}`),
    }),
    runTransaction: async <T>(fn: (tx: {
      get: (ref: FakeRef) => Promise<FakeSnap>;
      set: (ref: FakeRef, data: DocData, opts?: { merge?: boolean }) => void;
      create: (ref: FakeRef, data: DocData) => void;
    }) => Promise<T>): Promise<T> => {
      const writes: Array<() => void> = [];
      const result = await fn({
        get: (ref: FakeRef) => ref.get(),
        set: (ref: FakeRef, data: DocData, opts?: { merge?: boolean }) => {
          writes.push(() => {
            docs.set(ref.path, opts?.merge ? deepMerge(docs.get(ref.path) ?? {}, data) : { ...data });
          });
        },
        create: (ref: FakeRef, data: DocData) => {
          writes.push(() => docs.set(ref.path, { ...data }));
        },
      });
      writes.forEach((write) => write());
      return result;
    },
  };
}

class FakeHttpsError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

jest.mock('firebase-functions/v2/https', () => ({
  HttpsError: FakeHttpsError,
  onCall: (optsOrHandler: unknown, maybeHandler?: unknown) =>
    typeof optsOrHandler === 'function' ? optsOrHandler : maybeHandler,
}));

jest.mock('./callable_options', () => ({ HOT_CALLABLE_OPTIONS: {} }));

jest.mock('./auth_identity', () => ({
  // Mirror the real resolver's key behaviour: when a stableId is passed it wins (the doc
  // the client stores shards under); otherwise fall back to the auth uid.
  resolveStableUidForAuth: jest.fn(
    async (_db: unknown, authUid: string, requestedStableId?: unknown) =>
      typeof requestedStableId === 'string' && requestedStableId ? requestedStableId : authUid,
  ),
}));

jest.mock('firebase-admin', () => {
  const firestore = jest.fn(() => fakeDb());
  (firestore as unknown as { FieldValue: Record<string, unknown> }).FieldValue = {
    serverTimestamp: () => ({ __op: 'serverTimestamp' }),
  };
  return { firestore };
});

async function callUpgrade(data: DocData, authUid = 'u1') {
  const { profileCardUpgrade } = require('./profile_card_upgrade');
  return profileCardUpgrade({ auth: { uid: authUid }, data });
}

beforeEach(() => {
  jest.resetModules();
  docs.clear();
});

describe('profileCardUpgrade', () => {
  it('rejects unauthenticated callers', async () => {
    const { profileCardUpgrade } = require('./profile_card_upgrade');
    await expect(profileCardUpgrade({ auth: undefined, data: {} })).rejects.toThrow('Not authenticated');
  });

  it('charges the exact next-level cost and raises the authoritative level (progress field)', async () => {
    docs.set('users/u1', { shards: 250, progress: { profile_card_level: 0 } });

    const res = await callUpgrade({ expectedLevel: 0 });

    expect(res).toMatchObject({ ok: true, alreadyApplied: false, level: 1, spent: 0 });
    expect(res).not.toHaveProperty('balance');
    const u = docs.get('users/u1') as Record<string, any>;
    expect(u.shards).toBe(250);
    // The badge reads progress.profile_card_level (sync_leaderboard.ts), so the CF must
    // write THERE — not a dead root field that nothing renders from.
    expect(u.progress.profile_card_level).toBe(1);
  });

  it('reads the doc under the client stableId, not the auth uid (the shop-bug fix)', async () => {
    // Shards live under the stableId doc; the auth-uid doc is empty (or absent). Before the
    // fix the CF resolved to the auth uid → balance 0 → false "insufficient" → shard shop.
    docs.set('users/stable-1', { shards: 250, progress: { profile_card_level: 0 } });
    // (no users/auth-1 doc on purpose)

    const res = await callUpgrade({ expectedLevel: 0, stableId: 'stable-1' }, 'auth-1');

    expect(res).toMatchObject({ ok: true, level: 1, spent: 0 });
    expect(res).not.toHaveProperty('balance');
    expect((docs.get('users/stable-1') as Record<string, any>).progress.profile_card_level).toBe(1);
    expect(docs.get('users/auth-1')).toBeUndefined();
  });

  it('preserves sibling progress keys when upgrading', async () => {
    docs.set('users/u1', { shards: 250, progress: { profile_card_level: 0, streak_count: '7', user_total_xp: '999' } });

    await callUpgrade({ expectedLevel: 0 });

    const u = docs.get('users/u1') as Record<string, any>;
    expect(u.progress).toMatchObject({ profile_card_level: 1, streak_count: '7', user_total_xp: '999' });
  });

  it('stores metadata without using server balance as permission', async () => {
    docs.set('users/u1', { shards: 190, progress: { profile_card_level: 0 } });

    const res = await callUpgrade({ expectedLevel: 0 });

    expect(res).toMatchObject({ ok: true, level: 1, spent: 0 });
    expect(res).not.toHaveProperty('balance');
    const u = docs.get('users/u1') as Record<string, any>;
    expect(u.shards).toBe(190);
    expect(u.progress.profile_card_level).toBe(1);
  });

  it('is idempotent: a duplicate call after the server already advanced does not double-charge', async () => {
    // Server already has Pro, but client still thinks it is at level 0 (retry / race).
    docs.set('users/u1', { shards: 500, progress: { profile_card_level: 1 } });

    const res = await callUpgrade({ expectedLevel: 0 });

    expect(res).toMatchObject({ ok: true, alreadyApplied: true, level: 1, spent: 0 });
    const u = docs.get('users/u1') as Record<string, any>;
    expect(u.shards).toBe(500);
    expect(u.progress.profile_card_level).toBe(1);
  });

  it('returns max at Legend (V) without charging', async () => {
    docs.set('users/u1', { shards: 9999, progress: { profile_card_level: 5 } });

    const res = await callUpgrade({ expectedLevel: 5 });

    expect(res).toMatchObject({ ok: false, reason: 'max', level: 5 });
    const u = docs.get('users/u1') as Record<string, any>;
    expect(u.shards).toBe(9999);
    expect(u.progress.profile_card_level).toBe(5);
  });

  it('stores every ladder level without changing the personal balance', async () => {
    const total = 200 + 450 + 800 + 1400 + 2400;
    docs.set('users/u1', { shards: total, progress: { profile_card_level: 0 } });

    const expected = [
      { level: 1, spent: 200 },
      { level: 2, spent: 450 },
      { level: 3, spent: 800 },
      { level: 4, spent: 1400 },
      { level: 5, spent: 2400 },
    ];
    for (const step of expected) {
      const res = await callUpgrade({ expectedLevel: step.level - 1 });
      expect(res).toMatchObject({ ok: true, alreadyApplied: false, level: step.level, spent: 0 });
    }
    const u = docs.get('users/u1') as Record<string, any>;
    expect(u.shards).toBe(total);
    expect(u.progress.profile_card_level).toBe(5);
  });

  it('does not inspect a mid-ladder personal balance', async () => {
    // 200 was enough for I, but II costs 450 — no charge, no level bump.
    docs.set('users/u1', { shards: 449, progress: { profile_card_level: 1 } });

    const res = await callUpgrade({ expectedLevel: 1 });

    expect(res).toMatchObject({ ok: true, level: 2, spent: 0 });
    expect(res).not.toHaveProperty('balance');
    expect((docs.get('users/u1') as Record<string, any>).progress.profile_card_level).toBe(2);
  });

  it('assigns sequential Legend numbers from the global counter, once per player', async () => {
    docs.set('users/u1', { shards: 2400, progress: { profile_card_level: 4 } });
    docs.set('users/u2', { shards: 2400, progress: { profile_card_level: 4 } });

    const first = await callUpgrade({ expectedLevel: 4 }, 'u1');
    const second = await callUpgrade({ expectedLevel: 4, stableId: 'u2' }, 'auth-x');

    expect(first).toMatchObject({ ok: true, level: 5, spent: 0, legendNo: 1 });
    expect(second).toMatchObject({ ok: true, level: 5, spent: 0, legendNo: 2 });
    expect((docs.get('users/u1') as Record<string, any>).progress.profile_card_legend_no).toBe(1);
    expect((docs.get('users/u2') as Record<string, any>).progress.profile_card_legend_no).toBe(2);
    expect((docs.get('stats/profile_card_legends') as Record<string, any>).issued).toBe(2);
  });

  it('does not attach a legend number to non-Legend upgrades', async () => {
    docs.set('users/u1', { shards: 450, progress: { profile_card_level: 1 } });

    const res = await callUpgrade({ expectedLevel: 1 });

    expect(res).toMatchObject({ ok: true, level: 2, spent: 0 });
    expect((res as Record<string, unknown>).legendNo).toBeUndefined();
    expect((docs.get('users/u1') as Record<string, any>).progress.profile_card_legend_no).toBeUndefined();
    expect(docs.get('stats/profile_card_legends')).toBeUndefined();
  });

  it('ignores a client-supplied cost because the server never charges', async () => {
    docs.set('users/u1', { shards: 1000, progress: { profile_card_level: 0 } });

    // Even though the client could try to pass a bogus cheap cost, the server uses Pro = 200.
    const res = await callUpgrade({ expectedLevel: 0, cost: 1 });

    expect(res).toMatchObject({ ok: true, level: 1, spent: 0 });
    expect(res).not.toHaveProperty('balance');
  });
});

describe('profileCardUpgrade — Фаза 4: «праздник легенды»', () => {
  it('grants +5 shards with server markers and a shard_log to every friend of a fresh Legend', async () => {
    docs.set('users/u1', { shards: 2400, progress: { profile_card_level: 4 } });
    docs.set('users/u1/friends/f1', { since: 1 });
    docs.set('users/u1/friends/f2', { since: 2 });
    docs.set('users/f1', { shards: 10 });
    docs.set('users/f2', { shards: 0 });

    const res = await callUpgrade({ expectedLevel: 4 });

    expect(res).toMatchObject({ ok: true, alreadyApplied: false, level: 5, legendNo: 1 });
    for (const [fid, before] of [['f1', 10], ['f2', 0]] as const) {
      const friend = docs.get(`users/${fid}`) as Record<string, any>;
      expect(friend.shards).toBe(before);
      const external = [...docs.entries()].find(([path, data]) =>
        path.startsWith(`users/${fid}/external_economy_events/`)
        && (data as Record<string, unknown>).reason === 'legend_celebration_gift');
      expect(external).toBeDefined();
      const log = [...docs.entries()].find(([path, data]) =>
        path.startsWith(`users/${fid}/shard_log/`) && (data as Record<string, unknown>).reason === 'legend_celebration_gift');
      expect(log).toBeDefined();
      expect(log![1]).toMatchObject({ type: 'earn', amount: 5, authority: 'external_event', legendUid: 'u1', legendNo: 1 });
    }
  });

  it('announces the new Legend into the friends feed with a stable doc id (no duplicates)', async () => {
    docs.set('users/u1', { shards: 2400, progress: { profile_card_level: 4 } });

    const res = await callUpgrade({ expectedLevel: 4 });

    expect(res).toMatchObject({ ok: true, level: 5, legendNo: 1 });
    const feedDoc = docs.get('users/u1/my_events/legend_celebration') as Record<string, any>;
    expect(feedDoc).toMatchObject({
      type: 'achievement',
      uid: 'u1',
      payload: { icon: '👑', nameRu: 'Легенда №1' },
    });
    expect(Number.isFinite(feedDoc.ts)).toBe(true);
  });

  it('does not gift or announce on an idempotent replay (level already granted earlier)', async () => {
    docs.set('users/u1', { shards: 500, progress: { profile_card_level: 5, profile_card_legend_no: 7 } });
    docs.set('users/u1/friends/f1', { since: 1 });
    docs.set('users/f1', { shards: 42 });

    const res = await callUpgrade({ expectedLevel: 4 });

    expect(res).toMatchObject({ ok: true, alreadyApplied: true, spent: 0 });
    expect((docs.get('users/f1') as Record<string, any>).shards).toBe(42);
    expect(docs.get('users/u1/my_events/legend_celebration')).toBeUndefined();
  });

  it('does not gift or announce on non-Legend upgrades', async () => {
    docs.set('users/u1', { shards: 800, progress: { profile_card_level: 2 } });
    docs.set('users/u1/friends/f1', { since: 1 });
    docs.set('users/f1', { shards: 42 });

    const res = await callUpgrade({ expectedLevel: 2 });

    expect(res).toMatchObject({ ok: true, alreadyApplied: false, level: 3, spent: 0 });
    expect((docs.get('users/f1') as Record<string, any>).shards).toBe(42);
    expect(docs.get('users/u1/my_events/legend_celebration')).toBeUndefined();
  });

  it('keeps the upgrade successful even when the legend has no friends', async () => {
    docs.set('users/u1', { shards: 2400, progress: { profile_card_level: 4 } });

    const res = await callUpgrade({ expectedLevel: 4 });

    expect(res).toMatchObject({ ok: true, level: 5, legendNo: 1 });
    expect(docs.get('users/u1/my_events/legend_celebration')).toBeDefined();
  });
});
