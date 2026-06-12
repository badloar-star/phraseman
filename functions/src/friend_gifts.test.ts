type DocData = Record<string, unknown>;

type FakeRef = {
  path: string;
  collection: (name: string) => { doc: (id?: string) => FakeRef };
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
      doc: (id?: string) => makeRef(`${name}/${id || `auto-${++autoId}`}`),
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

function seedGiftUsers() {
  docs.set('users/sender', {
    firebaseAuthUid: 'auth-sender',
    displayName: 'Sender',
    shards: 100,
    progress: { user_total_xp: '1000', user_name: 'Sender' },
  });
  docs.set('users/recipient', {
    firebaseAuthUid: 'auth-recipient',
    displayName: 'Recipient',
    shards: 40,
    progress: { user_total_xp: '900', user_name: 'Recipient' },
  });
  docs.set('users/sender/friends/recipient', { since: 1 });
  docs.set('users/recipient/friends/sender', { since: 1 });
}

async function sendGift(overrides: Record<string, unknown> = {}) {
  const { friendSendGift } = require('./friend_gifts');
  return friendSendGift({
    auth: { uid: 'auth-sender' },
    data: {
      senderStableId: 'sender',
      friendStableId: 'recipient',
      giftId: 'chain_shield_1',
      senderDisplayName: 'Sender',
      ...overrides,
    },
  });
}

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date('2026-06-12T10:00:00.000Z'));
  jest.resetModules();
  docs.clear();
  autoId = 0;
  seedGiftUsers();
});

afterEach(() => {
  jest.useRealTimers();
});

test('friendSendGift starts one weekly friend quest after a successful gift', async () => {
  const result = await sendGift();

  expect(result).toMatchObject({
    ok: true,
    giftId: 'chain_shield_1',
    questStarted: true,
    quest: {
      participantUids: ['sender', 'recipient'],
      targetXp: 3000,
      rewardShards: 10,
      rewardXp: 1000,
    },
  });
  const questId = result.quest.questId;
  expect(docs.get(`friend_quests/${questId}`)).toMatchObject({
    status: 'active',
    weekKey: '2026-W24',
    targetXp: 3000,
    rewardShards: 10,
    rewardXp: 1000,
    startXpByUid: { sender: 1000, recipient: 900 },
  });
  expect(docs.get('users/sender/friend_quest_meta/current')).toMatchObject({ questId, status: 'active' });
  expect(docs.get('users/recipient/friend_quest_meta/current')).toMatchObject({ questId, status: 'active' });
  expect(docs.get('users/sender/friend_quest_weekly/2026-W24')).toMatchObject({ questId });
  expect(docs.get('users/recipient/friend_quest_weekly/2026-W24')).toMatchObject({ questId });
});

test('friendSendGift does not start another quest while either user has an active quest', async () => {
  docs.set('users/sender/friend_quest_meta/current', {
    questId: 'existing',
    status: 'active',
    expiresAtMs: Date.now() + 3600000,
  });

  const result = await sendGift();

  expect(result).toMatchObject({ ok: true, questStarted: false, questBlockedReason: 'active' });
  expect(Array.from(docs.keys()).filter(path => path.startsWith('friend_quests/'))).toEqual([]);
});

test('friendClaimQuestReward grants both users once when both reached the XP target', async () => {
  const questId = 'quest_sender_recipient_2026-W24';
  docs.set(`friend_quests/${questId}`, {
    questId,
    participantUids: ['sender', 'recipient'],
    status: 'active',
    startedAtMs: Date.now() - 3600000,
    expiresAtMs: Date.now() + 3600000,
    weekKey: '2026-W24',
    targetXp: 3000,
    rewardShards: 10,
    rewardXp: 1000,
    startXpByUid: { sender: 1000, recipient: 900 },
    rewardClaimedByUid: {},
  });
  docs.set('users/sender/friend_quest_meta/current', { questId, status: 'active', expiresAtMs: Date.now() + 3600000 });
  docs.set('users/recipient/friend_quest_meta/current', { questId, status: 'active', expiresAtMs: Date.now() + 3600000 });
  docs.set('users/sender', { ...docs.get('users/sender'), shards: 4, progress: { user_total_xp: '4100' } });
  docs.set('users/recipient', { ...docs.get('users/recipient'), shards: 9, progress: { user_total_xp: '3900' } });

  const { friendClaimQuestReward } = require('./friend_gifts');
  const first = await friendClaimQuestReward({
    auth: { uid: 'auth-sender' },
    data: { stableId: 'sender', questId },
  });
  const second = await friendClaimQuestReward({
    auth: { uid: 'auth-sender' },
    data: { stableId: 'sender', questId },
  });

  expect(first).toMatchObject({ ok: true, questId, rewardApplied: true, callerShards: 14, callerXp: 5100 });
  expect(second).toMatchObject({ ok: true, questId, rewardApplied: false, callerShards: 14, callerXp: 5100 });
  expect(docs.get('users/sender')).toMatchObject({ shards: 14, progress: { user_total_xp: '5100' } });
  expect(docs.get('users/recipient')).toMatchObject({ shards: 19, progress: { user_total_xp: '4900' } });
  expect(docs.get(`friend_quests/${questId}`)).toMatchObject({
    status: 'completed',
    rewardClaimedByUid: { sender: true, recipient: true },
  });
});
