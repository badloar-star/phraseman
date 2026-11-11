import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncToCloud } from '../app/cloud_sync';
import { invalidatePremiumCache, markPremiumStoreSeenNow } from '../app/premium_guard';
import {
  customerInfoConfirmsProductAccess,
  inferPremiumPlanFromCustomerInfo,
  inferPremiumPlanFromProductId,
  persistStorePremiumLocally,
  revenueCatCustomerInfoHasPremiumAccess,
  revenueCatPremiumMetadata,
} from '../app/premium_revenuecat_state';
import {
  beginAccountGeneration,
  captureAccountGeneration,
  __resetAccountGenerationForTests,
} from '../app/account_generation';

jest.mock('../app/cloud_sync', () => ({
  syncToCloud: jest.fn(async () => undefined),
}));

jest.mock('../app/premium_guard', () => ({
  markPremiumStoreSeenNow: jest.fn(async () => undefined),
  invalidatePremiumCache: jest.fn(),
}));

describe('premium RevenueCat state sync', () => {
  beforeEach(() => {
    (AsyncStorage as any).__reset?.();
    jest.clearAllMocks();
    __resetAccountGenerationForTests();
    beginAccountGeneration('premium-revenuecat-test');
  });

  it('infers subscription plan from RevenueCat product ids', () => {
    expect(inferPremiumPlanFromProductId('phraseman_premium_yearly')).toBe('yearly');
    expect(inferPremiumPlanFromProductId('premium_12_months')).toBe('yearly');
    expect(inferPremiumPlanFromProductId('premium_monthly')).toBe('monthly');
    expect(inferPremiumPlanFromProductId('unknown', 'yearly')).toBe('yearly');
  });

  it('does not treat unknown active store state as monthly', () => {
    expect(inferPremiumPlanFromCustomerInfo({
      entitlements: { active: {} },
      activeSubscriptions: [],
    } as any)).toBeNull();

    expect(inferPremiumPlanFromCustomerInfo({
      entitlements: { active: {} },
      activeSubscriptions: ['phraseman_premium_yearly_2999'],
    } as any)).toBe('yearly');
  });

  it('extracts trial metadata from the active premium entitlement', () => {
    const info = {
      entitlements: {
        active: {
          premium: {
            productIdentifier: 'premium_yearly',
            periodType: 'TRIAL',
            store: 'APP_STORE',
            expirationDateMillis: 1770000000000,
          },
        },
      },
      activeSubscriptions: ['fallback_monthly'],
    } as any;

    expect(revenueCatPremiumMetadata(info)).toEqual({
      productId: 'premium_yearly',
      periodType: 'TRIAL',
      store: 'APP_STORE',
      expiryMs: 1770000000000,
    });
  });

  it('ignores retired MAX metadata when ordinary Premium is active', () => {
    const info = {
      entitlements: { active: {
        premium: {
          productIdentifier: 'phraseman_premium_monthly_399',
          expirationDateMillis: 1_000,
          store: 'APP_STORE',
        },
        max: {
          productIdentifier: 'phraseman_max_monthly_v1:monthly-base',
          expirationDateMillis: 9_000,
          store: 'PLAY_STORE',
        },
      } },
      activeSubscriptions: [
        'phraseman_premium_monthly_399',
        'phraseman_max_monthly_v1:monthly-base',
      ],
    } as any;

    expect(inferPremiumPlanFromCustomerInfo(info)).toBe('monthly');
    expect(revenueCatPremiumMetadata(info)).toEqual(expect.objectContaining({
      productId: 'phraseman_premium_monthly_399',
      expiryMs: 1_000,
      store: 'APP_STORE',
    }));
  });

  it('confirms only the product returned for the selected purchase package', () => {
    const info = {
      entitlements: {
        active: {
          other: { productIdentifier: 'unrelated_active_product' },
          premium: { productIdentifier: 'phraseman_yearly' },
        },
      },
      // A canonical entitlement is authoritative when present; a different
      // active subscription must not override its exact product identifier.
      activeSubscriptions: ['phraseman_monthly'],
    } as any;

    expect(customerInfoConfirmsProductAccess(info, 'phraseman_yearly')).toBe(true);
    expect(customerInfoConfirmsProductAccess(info, 'phraseman_monthly')).toBe(false);
    expect(customerInfoConfirmsProductAccess(info, '')).toBe(false);
  });

  it('unlocks generic Premium access only for the canonical premium entitlement', () => {
    expect(revenueCatCustomerInfoHasPremiumAccess({
      entitlements: { active: { other: { productIdentifier: 'unrelated_product' } } },
      activeSubscriptions: ['unrelated_product'],
    } as any)).toBe(false);

    expect(revenueCatCustomerInfoHasPremiumAccess({
      entitlements: { active: { premium: { productIdentifier: 'phraseman_yearly' } } },
      activeSubscriptions: [],
    } as any)).toBe(true);
  });

  it.each([
    'premium_monthly',
    'premium_yearly',
    'premium_lifetime',
    'phraseman_premium_monthly_399',
    'phraseman_premium_yearly_2999',
    'phraseman_premium_lifetime_9999',
  ])('keeps ordinary Premium product %s eligible', (productIdentifier) => {
    expect(revenueCatCustomerInfoHasPremiumAccess({
      entitlements: { active: { premium: { productIdentifier } } },
      activeSubscriptions: [productIdentifier],
    } as any)).toBe(true);
  });

  it.each([
    'phraseman_max_monthly_v1',
    'phraseman_voice_minutes_30',
    'phraseman_voice_minutes_120',
    'phraseman_voice_minutes_300',
  ])('never treats retired MAX or minute product %s as Premium', (productIdentifier) => {
    expect(revenueCatCustomerInfoHasPremiumAccess({
      entitlements: { active: { premium: { productIdentifier } } },
      activeSubscriptions: [productIdentifier],
    } as any)).toBe(false);
  });

  it('also confirms an exact active subscription id when entitlement details are absent', () => {
    const info = {
      entitlements: { active: {} },
      activeSubscriptions: ['phraseman_monthly'],
    } as any;

    expect(customerInfoConfirmsProductAccess(info, 'phraseman_monthly')).toBe(true);
    expect(customerInfoConfirmsProductAccess(info, 'phraseman_yearly')).toBe(false);
  });

  it('persists premium locally and immediately forces cloud sync', async () => {
    await persistStorePremiumLocally(captureAccountGeneration(), 'yearly', {
      productId: 'premium_yearly',
      periodType: 'TRIAL',
      store: 'APP_STORE',
      expiryMs: 1770000000000,
    }, 'store_purchase');

    await expect(AsyncStorage.multiGet([
      'premium_plan',
      'premium_expiry',
      'premium_active',
      'tester_no_premium',
      'premium_rc_product_id',
      'premium_rc_period_type',
      'premium_rc_store',
      'premium_rc_expiry_ms',
    ])).resolves.toEqual([
      ['premium_plan', 'yearly'],
      ['premium_expiry', '0'],
      ['premium_active', 'true'],
      ['tester_no_premium', 'false'],
      ['premium_rc_product_id', 'premium_yearly'],
      ['premium_rc_period_type', 'TRIAL'],
      ['premium_rc_store', 'APP_STORE'],
      ['premium_rc_expiry_ms', '1770000000000'],
    ]);
    expect(markPremiumStoreSeenNow).toHaveBeenCalledTimes(1);
    expect(invalidatePremiumCache).toHaveBeenCalledTimes(1);
    expect(syncToCloud).toHaveBeenCalledWith({ forceNow: true });
    const scopedRaw = await AsyncStorage.getItem(
      'premium_real_snapshot_v1:premium-revenuecat-test',
    );
    expect(JSON.parse(String(scopedRaw))).toEqual(expect.objectContaining({
      version: 1,
      ownerStableId: 'premium-revenuecat-test',
      active: true,
      plan: 'yearly',
      evidenceSource: 'store_purchase',
    }));
  });

  it('stops premium side effects when generation changes during local persistence', async () => {
    let release!: () => void;
    const originalSet = (AsyncStorage.setItem as jest.Mock).getMockImplementation();
    (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
      if (key === 'premium_real_snapshot_v1:premium-revenuecat-test' && !release) {
        await new Promise<void>((resolve) => { release = resolve; });
      }
      return originalSet(key, value);
    });

    const generation = require('../app/account_generation');
    const token = captureAccountGeneration();
    const pending = persistStorePremiumLocally(token, 'yearly', {}, 'store_purchase');
    for (let spin = 0; !release && spin < 20; spin += 1) await Promise.resolve();
    expect(release).toBeDefined();
    generation.beginAccountGeneration('premium-revenuecat-other');
    release();
    await expect(pending).resolves.toBe(false);

    expect(markPremiumStoreSeenNow).not.toHaveBeenCalled();
    expect(invalidatePremiumCache).not.toHaveBeenCalled();
    expect(syncToCloud).not.toHaveBeenCalled();
  });

  it('suppresses ownerless cache and sync tails when generation changes after commit permit', async () => {
    const pendingKey = 'premium_real_snapshot_v1:premium-revenuecat-test:pending';
    let releaseRemoval!: () => void;
    const originalRemove = (AsyncStorage.removeItem as jest.Mock).getMockImplementation();
    (AsyncStorage.removeItem as jest.Mock).mockImplementation(async (key: string) => {
      if (key === pendingKey && !releaseRemoval) {
        await new Promise<void>((resolve) => { releaseRemoval = resolve; });
      }
      return originalRemove(key);
    });

    const token = captureAccountGeneration();
    const pending = persistStorePremiumLocally(token, 'yearly', {
      productId: 'premium_yearly',
    }, 'store_purchase');
    for (let spin = 0; !releaseRemoval && spin < 30; spin += 1) await Promise.resolve();
    expect(releaseRemoval).toBeDefined();

    beginAccountGeneration('premium-revenuecat-other');
    const returnedA = beginAccountGeneration('premium-revenuecat-test');
    expect(returnedA.stableId).toBe('premium-revenuecat-test');
    releaseRemoval();
    await expect(pending).resolves.toBe(false);

    expect(AsyncStorage.multiSet).not.toHaveBeenCalled();
    expect(markPremiumStoreSeenNow).not.toHaveBeenCalled();
    expect(invalidatePremiumCache).not.toHaveBeenCalled();
    expect(syncToCloud).not.toHaveBeenCalled();
    await expect(AsyncStorage.getItem('premium_real_snapshot_v1:premium-revenuecat-test'))
      .resolves.not.toBeNull();
  });

  it('can skip the unrelated full cloud sync on the immediate purchase path', async () => {
    await persistStorePremiumLocally(
      captureAccountGeneration(),
      'yearly',
      {},
      'store_purchase',
      false,
    );

    expect(syncToCloud).not.toHaveBeenCalled();
    expect(markPremiumStoreSeenNow).toHaveBeenCalledTimes(1);
    expect(invalidatePremiumCache).toHaveBeenCalledTimes(1);
  });
});
