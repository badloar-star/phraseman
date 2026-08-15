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

  it('also confirms an exact active subscription id when entitlement details are absent', () => {
    const info = {
      entitlements: { active: {} },
      activeSubscriptions: ['phraseman_monthly'],
    } as any;

    expect(customerInfoConfirmsProductAccess(info, 'phraseman_monthly')).toBe(true);
    expect(customerInfoConfirmsProductAccess(info, 'phraseman_yearly')).toBe(false);
  });

  it('persists premium locally and immediately forces cloud sync', async () => {
    await persistStorePremiumLocally('yearly', {
      productId: 'premium_yearly',
      periodType: 'TRIAL',
      store: 'APP_STORE',
      expiryMs: 1770000000000,
    });

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
  });

  it('stops premium side effects when generation changes during local persistence', async () => {
    let release!: () => void;
    let current = true;
    (AsyncStorage.multiSet as jest.Mock).mockImplementationOnce(() => (
      new Promise<void>((resolve) => { release = resolve; })
    ));

    const pending = persistStorePremiumLocally('yearly', {}, () => current);
    await Promise.resolve();
    current = false;
    release();
    await pending;

    expect(markPremiumStoreSeenNow).not.toHaveBeenCalled();
    expect(invalidatePremiumCache).not.toHaveBeenCalled();
    expect(syncToCloud).not.toHaveBeenCalled();
  });

  it('can skip the unrelated full cloud sync on the immediate purchase path', async () => {
    await persistStorePremiumLocally('yearly', {}, () => true, false);

    expect(syncToCloud).not.toHaveBeenCalled();
    expect(markPremiumStoreSeenNow).toHaveBeenCalledTimes(1);
    expect(invalidatePremiumCache).toHaveBeenCalledTimes(1);
  });
});
