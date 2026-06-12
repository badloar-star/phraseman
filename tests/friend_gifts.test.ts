const mockCallableInvoker = jest.fn(async () => ({
  data: {
    ok: true,
    giftId: 'arena_extra_5',
    costShards: 5,
    senderBalanceAfter: 95,
    dailyRemaining: 2,
  },
}));

const mockEnsureAnonUser = jest.fn(async () => 'stable-from-auth');
const mockEnsureStableAuthLinkForStableId = jest.fn(async () => true);
const mockReplaceShardsBalanceLocal = jest.fn(async () => undefined);
const mockBumpLifetimeShardsSpent = jest.fn();
const mockCheckAchievements = jest.fn();

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
  ensureStableAuthLinkForStableId: mockEnsureStableAuthLinkForStableId,
}));

jest.mock('../app/user_id_policy', () => ({
  getCanonicalUserId: jest.fn(async () => 'stale-canonical-id'),
}));

jest.mock('../app/app_check_init', () => ({
  initFirebaseAppCheckIfAvailable: jest.fn(async () => undefined),
}));

jest.mock('../app/shards_system', () => ({
  replaceShardsBalanceLocal: mockReplaceShardsBalanceLocal,
}));

jest.mock('../app/lifetime_profile_stats', () => ({
  bumpLifetimeShardsSpent: mockBumpLifetimeShardsSpent,
}));

jest.mock('../app/achievements', () => ({
  checkAchievements: mockCheckAchievements,
}));

beforeEach(() => {
  jest.clearAllMocks();
});

test('sendFriendGiftWithShards prepares auth before calling the gift function', async () => {
  const { sendFriendGiftWithShards } = require('../app/friend_gifts');

  await sendFriendGiftWithShards({
    friendStableId: 'friend-123',
    giftId: 'arena_extra_5',
    senderDisplayName: 'Ada',
  });

  expect(mockEnsureAnonUser).toHaveBeenCalledTimes(1);
  expect(mockEnsureStableAuthLinkForStableId).toHaveBeenCalledWith('stable-from-auth');
  expect(mockCallableInvoker).toHaveBeenCalledWith({
    senderStableId: 'stable-from-auth',
    friendStableId: 'friend-123',
    giftId: 'arena_extra_5',
    senderDisplayName: 'Ada',
  });
  expect(mockEnsureAnonUser.mock.invocationCallOrder[0]).toBeLessThan(
    mockCallableInvoker.mock.invocationCallOrder[0],
  );
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
  });
});
