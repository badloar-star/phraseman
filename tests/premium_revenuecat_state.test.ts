import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncToCloud } from '../app/cloud_sync';
import { invalidatePremiumCache, markPremiumStoreSeenNow } from '../app/premium_guard';
import {
  inferPremiumPlanFromProductId,
  persistStorePremiumLocally,
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
});
