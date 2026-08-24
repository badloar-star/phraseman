import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { maxPendingActivationStorageKey } from '../modules/max_subscription/pending';

const mockGetOfferings = jest.fn();
const mockGetCustomerInfo = jest.fn();
const mockPurchasePackage = jest.fn();
const mockRestorePurchases = jest.fn();
const mockPersistStorePremiumLocally = jest.fn();
const mockConfirmProjection = jest.fn();
let mockGenerationCurrent = true;

jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));
jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    getOfferings: mockGetOfferings,
    getCustomerInfo: mockGetCustomerInfo,
    purchasePackage: mockPurchasePackage,
    restorePurchases: mockRestorePurchases,
  },
  PRORATION_MODE: { IMMEDIATE_WITH_TIME_PRORATION: 3 },
  PURCHASES_ERROR_CODE: { PAYMENT_PENDING_ERROR: 'PAYMENT_PENDING_ERROR' },
}));
jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: () => ({ generation: 1, stableId: 'stable-a', phase: 'active' }),
  isCurrentAccountGeneration: () => mockGenerationCurrent,
  withAccountTransitionLock: async (work: (lease: object) => Promise<unknown>) => work({}),
}));
jest.mock('../app/revenuecat_init', () => ({
  initRevenueCat: jest.fn(async () => true),
  syncRevenueCatIdentity: jest.fn(async () => mockGenerationCurrent),
  resolveMaxPackage: (offerings: any) => offerings?.all?.max?.availablePackages?.[0],
}));
jest.mock('../app/revenuecat_account_identity', () => ({
  runRevenueCatOperationForGeneration: async (_generation: unknown, operation: () => Promise<unknown>) => {
    const value = await operation();
    return mockGenerationCurrent ? { status: 'ok', value } : { status: 'stale' };
  },
  commitRevenueCatResultForGeneration: async (_generation: unknown, work: (isCurrent: () => boolean) => Promise<unknown>) => {
    if (!mockGenerationCurrent) return { status: 'stale' };
    const value = await work(() => mockGenerationCurrent);
    return mockGenerationCurrent ? { status: 'ok', value } : { status: 'stale' };
  },
}));
jest.mock('../app/premium_revenuecat_state', () => {
  const metadata = (info: any, productId?: string) => ({
    productId: productId ?? info?.entitlements?.active?.max?.productIdentifier,
  });
  return {
    persistStorePremiumLocally: mockPersistStorePremiumLocally,
    revenueCatPremiumMetadata: metadata,
    revenueCatMaxMetadata: metadata,
  };
});
jest.mock('../app/revenuecat_projection_sync', () => ({
  confirmRevenueCatMaxProjectionForAccount: mockConfirmProjection,
}));

const maxPackage = {
  identifier: 'max_monthly',
  product: { identifier: 'phraseman_max_monthly_v1:monthly-base' },
};
const plusInfo = {
  entitlements: { active: { premium: { productIdentifier: 'phraseman_premium_monthly_399:monthly-base' } } },
  activeSubscriptions: ['phraseman_premium_monthly_399:monthly-base'],
};
const maxInfo = {
  entitlements: { active: { max: { productIdentifier: 'phraseman_max_monthly_v1:monthly-base' } } },
  activeSubscriptions: ['phraseman_max_monthly_v1:monthly-base'],
};

describe('MAX purchase account and Android behavior', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockGenerationCurrent = true;
    mockGetOfferings.mockResolvedValue({ all: { max: { availablePackages: [maxPackage] } } });
    mockGetCustomerInfo.mockResolvedValue(plusInfo);
    mockPurchasePackage.mockResolvedValue({ customerInfo: maxInfo });
    mockRestorePurchases.mockResolvedValue(maxInfo);
    mockPersistStorePremiumLocally.mockResolvedValue(true);
    mockConfirmProjection.mockResolvedValue(false);
    await AsyncStorage.clear();
    (SecureStore as typeof SecureStore & { __reset?: () => void }).__reset?.();
  });

  it('uses the existing Plus product and immediate time proration for Android replacement', async () => {
    const { purchaseMaxSubscription } = require('../modules/max_subscription/purchase');

    await expect(purchaseMaxSubscription()).resolves.toMatchObject({ status: 'purchased' });
    expect(mockPurchasePackage).toHaveBeenCalledWith(maxPackage, null, {
      oldProductIdentifier: 'phraseman_premium_monthly_399:monthly-base',
      prorationMode: 3,
    });
  });

  it('does not commit MAX when the account changes while the store purchase is in flight', async () => {
    mockPurchasePackage.mockImplementation(async () => {
      mockGenerationCurrent = false;
      return { customerInfo: maxInfo };
    });
    const { purchaseMaxSubscription } = require('../modules/max_subscription/purchase');

    await expect(purchaseMaxSubscription()).resolves.toEqual({ status: 'stale' });
    expect(mockPersistStorePremiumLocally).not.toHaveBeenCalled();
  });

  it('fails closed when the account changes during the local entitlement commit', async () => {
    mockPersistStorePremiumLocally.mockImplementation(async (_plan, _metadata, isCurrent) => {
      mockGenerationCurrent = false;
      return isCurrent();
    });
    const { purchaseMaxSubscription } = require('../modules/max_subscription/purchase');

    await expect(purchaseMaxSubscription()).resolves.toEqual({ status: 'stale' });
  });

  it('persists only account-scoped timing metadata when the store reports pending', async () => {
    mockPurchasePackage.mockResolvedValueOnce({ customerInfo: plusInfo });
    const { purchaseMaxSubscription } = require('../modules/max_subscription/purchase');
    const markerKey = await maxPendingActivationStorageKey('stable-a');

    await expect(purchaseMaxSubscription()).resolves.toEqual({ status: 'pending' });
    const raw = await AsyncStorage.getItem(markerKey);
    const marker = JSON.parse(raw ?? '{}');
    expect(marker).toMatchObject({ version: 1, stableId: 'stable-a' });
    expect(Object.keys(marker).sort()).toEqual(['createdAtMs', 'expiresAtMs', 'stableId', 'version']);
    await expect(SecureStore.getItemAsync(markerKey)).resolves.toBe(raw);
  });

  it('treats RevenueCat PAYMENT_PENDING_ERROR as durable pending instead of throwing', async () => {
    mockPurchasePackage.mockRejectedValueOnce({ code: 'PAYMENT_PENDING_ERROR' });
    const { purchaseMaxSubscription } = require('../modules/max_subscription/purchase');
    const markerKey = await maxPendingActivationStorageKey('stable-a');

    await expect(purchaseMaxSubscription()).resolves.toEqual({ status: 'pending' });
    await expect(AsyncStorage.getItem(markerKey)).resolves.not.toBeNull();
    await expect(SecureStore.getItemAsync(markerKey)).resolves.not.toBeNull();
  });

  it('keeps a store-confirmed purchase latched until the server confirms MAX activation', async () => {
    const {
      confirmMaxSubscriptionActivation,
      purchaseMaxSubscription,
    } = require('../modules/max_subscription/purchase');
    const markerKey = await maxPendingActivationStorageKey('stable-a');

    await expect(purchaseMaxSubscription()).resolves.toMatchObject({ status: 'purchased' });
    await expect(AsyncStorage.getItem(markerKey)).resolves.not.toBeNull();

    mockConfirmProjection.mockResolvedValueOnce(true);
    await expect(confirmMaxSubscriptionActivation()).resolves.toBe(true);
    await expect(AsyncStorage.getItem(markerKey)).resolves.toBeNull();
    await expect(SecureStore.getItemAsync(markerKey)).resolves.toBeNull();
  });

  it('does not hide confirmed MAX activation when stale-marker cleanup fails', async () => {
    const {
      confirmMaxSubscriptionActivation,
      purchaseMaxSubscription,
    } = require('../modules/max_subscription/purchase');

    await purchaseMaxSubscription();
    const markerKey = await maxPendingActivationStorageKey('stable-a');
    mockConfirmProjection.mockResolvedValueOnce(true);
    (AsyncStorage.removeItem as jest.Mock).mockRejectedValueOnce(new Error('storage_unavailable'));

    await expect(confirmMaxSubscriptionActivation()).resolves.toBe(true);
    await expect(SecureStore.getItemAsync(markerKey)).resolves.toBeNull();
  });

  it('does not clear a durable pending marker when restore finds no active MAX entitlement', async () => {
    const {
      purchaseMaxSubscription,
      restoreMaxSubscription,
    } = require('../modules/max_subscription/purchase');
    const markerKey = await maxPendingActivationStorageKey('stable-a');
    mockPurchasePackage.mockResolvedValueOnce({ customerInfo: plusInfo });
    await expect(purchaseMaxSubscription()).resolves.toEqual({ status: 'pending' });
    const pendingMarker = await AsyncStorage.getItem(markerKey);
    mockRestorePurchases.mockResolvedValueOnce(plusInfo);

    await expect(restoreMaxSubscription()).resolves.toEqual({ status: 'unavailable' });
    await expect(AsyncStorage.getItem(markerKey)).resolves.toBe(pendingMarker);
    await expect(SecureStore.getItemAsync(markerKey)).resolves.toBe(pendingMarker);
  });
});
