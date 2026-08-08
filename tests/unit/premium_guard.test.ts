import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getVerifiedPremiumAccessStatus,
  getVerifiedPremiumStatus,
  invalidatePremiumCache,
} from '../../app/premium_guard';
import { isIntroFullAccessActive } from '../../app/intro_full_access';
import { __resetAccountGenerationForTests, beginAccountGeneration } from '../../app/account_generation';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('react-native-purchases', () => ({
  default: { getCustomerInfo: jest.fn() },
}));
jest.mock('../../app/config', () => ({ IS_EXPO_GO: true })); // skip RevenueCat calls
// Intro access is exercised separately; default it OFF here so the
// real-premium/VIP path is what's under test, then flip it per-case.
jest.mock('../../app/intro_full_access', () => ({ isIntroFullAccessActive: jest.fn().mockResolvedValue(false) }));

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockMultiGet = AsyncStorage.multiGet as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;
const mockIntroActive = isIntroFullAccessActive as jest.Mock;

beforeEach(() => {
  __resetAccountGenerationForTests();
  beginAccountGeneration('premium-guard-test-account');
  jest.clearAllMocks();
  invalidatePremiumCache();
  mockSetItem.mockResolvedValue(undefined);
  mockIntroActive.mockResolvedValue(false);
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
      ['premium_plan', 'monthly'],
      ['premium_expiry', String(pastExpiry)],
    ]);
    const result = await getVerifiedPremiumStatus();
    expect(result).toBe(false);
    expect(mockSetItem).toHaveBeenCalledWith('premium_active', 'false');
  });

  it('returns true for a time-limited store plan not yet expired', async () => {
    const futureExpiry = Date.now() + 86400000;
    mockGetItem.mockResolvedValue(null);
    mockMultiGet.mockResolvedValue([
      ['premium_active', 'true'],
      ['premium_plan', 'monthly'],
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
    const callsAfterFirst = mockMultiGet.mock.calls.length;
    await getVerifiedPremiumStatus();
    // Второй вызов берёт результат из кэша — НИ ОДНОГО нового чтения хранилища.
    // (Точное число чтений за первый проход — деталь реализации: real/vip/intro
    // читают разные ключи; важно лишь, что кэш гасит повторный проход.)
    expect(mockMultiGet).toHaveBeenCalledTimes(callsAfterFirst);
  });

  it('invalidatePremiumCache forces re-check', async () => {
    mockGetItem.mockResolvedValue(null);
    mockMultiGet.mockResolvedValue([
      ['premium_active', 'true'],
      ['premium_plan', null],
      ['premium_expiry', '0'],
    ]);
    await getVerifiedPremiumStatus();
    const callsAfterFirst = mockMultiGet.mock.calls.length;
    invalidatePremiumCache();
    await getVerifiedPremiumStatus();
    // После сброса кэша второй проход снова читает хранилище — счётчик растёт
    // (число дополнительных чтений = деталь реализации, важен сам факт re-check).
    expect(mockMultiGet.mock.calls.length).toBeGreaterThan(callsAfterFirst);
  });
});
