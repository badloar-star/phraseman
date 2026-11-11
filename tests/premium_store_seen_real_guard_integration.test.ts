const durableStore = new Map<string, string>();

const asyncStorageMock = {
  getItem: jest.fn(async (key: string) => durableStore.get(key) ?? null),
  setItem: jest.fn(async (key: string, value: string) => {
    durableStore.set(key, String(value));
  }),
  removeItem: jest.fn(async (key: string) => {
    durableStore.delete(key);
  }),
  multiGet: jest.fn(async (keys: string[]) => (
    keys.map((key) => [key, durableStore.get(key) ?? null] as [string, string | null])
  )),
  multiSet: jest.fn(async (pairs: [string, string][]) => {
    pairs.forEach(([key, value]) => durableStore.set(key, String(value)));
  }),
  multiRemove: jest.fn(async (keys: string[]) => {
    keys.forEach((key) => durableStore.delete(key));
  }),
  getAllKeys: jest.fn(async () => [...durableStore.keys()]),
};

const syncToCloud = jest.fn(async () => undefined);

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: asyncStorageMock,
  ...asyncStorageMock,
}));

jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    isConfigured: jest.fn(async () => false),
    getAppUserID: jest.fn(async () => ''),
    getCustomerInfo: jest.fn(async () => ({ entitlements: { active: {} } })),
  },
}));

jest.mock('../app/config', () => ({
  FORCE_PREMIUM: false,
  IS_EXPO_GO: true,
  IS_STORE_RELEASE: true,
}));

jest.mock('../app/cloud_sync', () => ({
  syncToCloud,
  restoreFromCloud: jest.fn(async () => false),
  peekCloudRestoreInFlight: jest.fn(() => null),
  lastCloudRestoreCompletedAt: jest.fn(() => 0),
}));

jest.mock('../app/gift_access_cloud', () => ({
  readGiftAccessFromCloud: jest.fn(async () => null),
}));

jest.mock('../app/gift_access_local_copy', () => ({
  forgetVerifiedLoyaltyGift: jest.fn(async () => undefined),
  readVerifiedLoyaltyGiftUntilMs: jest.fn(async () => null),
  rememberVerifiedLoyaltyGift: jest.fn(async () => undefined),
}));

jest.mock('../app/user_id_policy', () => ({
  getCanonicalUserId: jest.fn(async () => null),
}));

jest.mock('../app/revenuecat_projection_sync', () => ({
  syncRevenueCatProjectionForAccount: jest.fn(async () => false),
}));

import {
  __resetAccountGenerationForTests,
  acquireAccountTransitionCommitPermit,
  beginAccountGeneration,
  withAccountTransitionLock,
} from '../app/account_generation';
import * as premiumGuard from '../app/premium_guard';
import { __resetPremiumPlanPeekForTests } from '../app/premium_plan_peek';
import {
  readRealPremiumSnapshotForGeneration,
  realPremiumPendingStorageKey,
  realPremiumSnapshotStorageKey,
} from '../app/premium_real_storage';
import { persistStorePremiumLocally } from '../app/premium_revenuecat_state';

describe('real store-seen Premium integration', () => {
  beforeEach(() => {
    durableStore.clear();
    jest.clearAllMocks();
    __resetAccountGenerationForTests();
    __resetPremiumPlanPeekForTests();
    premiumGuard.invalidatePremiumCache();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('purchase and real store-seen update make two sequential same-lease commits', async () => {
    let now = 1_700_000_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => now += 1);
    const invalidateSpy = jest.spyOn(premiumGuard, 'invalidatePremiumCache');
    const tokenA = beginAccountGeneration('owner-A');
    const pendingKey = realPremiumPendingStorageKey('owner-A');

    await expect(persistStorePremiumLocally(tokenA, 'lifetime', {
      productId: 'phraseman_premium_lifetime',
      periodType: 'NORMAL',
      store: 'PLAY_STORE',
      purchasedMs: 1_600_000_000_000,
    }, 'store_purchase')).resolves.toBe(true);

    const snapshot = await readRealPremiumSnapshotForGeneration(tokenA);
    expect(snapshot).toEqual(expect.objectContaining({
      ownerStableId: 'owner-A',
      active: true,
      plan: 'lifetime',
      evidenceSource: 'store_purchase',
      rcProductId: 'phraseman_premium_lifetime',
    }));
    expect(snapshot?.rcLastSeenAtMs).toBeGreaterThan(1_700_000_000_000);
    expect(durableStore.get('premium_rc_last_seen_at')).toBe(String(snapshot?.rcLastSeenAtMs));
    expect(durableStore.get('premium_active')).toBe('true');
    expect(durableStore.get('premium_plan')).toBe('lifetime');
    expect(durableStore.has(pendingKey)).toBe(false);
    expect(asyncStorageMock.removeItem.mock.calls.filter(([key]) => key === pendingKey)).toHaveLength(2);
    expect(syncToCloud).toHaveBeenCalledWith({ forceNow: true });
    expect(invalidateSpy).toHaveBeenCalled();
  });

  test('eligibility is repeatable while current and immediately denied after a generation change', async () => {
    const tokenA = beginAccountGeneration('owner-A');
    await withAccountTransitionLock(async (lease) => {
      expect(acquireAccountTransitionCommitPermit(lease, tokenA)).toBe(true);
      expect(acquireAccountTransitionCommitPermit(lease, tokenA)).toBe(true);
      beginAccountGeneration('owner-B');
      expect(acquireAccountTransitionCommitPermit(lease, tokenA)).toBe(false);
    });
  });

  test('post-permit transition suppresses global tails and B cannot read sealed A', async () => {
    const invalidateSpy = jest.spyOn(premiumGuard, 'invalidatePremiumCache');
    invalidateSpy.mockClear();
    const tokenA = beginAccountGeneration('owner-A');
    const pendingKey = realPremiumPendingStorageKey('owner-A');
    let releaseRemoval!: () => void;
    const originalRemove = asyncStorageMock.removeItem.getMockImplementation();
    asyncStorageMock.removeItem.mockImplementation(async (key: string) => {
      if (key === pendingKey && !releaseRemoval) {
        await new Promise<void>((resolve) => { releaseRemoval = resolve; });
      }
      return originalRemove?.(key);
    });

    const pending = persistStorePremiumLocally(tokenA, 'yearly', {
      productId: 'phraseman_premium_yearly',
      store: 'APP_STORE',
    }, 'store_purchase');
    for (let spin = 0; !releaseRemoval && spin < 40; spin += 1) await Promise.resolve();
    expect(releaseRemoval).toBeDefined();

    const tokenB = beginAccountGeneration('owner-B');
    releaseRemoval();
    await expect(pending).resolves.toBe(false);

    expect(durableStore.has(realPremiumSnapshotStorageKey('owner-A'))).toBe(true);
    await expect(readRealPremiumSnapshotForGeneration(tokenB)).resolves.toBeNull();
    expect(durableStore.has(pendingKey)).toBe(false);
    expect(asyncStorageMock.multiSet).not.toHaveBeenCalled();
    expect(durableStore.has('premium_rc_last_seen_at')).toBe(false);
    expect(syncToCloud).not.toHaveBeenCalled();
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});

