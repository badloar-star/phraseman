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
    // Считаем только чтения ключей Plus: флаги тестера в dev читаются каждый вызов НАМЕРЕННО (6bb14d3f5 —
    // «Снять премиум» срабатывает сразу; в стор-сборке хранилище не трогается), это не промах кэша.
    const premiumKeyReads = () => mockMultiGet.mock.calls
      .filter(([keys]) => Array.isArray(keys) && (keys as string[]).includes('premium_active')).length;
    await getVerifiedPremiumStatus();
    const callsAfterFirst = premiumKeyReads();
    expect(callsAfterFirst).toBeGreaterThan(0);
    await getVerifiedPremiumStatus();
    // Второй вызов берёт результат из кэша — ни одного нового чтения ключей Plus.
    expect(premiumKeyReads()).toBe(callsAfterFirst);
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
