import AsyncStorage from '@react-native-async-storage/async-storage';

const mockCallableInvoker = jest.fn();
const mockMarkLevel = jest.fn<Promise<void>, [string, number]>(async () => undefined);
const mockMarkChest = jest.fn<Promise<void>, [string]>(async () => undefined);
const mockMergeServerStars = jest.fn(async (_token: unknown, _observation: unknown) => ({ balance: 0, earnedTotal: 0 }));
let accountGeneration = 1;
let accountStableId = 'me';

jest.mock('@react-native-firebase/app', () => ({ getApp: jest.fn(() => ({})) }));
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn(() => mockCallableInvoker),
}));
jest.mock('../app/config', () => ({ CLOUD_SYNC_ENABLED: true, IS_EXPO_GO: false }));
jest.mock('../app/app_check_init', () => ({ initFirebaseAppCheckIfAvailable: jest.fn(async () => undefined) }));
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
  markWeeklyChestClaimedLocally: (weekKey: string) => mockMarkChest(weekKey),
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
  it('normalizes the original level callable field names and persists the local claim', async () => {
    mockCallableInvoker.mockResolvedValueOnce({ data: {
      ok: true, starsAwarded: 10, starsBalance: 42, starsEarnedTotal: 90, starsSeq: 7,
    } });
    const { claimFriendLevel } = await import('../app/friends_together/claims_client');

    await expect(claimFriendLevel('friend-1', 3)).resolves.toEqual({
      ok: true,
      starsGranted: 10,
      stars: 42,
      starsEarnedTotal: 90,
      starsSeq: 7,
    });
    expect(mockMarkLevel).toHaveBeenCalledWith('friend-1', 3);
    expect(mockMergeServerStars).toHaveBeenCalledWith(
      expect.objectContaining({ stableId: 'me' }),
      { stars: 42, starsEarnedTotal: 90, starsSeq: 7 },
    );
  });

  it('normalizes a persisted nested chest receipt and persists the claimed week', async () => {
    mockCallableInvoker.mockResolvedValueOnce({
      data: {
        ok: true,
        alreadyClaimed: true,
        rewards: {
          stars: 135,
          drops: [
            { kind: 'xp_boost' },
            { kind: 'streak_shield' },
            { kind: 'avatar_aura' },
          ],
        },
        starsBalance: 200,
        starsSeq: 8,
      },
    });
    const { claimWeeklyChest } = await import('../app/friends_together/claims_client');

    await expect(claimWeeklyChest('2026-W34')).resolves.toEqual({
      ok: true,
      rewards: { starsGranted: 135, xpBoostMinutes: 60, streakShield: true, aura: true },
      stars: 200,
      starsSeq: 8,
    });
    expect(mockMarkChest).toHaveBeenCalledWith('2026-W34');
  });

  it('reuses the same durable request id after an ambiguous network failure', async () => {
    mockCallableInvoker
      .mockRejectedValueOnce(new Error('unavailable network'))
      .mockResolvedValueOnce({ data: { ok: true, starsGranted: 5 } });
    const { claimFriendLevel } = await import('../app/friends_together/claims_client');

    await expect(claimFriendLevel('friend-2', 2)).resolves.toEqual({ ok: false, reason: 'network' });
    await expect(claimFriendLevel('friend-2', 2)).resolves.toEqual({ ok: true, starsGranted: 5 });

    const firstId = mockCallableInvoker.mock.calls[0][0].requestId;
    const secondId = mockCallableInvoker.mock.calls[1][0].requestId;
    expect(secondId).toBe(firstId);
  });

  it('does not merge, cache, or remove account A claim after switching to B during callable await', async () => {
    let resolveResponse!: (value: unknown) => void;
    mockCallableInvoker.mockReturnValueOnce(new Promise((resolve) => { resolveResponse = resolve; }));
    const { claimFriendLevel } = await import('../app/friends_together/claims_client');
    const pending = claimFriendLevel('friend-1', 3);
    for (let index = 0; index < 10 && mockCallableInvoker.mock.calls.length === 0; index += 1) {
      await Promise.resolve();
    }
    accountGeneration = 2;
    accountStableId = 'account-b';
    resolveResponse({ data: {
      ok: true, starsGranted: 20, starsBalance: 120, starsEarnedTotal: 90, starsSeq: 8,
    } });
    await expect(pending).resolves.toEqual({ ok: false, reason: 'network' });
    expect(mockMarkLevel).not.toHaveBeenCalled();
    expect(mockMergeServerStars).not.toHaveBeenCalled();
  });
});
