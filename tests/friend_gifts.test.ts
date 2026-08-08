const mockCallableInvoker = jest.fn(async (_payload: unknown) => ({
  data: {
    ok: true,
    giftId: 'chain_shield_1',
    costShards: 5,
    senderBalanceAfter: 95,
    shardsUpdatedAtMs: 3_000,
    dailyRemaining: 2,
  },
}));

const mockEnsureAnonUser = jest.fn(async () => 'stable-from-auth');
const mockEnsureStableAuthLinkForStableIdDetailed = jest.fn(async (stableUid: string) => ({
  ok: true,
  requestedStableId: stableUid,
  stableUid,
  authUid: 'auth-from-test',
  source: 'callable',
}));
const mockReplaceShardsBalanceLocal = jest.fn(async () => undefined);
const mockReplaceShardsBalanceForAccountGeneration = jest.fn(async () => 'applied');
const mockBumpLifetimeShardsSpent = jest.fn(async () => undefined);
const mockCheckAchievements = jest.fn(async () => []);
const mockInitFirebaseAppCheckIfAvailable = jest.fn(async () => undefined);
const mockStorage: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(mockStorage[key] ?? null)),
  setItem: jest.fn((key: string, value: string) => { mockStorage[key] = value; return Promise.resolve(); }),
  removeItem: jest.fn((key: string) => { delete mockStorage[key]; return Promise.resolve(); }),
}));

jest.mock('@react-native-firebase/app', () => ({
  getApp: jest.fn(() => ({})),
}));

jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn(() => mockCallableInvoker),
}));

jest.mock('../app/config', () => ({
  CLOUD_SYNC_ENABLED: true,
  IS_EXPO_GO: false,
}));

jest.mock('../app/cloud_sync', () => ({
  ensureAnonUser: mockEnsureAnonUser,
  ensureStableAuthLinkForStableIdDetailed: mockEnsureStableAuthLinkForStableIdDetailed,
}));

jest.mock('../app/user_id_policy', () => ({
  getCanonicalUserId: jest.fn(async () => 'stale-canonical-id'),
}));

jest.mock('../app/app_check_init', () => ({
  initFirebaseAppCheckIfAvailable: mockInitFirebaseAppCheckIfAvailable,
}));

jest.mock('../app/shards_system', () => ({
  replaceShardsBalanceLocal: mockReplaceShardsBalanceLocal,
  replaceShardsBalanceForAccountGeneration: mockReplaceShardsBalanceForAccountGeneration,
}));

jest.mock('../app/lifetime_profile_stats', () => ({
  bumpLifetimeShardsSpent: mockBumpLifetimeShardsSpent,
}));

jest.mock('../app/achievements', () => ({
  checkAchievements: mockCheckAchievements,
}));

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  mockCallableInvoker.mockReset().mockImplementation(async (_payload: unknown) => ({
    data: {
      ok: true,
      giftId: 'chain_shield_1',
      costShards: 5,
      senderBalanceAfter: 95,
      shardsUpdatedAtMs: 3_000,
      dailyRemaining: 2,
    },
  }));
  mockEnsureAnonUser.mockReset().mockResolvedValue('stable-from-auth');
  mockEnsureStableAuthLinkForStableIdDetailed.mockReset().mockImplementation(async (stableUid: string) => ({
    ok: true,
    requestedStableId: stableUid,
    stableUid,
    authUid: 'auth-from-test',
    source: 'callable',
  }));
  mockReplaceShardsBalanceLocal.mockReset().mockResolvedValue(undefined);
  mockReplaceShardsBalanceForAccountGeneration.mockReset().mockResolvedValue('applied');
  mockBumpLifetimeShardsSpent.mockReset().mockResolvedValue(undefined);
  mockCheckAchievements.mockReset().mockResolvedValue([]);
  mockInitFirebaseAppCheckIfAvailable.mockReset().mockResolvedValue(undefined);
  const AsyncStorage = require('@react-native-async-storage/async-storage') as {
    getItem: jest.Mock;
    setItem: jest.Mock;
    removeItem: jest.Mock;
  };
  AsyncStorage.getItem.mockReset().mockImplementation(
    (key: string) => Promise.resolve(mockStorage[key] ?? null),
  );
  AsyncStorage.setItem.mockReset().mockImplementation((key: string, value: string) => {
    mockStorage[key] = value;
    return Promise.resolve();
  });
  AsyncStorage.removeItem.mockReset().mockImplementation((key: string) => {
    delete mockStorage[key];
    return Promise.resolve();
  });
  const { __resetAccountGenerationForTests, beginAccountGeneration } = require('../app/account_generation');
  __resetAccountGenerationForTests();
  beginAccountGeneration('stable-from-auth');
  Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
});

test('friend gift catalog exposes only gifts supported by the server', () => {
  const { FRIEND_GIFT_CATALOG } = require('../app/friend_gifts');

  expect(FRIEND_GIFT_CATALOG.map(({ id }: { id: string }) => id)).toEqual([
    'chain_shield_1',
    'xp_boost_2x_24h',
  ]);
});

test('friend gift revalidates account ownership after ensureAnonUser before auth-link or App Check side effects', async () => {
  let release!: (value: string) => void;
  mockEnsureAnonUser.mockReturnValueOnce(new Promise<string>((resolve) => { release = resolve; }));
  const { sendFriendGiftWithShards } = require('../app/friend_gifts');

  const request = sendFriendGiftWithShards({
    friendStableId: 'friend-123',
    giftId: 'chain_shield_1',
  });
  for (let i = 0; i < 12 && mockEnsureAnonUser.mock.calls.length === 0; i += 1) await Promise.resolve();
  require('../app/account_generation').beginAccountGeneration('account-b');
  release('stable-from-auth');

  await expect(request).rejects.toThrow('friend_gift_identity_changed');
  expect(mockEnsureStableAuthLinkForStableIdDetailed).not.toHaveBeenCalled();
  expect(mockInitFirebaseAppCheckIfAvailable).not.toHaveBeenCalled();
});

test('friend gift revalidates account ownership after auth-link before App Check side effects', async () => {
  let release!: (value: {
    ok: true;
    requestedStableId: string;
    stableUid: string;
    authUid: string;
    source: 'callable';
  }) => void;
  mockEnsureStableAuthLinkForStableIdDetailed.mockReturnValueOnce(new Promise((resolve) => { release = resolve; }));
  const { sendFriendGiftWithShards } = require('../app/friend_gifts');

  const request = sendFriendGiftWithShards({
    friendStableId: 'friend-123',
    giftId: 'chain_shield_1',
  });
  for (let i = 0; i < 12 && mockEnsureStableAuthLinkForStableIdDetailed.mock.calls.length === 0; i += 1) {
    await Promise.resolve();
  }
  require('../app/account_generation').beginAccountGeneration('account-b');
  release({
    ok: true,
    requestedStableId: 'stable-from-auth',
    stableUid: 'stable-from-auth',
    authUid: 'auth-from-test',
    source: 'callable',
  });

  await expect(request).rejects.toThrow('friend_gift_identity_changed');
  expect(mockInitFirebaseAppCheckIfAvailable).not.toHaveBeenCalled();
});

test('sendFriendGiftWithShards prepares auth before calling the gift function', async () => {
  const { sendFriendGiftWithShards } = require('../app/friend_gifts');

  await sendFriendGiftWithShards({
    friendStableId: 'friend-123',
    giftId: 'chain_shield_1',
    senderDisplayName: 'Ada',
  });

  expect(mockEnsureAnonUser).toHaveBeenCalledTimes(1);
  expect(mockEnsureStableAuthLinkForStableIdDetailed).toHaveBeenCalledWith('stable-from-auth');
  expect(mockCallableInvoker).toHaveBeenCalledWith({
    senderStableId: 'stable-from-auth',
    friendStableId: 'friend-123',
    giftId: 'chain_shield_1',
    senderDisplayName: 'Ada',
    idempotencyKey: expect.stringMatching(/^fg_[a-z0-9]+_[a-z0-9]+_[a-z0-9]+$/),
  });
  expect(mockEnsureAnonUser.mock.invocationCallOrder[0]).toBeLessThan(
    mockCallableInvoker.mock.invocationCallOrder[0],
  );
  expect(mockReplaceShardsBalanceForAccountGeneration).toHaveBeenCalledWith(
    95,
    expect.objectContaining({ stableId: 'stable-from-auth', phase: 'active' }),
    'stable-from-auth',
    {
      updatedAtMs: 3_000,
      op: 'spend',
      reason: 'friend_gift',
    },
  );
  expect(mockReplaceShardsBalanceLocal).not.toHaveBeenCalled();
});

test('sendFriendGiftWithShards does not call the gift function when auth link is unavailable', async () => {
  mockEnsureStableAuthLinkForStableIdDetailed.mockResolvedValueOnce({
    ok: false,
    requestedStableId: 'stable-from-auth',
    stableUid: '',
    authUid: '',
    source: 'unavailable',
  });
  const { sendFriendGiftWithShards } = require('../app/friend_gifts');

  await expect(sendFriendGiftWithShards({
    friendStableId: 'friend-123',
    giftId: 'chain_shield_1',
    senderDisplayName: 'Ada',
  })).rejects.toThrow('friend_gift_auth_unavailable');

  expect(mockCallableInvoker).not.toHaveBeenCalled();
});

test('sendFriendGiftWithShards stops when auth link resolves to another stable id', async () => {
  mockEnsureStableAuthLinkForStableIdDetailed.mockResolvedValueOnce({
    ok: true,
    requestedStableId: 'stable-from-auth',
    stableUid: 'other-stable',
    authUid: 'auth-from-test',
    source: 'callable',
  });
  const { sendFriendGiftWithShards } = require('../app/friend_gifts');

  await expect(sendFriendGiftWithShards({
    friendStableId: 'friend-123',
    giftId: 'chain_shield_1',
    senderDisplayName: 'Ada',
  })).rejects.toThrow('friend_gift_identity_changed');

  expect(mockCallableInvoker).not.toHaveBeenCalled();
});

test('classifyFriendGiftError maps callable failures to actionable gift states', () => {
  const { classifyFriendGiftError } = require('../app/friend_gifts');

  expect(classifyFriendGiftError({ code: 'functions/permission-denied', message: 'stable_id_mismatch' })).toBe('auth');
  expect(classifyFriendGiftError({ code: 'functions/failed-precondition', message: 'sender_stable_id_changed' })).toBe('identity_changed');
  expect(classifyFriendGiftError({ code: 'functions/resource-exhausted', message: 'Daily gift limit reached' })).toBe('limit');
  expect(classifyFriendGiftError({ code: 'functions/failed-precondition', message: 'Not enough shards' })).toBe('not_enough_shards');
  expect(classifyFriendGiftError({ code: 'functions/not-found', message: 'User not found' })).toBe('user_missing');
  expect(classifyFriendGiftError({ code: 'functions/unavailable', message: 'network timeout' })).toBe('network');
});

test('send fails closed when the persisted idempotency key cannot be read', async () => {
  const AsyncStorage = require('@react-native-async-storage/async-storage') as {
    getItem: jest.Mock;
    setItem: jest.Mock;
    removeItem: jest.Mock;
  };
  AsyncStorage.getItem.mockRejectedValueOnce(new Error('storage unavailable'));
  const { sendFriendGiftWithShards } = require('../app/friend_gifts');

  await expect(sendFriendGiftWithShards({
    friendStableId: 'friend-storage-read',
    giftId: 'chain_shield_1',
  })).rejects.toThrow('storage unavailable');

  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
  expect(mockCallableInvoker).not.toHaveBeenCalled();
});

test('send retry reuses one idempotency key after an ambiguous timeout until a definitive response', async () => {
  const { sendFriendGiftWithShards } = require('../app/friend_gifts');
  mockCallableInvoker
    .mockRejectedValueOnce({ code: 'functions/deadline-exceeded', message: 'timeout after commit is unknown' })
    .mockResolvedValueOnce({
      data: {
        ok: true,
        giftId: 'chain_shield_1',
        costShards: 5,
        senderBalanceAfter: 95,
        shardsUpdatedAtMs: 3_000,
        dailyRemaining: 2,
      },
    })
    .mockResolvedValueOnce({
      data: {
        ok: true,
        giftId: 'chain_shield_1',
        costShards: 5,
        senderBalanceAfter: 90,
        shardsUpdatedAtMs: 4_000,
        dailyRemaining: 1,
      },
    });

  const request = { friendStableId: 'friend-timeout', giftId: 'chain_shield_1' as const };
  await expect(sendFriendGiftWithShards(request)).rejects.toMatchObject({ code: 'functions/deadline-exceeded' });
  await expect(sendFriendGiftWithShards(request)).resolves.toMatchObject({ senderBalanceAfter: 95 });
  await expect(sendFriendGiftWithShards(request)).resolves.toMatchObject({ senderBalanceAfter: 90 });

  const keys = mockCallableInvoker.mock.calls.map((call) => (
    call[0] as { idempotencyKey: string }
  ).idempotencyKey);
  expect(keys[0]).toBe(keys[1]);
  expect(keys[2]).not.toBe(keys[1]);
});

test('pre-call account switch cannot discard an already ambiguous account key', async () => {
  const { sendFriendGiftWithShards } = require('../app/friend_gifts');
  const data = { friendStableId: 'friend-ambiguous-switch', giftId: 'chain_shield_1' as const };
  mockCallableInvoker.mockRejectedValueOnce({ code: 'functions/deadline-exceeded', message: 'unknown commit' });
  await expect(sendFriendGiftWithShards(data)).rejects.toMatchObject({ code: 'functions/deadline-exceeded' });
  const originalKey = (mockCallableInvoker.mock.calls[0][0] as { idempotencyKey: string }).idempotencyKey;

  let releaseIdentity!: (value: string) => void;
  mockEnsureAnonUser.mockReturnValueOnce(new Promise<string>((resolve) => { releaseIdentity = resolve; }));
  const interruptedRetry = sendFriendGiftWithShards(data);
  for (let i = 0; i < 20 && mockEnsureAnonUser.mock.calls.length < 2; i += 1) await Promise.resolve();
  require('../app/account_generation').beginAccountGeneration('account-b');
  releaseIdentity('stable-from-auth');
  await expect(interruptedRetry).rejects.toThrow('friend_gift_identity_changed');
  expect(mockCallableInvoker).toHaveBeenCalledTimes(1);

  require('../app/account_generation').beginAccountGeneration('stable-from-auth');
  mockEnsureAnonUser.mockResolvedValue('stable-from-auth');
  mockCallableInvoker.mockResolvedValueOnce({ data: {
    ok: true,
    giftId: 'chain_shield_1',
    costShards: 5,
    senderBalanceAfter: 95,
    shardsUpdatedAtMs: 3_000,
    dailyRemaining: 2,
    idempotentReplay: true,
  } } as any);
  await expect(sendFriendGiftWithShards(data)).resolves.toMatchObject({ idempotentReplay: true });

  expect((mockCallableInvoker.mock.calls[1][0] as { idempotencyKey: string }).idempotencyKey).toBe(originalKey);
});

test('unmapped callable failure retains its key because commit status is ambiguous', async () => {
  const { sendFriendGiftWithShards } = require('../app/friend_gifts');
  const data = { friendStableId: 'friend-internal-error', giftId: 'chain_shield_1' as const };
  mockCallableInvoker
    .mockRejectedValueOnce({ code: 'functions/internal', message: 'server fault after transaction' })
    .mockResolvedValueOnce({ data: {
      ok: true,
      giftId: 'chain_shield_1',
      costShards: 5,
      senderBalanceAfter: 95,
      shardsUpdatedAtMs: 3_000,
      dailyRemaining: 2,
      idempotentReplay: true,
    } } as any);

  await expect(sendFriendGiftWithShards(data)).rejects.toMatchObject({ code: 'functions/internal' });
  await expect(sendFriendGiftWithShards(data)).resolves.toMatchObject({ idempotentReplay: true });

  const keys = mockCallableInvoker.mock.calls.map((call) => (
    call[0] as { idempotencyKey: string }
  ).idempotencyKey);
  expect(keys[1]).toBe(keys[0]);
});

test('concurrent identical sends share storage, callable, result, and idempotency key', async () => {
  let releaseStorage!: (value: string | null) => void;
  const storageRead = new Promise<string | null>((resolve) => { releaseStorage = resolve; });
  const AsyncStorage = require('@react-native-async-storage/async-storage') as {
    getItem: jest.Mock;
  };
  AsyncStorage.getItem.mockImplementation(() => storageRead);

  let releaseCallable!: () => void;
  const callableGate = new Promise<void>((resolve) => { releaseCallable = resolve; });
  mockCallableInvoker.mockImplementation(async (rawPayload: unknown) => {
    const payload = rawPayload as { idempotencyKey: string };
    await callableGate;
    return {
      data: {
        ok: true,
        giftId: 'chain_shield_1',
        costShards: 5,
        senderBalanceAfter: 95,
        shardsUpdatedAtMs: 3_000,
        dailyRemaining: 2,
        idempotencyKey: payload.idempotencyKey,
      },
    };
  });
  const { sendFriendGiftWithShards } = require('../app/friend_gifts');
  const data = { friendStableId: 'friend-concurrent', giftId: 'chain_shield_1' as const };

  const first = sendFriendGiftWithShards(data);
  const second = sendFriendGiftWithShards(data);
  releaseStorage(null);
  for (let i = 0; i < 20 && mockCallableInvoker.mock.calls.length === 0; i += 1) {
    await Promise.resolve();
  }
  releaseCallable();
  const [firstResult, secondResult] = await Promise.all([first, second]);

  expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1);
  expect(mockCallableInvoker).toHaveBeenCalledTimes(1);
  expect(firstResult).toBe(secondResult);
  expect(firstResult.idempotencyKey).toBe(
    (mockCallableInvoker.mock.calls[0][0] as { idempotencyKey: string }).idempotencyKey,
  );
});

test('ambiguous send retry reuses its persisted account-scoped key after module restart', async () => {
  let gifts = require('../app/friend_gifts');
  mockCallableInvoker.mockRejectedValueOnce({ code: 'functions/deadline-exceeded', message: 'unknown commit' });
  const request = { friendStableId: 'friend-restart', giftId: 'chain_shield_1' as const };
  await expect(gifts.sendFriendGiftWithShards(request)).rejects.toMatchObject({ code: 'functions/deadline-exceeded' });
  const firstKey = (mockCallableInvoker.mock.calls[0][0] as { idempotencyKey: string }).idempotencyKey;

  jest.resetModules();
  require('../app/account_generation').beginAccountGeneration('stable-from-auth');
  mockCallableInvoker.mockResolvedValueOnce({ data: {
    ok: true, giftId: 'chain_shield_1', costShards: 5, senderBalanceAfter: 95,
    shardsUpdatedAtMs: 3_000, dailyRemaining: 2,
  } });
  gifts = require('../app/friend_gifts');
  await gifts.sendFriendGiftWithShards(request);
  const secondKey = (mockCallableInvoker.mock.calls[1][0] as { idempotencyKey: string }).idempotencyKey;

  expect(secondKey).toBe(firstKey);
});

test('post-response local hydration failure stays ancillary to the authoritative server success', async () => {
  mockReplaceShardsBalanceForAccountGeneration.mockRejectedValueOnce(new Error('local hydration failed'));
  const { sendFriendGiftWithShards } = require('../app/friend_gifts');
  const request = { friendStableId: 'friend-post-commit', giftId: 'chain_shield_1' as const };

  await expect(sendFriendGiftWithShards(request)).resolves.toMatchObject({
    senderBalanceAfter: 95,
  });
  expect(mockCallableInvoker).toHaveBeenCalledTimes(1);
});

test('account switch after a committed send resolves the server result without mutating account B', async () => {
  let releaseCallable!: (value: { data: {
    ok: true;
    giftId: 'chain_shield_1';
    costShards: number;
    senderBalanceAfter: number;
    shardsUpdatedAtMs: number;
    dailyRemaining: number;
  } }) => void;
  mockCallableInvoker.mockReturnValueOnce(new Promise((resolve) => { releaseCallable = resolve; }));
  const { sendFriendGiftWithShards } = require('../app/friend_gifts');

  const pending = sendFriendGiftWithShards({
    friendStableId: 'friend-account-switch',
    giftId: 'chain_shield_1',
  });
  for (let i = 0; i < 20 && mockCallableInvoker.mock.calls.length === 0; i += 1) await Promise.resolve();
  const sentKey = (mockCallableInvoker.mock.calls[0][0] as { idempotencyKey: string }).idempotencyKey;
  require('../app/account_generation').beginAccountGeneration('account-b');
  releaseCallable({ data: {
    ok: true,
    giftId: 'chain_shield_1',
    costShards: 5,
    senderBalanceAfter: 95,
    shardsUpdatedAtMs: 3_000,
    dailyRemaining: 2,
  } });

  await expect(pending).resolves.toMatchObject({ ok: true, senderBalanceAfter: 95 });
  expect(mockCallableInvoker).toHaveBeenCalledTimes(1);
  expect((mockCallableInvoker.mock.calls[0][0] as { idempotencyKey: string }).idempotencyKey).toBe(sentKey);
  expect(mockReplaceShardsBalanceForAccountGeneration).not.toHaveBeenCalled();
  expect(mockReplaceShardsBalanceLocal).not.toHaveBeenCalled();
  expect(mockBumpLifetimeShardsSpent).not.toHaveBeenCalled();
  expect(mockCheckAchievements).not.toHaveBeenCalled();
});

test('account A retry cap does not block an independent send from account B', async () => {
  mockCallableInvoker.mockRejectedValue({ code: 'functions/deadline-exceeded', message: 'unknown commit' });
  const { sendFriendGiftWithShards } = require('../app/friend_gifts');

  for (let index = 0; index < 32; index += 1) {
    await expect(sendFriendGiftWithShards({
      friendStableId: `friend-a-${index}`,
      giftId: 'chain_shield_1',
    })).rejects.toMatchObject({ code: 'functions/deadline-exceeded' });
  }

  require('../app/account_generation').beginAccountGeneration('account-b');
  mockEnsureAnonUser.mockResolvedValue('account-b');
  mockCallableInvoker.mockResolvedValueOnce({ data: {
    ok: true,
    giftId: 'chain_shield_1',
    costShards: 5,
    senderBalanceAfter: 50,
    shardsUpdatedAtMs: 4_000,
    dailyRemaining: 2,
  } });

  await expect(sendFriendGiftWithShards({
    friendStableId: 'friend-b',
    giftId: 'chain_shield_1',
  })).resolves.toMatchObject({ ok: true, senderBalanceAfter: 50 });
  expect(mockCallableInvoker).toHaveBeenCalledTimes(33);
});

test('sendFriendGiftThanks calls the thanks function for the gift sender', async () => {
  const { sendFriendGiftThanks } = require('../app/friend_gifts');

  await sendFriendGiftThanks({
    friendStableId: 'friend-123',
    giftId: 'chain_shield_1',
    senderDisplayName: 'Ada',
  });

  expect(mockCallableInvoker).toHaveBeenCalledWith({
    senderStableId: 'stable-from-auth',
    friendStableId: 'friend-123',
    giftId: 'chain_shield_1',
    senderDisplayName: 'Ada',
    idempotencyKey: expect.stringMatching(/^fgt_[a-z0-9]+_[a-z0-9]+_[a-z0-9]+$/),
  });
});

test('sendFriendGiftThanks reuses its durable key after an ambiguous response', async () => {
  const { sendFriendGiftThanks } = require('../app/friend_gifts');
  const request = {
    friendStableId: 'friend-thanks-retry',
    giftId: 'chain_shield_1' as const,
    senderDisplayName: 'Ada',
  };
  mockCallableInvoker.mockRejectedValueOnce({ code: 'functions/deadline-exceeded', message: 'unknown commit' });

  await expect(sendFriendGiftThanks(request)).rejects.toMatchObject({ code: 'functions/deadline-exceeded' });
  const firstKey = (mockCallableInvoker.mock.calls[0][0] as { idempotencyKey: string }).idempotencyKey;
  mockCallableInvoker.mockResolvedValueOnce({
    data: { ok: true, idempotencyKey: firstKey, idempotentReplay: true },
  } as any);

  await expect(sendFriendGiftThanks(request)).resolves.toMatchObject({ ok: true, idempotentReplay: true });
  const secondKey = (mockCallableInvoker.mock.calls[1][0] as { idempotencyKey: string }).idempotencyKey;
  expect(secondKey).toBe(firstKey);
});

test('sendFriendGiftThanks reuses its durable key after internal unknown outcome and module restart', async () => {
  let gifts = require('../app/friend_gifts');
  const request = {
    friendStableId: 'friend-thanks-internal-restart',
    giftId: 'chain_shield_1' as const,
    senderDisplayName: 'Ada',
  };
  mockCallableInvoker.mockRejectedValueOnce({
    code: 'functions/internal',
    message: 'response lost after commit',
  });

  await expect(gifts.sendFriendGiftThanks(request)).rejects.toMatchObject({ code: 'functions/internal' });
  const firstKey = (mockCallableInvoker.mock.calls[0][0] as { idempotencyKey: string }).idempotencyKey;
  expect(Object.values(mockStorage)).toContain(firstKey);

  jest.resetModules();
  require('../app/account_generation').beginAccountGeneration('stable-from-auth');
  mockCallableInvoker.mockResolvedValueOnce({
    data: { ok: true, idempotencyKey: firstKey, idempotentReplay: true },
  } as any);
  gifts = require('../app/friend_gifts');
  await expect(gifts.sendFriendGiftThanks(request)).resolves.toMatchObject({ ok: true, idempotentReplay: true });

  const secondKey = (mockCallableInvoker.mock.calls[1][0] as { idempotencyKey: string }).idempotencyKey;
  expect(secondKey).toBe(firstKey);
  expect(Object.values(mockStorage)).not.toContain(firstKey);
});

test('sendFriendGiftThanks clears its durable key after a definitive server rejection', async () => {
  const { sendFriendGiftThanks } = require('../app/friend_gifts');
  const request = {
    friendStableId: 'friend-thanks-definitive',
    giftId: 'chain_shield_1' as const,
  };
  mockCallableInvoker.mockRejectedValueOnce({
    code: 'functions/failed-precondition',
    message: 'users are not friends',
  });

  await expect(sendFriendGiftThanks(request)).rejects.toMatchObject({ code: 'functions/failed-precondition' });
  const firstKey = (mockCallableInvoker.mock.calls[0][0] as { idempotencyKey: string }).idempotencyKey;
  expect(Object.values(mockStorage)).not.toContain(firstKey);

  mockCallableInvoker.mockResolvedValueOnce({ data: { ok: true } } as any);
  await expect(sendFriendGiftThanks(request)).resolves.toMatchObject({ ok: true });
  const secondKey = (mockCallableInvoker.mock.calls[1][0] as { idempotencyKey: string }).idempotencyKey;
  expect(secondKey).not.toBe(firstKey);
});
