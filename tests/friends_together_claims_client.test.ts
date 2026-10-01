import AsyncStorage from '@react-native-async-storage/async-storage';

const mockCallableInvoker = jest.fn();
const mockMarkLevel = jest.fn<Promise<void>, [string, number]>(async () => undefined);
const mockMergeServerStars = jest.fn(async (_token: unknown, _observation: unknown) => ({ balance: 0, earnedTotal: 0 }));
let accountGeneration = 1;
let accountStableId = 'me';

jest.mock('@react-native-firebase/app', () => ({ getApp: jest.fn(() => ({})) }));
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn(() => mockCallableInvoker),
}));
jest.mock('../app/config', () => ({ CLOUD_SYNC_ENABLED: true, IS_EXPO_GO: false }));
jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: jest.fn(() => ({ generation: accountGeneration, stableId: accountStableId, phase: 'active' })),
  isCurrentAccountGeneration: jest.fn((token: { generation: number; stableId: string }, owner: string) => (
    token.generation === accountGeneration && token.stableId === accountStableId && owner === accountStableId
  )),
  withAccountTransitionLock: jest.fn(async (work: () => Promise<unknown>) => work()),
}));
jest.mock('../app/level_spin_star_grants', () => ({
  mergeLevelSpinServerStars: (token: unknown, observation: unknown) => mockMergeServerStars(token, observation),
}));
jest.mock('../app/friends_together/together_store', () => ({
  markFriendLevelClaimedLocally: (friendUid: string, level: number) => mockMarkLevel(friendUid, level),
}));
jest.mock('../app/friends_together/sender_identity', () => ({
  prepareTogetherSender: jest.fn(async () => ({ stableId: 'me', displayName: 'Me' })),
}));

beforeEach(async () => {
  jest.clearAllMocks();
  accountGeneration = 1;
  accountStableId = 'me';
  await AsyncStorage.clear();
});

describe('friends together claim response compatibility', () => {
  it('closes the level claim locally without a server decision or reward', async () => {
    const { claimFriendLevel } = await import('../app/friends_together/claims_client');

    await expect(claimFriendLevel('friend-1', 3)).resolves.toEqual({
      ok: true,
      starsGranted: 0,
    });
    expect(mockMarkLevel).toHaveBeenCalledWith('friend-1', 3);
    expect(mockCallableInvoker).not.toHaveBeenCalled();
    expect(mockMergeServerStars).not.toHaveBeenCalled();
  });

  it('is idempotent through the local claim store', async () => {
    const { claimFriendLevel } = await import('../app/friends_together/claims_client');

    await expect(claimFriendLevel('friend-2', 2)).resolves.toEqual({ ok: true, starsGranted: 0 });
    await expect(claimFriendLevel('friend-2', 2)).resolves.toEqual({ ok: true, starsGranted: 0 });
    expect(mockCallableInvoker).not.toHaveBeenCalled();
    expect(mockMarkLevel).toHaveBeenCalledTimes(2);
  });

  it('fails closed when there is no active owner', async () => {
    const { claimFriendLevel } = await import('../app/friends_together/claims_client');
    accountStableId = '';
    await expect(claimFriendLevel('friend-1', 3)).resolves.toEqual({ ok: false, reason: 'network' });
    expect(mockMarkLevel).not.toHaveBeenCalled();
    expect(mockCallableInvoker).not.toHaveBeenCalled();
  });
});
