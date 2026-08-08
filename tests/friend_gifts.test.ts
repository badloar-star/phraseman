const mockCallableInvoker = jest.fn(async () => ({
  data: {
    ok: true,
    giftId: 'arena_extra_5',
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

import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
} from '../app/account_generation';

beforeEach(() => {
  jest.clearAllMocks();
  __resetAccountGenerationForTests();
  beginAccountGeneration('stable-from-auth');
  mockEnsureAnonUser.mockResolvedValue('stable-from-auth');
  mockEnsureStableAuthLinkForStableIdDetailed.mockImplementation(async (stableUid: string) => ({
    ok: true,
    requestedStableId: stableUid,
    stableUid,
    authUid: 'auth-from-test',
    source: 'callable',
  }));
});

test('friend gift revalidates account ownership after ensureAnonUser before auth-link or App Check side effects', async () => {
  let release!: (value: string) => void;
  mockEnsureAnonUser.mockReturnValueOnce(new Promise<string>((resolve) => { release = resolve; }));
  const { sendFriendGiftWithShards } = require('../app/friend_gifts');

  const request = sendFriendGiftWithShards({
    friendStableId: 'friend-123',
    giftId: 'arena_extra_5',
  });
  for (let i = 0; i < 12 && mockEnsureAnonUser.mock.calls.length === 0; i += 1) await Promise.resolve();
  beginAccountGeneration('account-b');
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
    giftId: 'arena_extra_5',
  });
  for (let i = 0; i < 12 && mockEnsureStableAuthLinkForStableIdDetailed.mock.calls.length === 0; i += 1) {
    await Promise.resolve();
  }
  beginAccountGeneration('account-b');
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
    giftId: 'arena_extra_5',
    senderDisplayName: 'Ada',
  });

  expect(mockEnsureAnonUser).toHaveBeenCalledTimes(1);
  expect(mockEnsureStableAuthLinkForStableIdDetailed).toHaveBeenCalledWith('stable-from-auth');
  expect(mockCallableInvoker).toHaveBeenCalledWith({
    senderStableId: 'stable-from-auth',
    friendStableId: 'friend-123',
    giftId: 'arena_extra_5',
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
    giftId: 'arena_extra_5',
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
    giftId: 'arena_extra_5',
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
