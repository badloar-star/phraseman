const asyncStore: Record<string, string> = {};
const patchAppSnapshot = jest.fn();
const hydrateReferralStateFromRaw = jest.fn();

const storage = {
  getItem: jest.fn(async (key: string) => asyncStore[key] ?? null),
  multiGet: jest.fn<Promise<Array<[string, string | null]>>, [string[]]>(
    async (keys: string[]) => keys.map((key) => [key, asyncStore[key] ?? null]),
  ),
  multiSet: jest.fn(async (pairs: Array<[string, string]>) => {
    pairs.forEach(([key, value]) => { asyncStore[key] = value; });
  }),
};

jest.mock('@react-native-async-storage/async-storage', () => storage);
jest.mock('../app/app_snapshot_store', () => ({
  APP_SNAPSHOT_RESOURCE_LIMITS: { friendProfileMaxEntries: 20, recentItemsMax: 20 },
  limitArray: (value: unknown[]) => value,
  patchAppSnapshot: (...args: unknown[]) => patchAppSnapshot(...args),
}));
jest.mock('../app/friends_tab_swr_warm', () => ({
  startFriendsTabSwrPrime: jest.fn(async () => {}),
  peekFriendsTabSwrWarm: jest.fn(() => null),
}));
jest.mock('../app/user_settings_store', () => ({
  getUserSettingsSnapshot: jest.fn(() => ({})),
  hydrateUserSettingsFromStorage: jest.fn(async () => {}),
}));
jest.mock('../app/customization_snapshot', () => ({
  buildCustomizationSnapshot: jest.fn(() => ({ source: 'storage', updatedAt: 1 })),
}));
jest.mock('../app/referrals_cache', () => ({
  REFERRAL_STATE_STORAGE_KEY: 'referral_state_v1',
  hydrateReferralStateFromRaw: (...args: unknown[]) => hydrateReferralStateFromRaw(...args),
}));
jest.mock('../constants/theme', () => ({ getLevelFromXP: jest.fn(() => 1) }));

describe('app snapshot bootstrap account boundary', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    Object.keys(asyncStore).forEach((key) => delete asyncStore[key]);
    storage.getItem.mockImplementation(async (key: string) => asyncStore[key] ?? null);
    storage.multiGet.mockImplementation(async (keys: string[]) => keys.map((key) => [key, asyncStore[key] ?? null]));
    storage.multiSet.mockImplementation(async (pairs: Array<[string, string]>) => {
      pairs.forEach(([key, value]) => { asyncStore[key] = value; });
    });
  });

  it('does not publish A profile or VIP after B activates during startup storage hydration', async () => {
    const generation = await import('../app/account_generation');
    const vipStorage = await import('../app/premium_vip_storage');
    generation.beginAccountGeneration('stable-A');
    await vipStorage.writeVipSnapshotForAccount('stable-A', {
      vip_active: 'true',
      vip_plan: 'admin_vip',
      vip_until: '9999999999999',
      vip_admin_override: 'true',
    });
    asyncStore.user_name = 'Account A';
    asyncStore.premium_active = 'true';

    let releaseHydration!: () => void;
    let hydrationStarted!: () => void;
    const pendingHydration = new Promise<void>((resolve) => { releaseHydration = resolve; });
    const hydrationStart = new Promise<void>((resolve) => { hydrationStarted = resolve; });
    storage.multiGet.mockImplementation(async (keys: string[]) => {
      const captured = keys.map((key) => [key, asyncStore[key] ?? null] as [string, string | null]);
      if (keys.includes('user_name')) {
        hydrationStarted();
        await pendingHydration;
      }
      return captured;
    });

    const { primeAppSnapshotFromStorage } = await import('../app/app_snapshot_bootstrap');
    const primeA = primeAppSnapshotFromStorage('en');
    await hydrationStart;
    generation.beginAccountGeneration('stable-B');
    releaseHydration();
    await primeA;

    expect(patchAppSnapshot).not.toHaveBeenCalled();
    expect(hydrateReferralStateFromRaw).not.toHaveBeenCalled();
  });

  it('hydrates the lifetime plan into the synchronous profile snapshot', async () => {
    const generation = await import('../app/account_generation');
    generation.beginAccountGeneration('stable-pro');
    asyncStore.premium_active = 'true';
    asyncStore.premium_plan = 'lifetime';

    const { primeAppSnapshotFromStorage } = await import('../app/app_snapshot_bootstrap');
    await primeAppSnapshotFromStorage('en');

    expect(patchAppSnapshot).toHaveBeenCalledWith(expect.objectContaining({
      profile: expect.objectContaining({
        premiumActive: true,
        premiumPlan: 'lifetime',
      }),
    }));
  });
});
