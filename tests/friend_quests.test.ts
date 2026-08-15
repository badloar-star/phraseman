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
const mockCommitConfirmedExternalShardEvent = jest.fn(async () => ({ status: 'applied', balanceAfter: 24 }));
const mockStorageSetItem = jest.fn(async () => undefined);
const mockStorageGetItem: jest.Mock<Promise<string | null>, [string]> = jest.fn(async (_key: string) => null);
const mockEnqueueAuthoritativeLevelSpinLevels = jest.fn(async () => undefined);
const mockPersistAuthoritativeLevelSpinBalance = jest.fn(async () => undefined);
const mockAccountGeneration = { generation: 1, stableId: 'stable-from-auth' };

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
  commitConfirmedExternalShardEvent: mockCommitConfirmedExternalShardEvent,
}));

jest.mock('../app/level_spin_level_up_queue', () => ({
  enqueueAuthoritativeLevelSpinLevels: mockEnqueueAuthoritativeLevelSpinLevels,
}));

jest.mock('../app/level_reward_spins_client', () => ({
  persistAuthoritativeLevelSpinBalance: mockPersistAuthoritativeLevelSpinBalance,
}));

jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: jest.fn(() => ({
    generation: mockAccountGeneration.generation,
    stableId: mockAccountGeneration.stableId,
    phase: 'active',
  })),
  isCurrentAccountGeneration: jest.fn((token, expectedStableId) => (
    token.generation === mockAccountGeneration.generation
    && token.stableId === mockAccountGeneration.stableId
    && expectedStableId === mockAccountGeneration.stableId
  )),
  withAccountTransitionLock: jest.fn(async (work) => work()),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockStorageGetItem.mockResolvedValue(null);
  mockAccountGeneration.generation = 1;
  mockAccountGeneration.stableId = 'stable-from-auth';
});

test('getActiveFriendQuest prepares stable auth and calls the status function', async () => {
  const { getActiveFriendQuest } = require('../app/friend_quests');

  const result = await getActiveFriendQuest();

  expect(mockEnsureAnonUser).toHaveBeenCalledTimes(1);
  expect(mockEnsureStableAuthLinkForStableId).toHaveBeenCalledWith('stable-from-auth');
  expect(mockCallableInvoker).toHaveBeenCalledWith({ stableId: 'stable-from-auth', force: false });
  expect(result.quest.targetXp).toBe(3000);
});

test('claimFriendQuestReward applies the confirmed external shard event and XP locally', async () => {
  mockCallableInvoker.mockResolvedValueOnce({
    data: {
      ok: true,
      questId: 'quest_2026-W24_sender_recipient',
      rewardApplied: true,
      rewardShardsApplied: 10,
      callerXp: 5100,
    },
  });
  const { claimFriendQuestReward } = require('../app/friend_quests');

  const result = await claimFriendQuestReward('quest_2026-W24_sender_recipient');

  expect(mockCallableInvoker).toHaveBeenCalledWith({
    stableId: 'stable-from-auth',
    questId: 'quest_2026-W24_sender_recipient',
    levelSpinProtocol: 'v1',
  });
  expect(mockCommitConfirmedExternalShardEvent).toHaveBeenCalledWith(expect.objectContaining({
    source: 'friend_quest', eventId: 'quest_2026-W24_sender_recipient', delta: 10,
  }));
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
      callerXp: 5100,
    },
  });
  const { claimFriendQuestReward } = require('../app/friend_quests');

  await claimFriendQuestReward('quest_2026-W24_sender_recipient');

  expect(mockStorageSetItem).toHaveBeenCalledWith('user_total_xp', '9000');
});

test('claimFriendQuestReward persists exact server Spin metadata before sparse plaque enqueue', async () => {
  mockStorageGetItem.mockResolvedValueOnce('50');
  mockCallableInvoker.mockResolvedValueOnce({
    data: {
      ok: true,
      questId: 'quest_2026-W24_sender_recipient',
      rewardApplied: true,
      callerXpBeforeReward: 50,
      rewardXpApplied: 100,
      callerXp: 150,
      levelSpinMintedCredits: [
        { id: 'level_spin_v1_002', level: 2, kind: 'standard' },
        { id: 'level_spin_v1_004', level: 4, kind: 'standard' },
      ],
      levelSpinBalance: 7,
    },
  });
  const { claimFriendQuestReward } = require('../app/friend_quests');

  await claimFriendQuestReward('quest_2026-W24_sender_recipient');

  expect(mockStorageSetItem).toHaveBeenCalledWith('user_total_xp', '150');
  expect(mockPersistAuthoritativeLevelSpinBalance).toHaveBeenCalledWith('stable-from-auth', 7);
  expect(mockEnqueueAuthoritativeLevelSpinLevels).toHaveBeenCalledWith([2, 4]);
  expect(mockPersistAuthoritativeLevelSpinBalance.mock.invocationCallOrder[0])
    .toBeLessThan(mockEnqueueAuthoritativeLevelSpinLevels.mock.invocationCallOrder[0]);
});

test('claimFriendQuestReward replays exact server Spin metadata even when rewardApplied is false', async () => {
  mockStorageGetItem.mockResolvedValueOnce('50');
  mockCallableInvoker.mockResolvedValueOnce({
    data: {
      ok: true,
      questId: 'quest_2026-W24_sender_recipient',
      rewardApplied: false,
      callerXpBeforeReward: 4100,
      rewardXpApplied: 0,
      callerXp: 5100,
      levelSpinMintedCredits: [{ id: 'level_spin_v1_005', level: 5, kind: 'milestone' }],
      levelSpinBalance: 1,
    },
  });
  const { claimFriendQuestReward } = require('../app/friend_quests');

  await claimFriendQuestReward('quest_2026-W24_sender_recipient');

  expect(mockStorageSetItem).toHaveBeenCalledWith('user_total_xp', '5100');
  expect(mockEnqueueAuthoritativeLevelSpinLevels).toHaveBeenCalledWith([5]);
});

test('claimFriendQuestReward mirrors XP but does not reconcile when an old backend omits pre-reward XP', async () => {
  mockStorageGetItem.mockResolvedValueOnce('50');
  mockCallableInvoker.mockResolvedValueOnce({
    data: {
      ok: true,
      questId: 'quest_2026-W24_sender_recipient',
      rewardApplied: true,
      callerXp: 5100,
    },
  });
  const { claimFriendQuestReward } = require('../app/friend_quests');

  await claimFriendQuestReward('quest_2026-W24_sender_recipient');

  expect(mockStorageSetItem).toHaveBeenCalledWith('user_total_xp', '5100');
  expect(mockEnqueueAuthoritativeLevelSpinLevels).not.toHaveBeenCalled();
});

test('claimFriendQuestReward mirrors repeated server XP without creating historical rewards', async () => {
  mockStorageGetItem.mockResolvedValueOnce('50');
  mockCallableInvoker.mockResolvedValueOnce({
    data: {
      ok: true,
      questId: 'quest_2026-W24_sender_recipient',
      rewardApplied: false,
      callerXp: 150,
    },
  });
  const { claimFriendQuestReward } = require('../app/friend_quests');

  await claimFriendQuestReward('quest_2026-W24_sender_recipient');

  expect(mockStorageSetItem).toHaveBeenCalledWith('user_total_xp', '150');
  expect(mockEnqueueAuthoritativeLevelSpinLevels).not.toHaveBeenCalled();
});

test.each([
  ['string before XP', { callerXpBeforeReward: '50', rewardXpApplied: 100, callerXp: 150 }],
  ['fractional before XP', { callerXpBeforeReward: 50.5, rewardXpApplied: 100, callerXp: 150 }],
  ['unsafe before XP', { callerXpBeforeReward: Number.MAX_SAFE_INTEGER + 1, rewardXpApplied: 100, callerXp: 150 }],
  ['string reward XP', { callerXpBeforeReward: 50, rewardXpApplied: '100', callerXp: 150 }],
  ['zero reward XP', { callerXpBeforeReward: 50, rewardXpApplied: 0, callerXp: 150 }],
  ['fractional reward XP', { callerXpBeforeReward: 50, rewardXpApplied: 100.5, callerXp: 150 }],
  ['unsafe reward XP', { callerXpBeforeReward: 50, rewardXpApplied: Number.MAX_SAFE_INTEGER + 1, callerXp: 150 }],
  ['inconsistent reward interval', { callerXpBeforeReward: 50, rewardXpApplied: 99, callerXp: 150 }],
  ['missing before XP', { rewardXpApplied: 100, callerXp: 150 }],
])('claimFriendQuestReward mirrors XP but does not reconcile a %s', async (_label, fields) => {
  mockStorageGetItem.mockResolvedValueOnce('40');
  mockCallableInvoker.mockResolvedValueOnce({
    data: {
      ok: true,
      questId: 'quest_2026-W24_sender_recipient',
      rewardApplied: true,
      ...fields,
    },
  });
  const { claimFriendQuestReward } = require('../app/friend_quests');

  await claimFriendQuestReward('quest_2026-W24_sender_recipient');

  expect(mockStorageSetItem).toHaveBeenCalledWith('user_total_xp', '150');
  expect(mockEnqueueAuthoritativeLevelSpinLevels).not.toHaveBeenCalled();
});

test.each([
  ['string caller XP', '150'],
  ['fractional caller XP', 150.5],
  ['unsafe caller XP', Number.MAX_SAFE_INTEGER + 1],
  ['missing caller XP', undefined],
])('claimFriendQuestReward does not reconcile a %s', async (_label, callerXp) => {
  mockStorageGetItem.mockResolvedValueOnce('40');
  mockCallableInvoker.mockResolvedValueOnce({
    data: {
      ok: true,
      questId: 'quest_2026-W24_sender_recipient',
      rewardApplied: true,
      callerXpBeforeReward: 50,
      rewardXpApplied: 100,
      callerXp,
    },
  });
  const { claimFriendQuestReward } = require('../app/friend_quests');

  await claimFriendQuestReward('quest_2026-W24_sender_recipient');

  expect(mockEnqueueAuthoritativeLevelSpinLevels).not.toHaveBeenCalled();
});

test('claimFriendQuestReward skips all local writes after an account transition', async () => {
  let resolveClaim!: (value: unknown) => void;
  mockCallableInvoker.mockImplementationOnce(() => new Promise((resolve) => { resolveClaim = resolve; }));
  const { claimFriendQuestReward } = require('../app/friend_quests');

  const claim = claimFriendQuestReward('quest_2026-W24_sender_recipient');
  await new Promise((resolve) => setImmediate(resolve));
  mockAccountGeneration.generation += 1;
  mockAccountGeneration.stableId = 'stable-b';
  resolveClaim({
    data: {
      ok: true,
      questId: 'quest_2026-W24_sender_recipient',
      rewardApplied: true,
      callerXpBeforeReward: 50,
      rewardXpApplied: 100,
      callerXp: 150,
    },
  });

  await expect(claim).resolves.toMatchObject({ rewardApplied: true });
  expect(mockCommitConfirmedExternalShardEvent).not.toHaveBeenCalled();
  expect(mockStorageSetItem).not.toHaveBeenCalled();
  expect(mockEnqueueAuthoritativeLevelSpinLevels).not.toHaveBeenCalled();
});
