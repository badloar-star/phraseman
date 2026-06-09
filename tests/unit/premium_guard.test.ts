import AsyncStorage from '@react-native-async-storage/async-storage';
import { getVerifiedPremiumStatus, invalidatePremiumCache } from '../../app/premium_guard';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('react-native-purchases', () => ({
  default: { getCustomerInfo: jest.fn() },
}));
jest.mock('../../app/config', () => ({ IS_EXPO_GO: true })); // skip RevenueCat calls

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockMultiGet = AsyncStorage.multiGet as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  invalidatePremiumCache();
  mockSetItem.mockResolvedValue(undefined);
});

describe('getVerifiedPremiumStatus', () => {
  it('returns false when tester_no_premium is set', async () => {
    mockGetItem.mockResolvedValue('true');
    mockMultiGet.mockResolvedValue([
      ['premium_active', 'true'],
      ['premium_plan', null],
      ['premium_expiry', '0'],
    ]);
    const result = await getVerifiedPremiumStatus();
    expect(result).toBe(false);
  });

  it('returns false when no premium data', async () => {
    mockGetItem.mockResolvedValue(null); // tester_no_premium not set
    mockMultiGet.mockResolvedValue([
      ['premium_active', null],
      ['premium_plan', null],
      ['premium_expiry', '0'],
    ]);
    const result = await getVerifiedPremiumStatus();
    expect(result).toBe(false);
  });

  it('returns true when premium_active is true and no expiry', async () => {
    mockGetItem.mockResolvedValue(null);
    mockMultiGet.mockResolvedValue([
      ['premium_active', 'true'],
      ['premium_plan', 'monthly'],
      ['premium_expiry', '0'],
    ]);
    const result = await getVerifiedPremiumStatus();
    expect(result).toBe(true);
  });

  it('returns false when premium expired', async () => {
    const pastExpiry = Date.now() - 1000;
    mockGetItem.mockResolvedValue(null);
    mockMultiGet.mockResolvedValue([
      ['premium_active', 'true'],
      ['premium_plan', 'referral_bonus'],
      ['premium_expiry', String(pastExpiry)],
    ]);
    const result = await getVerifiedPremiumStatus();
    expect(result).toBe(false);
    expect(mockSetItem).toHaveBeenCalledWith('premium_active', 'false');
  });

  it('returns true for referral bonus not yet expired', async () => {
    const futureExpiry = Date.now() + 86400000;
    mockGetItem.mockResolvedValue(null);
    mockMultiGet.mockResolvedValue([
      ['premium_active', 'true'],
      ['premium_plan', 'referral_bonus'],
      ['premium_expiry', String(futureExpiry)],
    ]);
    const result = await getVerifiedPremiumStatus();
    expect(result).toBe(true);
  });

  it('caches result on second call', async () => {
    mockGetItem.mockResolvedValue(null);
    mockMultiGet.mockResolvedValue([
      ['premium_active', 'true'],
      ['premium_plan', null],
      ['premium_expiry', '0'],
    ]);
    await getVerifiedPremiumStatus();
    await getVerifiedPremiumStatus();
    // multiGet called only once due to cache
    expect(mockMultiGet).toHaveBeenCalledTimes(1);
  });

  it('invalidatePremiumCache forces re-check', async () => {
    mockGetItem.mockResolvedValue(null);
    mockMultiGet.mockResolvedValue([
      ['premium_active', 'true'],
      ['premium_plan', null],
      ['premium_expiry', '0'],
    ]);
    await getVerifiedPremiumStatus();
    invalidatePremiumCache();
    await getVerifiedPremiumStatus();
    expect(mockMultiGet).toHaveBeenCalledTimes(2);
  });
});
