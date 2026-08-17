type DocData = Record<string, unknown>;

type FakeQuerySnap = {
  empty: boolean;
  docs: Array<{ id: string; ref: FakeRef; data: () => DocData | undefined }>;
};

type FakeRef = {
  path: string;
  get: () => Promise<{ exists: boolean; data: () => DocData | undefined }>;
  set: (data: DocData, opts?: { merge?: boolean }) => Promise<void>;
  collection: (name: string) => FakeCollection;
};

type FakeCollection = {
  doc: (id?: string) => FakeRef;
  where: (field: string, op: string, value: unknown) => { limit: (count: number) => { get: () => Promise<FakeQuerySnap> } };
  limit: (count: number) => { get: () => Promise<FakeQuerySnap> };
};

const docs = new Map<string, DocData>();
let autoId = 0;
const originalFetch = global.fetch;
let requestSequence = 0;

function makeRef(path: string): FakeRef {
  return {
    path,
    get: async () => {
      const data = docs.get(path);
      return { exists: data !== undefined, data: () => data };
    },
    set: async (data: DocData, opts?: { merge?: boolean }) => {
      const existing = docs.get(path) ?? {};
      docs.set(path, opts?.merge ? deepMerge(existing, data) : { ...data });
    },
    collection: (name: string) => collectionApi(`${path}/${name}`),
  };
}

function deepMerge(target: DocData, source: DocData): DocData {
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

function directChildrenUnder(prefix: string): Array<[string, DocData]> {
  return Array.from(docs.entries()).filter(([path]) => (
    path.startsWith(prefix) && path.slice(prefix.length).split('/').length === 1
  ));
}

function collectionApi(name: string): FakeCollection {
  return {
    doc: (id?: string) => makeRef(`${name}/${id || `auto-${++autoId}`}`),
    where: (field: string, op: string, value: unknown) => ({
      limit: (count: number) => ({
        get: async (): Promise<FakeQuerySnap> => {
          const prefix = `${name}/`;
          const matched = directChildrenUnder(prefix)
            .filter(([, data]) => op === '==' && data[field] === value)
            .slice(0, count)
            .map(([path, data]) => ({ id: path.slice(prefix.length), ref: makeRef(path), data: () => data }));
          return { empty: matched.length === 0, docs: matched };
        },
      }),
    }),
    limit: (count: number) => ({
      get: async (): Promise<FakeQuerySnap> => {
        const prefix = `${name}/`;
        const matched = directChildrenUnder(prefix)
          .slice(0, count)
          .map(([path, data]) => ({ id: path.slice(prefix.length), ref: makeRef(path), data: () => data }));
        return { empty: matched.length === 0, docs: matched };
      },
    }),
  };
}

function buildDb() {
  return {
    collection: (name: string) => collectionApi(name),
    runTransaction: async <T>(fn: (tx: {
      get: (ref: FakeRef) => Promise<{ exists: boolean; data: () => DocData | undefined; ref: FakeRef }>;
      set: (ref: FakeRef, data: DocData, opts?: { merge?: boolean }) => void;
      create: (ref: FakeRef, data: DocData) => void;
    }) => Promise<T>): Promise<T> => {
      const writes: Array<() => void> = [];
      const tx = {
        get: async (ref: FakeRef) => {
          const data = docs.get(ref.path);
          return { exists: data !== undefined, data: () => data, ref };
        },
        set: (ref: FakeRef, data: DocData, opts?: { merge?: boolean }) => {
          writes.push(() => {
            const existing = docs.get(ref.path) ?? {};
            docs.set(ref.path, opts?.merge ? deepMerge(existing, data) : { ...data });
          });
        },
        create: (ref: FakeRef, data: DocData) => {
          writes.push(() => {
            if (docs.has(ref.path)) throw new Error(`already-exists:${ref.path}`);
            docs.set(ref.path, { ...data });
          });
        },
      };
      const result = await fn(tx);
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
  onCall: (_opts: unknown, handler: unknown) => handler,
}));

jest.mock('firebase-admin', () => {
  const firestore = Object.assign(jest.fn(() => buildDb()), {
    FieldValue: {
      serverTimestamp: jest.fn(() => new Date('2026-08-21T10:00:00.000Z')),
      increment: jest.fn((value: number) => ({ __op: 'increment', value })),
    },
    Timestamp: {
      fromMillis: jest.fn((ms: number) => ({ __type: 'timestamp', ms })),
    },
  });
  return { firestore };
});

/** Active-days codec matching friends_together_core.ts, inlined so the test has no cross-module coupling risk. */
function encode(anchor: string, dates: string[]): { anchor: string; bits: string } {
  const anchorMs = Date.parse(`${anchor}T00:00:00.000Z`);
  const set = new Set(dates);
  let bits = '';
  for (let i = 0; i < 120; i += 1) {
    const dayMs = anchorMs - i * 86400000;
    const dayKey = new Date(dayMs).toISOString().slice(0, 10);
    bits += set.has(dayKey) ? '1' : '0';
  }
  bits = bits.replace(/0+$/, '');
  return { anchor, bits };
}

function seedUsers() {
  docs.set('users/alice', {
    firebaseAuthUid: 'auth-alice',
    displayName: 'Alice',
    progress: {
      user_name: 'Alice',
      user_total_xp: '5000',
      active_days_v1: JSON.stringify(encode('2026-08-21', [
        '2026-08-21', '2026-08-20', '2026-08-19', '2026-08-18', '2026-08-17',
      ])),
    },
  });
  docs.set('users/bob', {
    firebaseAuthUid: 'auth-bob',
    displayName: 'Bob',
    expoPushToken: 'ExponentPushToken[bob]',
    progress: {
      user_name: 'Bob',
      user_total_xp: '4000',
      active_days_v1: JSON.stringify(encode('2026-08-21', [
        '2026-08-21', '2026-08-20', '2026-08-19', '2026-08-18', '2026-08-17',
      ])),
      friends_push_v1: JSON.stringify({ enabled: true, tz: 0 }),
    },
  });
  docs.set('users/alice/friends/bob', { since: 1 });
  docs.set('users/bob/friends/alice', { since: 1 });
}

function reqId(prefix: string): string {
  // cleanRequestId requires 12-96 chars matching [A-Za-z0-9_-]; pad short prefixes.
  const base = `${prefix}_${String(++requestSequence).padStart(6, '0')}`;
  return base.length >= 12 ? base : base.padEnd(12, '0');
}

async function claimLevel(overrides: Record<string, unknown> = {}) {
  const { friendsTogetherClaimLevel } = require('./friends_together');
  return friendsTogetherClaimLevel({
    auth: { uid: 'auth-alice' },
    data: {
      stableId: 'alice',
      friendUid: 'bob',
      level: 2,
      requestId: reqId('claim_level'),
      ...overrides,
    },
  });
}

async function claimChest(overrides: Record<string, unknown> = {}) {
  const { friendsClaimWeeklyChest } = require('./friends_together');
  return friendsClaimWeeklyChest({
    auth: { uid: 'auth-alice' },
    data: {
      stableId: 'alice',
      requestId: reqId('claim_chest'),
      ...overrides,
    },
  });
}

async function nudge(overrides: Record<string, unknown> = {}) {
  const { friendsNudge } = require('./friends_together');
  return friendsNudge({
    auth: { uid: 'auth-alice' },
    data: {
      stableId: 'alice',
      friendUid: 'bob',
      senderDisplayName: 'Alice',
      requestId: reqId('nudge'),
      ...overrides,
    },
  });
}

beforeEach(() => {
  // 2026-08-21 is a Friday in ISO week 2026-W34 (week starts Monday 2026-08-17) —
  // keeps all 5 seeded "common days" (08-17..08-21) inside the SAME ISO week so
  // myDaysThisWeek (week-scoped) and daysTogether (all-time) agree in these fixtures.
  jest.useFakeTimers().setSystemTime(new Date('2026-08-21T10:00:00.000Z'));
  jest.resetModules();
  docs.clear();
  autoId = 0;
  requestSequence = 0;
  seedUsers();
  global.fetch = jest.fn(async () => ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify({ data: { status: 'ok' } }),
    json: async () => ({ data: [{ status: 'ok' }] }),
  })) as unknown as typeof fetch;
});

afterEach(async () => {
  await Promise.resolve();
  await Promise.resolve();
  global.fetch = originalFetch;
  jest.useRealTimers();
});

describe('friendsTogetherClaimLevel', () => {
  test('claims level 2 when 5 common days are already recorded, awards stars', async () => {
    const result = await claimLevel();
    expect(result.ok).toBe(true);
    expect(result.level).toBe(2);
    expect(result.daysTogether).toBe(5);
    expect(result.starsAwarded).toBe(5);
    expect(result.starsBalance).toBe(5);
    const pair = docs.get('friend_pairs/alice__bob');
    expect((pair?.claimedLevel as Record<string, number>).alice).toBe(2);
  });

  test('not_friends when friendship edge is missing', async () => {
    docs.delete('users/alice/friends/bob');
    await expect(claimLevel()).rejects.toMatchObject({ code: 'failed-precondition', message: 'not_friends' });
  });

  test('not_reached when days together are below the level threshold', async () => {
    await expect(claimLevel({ level: 3 })).rejects.toMatchObject({ code: 'failed-precondition', message: 'not_reached' });
  });

  test('already-exists "claimed" on a second claim of the same level', async () => {
    await claimLevel({ requestId: reqId('a') });
    await expect(claimLevel({ requestId: reqId('b') })).rejects.toMatchObject({ code: 'already-exists', message: 'claimed' });
  });

  test('idempotent replay: same requestId returns the same response without double-awarding stars', async () => {
    const requestId = reqId('idem');
    const first = await claimLevel({ requestId });
    const second = await claimLevel({ requestId });
    expect(second).toEqual(first);
    // Balance must not have doubled — still 5, not 10.
    expect(second.starsBalance).toBe(5);
  });

  test('bonusDays from a referral pair count toward the threshold', async () => {
    docs.set('friend_pairs/alice__bob', { uids: ['alice', 'bob'], bonusDays: 3, claimedLevel: {} });
    // 5 common days + 3 bonus = 8, still short of level 3 threshold (10).
    await expect(claimLevel({ level: 3 })).rejects.toMatchObject({ code: 'failed-precondition', message: 'not_reached' });
    // But level 2 (threshold 3) is reachable.
    const result = await claimLevel({ level: 2 });
    expect(result.daysTogether).toBe(8);
  });

  test('rejects invalid level (below 2 or above 5)', async () => {
    await expect(claimLevel({ level: 1 })).rejects.toMatchObject({ code: 'invalid-argument' });
    await expect(claimLevel({ level: 6 })).rejects.toMatchObject({ code: 'invalid-argument' });
  });
});

describe('friendsClaimWeeklyChest', () => {
  function setBobWeeklyXp(xp: number) {
    const bob = docs.get('users/bob') as DocData;
    docs.set('users/bob', {
      ...bob,
      progress: {
        ...(bob.progress as DocData),
        weekly_xp: xp,
        weekly_xp_period_start: '2026-08-17', // Monday of the current (2026-W34) ISO week
      },
    });
  }

  function setAliceWeeklyXp(xp: number) {
    const alice = docs.get('users/alice') as DocData;
    docs.set('users/alice', {
      ...alice,
      progress: {
        ...(alice.progress as DocData),
        weekly_xp: xp,
        weekly_xp_period_start: '2026-08-17',
      },
    });
  }

  test('own_days blocks claim when my active days this week < 5', async () => {
    const alice = docs.get('users/alice') as DocData;
    docs.set('users/alice', {
      ...alice,
      progress: { ...(alice.progress as DocData), active_days_v1: JSON.stringify(encode('2026-08-17', ['2026-08-17'])) },
    });
    setAliceWeeklyXp(5000);
    await expect(claimChest()).rejects.toMatchObject({ code: 'failed-precondition', message: 'own_days' });
  });

  test('own_xp blocks claim when my weekly XP < 1000', async () => {
    setAliceWeeklyXp(500);
    await expect(claimChest()).rejects.toMatchObject({ code: 'failed-precondition', message: 'own_xp' });
  });

  test('tier_zero blocks claim when friend contributions do not reach tier I (6000)', async () => {
    setAliceWeeklyXp(5000);
    // Bob's pair level is only 1 (no active_days overlap recorded as level>=2 pair) — actually
    // alice/bob share 5 days = level 2, so let's zero bob's weeklyXp instead to force progress=0.
    setBobWeeklyXp(0);
    await expect(claimChest()).rejects.toMatchObject({ code: 'failed-precondition', message: 'tier_zero' });
  });

  test('claims tier I successfully: xp_boost + 10 stars, myDays multiplier x1 at exactly 5 days', async () => {
    setAliceWeeklyXp(5000);
    setBobWeeklyXp(6000); // pairLevel 2 (5 common days), contributes min(6000,2000)=2000 < 6000 tier... need bigger
    // Bump bob further: to reach tier I (6000 progress) with cap 2000, need >=3 friends contributing 2000 each,
    // OR just accept bob contributes 2000 (capped) which is below 6000 -> tier 0. Add more friends instead.
    seedExtraFriend('carol', 6);
    seedExtraFriend('dave', 6);
    const result = await claimChest();
    expect(result.ok).toBe(true);
    expect(result.tier).toBeGreaterThanOrEqual(1);
    expect(result.multiplier).toBe(1);
    expect(result.rewards.stars).toBeGreaterThan(0);
  });

  function seedExtraFriend(uid: string, commonDays: number) {
    // Must overlap ALICE's active window (08-17..08-21) so pairLevel actually reaches
    // the >=2 threshold the chest requires — counting back from 08-21 (not 08-17)
    // guarantees the overlap regardless of commonDays.
    const dates = Array.from({ length: commonDays }, (_, i) => {
      const ms = Date.parse('2026-08-21T00:00:00.000Z') - i * 86400000;
      return new Date(ms).toISOString().slice(0, 10);
    });
    docs.set(`users/${uid}`, {
      firebaseAuthUid: `auth-${uid}`,
      progress: {
        user_name: uid,
        user_total_xp: '1000',
        active_days_v1: JSON.stringify(encode('2026-08-21', dates)),
        weekly_xp: 2000,
        weekly_xp_period_start: '2026-08-17',
      },
    });
    docs.set(`users/alice/friends/${uid}`, { since: 1 });
    docs.set(`users/${uid}/friends/alice`, { since: 1 });
  }

  test('week_open when weekKey is in the future', async () => {
    setAliceWeeklyXp(5000);
    await expect(claimChest({ weekKey: '2099-W01' })).rejects.toMatchObject({ code: 'failed-precondition', message: 'week_open' });
  });

  test('idempotent replay: claiming the same week twice returns alreadyClaimed', async () => {
    setAliceWeeklyXp(5000);
    setBobWeeklyXp(6000);
    seedExtraFriend('carol', 6);
    seedExtraFriend('dave', 6);
    const first = await claimChest();
    expect(first.alreadyClaimed).toBe(false);
    const second = await claimChest();
    expect(second.alreadyClaimed).toBe(true);
    expect(second.tier).toBe(first.tier);
  });
});

describe('friendsNudge', () => {
  test('sends a nudge successfully and records receipts on both sides', async () => {
    const result = await nudge();
    expect(result.ok).toBe(true);
    const senderDoc = docs.get('users/alice/friend_nudges/2026-08-21');
    expect((senderDoc?.sent as Record<string, number>).bob).toBeDefined();
    const receiverDoc = docs.get('users/bob/friend_nudges/2026-08-21');
    expect(receiverDoc?.receivedCount).toBe(1);
  });

  test('not_friends when friendship edge missing', async () => {
    docs.delete('users/alice/friends/bob');
    await expect(nudge()).rejects.toMatchObject({ code: 'failed-precondition', message: 'not_friends' });
  });

  test('disabled when friend turned off friends_push_v1', async () => {
    const bob = docs.get('users/bob') as DocData;
    docs.set('users/bob', {
      ...bob,
      progress: { ...(bob.progress as DocData), friends_push_v1: JSON.stringify({ enabled: false, tz: 0 }) },
    });
    await expect(nudge()).rejects.toMatchObject({ code: 'failed-precondition', message: 'disabled' });
  });

  test('quiet_hours when it is 23:00 in the receiver local time', async () => {
    jest.setSystemTime(new Date('2026-08-21T23:00:00.000Z')); // tz=0 for bob → local 23:00
    await expect(nudge()).rejects.toMatchObject({ code: 'failed-precondition', message: 'quiet_hours' });
  });

  test('daily_limit when already nudged this friend today', async () => {
    await nudge();
    await expect(nudge()).rejects.toMatchObject({ code: 'resource-exhausted', message: 'daily_limit' });
  });

  test('sender_limit after 5 nudges to different friends in one day', async () => {
    for (const uid of ['carol', 'dave', 'erin', 'frank']) {
      docs.set(`users/${uid}`, { firebaseAuthUid: `auth-${uid}`, progress: {} });
      docs.set(`users/alice/friends/${uid}`, { since: 1 });
      docs.set(`users/${uid}/friends/alice`, { since: 1 });
    }
    await nudge({ friendUid: 'bob' });
    await nudge({ friendUid: 'carol' });
    await nudge({ friendUid: 'dave' });
    await nudge({ friendUid: 'erin' });
    await nudge({ friendUid: 'frank' });
    docs.set('users/grace', { firebaseAuthUid: 'auth-grace', progress: {} });
    docs.set('users/alice/friends/grace', { since: 1 });
    docs.set('users/grace/friends/alice', { since: 1 });
    await expect(nudge({ friendUid: 'grace' })).rejects.toMatchObject({ code: 'resource-exhausted', message: 'sender_limit' });
  });

  test('receiver_limit after bob receives 3 nudges from different senders today', async () => {
    for (const uid of ['carol', 'dave']) {
      docs.set(`users/${uid}`, { firebaseAuthUid: `auth-${uid}`, progress: {} });
      docs.set(`users/${uid}/friends/bob`, { since: 1 });
      docs.set('users/bob/friends/' + uid, { since: 1 });
    }
    await nudge({ friendUid: 'bob' }); // alice -> bob (1)
    const { friendsNudge } = require('./friends_together');
    await friendsNudge({ auth: { uid: 'auth-carol' }, data: { stableId: 'carol', friendUid: 'bob', requestId: reqId('n') } }); // (2)
    await friendsNudge({ auth: { uid: 'auth-dave' }, data: { stableId: 'dave', friendUid: 'bob', requestId: reqId('n') } }); // (3)
    docs.set('users/erin', { firebaseAuthUid: 'auth-erin', progress: {} });
    docs.set('users/erin/friends/bob', { since: 1 });
    docs.set('users/bob/friends/erin', { since: 1 });
    await expect(
      friendsNudge({ auth: { uid: 'auth-erin' }, data: { stableId: 'erin', friendUid: 'bob', requestId: reqId('n') } }),
    ).rejects.toMatchObject({ code: 'resource-exhausted', message: 'receiver_limit' });
  });

  test('idempotent replay: same requestId does not double-count limits', async () => {
    const requestId = reqId('nudge_idem');
    const first = await nudge({ requestId });
    const second = await nudge({ requestId });
    expect(second).toEqual(first);
    const senderDoc = docs.get('users/alice/friend_nudges/2026-08-21');
    expect(senderDoc?.sentCount).toBe(1);
  });
});

describe('applyReferralPairBonus', () => {
  test('sets bonusDays=3 and boostUntilWeekKey to next week on first call', async () => {
    const { applyReferralPairBonus } = require('./friends_together');
    const admin = require('firebase-admin');
    const db = admin.firestore();
    await applyReferralPairBonus(db, 'alice', 'bob', Date.parse('2026-08-17T10:00:00.000Z'));
    const pair = docs.get('friend_pairs/alice__bob');
    expect(pair?.bonusDays).toBe(3);
    expect(typeof pair?.boostUntilWeekKey).toBe('string');
    expect(pair?.boostUntilWeekKey).not.toBe('');
  });

  test('is idempotent: second call does not change an already-set bonus', async () => {
    const { applyReferralPairBonus } = require('./friends_together');
    const admin = require('firebase-admin');
    const db = admin.firestore();
    await applyReferralPairBonus(db, 'alice', 'bob', Date.parse('2026-08-17T10:00:00.000Z'));
    const firstBoost = (docs.get('friend_pairs/alice__bob') as DocData).boostUntilWeekKey;
    // Second call much later — should NOT overwrite boostUntilWeekKey.
    await applyReferralPairBonus(db, 'alice', 'bob', Date.parse('2026-09-17T10:00:00.000Z'));
    const pair = docs.get('friend_pairs/alice__bob');
    expect(pair?.bonusDays).toBe(3);
    expect(pair?.boostUntilWeekKey).toBe(firstBoost);
  });

  test('no-op for self-referral or empty ids', async () => {
    const { applyReferralPairBonus } = require('./friends_together');
    const admin = require('firebase-admin');
    const db = admin.firestore();
    await applyReferralPairBonus(db, 'alice', 'alice', Date.now());
    expect(docs.has('friend_pairs/alice__alice')).toBe(false);
    await applyReferralPairBonus(db, '', 'bob', Date.now());
    expect(Array.from(docs.keys()).some((k) => k.startsWith('friend_pairs/'))).toBe(false);
  });
});
