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
  // зачем: воскресенье той же ISO-недели (W34) — сундук открывается только в воскресенье
  jest.useFakeTimers().setSystemTime(new Date('2026-08-23T10:00:00.000Z'));
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

describe('friendsNudge', () => {
  test('sends a nudge successfully and records receipts on both sides', async () => {
    const result = await nudge();
    expect(result.ok).toBe(true);
    const senderDoc = docs.get('users/alice/friend_nudges/2026-08-23');
    expect((senderDoc?.sent as Record<string, number>).bob).toBeDefined();
    const receiverDoc = docs.get('users/bob/friend_nudges/2026-08-23');
    expect(receiverDoc?.receivedCount).toBe(1);
    expect(docs.get('users/bob/notifications/friends_together_nudge_alice_2026-08-23')).toMatchObject({
      type: 'friend_nudge',
      fromUid: 'alice',
      text: 'Пять минут на практику?',
      nav: {
        kind: 'friend_event',
        actorStableUid: 'alice',
        eventId: 'friends_together_nudge_alice_2026-08-23',
        action: 'study_invite',
      },
    });
    const pushRequest = (global.fetch as jest.Mock).mock.calls[0]?.[1] as { body?: string } | undefined;
    const pushRows = JSON.parse(String(pushRequest?.body || '[]')) as Array<Record<string, unknown>>;
    expect(pushRows[0]).toMatchObject({
      title: 'Alice: пять минут практики?',
      body: 'Одно маленькое занятие.',
      data: expect.objectContaining({
        type: 'friend_nudge',
        eventId: 'friends_together_nudge_alice_2026-08-23',
        actorStableUid: 'alice',
      }),
    });
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
    jest.setSystemTime(new Date('2026-08-23T23:00:00.000Z')); // tz=0 for bob → local 23:00
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
    const senderDoc = docs.get('users/alice/friend_nudges/2026-08-23');
    expect(senderDoc?.sentCount).toBe(1);
  });
});

describe('applyReferralPairBonus', () => {
  test('can join an existing transaction so qualification, pair grant, and receipt commit atomically', async () => {
    const { applyReferralPairBonusInTransaction } = require('./friends_together');
    const admin = require('firebase-admin');
    const db = admin.firestore();

    await db.runTransaction(async (tx: unknown) => {
      await applyReferralPairBonusInTransaction(
        db,
        tx,
        'alice',
        'bob',
        Date.parse('2026-08-17T10:00:00.000Z'),
      );
    });

    expect(docs.get('friend_pairs/alice__bob')).toMatchObject({ bonusDays: 3 });
  });

  // зачем (PM-170, D78): недельный буст пары удалён вместе с наградами «Вместе» — пара получает только bonusDays.
  test('sets bonusDays=3 on first call and writes no weekly boost', async () => {
    const { applyReferralPairBonus } = require('./friends_together');
    const admin = require('firebase-admin');
    const db = admin.firestore();
    await applyReferralPairBonus(db, 'alice', 'bob', Date.parse('2026-08-17T10:00:00.000Z'));
    const pair = docs.get('friend_pairs/alice__bob');
    expect(pair?.bonusDays).toBe(3);
    expect(pair).not.toHaveProperty('boostUntilWeekKey');
  });

  test('is idempotent: second call does not change an already-set bonus', async () => {
    const { applyReferralPairBonus } = require('./friends_together');
    const admin = require('firebase-admin');
    const db = admin.firestore();
    await applyReferralPairBonus(db, 'alice', 'bob', Date.parse('2026-08-17T10:00:00.000Z'));
    // Second call much later — should NOT change the already-set bonus.
    await applyReferralPairBonus(db, 'alice', 'bob', Date.parse('2026-09-17T10:00:00.000Z'));
    const pair = docs.get('friend_pairs/alice__bob');
    expect(pair?.bonusDays).toBe(3);
    expect(pair).not.toHaveProperty('boostUntilWeekKey');
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

describe('friend nudge push logging (PM-200)', () => {
  test('logs failed/timeout transport with code and no PII; silent on sent', async () => {
    const { logFriendNudgePushOutcome, logFriendNudgePushError } = require('./friends_together');
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    logFriendNudgePushOutcome('sent');
    expect(warn).not.toHaveBeenCalled();
    logFriendNudgePushOutcome('failed');
    logFriendNudgePushOutcome('timeout');
    logFriendNudgePushError(new TypeError('boom ExponentPushToken[bob]'));
    expect(warn.mock.calls.map((c) => c[1])).toEqual([
      { type: 'friend_nudge', code: 'failed' },
      { type: 'friend_nudge', code: 'timeout' },
      { type: 'friend_nudge', code: 'TypeError' },
    ]);
    expect(warn.mock.calls.every((c) => String(c[0]).startsWith('[PUSH-PREFS]'))).toBe(true);
    warn.mockRestore();
  });
});

describe('серия вдвоём и флаг «Вместе» (ревью Ядра 4f33676dc)', () => {
  // зачем: у обоих 5 общих дней подряд по «сегодня» (23.08) — без этого серия 0 и тест «флаг выключен» прошёл бы впустую
  function seedFiveDayStreak() {
    const days = ['2026-08-23', '2026-08-22', '2026-08-21', '2026-08-20', '2026-08-19'];
    for (const uid of ['alice', 'bob']) {
      const user = docs.get(`users/${uid}`) as DocData;
      docs.set(`users/${uid}`, { ...user, progress: { ...(user.progress as DocData), active_days_v1: JSON.stringify(encode('2026-08-23', days)) } });
    }
  }
  const pushRow = (): Record<string, unknown> => {
    const request = (global.fetch as jest.Mock).mock.calls[0]?.[1] as { body?: string } | undefined;
    return (JSON.parse(String(request?.body || '[]')) as Array<Record<string, unknown>>)[0] ?? {};
  };
  const notificationNav = () => (docs.get('users/bob/notifications/friends_together_nudge_alice_2026-08-23') as { nav?: Record<string, unknown> } | undefined)?.nav;
  const receiptResponse = () => (docs.get('users/alice/friends_together_nudge_receipts/nudge_000001') as { response?: Record<string, unknown> } | undefined)?.response;

  test('флаг выключен — серия не уходит ни в пуш, ни в уведомление, ни в квитанцию', async () => {
    seedFiveDayStreak();

    const result = await nudge();

    expect(result.ok).toBe(true);
    expect(notificationNav()?.pairStreak).toBe(0);
    expect(receiptResponse()?.pairStreak).toBe(0);
    expect(pushRow()).toMatchObject({ title: 'Alice: пять минут практики?', body: 'Одно маленькое занятие.' });
  });

  test('флаг включён — серия 5 дней в уведомлении, квитанции и тексте пуша', async () => {
    seedFiveDayStreak();
    docs.set('remote_config/app', { bools: { friends_together_enabled: true } });

    await nudge();

    expect(notificationNav()?.pairStreak).toBe(5);
    expect(receiptResponse()?.pairStreak).toBe(5);
    expect(pushRow().title).toBe('Alice: серия вдвоём ждёт');
  });
});
