type DocData = Record<string, unknown>;

type FakeRef = {
  path: string;
  get: () => Promise<{ exists: boolean; data: () => DocData | undefined }>;
  set: (data: DocData, opts?: { merge?: boolean }) => Promise<void>;
  collection: (name: string) => { doc: (id?: string) => FakeRef };
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
  const collectionApi = (name: string) => ({
    doc: (id?: string) => makeRef(`${name}/${id || `auto-${++autoId}`}`),
    where: (field: string, op: string, value: unknown) => ({
      limit: (count: number) => ({
        get: async () => {
          const prefix = `${name}/`;
          const matched = Array.from(docs.entries())
            .filter(([path, data]) => (
              path.startsWith(prefix) &&
              path.slice(prefix.length).split('/').length === 1 &&
              op === '==' &&
              data[field] === value
            ))
            .slice(0, count)
            .map(([path, data]) => ({
              id: path.slice(prefix.length),
              ref: makeRef(path),
              data: () => data,
            }));
          return {
            empty: matched.length === 0,
            docs: matched,
          };
        },
      }),
    }),
  });
  return {
    collection: collectionApi,
    runTransaction: async <T>(fn: (tx: {
      get: (ref: FakeRef) => Promise<{ exists: boolean; data: () => DocData | undefined }>;
      set: (ref: FakeRef, data: DocData, opts?: { merge?: boolean }) => void;
      create: (ref: FakeRef, data: DocData) => void;
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
        create: (ref: FakeRef, data: DocData) => {
          writes.push(() => {
            if (docs.has(ref.path)) throw new Error(`already-exists:${ref.path}`);
            docs.set(ref.path, { ...data });
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

jest.mock('firebase-admin', () => {
  const firestore = Object.assign(jest.fn(() => buildDb()), {
    FieldValue: {
      serverTimestamp: jest.fn(() => new Date('2026-06-12T10:00:00.000Z')),
      increment: jest.fn((value: number) => ({ __op: 'increment', value })),
    },
  });
  return { firestore };
});

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
    expoPushToken: 'ExponentPushToken[recipient]',
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
      idempotencyKey: `fg_fixture_${String(++requestSequence).padStart(4, '0')}`,
      ...overrides,
    },
  });
}

async function thankGift(overrides: Record<string, unknown> = {}) {
  const { friendThankGift } = require('./friend_gifts');
  return friendThankGift({
    auth: { uid: 'auth-sender' },
    data: {
      senderStableId: 'sender',
      friendStableId: 'recipient',
      giftId: 'chain_shield_1',
      senderDisplayName: 'Sender',
      idempotencyKey: `fgt_fixture_${String(++requestSequence).padStart(4, '0')}`,
      ...overrides,
    },
  });
}

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date('2026-06-12T10:00:00.000Z'));
  jest.resetModules();
  docs.clear();
  autoId = 0;
  requestSequence = 0;
  seedGiftUsers();
  global.fetch = jest.fn(async () => ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify({ data: { status: 'ok' } }),
  })) as unknown as typeof fetch;
});

afterEach(async () => {
  await Promise.resolve();
  await Promise.resolve();
  global.fetch = originalFetch;
  jest.useRealTimers();
});

test('friendSendGift returns immediately after commit without awaiting Expo transport', async () => {
  const fetchMock = jest.fn(() => new Promise<Response>(() => {}));
  const previousFetch = global.fetch;
  global.fetch = fetchMock as typeof fetch;
  try {
    const result = await sendGift();
    expect(result).toMatchObject({ ok: true, costShards: 8 });
    expect(result).not.toHaveProperty('senderBalanceAfter');
    expect(result).not.toHaveProperty('shardsUpdatedAtMs');
    expect(result).not.toHaveProperty('notificationTransport');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  } finally {
    global.fetch = previousFetch;
  }
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

test('friendSendGift repairs stale anonymous auth ownership before spending shards', async () => {
  docs.set('users/sender', {
    ...docs.get('users/sender'),
    firebaseAuthUid: 'old-anon-auth',
    anon_merge_claim: { authUid: 'old-anon-auth', at: Date.now() },
  });

  const result = await sendGift();

  expect(result).toMatchObject({ ok: true, costShards: 8 });
  expect(result).not.toHaveProperty('senderBalanceAfter');
  expect(docs.get('users/sender')).toMatchObject({
    firebaseAuthUid: 'auth-sender',
    shards: 100,
  });
  expect(docs.get('auth_links/auth-sender')).toMatchObject({
    stable_id: 'sender',
  });
});

test('friendSendGift replays the same idempotency key without a second spend or gift', async () => {
  const first = await sendGift({ idempotencyKey: 'fg_test_1234567890' });
  const second = await sendGift({ idempotencyKey: 'fg_test_1234567890' });

  expect(first).toMatchObject({
    ok: true,
    idempotencyKey: 'fg_test_1234567890',
  });
  expect(second).toMatchObject({
    ok: true,
    idempotencyKey: 'fg_test_1234567890',
    idempotentReplay: true,
  });
  expect(first).not.toHaveProperty('senderBalanceAfter');
  expect(second).not.toHaveProperty('senderBalanceAfter');
  expect(docs.get('users/sender')).toMatchObject({ shards: 100 });
  expect(docs.get('users/sender/friend_gift_daily_limits/2026-06-12')).toMatchObject({
    totalSent: 1,
    recipients: { recipient: 1 },
  });
  expect(Array.from(docs.keys()).filter(path => path.startsWith('users/sender/friend_gifts_sent/'))).toHaveLength(1);
  expect(Array.from(docs.keys()).filter(path => path.startsWith('users/recipient/friend_gifts_received/'))).toHaveLength(1);
});

test('friendSendGift rejects reusing an idempotency key for a different gift', async () => {
  await sendGift({ idempotencyKey: 'fg_test_1234567890' });

  await expect(sendGift({
    giftId: 'xp_boost_2x_24h',
    idempotencyKey: 'fg_test_1234567890',
  })).rejects.toMatchObject({
    code: 'already-exists',
    message: 'Idempotency key already used for another friend gift',
  });
  expect(docs.get('users/sender')).toMatchObject({ shards: 100 });
});

test('friendThankGift replays the same idempotency key without a second thanks event', async () => {
  const first = await thankGift({ idempotencyKey: 'fgt_test_1234567890' });
  const second = await thankGift({ idempotencyKey: 'fgt_test_1234567890' });

  expect(first).toMatchObject({
    ok: true,
    idempotencyKey: 'fgt_test_1234567890',
  });
  expect(second).toMatchObject({
    ok: true,
    idempotencyKey: 'fgt_test_1234567890',
    idempotentReplay: true,
  });
  expect(docs.get('users/sender/friend_gift_thanks_idempotency/fgt_test_1234567890')).toMatchObject({
    senderStableId: 'sender',
    friendStableId: 'recipient',
    giftId: 'chain_shield_1',
  });
  expect(Array.from(docs.keys()).filter(path => path.startsWith('users/recipient/my_events/friend_gift_thanks_'))).toHaveLength(1);
});

test('friendThankGift rejects reusing an idempotency key for another thanks gift', async () => {
  await thankGift({ idempotencyKey: 'fgt_test_1234567890' });

  await expect(thankGift({
    giftId: 'xp_boost_2x_24h',
    idempotencyKey: 'fgt_test_1234567890',
  })).rejects.toMatchObject({
    code: 'already-exists',
    message: 'Idempotency key already used for another friend gift thanks',
  });
});

test.each([
  ['friendSendGift missing', () => sendGift({ idempotencyKey: undefined })],
  ['friendSendGift malformed', () => sendGift({ idempotencyKey: 'short' })],
  ['friendThankGift missing', () => thankGift({ idempotencyKey: undefined })],
  ['friendThankGift malformed', () => thankGift({ idempotencyKey: 'short' })],
])('%s idempotency key is rejected before any transaction mutation', async (_label, invoke) => {
  await expect(invoke()).rejects.toMatchObject({
    code: 'invalid-argument',
  });
  expect(docs.get('users/sender')).toMatchObject({ shards: 100 });
  expect(Array.from(docs.keys()).filter((path) => path.includes('friend_gift'))).toEqual([]);
});

test('friend gift callables reject the retired Arena gift before any mutation', async () => {
  await expect(sendGift({ giftId: 'arena_extra_5' })).rejects.toMatchObject({
    code: 'invalid-argument',
    message: 'Unsupported gift id',
  });
  await expect(thankGift({ giftId: 'arena_extra_5' })).rejects.toMatchObject({
    code: 'invalid-argument',
    message: 'Valid sender, friend and gift required',
  });
  expect(docs.get('users/sender')).toMatchObject({ shards: 100 });
  expect(docs.get('users/recipient')).not.toHaveProperty('arena_extra_plays_today');
});

test('friendConsumeChainShield decrements one canonical day once per missed-day occurrence', async () => {
  docs.set('users/sender', {
    ...docs.get('users/sender'),
    chain_shield: JSON.stringify({ daysLeft: 1 }),
    progress: { user_total_xp: '1000', chain_shield: JSON.stringify({ daysLeft: 3 }) },
  });
  const { friendConsumeChainShield } = require('./friend_gifts');
  const request = {
    auth: { uid: 'auth-sender' },
    data: { stableId: 'sender', occurrenceId: '2026-06-11_2026-06-12' },
  };

  const first = await friendConsumeChainShield(request);
  const replay = await friendConsumeChainShield(request);

  expect(first).toEqual(replay);
  expect(first).toMatchObject({ ok: true, consumed: true, daysLeft: 2 });
  const canonical = docs.get('users/sender')?.chain_shield;
  expect(JSON.parse(String(canonical))).toMatchObject({ daysLeft: 2 });
  expect(docs.get('users/sender')?.progress).toMatchObject({ chain_shield: canonical });
  expect(docs.get('users/sender/gift_perk_consumptions/chain_shield_2026-06-11_2026-06-12')).toMatchObject({
    occurrenceId: '2026-06-11_2026-06-12',
    response: first,
  });
});

test('friendConsumeChainShield records and replays a definitive no-shield response', async () => {
  const { friendConsumeChainShield } = require('./friend_gifts');
  const request = {
    auth: { uid: 'auth-sender' },
    data: { stableId: 'sender', occurrenceId: '2026-06-10_2026-06-11' },
  };
  await expect(friendConsumeChainShield(request)).resolves.toMatchObject({ consumed: false, daysLeft: 0 });
  docs.set('users/sender', {
    ...docs.get('users/sender'),
    chain_shield: JSON.stringify({ daysLeft: 5 }),
  });
  await expect(friendConsumeChainShield(request)).resolves.toMatchObject({ consumed: false, daysLeft: 0 });
  expect(JSON.parse(String(docs.get('users/sender')?.chain_shield))).toMatchObject({ daysLeft: 5 });
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

test('friendClaimQuestReward grants only the authenticated participant and replays exact Spin metadata', async () => {
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
  docs.set('users/recipient', { ...docs.get('users/recipient'), shards: 9, progress: { user_total_xp: '4100' } });

  const { friendClaimQuestReward } = require('./friend_gifts');
  const first = await friendClaimQuestReward({
    auth: { uid: 'auth-sender' },
    data: { stableId: 'sender', questId, levelSpinProtocol: 'v1' },
  });
  const second = await friendClaimQuestReward({
    auth: { uid: 'auth-sender' },
    data: { stableId: 'sender', questId, levelSpinProtocol: 'v1' },
  });

  expect(first).toMatchObject({
    ok: true,
    questId,
    rewardApplied: true,
    callerXpBeforeReward: 4100,
    rewardXpApplied: 1000,
    callerXp: 5100,
    levelSpinMintedCredits: [{ id: 'level_spin_v1_005', level: 5, kind: 'milestone' }],
    levelSpinBalance: 1,
  });
  expect(second).toMatchObject({
    ok: true,
    questId,
    rewardApplied: false,
    rewardXpApplied: 0,
    callerXp: 5100,
    levelSpinMintedCredits: [{ id: 'level_spin_v1_005', level: 5, kind: 'milestone' }],
    levelSpinBalance: 1,
  });
  expect(docs.get('users/sender')).toMatchObject({ shards: 4, progress: { user_total_xp: '5100' } });
  expect(docs.get('users/recipient')).toMatchObject({ shards: 9, progress: { user_total_xp: '4100' } });
  expect(docs.get('users/sender/level_spin_credits/level_spin_v1_005')).toMatchObject({
    level: 5,
    kind: 'milestone',
    status: 'available',
  });
  expect(docs.get('users/sender')).toMatchObject({
    levelSpinServerState: { levelBaseline: 5, balance: 1, activeRequestId: null },
    progress: { level_reward_spin_balance: '1' },
  });
  expect(docs.get('users/recipient')?.levelSpinServerState).toBeUndefined();
  expect(docs.get('users/recipient/level_spin_credits/level_spin_v1_005')).toBeUndefined();
  expect(docs.get(`friend_quests/${questId}`)).toMatchObject({
    status: 'ready',
    rewardClaimedByUid: { sender: true },
    rewardOutcomeByUid: {
      sender: {
        levelSpinMintedCredits: [{ id: 'level_spin_v1_005', level: 5, kind: 'milestone' }],
        levelSpinBalance: 1,
      },
    },
  });

  const recipient = await friendClaimQuestReward({
    auth: { uid: 'auth-recipient' },
    data: { stableId: 'recipient', questId },
  });
  expect(recipient).toMatchObject({
    rewardApplied: true,
    callerXp: 5100,
    levelSpinMintedCredits: [],
    levelSpinBalance: 0,
  });
  expect(first).not.toHaveProperty('callerShards');
  expect(second).not.toHaveProperty('callerShards');
  expect(recipient).not.toHaveProperty('callerShards');
  expect(docs.get(`friend_quests/${questId}`)).toMatchObject({
    status: 'completed',
    rewardClaimedByUid: { sender: true, recipient: true },
  });
});

test('friendClaimQuestReward does not let one participant claim an unclaimed partner reward', async () => {
  const questId = 'quest_sender_recipient_partial_2026-W24';
  docs.set(`friend_quests/${questId}`, {
    questId,
    participantUids: ['sender', 'recipient'],
    status: 'ready',
    startedAtMs: Date.now() - 3600000,
    expiresAtMs: Date.now() + 3600000,
    weekKey: '2026-W24',
    targetXp: 3000,
    rewardShards: 10,
    rewardXp: 1000,
    startXpByUid: { sender: 1000, recipient: 900 },
    rewardClaimedByUid: { sender: true },
  });
  docs.set('users/sender', { ...docs.get('users/sender'), shards: 14, progress: { user_total_xp: '5100' } });
  docs.set('users/recipient', { ...docs.get('users/recipient'), shards: 9, progress: { user_total_xp: '3900' } });

  const { friendClaimQuestReward } = require('./friend_gifts');
  const result = await friendClaimQuestReward({
    auth: { uid: 'auth-sender' },
    data: { stableId: 'sender', questId },
  });

  expect(result).toMatchObject({
    rewardApplied: false,
    callerXpBeforeReward: 5100,
    rewardXpApplied: 0,
    callerXp: 5100,
  });
  expect(docs.get('users/sender')).toMatchObject({ shards: 14, progress: { user_total_xp: '5100' } });
  expect(docs.get('users/recipient')).toMatchObject({ shards: 9, progress: { user_total_xp: '3900' } });
  expect(docs.get(`friend_quests/${questId}`)).toMatchObject({
    status: 'ready',
    rewardClaimedByUid: { sender: true },
  });
});

test('friendClaimQuestReward rejects a hidden account after it was merged into a canonical winner', async () => {
  const questId = 'quest_hidden_loser_2026-W24';
  docs.set(`friend_quests/${questId}`, {
    questId,
    participantUids: ['sender', 'recipient'],
    status: 'ready',
    expiresAtMs: Date.now() + 3600000,
    targetXp: 1,
    rewardShards: 10,
    rewardXp: 1000,
    startXpByUid: { sender: 0, recipient: 0 },
    rewardClaimedByUid: {},
  });
  docs.set('users/sender', { ...docs.get('users/sender'), progress: { user_total_xp: '10' } });
  docs.set('users/recipient', {
    ...docs.get('users/recipient'),
    progress: { user_total_xp: '10' },
    identityHidden: true,
    canonicalStableId: 'sender',
    levelSpinMergePending: false,
  });
  const shardsBefore = docs.get('users/recipient')?.shards;

  const { friendClaimQuestReward } = require('./friend_gifts');
  await expect(friendClaimQuestReward({
    auth: { uid: 'auth-recipient' },
    data: { stableId: 'recipient', questId, levelSpinProtocol: 'v1' },
  })).rejects.toMatchObject({ code: 'permission-denied' });
  expect(docs.get('users/recipient')).toMatchObject({ shards: shardsBefore, identityHidden: true });
});

export {};
