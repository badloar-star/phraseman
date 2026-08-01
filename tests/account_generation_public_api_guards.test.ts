import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
} from '../app/account_generation';

const mockPublicProfileSet = jest.fn(async () => undefined);
const mockEnsureAnonUser = jest.fn(async () => 'account-b');
const mockEnsureStableAuthLinkForStableIdDetailed = jest.fn(async (stableId: string) => ({
  ok: true,
  stableUid: stableId,
}));

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
  ensureStableAuthLinkForStableIdDetailed: mockEnsureStableAuthLinkForStableIdDetailed,
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

jest.mock('../app/streak_week_markers', () => ({
  recordMissedStreakWeekMarkersEndingYesterday: jest.fn(async () => undefined),
}));

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void };
function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage> & { __reset?: () => void };

function localDayOffset(days: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

beforeEach(() => {
  storage.__reset?.();
  jest.clearAllMocks();
  __resetAccountGenerationForTests();
});

test('omitted-token lesson repair cannot commit account A state after account B activates', async () => {
  const lastActiveRead = deferred<string | null>();
  storage.getItem.mockImplementation((key) => {
    if (key === 'last_active_date') return lastActiveRead.promise;
    if (key === 'streak_count') return Promise.resolve('5');
    return Promise.resolve(null);
  });
  beginAccountGeneration('account-a');
  const { recordLessonForRepair } = await import('../app/streak_repair');

  const request = recordLessonForRepair();
  for (let i = 0; i < 12 && !storage.getItem.mock.calls.some(([key]) => key === 'last_active_date'); i += 1) {
    await Promise.resolve();
  }
  expect(storage.getItem).toHaveBeenCalledWith('last_active_date');
  beginAccountGeneration('account-b');
  lastActiveRead.resolve(localDayOffset(-2));

  await expect(request).resolves.toEqual({ nowRepaired: false });
  expect(storage.setItem).not.toHaveBeenCalledWith('streak_repair_v1', expect.any(String));
});

test('omitted-token public profile sync cannot attach account A payload to account B after a deferred read', async () => {
  const cacheRead = deferred<string | null>();
  storage.getItem.mockImplementation((key) => (
    key === 'public_profile_snapshot_v1:account-a' ? cacheRead.promise : Promise.resolve(null)
  ));
  beginAccountGeneration('account-a');
  const workerId = process.env.JEST_WORKER_ID;
  delete process.env.JEST_WORKER_ID;
  try {
    const { syncPublicProfileSnapshot } = await import('../app/public_profile_snapshot');
    const request = syncPublicProfileSnapshot({
      reason: 'display_change',
      name: 'Account A',
      totalXp: 50,
    });
    for (let i = 0; i < 12 && !storage.getItem.mock.calls.some(([key]) => key === 'public_profile_snapshot_v1:account-a'); i += 1) {
      await Promise.resolve();
    }
    expect(storage.getItem).toHaveBeenCalledWith('public_profile_snapshot_v1:account-a');
    beginAccountGeneration('account-b');
    cacheRead.resolve(null);

    await request;
    expect(mockPublicProfileSet).not.toHaveBeenCalled();
  } finally {
    if (workerId === undefined) delete process.env.JEST_WORKER_ID;
    else process.env.JEST_WORKER_ID = workerId;
  }
});
