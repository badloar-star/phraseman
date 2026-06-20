export {};

type DocData = Record<string, unknown>;

type FakeRef = {
  id: string;
  path: string;
  get: () => Promise<FakeSnap>;
  set: (data: DocData, opts?: { merge?: boolean }) => Promise<void>;
};

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
    }) => Promise<T>): Promise<T> => {
      const writes: Array<() => void> = [];
      const result = await fn({
        get: (ref: FakeRef) => ref.get(),
        set: (ref: FakeRef, data: DocData, opts?: { merge?: boolean }) => {
          writes.push(() => {
            docs.set(ref.path, opts?.merge ? deepMerge(docs.get(ref.path) ?? {}, data) : { ...data });
          });
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
  // The test seeds the user doc under the auth uid directly, so identity is a passthrough.
  resolveStableUidForAuth: jest.fn(async (_db: unknown, uid: string) => uid),
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
    docs.set('users/u1', { shards: 100, progress: { profile_card_level: 0 } });

    const res = await callUpgrade({ expectedLevel: 0 });

    expect(res).toMatchObject({ ok: true, alreadyApplied: false, level: 1, spent: 30, balance: 70 });
    const u = docs.get('users/u1') as Record<string, any>;
    expect(u.shards).toBe(70);
    // The badge reads progress.profile_card_level (sync_leaderboard.ts), so the CF must
    // write THERE — not a dead root field that nothing renders from.
    expect(u.progress.profile_card_level).toBe(1);
  });

  it('preserves sibling progress keys when upgrading', async () => {
    docs.set('users/u1', { shards: 100, progress: { profile_card_level: 0, streak_count: '7', user_total_xp: '999' } });

    await callUpgrade({ expectedLevel: 0 });

    const u = docs.get('users/u1') as Record<string, any>;
    expect(u.progress).toMatchObject({ profile_card_level: 1, streak_count: '7', user_total_xp: '999' });
  });

  it('refuses to upgrade when shards are insufficient and spends nothing', async () => {
    docs.set('users/u1', { shards: 20, progress: { profile_card_level: 0 } });

    const res = await callUpgrade({ expectedLevel: 0 });

    expect(res).toMatchObject({ ok: false, reason: 'insufficient', level: 0, balance: 20, cost: 30 });
    const u = docs.get('users/u1') as Record<string, any>;
    expect(u.shards).toBe(20);
    expect(u.progress.profile_card_level).toBe(0);
  });

  it('is idempotent: a duplicate call after the server already advanced does not double-charge', async () => {
    // Server already at level 2, but client still thinks it is at level 1 (retry / race).
    docs.set('users/u1', { shards: 500, progress: { profile_card_level: 2 } });

    const res = await callUpgrade({ expectedLevel: 1 });

    expect(res).toMatchObject({ ok: true, alreadyApplied: true, level: 2, spent: 0 });
    const u = docs.get('users/u1') as Record<string, any>;
    expect(u.shards).toBe(500);
    expect(u.progress.profile_card_level).toBe(2);
  });

  it('returns max at level 5 without charging', async () => {
    docs.set('users/u1', { shards: 999, progress: { profile_card_level: 5 } });

    const res = await callUpgrade({ expectedLevel: 5 });

    expect(res).toMatchObject({ ok: false, reason: 'max', level: 5 });
    const u = docs.get('users/u1') as Record<string, any>;
    expect(u.shards).toBe(999);
    expect(u.progress.profile_card_level).toBe(5);
  });

  it('uses the server cost table, not a client-supplied cost', async () => {
    docs.set('users/u1', { shards: 1000, progress: { profile_card_level: 3 } });

    // Even though the client could try to pass a bogus cheap cost, the server uses level 4 = 160.
    const res = await callUpgrade({ expectedLevel: 3, cost: 1 });

    expect(res).toMatchObject({ ok: true, level: 4, spent: 160, balance: 840 });
  });
});
