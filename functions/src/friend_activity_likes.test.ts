type DocData = Record<string, unknown>;

function likeRecordId(targetUid: string, eventId: string): string {
  const { createHash } = require('node:crypto') as typeof import('node:crypto');
  const digest = createHash('sha256')
    .update(`activity-like-v2\0${targetUid}\0${eventId}`, 'utf8')
    .digest('hex')
    .slice(0, 48);
  return `al_${digest}`;
}

function sentLikePath(targetUid: string, eventId: string): string {
  return `users/sender/friend_activity_likes_sent/${likeRecordId(targetUid, eventId)}`;
}

function likeReceiptId(senderUid: string, targetUid: string, eventId: string): string {
  const { createHash } = require('node:crypto') as typeof import('node:crypto');
  const digest = createHash('sha256')
    .update(`activity-like-received-v2\0${senderUid}\0${targetUid}\0${eventId}`, 'utf8')
    .digest('hex')
    .slice(0, 48);
  return `alr_${digest}`;
}

function receivedLikePath(targetUid: string, eventId: string, senderUid = 'sender'): string {
  return `users/${targetUid}/activity_likes_received/${likeReceiptId(senderUid, targetUid, eventId)}`;
}

type FakeRef = {
  kind: 'ref';
  path: string;
  collection: (name: string) => FakeQuery;
};

type FakeQuery = {
  kind: 'query';
  path: string;
  filters: { field: string; value: unknown }[];
  doc: (id?: string) => FakeRef;
  where: (field: string, op: '==', value: unknown) => FakeQuery;
  limit: (count: number) => FakeQuery;
  limitCount?: number;
};

const docs = new Map<string, DocData>();
let autoId = 0;

function makeRef(path: string): FakeRef {
  return {
    kind: 'ref',
    path,
    collection: (name: string) => makeQuery(`${path}/${name}`),
  };
}

function makeQuery(
  path: string,
  filters: { field: string; value: unknown }[] = [],
  limitCount?: number,
): FakeQuery {
  return {
    kind: 'query',
    path,
    filters,
    doc: (id?: string) => makeRef(`${path}/${id || `auto-${++autoId}`}`),
    where: (field: string, _op: '==', value: unknown) => makeQuery(
      path,
      [...filters, { field, value }],
      limitCount,
    ),
    limit: (count: number) => makeQuery(path, filters, count),
    ...(limitCount === undefined ? {} : { limitCount }),
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

function buildDb() {
  return {
    collection: (name: string) => makeQuery(name),
    runTransaction: async <T>(fn: (tx: {
      get: (ref: FakeRef | FakeQuery) => Promise<any>;
      set: (ref: FakeRef, data: DocData, opts?: { merge?: boolean }) => void;
      delete: (ref: FakeRef) => void;
    }) => Promise<T>): Promise<T> => {
      const writes: Array<() => void> = [];
      const tx = {
        get: async (ref: FakeRef | FakeQuery) => {
          if (ref.kind === 'query') {
            const prefix = `${ref.path}/`;
            const matches = [...docs.entries()]
              .filter(([path, data]) => path.startsWith(prefix)
                && !path.slice(prefix.length).includes('/')
                && ref.filters.every(filter => data[filter.field] === filter.value))
              .slice(0, ref.limitCount ?? Number.MAX_SAFE_INTEGER)
              .map(([path, data]) => ({
                id: path.slice(prefix.length),
                ref: makeRef(path),
                exists: true,
                data: () => data,
              }));
            return { empty: matches.length === 0, docs: matches, size: matches.length };
          }
          const data = docs.get(ref.path);
          return { exists: data !== undefined, data: () => data };
        },
        set: (ref: FakeRef, data: DocData, opts?: { merge?: boolean }) => {
          writes.push(() => {
            const existing = docs.get(ref.path) ?? {};
            docs.set(ref.path, opts?.merge ? deepMerge(existing, data) : { ...data });
          });
        },
        delete: (ref: FakeRef) => {
          writes.push(() => { docs.delete(ref.path); });
        },
      };
      const result = await fn(tx);
      writes.forEach(write => write());
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

jest.mock('firebase-admin', () => ({
  firestore: jest.fn(() => buildDb()),
}));

function seedUsersAndEvent() {
  docs.set('users/sender', {
    firebaseAuthUid: 'auth-sender',
    displayName: 'Sender Root',
    progress: { user_name: 'Sender Progress' },
  });
  docs.set('users/target', { displayName: 'Target' });
  docs.set('users/target/friends/sender', { createdAt: Date.now() - 2000 });
  docs.set('users/target/my_events/event-1', {
    uid: 'target',
    type: 'level_up',
    ts: Date.now() - 1000,
    payload: { level: 3 },
  });
}

async function callLike(overrides: Record<string, unknown> = {}) {
  const { friendLikeActivity } = require('./friend_activity_likes');
  return friendLikeActivity({
    auth: { uid: 'auth-sender' },
    data: {
      senderStableId: 'sender',
      targetStableId: 'target',
      eventId: 'event-1',
      senderDisplayName: 'Sender Name',
      ...overrides,
    },
  });
}

/** Profile-level like from a user card: no eventId, friend or not. */
async function callProfileLike(overrides: Record<string, unknown> = {}) {
  const { friendLikeActivity } = require('./friend_activity_likes');
  return friendLikeActivity({
    auth: { uid: 'auth-sender' },
    data: {
      senderStableId: 'sender',
      targetStableId: 'target',
      senderDisplayName: 'Sender Name',
      ...overrides,
    },
  });
}

async function callUnlike(overrides: Record<string, unknown> = {}) {
  const { friendUnlikeActivity } = require('./friend_activity_likes');
  return friendUnlikeActivity({
    auth: { uid: 'auth-sender' },
    data: {
      senderStableId: 'sender',
      targetStableId: 'target',
      senderDisplayName: 'Sender Name',
      ...overrides,
    },
  });
}

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date('2026-05-14T10:00:00.000Z'));
  jest.resetModules();
  docs.clear();
  autoId = 0;
  seedUsersAndEvent();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('friendLikeActivity', () => {
  test('increments the event counter, profile aggregate, persistent sent state and audit log', async () => {
    const result = await callLike();

    expect(result).toEqual({
      ok: true,
      date: '2026-05-14',
      targetUid: 'target',
      eventId: 'event-1',
      activityLikeCount: 1,
      targetActivityLikeTotal: 1,
    });
    expect(docs.get('users/target/my_events/event-1')).toMatchObject({
      activityLikeCount: 1,
      lastActivityLikeFromUid: 'sender',
      lastActivityLikeFromName: 'Sender Name',
    });
    expect(docs.get('users/target/activity_like_stats/summary')).toMatchObject({
      total: 1,
      lastFromUid: 'sender',
      lastEventId: 'event-1',
    });
    expect(docs.get(sentLikePath('target', 'event-1'))).toMatchObject({
      date: '2026-05-14',
      targetUid: 'target',
      eventId: 'event-1',
    });
    expect(docs.get(receivedLikePath('target', 'event-1'))).toMatchObject({
      date: '2026-05-14',
      eventId: 'event-1',
      fromUid: 'sender',
      fromName: 'Sender Name',
    });
  });

  test('allows likes when the target root user doc is missing but the event exists', async () => {
    docs.delete('users/target');

    const result = await callLike();

    expect(result).toMatchObject({
      ok: true,
      targetUid: 'target',
      eventId: 'event-1',
      activityLikeCount: 1,
    });
    expect(docs.get('users/target/my_events/event-1')).toMatchObject({
      activityLikeCount: 1,
      lastActivityLikeFromUid: 'sender',
    });
  });

  test('allows likes on legacy events whose stored uid differs from the owner path', async () => {
    docs.set('users/target/my_events/event-1', {
      uid: 'legacy-auth-target',
      type: 'level_up',
      ts: Date.now() - 1000,
      payload: { level: 3 },
    });

    const result = await callLike();

    expect(result).toMatchObject({
      ok: true,
      targetUid: 'target',
      eventId: 'event-1',
      activityLikeCount: 1,
    });
    expect(docs.get('users/target/my_events/event-1')).toMatchObject({
      uid: 'target',
      activityLikeCount: 1,
      lastActivityLikeFromUid: 'sender',
    });
  });

  test('replays a duplicate like for the same event without incrementing', async () => {
    await callLike();

    await expect(callLike({ eventId: 'event-1' })).resolves.toMatchObject({
      ok: true,
      idempotentReplay: true,
      activityLikeCount: 1,
      targetActivityLikeTotal: 1,
    });
    expect(docs.get('users/target/my_events/event-1')).toMatchObject({ activityLikeCount: 1 });
    expect(docs.get('users/target/activity_like_stats/summary')).toMatchObject({ total: 1 });
  });

  test('migrates a matching legacy daily like without incrementing it again', async () => {
    docs.set('users/target/my_events/event-1', {
      uid: 'target', type: 'level_up', ts: Date.now() - 1000, payload: { level: 3 }, activityLikeCount: 1,
    });
    docs.set('users/target/activity_like_stats/summary', { total: 1 });
    docs.set('users/sender/friend_activity_like_daily_limits/2026-05-13', {
      targetUid: 'target', eventId: 'event-1', createdAt: Date.now() - 500,
    });

    await expect(callLike()).resolves.toMatchObject({
      idempotentReplay: true,
      migratedLegacy: true,
      activityLikeCount: 1,
      targetActivityLikeTotal: 1,
    });
    expect(docs.get(sentLikePath('target', 'event-1'))).toMatchObject({
      targetUid: 'target', eventId: 'event-1', legacyDate: '2026-05-13',
    });
    expect(docs.get('users/sender/friend_activity_like_daily_limits/2026-05-13')).toBeUndefined();
    expect(docs.get('users/target/activity_like_stats/summary')).toMatchObject({ total: 1 });
  });

  test('allows independent likes on different events on the same UTC day', async () => {
    await callLike();
    docs.set('users/target/my_events/event-2', {
      uid: 'target',
      type: 'level_up',
      ts: Date.now() - 500,
      payload: { level: 4 },
    });

    await expect(callLike({ eventId: 'event-2' })).resolves.toMatchObject({
      ok: true,
      eventId: 'event-2',
      targetActivityLikeTotal: 2,
    });
    expect(docs.get('users/target/my_events/event-1')).toMatchObject({ activityLikeCount: 1 });
    expect(docs.get('users/target/my_events/event-2')).toMatchObject({ activityLikeCount: 1 });
    expect(docs.get('users/target/activity_like_stats/summary')).toMatchObject({ total: 2 });
  });

  test('keeps separate receiver history rows when two senders like the same event', async () => {
    await callLike();
    docs.set('users/sender-2', {
      firebaseAuthUid: 'auth-sender-2',
      displayName: 'Second Sender',
    });
    docs.set('users/target/friends/sender-2', { createdAt: Date.now() - 1000 });
    const { friendLikeActivity } = require('./friend_activity_likes');

    await friendLikeActivity({
      auth: { uid: 'auth-sender-2' },
      data: {
        senderStableId: 'sender-2',
        targetStableId: 'target',
        eventId: 'event-1',
        senderDisplayName: 'Second Sender',
      },
    });

    expect(docs.get(receivedLikePath('target', 'event-1', 'sender'))).toMatchObject({ fromUid: 'sender' });
    expect(docs.get(receivedLikePath('target', 'event-1', 'sender-2'))).toMatchObject({ fromUid: 'sender-2' });
    expect(docs.get('users/target/activity_like_stats/summary')).toMatchObject({ total: 2 });
    expect(docs.get('users/target/my_events/event-1')).toMatchObject({ activityLikeCount: 2 });
  });

  test('mirrors league group boost event likes into the league group document', async () => {
    const boostEventId = 'league_group_boost_2026-20_group-1_1000';
    docs.set(`users/target/my_events/${boostEventId}`, {
      uid: 'target',
      type: 'league_group_boost',
      groupId: 'group-1',
      activityLikeCount: 2,
      ts: Date.now() - 1000,
    });
    docs.set('league_groups/group-1', {
      weekId: '2026-20',
      groupBoost: {
        buyerUid: 'target',
        likeEventId: boostEventId,
        likeCount: 2,
        multiplier: 2,
      },
    });

    const result = await callLike({ eventId: boostEventId });

    expect(result).toMatchObject({
      ok: true,
      eventId: boostEventId,
      activityLikeCount: 3,
    });
    expect(docs.get(`users/target/my_events/${boostEventId}`)).toMatchObject({
      activityLikeCount: 3,
    });
    expect(docs.get('league_groups/group-1')).toMatchObject({
      groupBoost: {
        buyerUid: 'target',
        likeEventId: boostEventId,
        likeCount: 3,
        multiplier: 2,
      },
    });
  });

  test('rejects self likes before any writes', async () => {
    docs.set('users/sender/my_events/event-1', { uid: 'sender', type: 'level_up', ts: Date.now(), payload: {} });

    await expect(callLike({ targetStableId: 'sender' })).rejects.toMatchObject({
      code: 'failed-precondition',
      message: 'Self activity likes are not allowed',
    });
    expect(docs.get(sentLikePath('sender', 'event-1'))).toBeUndefined();
  });

  test('rejects a sender stable id that is not linked to the auth user', async () => {
    docs.set('users/sender', { firebaseAuthUid: 'other-auth' });

    await expect(callLike()).rejects.toMatchObject({
      code: 'permission-denied',
      message: 'Sender does not match auth user',
    });
    expect(docs.get('users/target/activity_like_stats/summary')).toBeUndefined();
  });

  test('rejects likes when the sender is not a friend of the target', async () => {
    docs.delete('users/target/friends/sender');

    await expect(callLike()).rejects.toMatchObject({
      code: 'failed-precondition',
      message: 'Users are not friends',
    });
    expect(docs.get('users/target/activity_like_stats/summary')).toBeUndefined();
    expect(docs.get(sentLikePath('target', 'event-1'))).toBeUndefined();
  });

  test('rejects path-like or overlong ids as invalid arguments', async () => {
    await expect(callLike({ eventId: 'event-1/child' })).rejects.toMatchObject({
      code: 'invalid-argument',
      message: 'Valid sender, target and event ids required',
    });
    await expect(callLike({ senderStableId: 'x'.repeat(161) })).rejects.toMatchObject({
      code: 'invalid-argument',
      message: 'Valid sender, target and event ids required',
    });
    expect(docs.get('users/target/activity_like_stats/summary')).toBeUndefined();
  });
});

describe('friendLikeActivity profile-mode (user card)', () => {
  test('likes any user without an event or friendship and records who liked', async () => {
    docs.delete('users/target/friends/sender'); // not friends — profile likes are still allowed

    const result = await callProfileLike();

    expect(result).toMatchObject({
      ok: true,
      date: '2026-05-14',
      targetUid: 'target',
      eventId: '__profile__',
      activityLikeCount: 1,
      targetActivityLikeTotal: 1,
    });
    expect(docs.get('users/target/activity_like_stats/summary')).toMatchObject({
      total: 1,
      lastFromUid: 'sender',
      lastEventId: '__profile__',
    });
    expect(docs.get(sentLikePath('target', '__profile__'))).toMatchObject({
      targetUid: 'target',
      eventId: '__profile__',
      kind: 'profile',
    });
    expect(docs.get(receivedLikePath('target', '__profile__'))).toMatchObject({
      fromUid: 'sender',
      fromName: 'Sender Name',
      kind: 'profile',
    });
    // Profile likes never touch a my_events doc.
    expect(docs.get('users/target/my_events/__profile__')).toBeUndefined();
  });

  test('does not increment the event counter for a profile like', async () => {
    await callProfileLike();
    expect(docs.get('users/target/my_events/event-1')).not.toMatchObject({ activityLikeCount: 1 });
  });

  test('replays the same persistent profile like idempotently', async () => {
    await callProfileLike();
    jest.setSystemTime(new Date('2026-05-15T10:00:00.000Z'));
    await expect(callProfileLike()).resolves.toMatchObject({
      ok: true,
      idempotentReplay: true,
      targetActivityLikeTotal: 1,
    });
    expect(docs.get('users/target/activity_like_stats/summary')).toMatchObject({ total: 1 });
  });

  test('allows a profile like and an event like independently on the same day', async () => {
    await callProfileLike();
    await expect(callLike({ eventId: 'event-1' })).resolves.toMatchObject({
      ok: true,
      eventId: 'event-1',
      targetActivityLikeTotal: 2,
    });
  });

  test('rejects a profile self-like before any writes', async () => {
    await expect(callProfileLike({ targetStableId: 'sender' })).rejects.toMatchObject({
      code: 'failed-precondition',
      message: 'Self activity likes are not allowed',
    });
    expect(docs.get(sentLikePath('sender', '__profile__'))).toBeUndefined();
  });
});

describe('friendUnlikeActivity (toggle off)', () => {
  test('removes a persistent profile like: decrements total and clears sent + received', async () => {
    await callProfileLike();
    expect(docs.get('users/target/activity_like_stats/summary')).toMatchObject({ total: 1 });

    const result = await callUnlike();

    expect(result).toMatchObject({
      ok: true,
      removed: true,
      targetUid: 'target',
      eventId: '__profile__',
      targetActivityLikeTotal: 0,
    });
    expect(docs.get('users/target/activity_like_stats/summary')).toMatchObject({ total: 0 });
    expect(docs.get(sentLikePath('target', '__profile__'))).toBeUndefined();
    expect(docs.get(receivedLikePath('target', '__profile__'))).toBeUndefined();
  });

  test('can like a different user after unliking without any daily quota', async () => {
    await callProfileLike();
    await callUnlike();
    await expect(callProfileLike({ targetStableId: 'target2' })).resolves.toMatchObject({
      ok: true,
      targetUid: 'target2',
      targetActivityLikeTotal: 1,
    });
  });

  test('is a no-op when there is no matching persistent like', async () => {
    const result = await callUnlike();
    expect(result).toMatchObject({ ok: true, removed: false, targetActivityLikeTotal: 0 });
    expect(docs.get('users/target/activity_like_stats/summary')).toBeUndefined();
  });

  test('will not remove a persistent like that points at a different target', async () => {
    await callProfileLike();
    const result = await callUnlike({ targetStableId: 'target2' });
    expect(result).toMatchObject({ removed: false });
    // Original like untouched.
    expect(docs.get(sentLikePath('target', '__profile__'))).toMatchObject({ targetUid: 'target' });
    expect(docs.get('users/target/activity_like_stats/summary')).toMatchObject({ total: 1 });
  });

  test('removes an event-mode like and decrements the event counter', async () => {
    await callLike(); // event-1, friend
    expect(docs.get('users/target/my_events/event-1')).toMatchObject({ activityLikeCount: 1 });

    const result = await callUnlike({ eventId: 'event-1' });

    expect(result).toMatchObject({ removed: true, activityLikeCount: 0, targetActivityLikeTotal: 0 });
    expect(docs.get('users/target/my_events/event-1')).toMatchObject({ activityLikeCount: 0 });
    expect(docs.get(receivedLikePath('target', 'event-1'))).toBeUndefined();
  });
});

export {};
