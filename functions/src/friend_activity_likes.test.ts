type DocData = Record<string, unknown>;

type FakeRef = {
  path: string;
  collection: (name: string) => {
    doc: (id?: string) => FakeRef;
  };
};

const docs = new Map<string, DocData>();
let autoId = 0;

function makeRef(path: string): FakeRef {
  return {
    path,
    collection: (name: string) => ({
      doc: (id?: string) => makeRef(`${path}/${name}/${id || `auto-${++autoId}`}`),
    }),
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
    collection: (name: string) => ({
      doc: (id: string) => makeRef(`${name}/${id}`),
    }),
    runTransaction: async <T>(fn: (tx: {
      get: (ref: FakeRef) => Promise<{ exists: boolean; data: () => DocData | undefined }>;
      set: (ref: FakeRef, data: DocData, opts?: { merge?: boolean }) => void;
    }) => Promise<T>): Promise<T> => {
      const writes: Array<() => void> = [];
      const tx = {
        get: async (ref: FakeRef) => {
          const data = docs.get(ref.path);
          return { exists: data !== undefined, data: () => data };
        },
        set: (ref: FakeRef, data: DocData, opts?: { merge?: boolean }) => {
          writes.push(() => {
            const existing = docs.get(ref.path) ?? {};
            docs.set(ref.path, opts?.merge ? deepMerge(existing, data) : { ...data });
          });
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
  test('increments the event counter, profile aggregate, daily limit and audit log', async () => {
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
    expect(docs.get('users/sender/friend_activity_like_daily_limits/2026-05-14')).toMatchObject({
      date: '2026-05-14',
      targetUid: 'target',
      eventId: 'event-1',
    });
    expect(docs.get('users/target/activity_likes_received/2026-05-14_sender_event-1')).toMatchObject({
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

  test('blocks a second like from the same sender on the same UTC day without incrementing', async () => {
    await callLike();

    await expect(callLike({ eventId: 'event-1' })).rejects.toMatchObject({
      code: 'resource-exhausted',
      message: 'Daily activity like limit reached',
    });
    expect(docs.get('users/target/my_events/event-1')).toMatchObject({ activityLikeCount: 1 });
    expect(docs.get('users/target/activity_like_stats/summary')).toMatchObject({ total: 1 });
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
    expect(docs.get('users/sender/friend_activity_like_daily_limits/2026-05-14')).toBeUndefined();
  });

  test('rejects a sender stable id that is not linked to the auth user', async () => {
    docs.set('users/sender', { firebaseAuthUid: 'other-auth' });

    await expect(callLike()).rejects.toMatchObject({
      code: 'permission-denied',
      message: 'Sender does not match auth user',
    });
    expect(docs.get('users/target/activity_like_stats/summary')).toBeUndefined();
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
