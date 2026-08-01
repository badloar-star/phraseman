import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
} from '../app/account_generation';

const mockPublicProfileSet = jest.fn<Promise<void>, [Record<string, unknown>, { merge: boolean }]>(async () => undefined);
const mockEnsureAnonUser = jest.fn(async () => 'account-a');

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
jest.mock('../app/cloud_sync', () => ({
  ensureAnonUser: mockEnsureAnonUser,
  ensureStableAuthLinkForStableIdDetailed: jest.fn(async (stableId: string) => ({ ok: true, stableUid: stableId })),
}));
jest.mock('../app/lifetime_profile_stats', () => ({
  readLifetimeProfileStatsCache: jest.fn(async () => null),
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
    mockEnsureAnonUser.mockResolvedValue('account-a');
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
    expect(mockPublicProfileSet).not.toHaveBeenCalled();
  });

  it('collapses concurrent daily calls to one write with the latest total XP', async () => {
    const { syncPublicProfileSnapshot } = await import('../app/public_profile_snapshot');

    await Promise.all([
      syncPublicProfileSnapshot({ reason: 'daily_xp', name: 'Learner', totalXp: 10 }),
      syncPublicProfileSnapshot({ reason: 'daily_xp', name: 'Learner', totalXp: 25 }),
    ]);

    expect(mockPublicProfileSet).toHaveBeenCalledTimes(1);
    expect(mockPublicProfileSet.mock.calls[0][0]).toMatchObject({ totalXp: 25, updatedReason: 'daily_xp' });
  });

  it('does not lose display or entitlement priority when a daily call is merged', async () => {
    const { syncPublicProfileSnapshot } = await import('../app/public_profile_snapshot');

    await Promise.all([
      syncPublicProfileSnapshot({ reason: 'display_change', name: 'New Name', totalXp: 10 }),
      syncPublicProfileSnapshot({ reason: 'entitlement_change', isPremium: true }),
      syncPublicProfileSnapshot({ reason: 'daily_xp', totalXp: 30 }),
    ]);

    expect(mockPublicProfileSet).toHaveBeenCalledTimes(1);
    expect(mockPublicProfileSet.mock.calls[0][0]).toMatchObject({
      name: 'New Name',
      totalXp: 30,
      isPremium: true,
      updatedReason: 'entitlement_change',
    });
  });

  it('never writes account A cache after account B becomes current', async () => {
    const { __publicProfileSnapshotTestHooks, syncPublicProfileSnapshot } = await import('../app/public_profile_snapshot');
    let release!: () => void;
    mockPublicProfileSet.mockImplementationOnce(() => new Promise<void>((resolve) => { release = resolve; }));

    const request = syncPublicProfileSnapshot({ reason: 'display_change', name: 'A', totalXp: 10 });
    for (let i = 0; i < 30 && mockPublicProfileSet.mock.calls.length === 0; i += 1) await Promise.resolve();
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
    mockPublicProfileSet.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(undefined);

    await syncPublicProfileSnapshot({ reason: 'display_change', name: 'Retry Me', totalXp: 40 });
    expect(storage.setItem).not.toHaveBeenCalledWith(cacheKey, expect.any(String));

    await syncPublicProfileSnapshot({ reason: 'daily_xp', totalXp: 41 });
    expect(mockPublicProfileSet).toHaveBeenCalledTimes(2);
    expect(storage.setItem).toHaveBeenCalledWith(cacheKey, expect.any(String));
  });
});
