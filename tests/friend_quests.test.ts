const mockCallableInvoker: jest.Mock<Promise<any>, any> = jest.fn(async () => ({
  data: {
    ok: true,
    quest: {
      questId: 'quest_2026-W24_sender_recipient',
      participantUids: ['stable-from-auth', 'friend-123'],
      status: 'ready',
      targetXp: 3000,
      rewardShards: 10,
      rewardXp: 1000,
      progressByUid: { 'stable-from-auth': 3000, 'friend-123': 3000 },
      remainingXpByUid: { 'stable-from-auth': 0, 'friend-123': 0 },
    },
  },
}));
const mockEnsureAnonUser = jest.fn(async () => 'stable-from-auth');
const mockEnsureStableAuthLinkForStableId = jest.fn(async () => true);
const mockReplaceShardsBalanceLocal = jest.fn(async () => undefined);
const mockStorageSetItem = jest.fn(async () => undefined);
const mockStorageGetItem: jest.Mock<Promise<string | null>, [string]> = jest.fn(async (_key: string) => null);

jest.mock('@react-native-firebase/app', () => ({
  getApp: jest.fn(() => ({})),
}));

jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn(() => mockCallableInvoker),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: mockStorageGetItem,
  setItem: mockStorageSetItem,
}));

jest.mock('../app/config', () => ({
  CLOUD_SYNC_ENABLED: true,
  IS_EXPO_GO: false,
}));

jest.mock('../app/cloud_sync', () => ({
  ensureAnonUser: mockEnsureAnonUser,
  ensureStableAuthLinkForStableId: mockEnsureStableAuthLinkForStableId,
}));

jest.mock('../app/app_check_init', () => ({
  initFirebaseAppCheckIfAvailable: jest.fn(async () => undefined),
}));

jest.mock('../app/shards_system', () => ({
  replaceShardsBalanceLocal: mockReplaceShardsBalanceLocal,
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockStorageGetItem.mockResolvedValue(null);
});

test('getActiveFriendQuest prepares stable auth and calls the status function', async () => {
  const { getActiveFriendQuest } = require('../app/friend_quests');

  const result = await getActiveFriendQuest();

  expect(mockEnsureAnonUser).toHaveBeenCalledTimes(1);
  expect(mockEnsureStableAuthLinkForStableId).toHaveBeenCalledWith('stable-from-auth');
  expect(mockCallableInvoker).toHaveBeenCalledWith({ stableId: 'stable-from-auth', force: false });
  expect(result.quest.targetXp).toBe(3000);
});

test('claimFriendQuestReward syncs returned shards and XP locally', async () => {
  mockCallableInvoker.mockResolvedValueOnce({
    data: {
      ok: true,
      questId: 'quest_2026-W24_sender_recipient',
      rewardApplied: true,
      callerShards: 24,
      shardsUpdatedAtMs: 3_000,
      callerXp: 5100,
    },
  });
  const { claimFriendQuestReward } = require('../app/friend_quests');

  const result = await claimFriendQuestReward('quest_2026-W24_sender_recipient');

  expect(mockCallableInvoker).toHaveBeenCalledWith({
    stableId: 'stable-from-auth',
    questId: 'quest_2026-W24_sender_recipient',
  });
  expect(mockReplaceShardsBalanceLocal).toHaveBeenCalledWith(24, {
    updatedAtMs: 3_000,
    op: 'earn',
    reason: 'friend_quest_reward',
  });
  expect(mockStorageSetItem).toHaveBeenCalledWith('user_total_xp', '5100');
  expect(result.rewardApplied).toBe(true);
});

test('claimFriendQuestReward does not lower a higher local XP mirror', async () => {
  mockStorageGetItem.mockResolvedValueOnce('9000');
  mockCallableInvoker.mockResolvedValueOnce({
    data: {
      ok: true,
      questId: 'quest_2026-W24_sender_recipient',
      rewardApplied: true,
      callerShards: 24,
      shardsUpdatedAtMs: 3_000,
      callerXp: 5100,
    },
  });
  const { claimFriendQuestReward } = require('../app/friend_quests');

  await claimFriendQuestReward('quest_2026-W24_sender_recipient');

  expect(mockStorageSetItem).toHaveBeenCalledWith('user_total_xp', '9000');
});
