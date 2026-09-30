import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
} from '../app/account_generation';
import { coinRankStateKey } from '../app/coin_rank_state_v1';

type ProjectionResponse = {
  data: {
    ok: boolean;
    stableUid: string;
    isPremium: boolean;
    isVip: boolean;
    isLifetime: boolean;
    progressAuthority: 'server' | 'unavailable';
  };
};

const mockProjectionCallable = jest.fn<Promise<ProjectionResponse>, [Record<string, unknown>]>(async () => ({
  data: {
    ok: true,
    stableUid: 'account-a',
    isPremium: false,
    isVip: false,
    isLifetime: false,
    progressAuthority: 'unavailable',
  },
}));

jest.mock('../app/config', () => ({ CLOUD_SYNC_ENABLED: true, IS_EXPO_GO: false }));
jest.mock('@react-native-firebase/firestore', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({ get: jest.fn(async () => ({ exists: false })) })),
    })),
  })),
}));
jest.mock('@react-native-firebase/app', () => ({ getApp: jest.fn(() => ({})) }));
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn(() => mockProjectionCallable),
}));
jest.mock('../app/cloud_sync', () => ({
  ensureAnonUser: jest.fn(async () => 'account-a'),
  ensureAuthoritativeIdentityForCloudMutation: jest.fn(async (stableId: string) => ({
    ok: true,
    stableUid: stableId,
    adopted: false,
  })),
}));
jest.mock('../app/lifetime_profile_stats', () => ({
  readLifetimeProfileStatsCache: jest.fn(async () => null),
}));

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage> & { __reset?: () => void };
const workerId = process.env.JEST_WORKER_ID;

function encodedRank(ownerStableId: string, rank: number): string {
  return JSON.stringify({
    schemaVersion: 'coin-rank-state.v1',
    ownerStableId,
    rank,
    upgrades: [],
  });
}

describe('public profile local coin-rank source', () => {
  beforeEach(async () => {
    delete process.env.JEST_WORKER_ID;
    storage.__reset?.();
    jest.clearAllMocks();
    __resetAccountGenerationForTests();
    beginAccountGeneration('account-a');
    const { __publicProfileSnapshotTestHooks } = await import('../app/public_profile_snapshot');
    __publicProfileSnapshotTestHooks.resetRuntimeState();
  });

  afterAll(() => {
    if (workerId === undefined) delete process.env.JEST_WORKER_ID;
    else process.env.JEST_WORKER_ID = workerId;
  });

  it('projects the rank read from the current owner-scoped local state', async () => {
    await AsyncStorage.setItem(coinRankStateKey('account-a'), encodedRank('account-a', 7));
    const { syncPublicProfileSnapshot } = await import('../app/public_profile_snapshot');

    await syncPublicProfileSnapshot({ reason: 'display_change', name: 'Learner' });

    expect(mockProjectionCallable).toHaveBeenCalledWith(expect.objectContaining({
      stableId: 'account-a',
      profile: expect.objectContaining({ coinRank: 7 }),
    }));
  });

  it('abandons the projection when account generation changes during the rank read', async () => {
    let releaseRankRead!: (value: string | null) => void;
    const originalGetItem = storage.getItem.getMockImplementation();
    storage.getItem.mockImplementation((key: string) => {
      if (key === coinRankStateKey('account-a')) {
        return new Promise<string | null>((resolve) => { releaseRankRead = resolve; });
      }
      return originalGetItem ? originalGetItem(key) : Promise.resolve(null);
    });
    const { syncPublicProfileSnapshot } = await import('../app/public_profile_snapshot');

    const request = syncPublicProfileSnapshot({ reason: 'display_change', name: 'Account A' });
    for (let i = 0; i < 30 && !releaseRankRead; i += 1) await Promise.resolve();
    expect(releaseRankRead).toBeDefined();
    beginAccountGeneration('account-b');
    releaseRankRead(encodedRank('account-a', 6));
    await request;

    expect(mockProjectionCallable).not.toHaveBeenCalled();
  });
});
