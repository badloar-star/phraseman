import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getVerifiedPremiumAccessStatus,
  getVerifiedPremiumStatus,
  invalidatePremiumCache,
} from '../../app/premium_guard';
import { isLoyaltyGiftActive } from '../../app/loyalty_gift';
import { isIntroFullAccessActive } from '../../app/intro_full_access';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('react-native-purchases', () => ({
  default: { getCustomerInfo: jest.fn() },
}));
jest.mock('../../app/config', () => ({ IS_EXPO_GO: true })); // skip RevenueCat calls
// Loyalty gift / intro access are exercised separately; default them OFF here so the
// real-premium/VIP path is what's under test, then flip them per-case.
jest.mock('../../app/loyalty_gift', () => ({ isLoyaltyGiftActive: jest.fn().mockResolvedValue(false) }));
jest.mock('../../app/intro_full_access', () => ({ isIntroFullAccessActive: jest.fn().mockResolvedValue(false) }));

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockMultiGet = AsyncStorage.multiGet as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;
const mockLoyaltyActive = isLoyaltyGiftActive as jest.Mock;
const mockIntroActive = isIntroFullAccessActive as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  invalidatePremiumCache();
  mockSetItem.mockResolvedValue(undefined);
  mockLoyaltyActive.mockResolvedValue(false);
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
    // (Точное число чтений за первый проход — деталь реализации: real/vip/intro/loyalty
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

// ── Концерн «подарок 3 дня не мешает покупке премиума / получению VIP» ──────
// Доступ-резолвер обязан проверять РЕАЛЬНЫЙ премиум/VIP РАНЬШЕ подарка лояльности,
// чтобы подарок никогда не «перехватывал» оплату и чтобы платный/VIP-доступ не
// зависел от состояния подарка. Эти тесты фиксируют порядок приоритетов.
describe('getVerifiedPremiumAccessStatus — loyalty gift priority', () => {
  it('real premium wins regardless of loyalty gift (no interference)', async () => {
    mockGetItem.mockResolvedValue(null); // tester_no_premium / tester_no_limits off
    mockMultiGet.mockResolvedValue([
      ['premium_active', 'true'],
      ['premium_plan', 'monthly'],
      ['premium_expiry', '0'],
    ]);
    // Подарок активен ОДНОВРЕМЕННО — не должен ничего менять: оплата главнее.
    mockLoyaltyActive.mockResolvedValue(true);
    expect(await getVerifiedPremiumAccessStatus()).toBe(true);
    // Резолвер вернулся на ветке real/VIP и до подарка даже не дошёл.
    expect(mockLoyaltyActive).not.toHaveBeenCalled();
  });

  it('grants access via the loyalty gift when no real premium/VIP', async () => {
    mockGetItem.mockResolvedValue(null);
    mockMultiGet.mockResolvedValue([
      ['premium_active', null],
      ['premium_plan', null],
      ['premium_expiry', '0'],
    ]);
    mockLoyaltyActive.mockResolvedValue(true);
    expect(await getVerifiedPremiumAccessStatus()).toBe(true);
  });

  it('access disappears the moment the gift goes inactive (free user, no real premium)', async () => {
    mockGetItem.mockResolvedValue(null);
    mockMultiGet.mockResolvedValue([
      ['premium_active', null],
      ['premium_plan', null],
      ['premium_expiry', '0'],
    ]);
    mockLoyaltyActive.mockResolvedValue(true);
    expect(await getVerifiedPremiumAccessStatus()).toBe(true);

    invalidatePremiumCache();
    mockLoyaltyActive.mockResolvedValue(false); // подарок истёк
    // Облачный refresh внутри тоже не воскресит доступ (нет real/VIP в облаке).
    expect(await getVerifiedPremiumAccessStatus()).toBe(false);
  });

  it('tester_no_premium kill-switch overrides an active loyalty gift', async () => {
    mockGetItem.mockResolvedValue('true'); // tester_no_premium = true
    mockMultiGet.mockResolvedValue([
      ['premium_active', null],
      ['premium_plan', null],
      ['premium_expiry', '0'],
    ]);
    mockLoyaltyActive.mockResolvedValue(true);
    expect(await getVerifiedPremiumAccessStatus()).toBe(false);
  });
});
