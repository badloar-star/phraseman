import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  LOYALTY_GIFT_ALL_KEYS,
  LOYALTY_GIFT_CLAIMED_KEY,
  LOYALTY_GIFT_DURATION_MS,
  LOYALTY_GIFT_ENDS_AT_KEY,
  LOYALTY_GIFT_STARTED_AT_KEY,
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

  // ── Концерн «не продлевается больше 3 дней» ──────────────────────────────
  // Окно подарка привязано к АБСОЛЮТНОМУ endsAt, а не к started_at+duration.
  // Эти тесты фиксируют, что никакая подмена started_at / повторный старт не
  // удлиняют доступ сверх исходных 72 часов.

  it('binds the window to absolute endsAt — tampering started_at does NOT extend it', async () => {
    const now = 1_000_000_000_000;
    await startLoyaltyGift(now, 'ru');
    const originalEndsAt = now + LOYALTY_GIFT_DURATION_MS;

    // Злонамеренно «переставляем» started_at вперёд (как будто подарок только начался),
    // НЕ трогая endsAt — состояние обязано игнорировать started_at для срока.
    store.set(LOYALTY_GIFT_STARTED_AT_KEY, String(now + LOYALTY_GIFT_DURATION_MS));

    const state = await getLoyaltyGiftState(now);
    expect(state.endsAt).toBe(originalEndsAt); // срок не сдвинулся
    // Сразу после исходного окончания доступа уже нет — продления не случилось.
    expect(await isLoyaltyGiftActive(originalEndsAt + 1)).toBe(false);
  });

  it('a second start after restore re-wrote claimed/started does NOT stack a new 72h window', async () => {
    const now = 1_000_000_000_000;
    await startLoyaltyGift(now, 'ru');
    const originalEndsAt = now + LOYALTY_GIFT_DURATION_MS;

    // Имитируем restore из облака: claimed/started уже стоят (зеркало с другого устройства).
    // Повторный старт спустя время обязан вернуть false и НЕ переписать endsAt вперёд.
    const later = now + LOYALTY_GIFT_DURATION_MS / 2;
    expect(await startLoyaltyGift(later, 'ru')).toBe(false);
    expect(store.get(LOYALTY_GIFT_ENDS_AT_KEY)).toBe(String(originalEndsAt));
  });

  it('existingStart guard blocks re-grant even if claimed key was cleared (no second window)', async () => {
    const now = 1_000_000_000_000;
    await startLoyaltyGift(now, 'ru');
    const originalEndsAt = now + LOYALTY_GIFT_DURATION_MS;

    // Стираем только метку claimed (started/ends остаются) — второй независимый
    // предохранитель existingStart обязан всё равно запретить повторную выдачу.
    store.delete(LOYALTY_GIFT_CLAIMED_KEY);
    expect(await startLoyaltyGift(now + 1000, 'ru')).toBe(false);
    expect(store.get(LOYALTY_GIFT_ENDS_AT_KEY)).toBe(String(originalEndsAt));
  });

  // ── Концерн «корректно начисляется» — fail-closed на битых данных ────────

  it('fail-closed: a corrupted (non-numeric) endsAt reads as inactive, never grants forever', async () => {
    store.set(LOYALTY_GIFT_STARTED_AT_KEY, '1000000000000');
    store.set(LOYALTY_GIFT_ENDS_AT_KEY, 'not-a-number');
    const state = await getLoyaltyGiftState(1_000_000_000_001);
    expect(state.active).toBe(false);
    expect(state.endsAt).toBeNull();
    expect(await isLoyaltyGiftActive(1_000_000_000_001)).toBe(false);
  });

  it('fail-closed: a negative endsAt reads as inactive', async () => {
    store.set(LOYALTY_GIFT_STARTED_AT_KEY, '1000000000000');
    store.set(LOYALTY_GIFT_ENDS_AT_KEY, '-5');
    expect(await isLoyaltyGiftActive(1_000_000_000_001)).toBe(false);
  });
});
