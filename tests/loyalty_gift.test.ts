import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  LOYALTY_GIFT_ALL_KEYS,
  LOYALTY_GIFT_CLAIMED_KEY,
  LOYALTY_GIFT_DURATION_MS,
  getLoyaltyGiftState,
  isLoyaltyGiftActive,
  isLoyaltyGiftClaimed,
  resetLoyaltyGiftForAdmin,
  startLoyaltyGift,
} from '../app/loyalty_gift';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/notifications', () => ({
  scheduleIntroExpiringNotification: jest.fn().mockResolvedValue(undefined),
  scheduleUpsellNotifications: jest.fn().mockResolvedValue(undefined),
}));

// Простой in-memory backend для AsyncStorage-моков.
const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (k: string) => store.get(k) ?? null);
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (k: string, v: string) => { store.set(k, v); });
  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (pairs: [string, string][]) => {
    pairs.forEach(([k, v]) => store.set(k, v));
  });
  (AsyncStorage.multiGet as jest.Mock).mockImplementation(async (keys: string[]) =>
    keys.map((k) => [k, store.get(k) ?? null]));
  (AsyncStorage.multiRemove as jest.Mock).mockImplementation(async (keys: string[]) => {
    keys.forEach((k) => store.delete(k));
  });
});

describe('loyalty_gift', () => {
  it('grants a 72h active gift on first start', async () => {
    const now = 1_000_000_000_000;
    const started = await startLoyaltyGift(now, 'ru');
    expect(started).toBe(true);

    const state = await getLoyaltyGiftState(now);
    expect(state.active).toBe(true);
    expect(state.endsAt).toBe(now + LOYALTY_GIFT_DURATION_MS);
    expect(await isLoyaltyGiftActive(now)).toBe(true);
    expect(await isLoyaltyGiftClaimed()).toBe(true);
  });

  it('is one-time: a second start does not re-grant', async () => {
    const now = 1_000_000_000_000;
    expect(await startLoyaltyGift(now, 'ru')).toBe(true);
    // Повторный вызов — отказ (claimed уже стоит).
    expect(await startLoyaltyGift(now + 5000, 'ru')).toBe(false);
  });

  it('expires after 72h (no access past the window)', async () => {
    const now = 1_000_000_000_000;
    await startLoyaltyGift(now, 'ru');
    const afterExpiry = now + LOYALTY_GIFT_DURATION_MS + 1;
    expect(await isLoyaltyGiftActive(afterExpiry)).toBe(false);
    const state = await getLoyaltyGiftState(afterExpiry);
    expect(state.active).toBe(false);
    // Истёк, но финальный модал ещё не показан → expiredUnseen для триггера ended-модала.
    expect(state.expiredUnseen).toBe(true);
  });

  it('admin reset wipes ALL keys (clean rollback) and access disappears', async () => {
    const now = 1_000_000_000_000;
    await startLoyaltyGift(now, 'ru');
    expect(store.get(LOYALTY_GIFT_CLAIMED_KEY)).toBe('true');

    await resetLoyaltyGiftForAdmin();
    // Ни одного ключа подарка не осталось — доступ снимается мгновенно.
    for (const key of LOYALTY_GIFT_ALL_KEYS) {
      expect(store.has(key)).toBe(false);
    }
    expect(await isLoyaltyGiftActive(now)).toBe(false);
    expect(await isLoyaltyGiftClaimed()).toBe(false);
  });

  it('does NOT touch real premium / vip storage keys', async () => {
    const now = 1_000_000_000_000;
    store.set('premium_active', 'true');
    store.set('vip_active', 'true');
    await startLoyaltyGift(now, 'ru');
    await resetLoyaltyGiftForAdmin();
    // Платный премиум и VIP не затронуты ни выдачей, ни откатом подарка.
    expect(store.get('premium_active')).toBe('true');
    expect(store.get('vip_active')).toBe('true');
  });
});
