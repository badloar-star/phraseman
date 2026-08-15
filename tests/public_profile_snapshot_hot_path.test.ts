import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
} from '../app/account_generation';

const mockPublicProfileSet = jest.fn<Promise<void>, [Record<string, unknown>, { merge: boolean }]>(async () => undefined);
type ProjectionResponse = {
  data: {
    ok: boolean;
    stableUid: string;
    isPremium?: boolean;
    isVip?: boolean;
    isLifetime?: boolean;
  };
};

const mockProjectionCallable = jest.fn<Promise<ProjectionResponse>, [Record<string, unknown>]>(async () => ({
  data: { ok: true, stableUid: 'account-a', isPremium: false, isVip: false, isLifetime: false },
}));
const mockEnsureAnonUser = jest.fn(async () => 'account-a');
const mockReadLifetimeStats = jest.fn(async () => null as null | {
  wordsLearned: number;
  phrasesLearned: number;
  appDaysUnion: number;
  longestStreakDays: number;
});

jest.mock('../app/config', () => ({ CLOUD_SYNC_ENABLED: true, IS_EXPO_GO: false }));
jest.mock('@react-native-firebase/firestore', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    collection: jest.fn((name: string) => ({
      doc: jest.fn(() => name === 'banned_users'
        ? { get: jest.fn(async () => ({ exists: false })) }
        : { set: mockPublicProfileSet }),
    })),
  })),
}));
jest.mock('@react-native-firebase/app', () => ({ getApp: jest.fn(() => ({})) }));
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn(() => mockProjectionCallable),
}));
jest.mock('../app/cloud_sync', () => ({
  ensureAnonUser: mockEnsureAnonUser,
  ensureAuthoritativeIdentityForCloudMutation: jest.fn(async (stableId: string) => ({
    ok: true,
    stableUid: stableId,
    adopted: false,
  })),
}));
jest.mock('../app/lifetime_profile_stats', () => ({
  readLifetimeProfileStatsCache: () => mockReadLifetimeStats(),
}));
jest.mock('../app/hall_of_fame_utils', () => ({
  parseWeekPointsForWeek: jest.fn(() => 0),
}));
jest.mock('../app/premium_guard', () => ({
  isLifetimePlanLocal: jest.fn(async () => false),
}));

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage> & { __reset?: () => void };
const workerId = process.env.JEST_WORKER_ID;

describe('public profile snapshot hot path', () => {
  beforeEach(async () => {
    delete process.env.JEST_WORKER_ID;
    storage.__reset?.();
    jest.clearAllMocks();
    mockPublicProfileSet.mockResolvedValue(undefined);
    mockProjectionCallable.mockResolvedValue({
      data: { ok: true, stableUid: 'account-a', isPremium: false, isVip: false, isLifetime: false },
    });
    mockEnsureAnonUser.mockResolvedValue('account-a');
    mockReadLifetimeStats.mockResolvedValue(null);
    __resetAccountGenerationForTests();
    beginAccountGeneration('account-a');
    const { __publicProfileSnapshotTestHooks } = await import('../app/public_profile_snapshot');
    __publicProfileSnapshotTestHooks.resetRuntimeState();
  });

  afterAll(() => {
    if (workerId === undefined) delete process.env.JEST_WORKER_ID;
    else process.env.JEST_WORKER_ID = workerId;
  });

  it('returns a fresh clean daily XP snapshot before bulk profile reads', async () => {
    const {
      PUBLIC_PROFILE_XP_TTL_MS,
      __publicProfileSnapshotTestHooks,
      syncPublicProfileSnapshot,
    } = await import('../app/public_profile_snapshot');
    await AsyncStorage.setItem(
      __publicProfileSnapshotTestHooks.cacheKey('account-a'),
      JSON.stringify({ xpSyncedAt: Date.now() - PUBLIC_PROFILE_XP_TTL_MS + 60_000 }),
    );
    jest.clearAllMocks();

    await syncPublicProfileSnapshot({ reason: 'daily_xp', totalXp: 10 });

    expect(storage.getItem).toHaveBeenCalledTimes(1);
    expect(storage.multiGet).not.toHaveBeenCalled();
    expect(mockProjectionCallable).not.toHaveBeenCalled();
  });

  it('collapses concurrent daily calls to one write with the latest total XP', async () => {
    const { syncPublicProfileSnapshot } = await import('../app/public_profile_snapshot');

    await Promise.all([
      syncPublicProfileSnapshot({ reason: 'daily_xp', name: 'Learner', totalXp: 10 }),
      syncPublicProfileSnapshot({ reason: 'daily_xp', name: 'Learner', totalXp: 25 }),
    ]);

    expect(mockProjectionCallable).toHaveBeenCalledTimes(1);
    const request = mockProjectionCallable.mock.calls[0][0] as Record<string, unknown>;
    expect(request).not.toHaveProperty('totalXp');
    expect(request).not.toHaveProperty('level');
    expect(request).not.toHaveProperty('streak');
    expect(request).not.toHaveProperty('isPremium');
    expect(request).not.toHaveProperty('isVip');
    expect(request.profile).not.toHaveProperty('totalXp');
    expect(request.profile).not.toHaveProperty('level');
    expect(request.profile).not.toHaveProperty('streak');
    expect(request.profile).not.toHaveProperty('isPremium');
    expect(request.profile).not.toHaveProperty('isVip');
  });

  it('does not lose display or entitlement priority when a daily call is merged', async () => {
    const { syncPublicProfileSnapshot } = await import('../app/public_profile_snapshot');

    await Promise.all([
      syncPublicProfileSnapshot({ reason: 'display_change', name: 'New Name', totalXp: 10 }),
      syncPublicProfileSnapshot({ reason: 'entitlement_change', isPremium: true }),
      syncPublicProfileSnapshot({ reason: 'daily_xp', totalXp: 30 }),
    ]);

    expect(mockProjectionCallable).toHaveBeenCalledTimes(1);
    expect(mockProjectionCallable.mock.calls[0][0]).toMatchObject({
      stableId: 'account-a',
      reason: 'entitlement_change',
      profile: expect.objectContaining({ name: 'New Name' }),
    });
  });

  it('preserves bounded profile-card lifetime stats and league presentation fields', async () => {
    const { syncPublicProfileSnapshot } = await import('../app/public_profile_snapshot');
    await AsyncStorage.setItem('profile_card_level', '2');
    await AsyncStorage.setItem('league_state_v3', JSON.stringify({ leagueId: 7 }));
    mockReadLifetimeStats.mockResolvedValue({
      wordsLearned: 321,
      phrasesLearned: 123,
      appDaysUnion: 44,
      longestStreakDays: 15,
    });

    await syncPublicProfileSnapshot({ reason: 'display_change', name: 'Learner' });

    expect(mockProjectionCallable).toHaveBeenCalledWith(expect.objectContaining({
      profile: expect.objectContaining({
        leagueId: 7,
        cardWordsLearned: 321,
        cardPhrasesLearned: 123,
        cardAppDays: 44,
        cardLongestStreak: 15,
      }),
    }));
  });

  it('never writes account A cache after account B becomes current', async () => {
    const { __publicProfileSnapshotTestHooks, syncPublicProfileSnapshot } = await import('../app/public_profile_snapshot');
    let release!: () => void;
    mockProjectionCallable.mockImplementationOnce(() => new Promise<any>((resolve) => {
      release = () => resolve({ data: { ok: true, stableUid: 'account-a' } });
    }));

    const request = syncPublicProfileSnapshot({ reason: 'display_change', name: 'A', totalXp: 10 });
    for (let i = 0; i < 30 && mockProjectionCallable.mock.calls.length === 0; i += 1) await Promise.resolve();
    beginAccountGeneration('account-b');
    release();
    await request;

    expect(storage.setItem).not.toHaveBeenCalledWith(
      __publicProfileSnapshotTestHooks.cacheKey('account-b'),
      expect.any(String),
    );
    expect(storage.setItem).not.toHaveBeenCalledWith(
      __publicProfileSnapshotTestHooks.cacheKey('account-a'),
      expect.any(String),
    );
  });

  it('updates TTL only after Firestore succeeds and retries a failed dirty owner', async () => {
    const {
      PUBLIC_PROFILE_XP_TTL_MS,
      __publicProfileSnapshotTestHooks,
      syncPublicProfileSnapshot,
    } = await import('../app/public_profile_snapshot');
    const cacheKey = __publicProfileSnapshotTestHooks.cacheKey('account-a');
    await AsyncStorage.setItem(cacheKey, JSON.stringify({ xpSyncedAt: Date.now() - PUBLIC_PROFILE_XP_TTL_MS + 60_000 }));
    jest.clearAllMocks();
    mockProjectionCallable
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ data: { ok: true, stableUid: 'account-a' } });

    await syncPublicProfileSnapshot({ reason: 'display_change', name: 'Retry Me', totalXp: 40 });
    expect(storage.setItem).not.toHaveBeenCalledWith(cacheKey, expect.any(String));

    await syncPublicProfileSnapshot({ reason: 'daily_xp', totalXp: 41 });
    expect(mockProjectionCallable).toHaveBeenCalledTimes(2);
    expect(storage.setItem).toHaveBeenCalledWith(cacheKey, expect.any(String));
  });
});
