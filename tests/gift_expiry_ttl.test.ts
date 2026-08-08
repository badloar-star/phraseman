/**
 * TTL подарков (72ч): индивидуальный таймер с момента получения, сгорание и
 * вычистка из хранилища при чтении (владелец, 2026-08-02).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadPendingLevelGiftInventory,
  saveUnclaimedGift,
  saveUnclaimedDualGift,
  markGiftClaimed,
  PENDING_LEVEL_GIFT_COUNT_CACHE_KEY,
  UNCLAIMED_DUAL_GIFTS_KEY,
  UNCLAIMED_GIFTS_KEY,
  UNCLAIMED_GIFT_RECEIVED_AT_KEY,
} from '../app/level_gift_inventory';
import type { GiftDef } from '../app/level_gift_system';
import {
  friendGiftExpiresAtMs,
  friendGiftInventoryKey,
  loadStoredFriendGiftInventory,
} from '../app/friend_gift_inventory';
import { beginAccountGeneration, captureAccountGeneration } from '../app/account_generation';
import { loadActiveLevelGiftInventory } from '../app/level_gift_active_inventory';
import {
  GIFT_FIRST_SEEN_KEY,
  GIFT_TTL_MS,
  giftCountdownLabel,
} from '../app/gift_expiry';
import { __resetAccountGenerationForTests } from '../app/account_generation';

jest.mock('@react-native-async-storage/async-storage');

const mockStorage: Record<string, string> = {};

const T0 = Date.UTC(2026, 7, 2, 12, 0, 0);
let now = T0;

const makeGift = (id: string): GiftDef => ({
  id,
  rarity: 'common',
  icon: 'gift',
  titleRU: id,
  titleUK: id,
  titleES: id,
  descRU: id,
  descUK: id,
  descES: id,
  weight: 1,
});

beforeEach(() => {
  __resetAccountGenerationForTests();
  beginAccountGeneration('account-a');
  jest.clearAllMocks();
  now = T0;
  jest.spyOn(Date, 'now').mockImplementation(() => now);
  Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) =>
    Promise.resolve(mockStorage[key] ?? null),
  );
  (AsyncStorage.setItem as jest.Mock).mockImplementation((key: string, value: string) => {
    mockStorage[key] = value;
    return Promise.resolve();
  });
  (AsyncStorage.removeItem as jest.Mock).mockImplementation((key: string) => {
    delete mockStorage[key];
    return Promise.resolve();
  });
  (AsyncStorage.multiGet as jest.Mock).mockImplementation((keys: string[]) =>
    Promise.resolve(keys.map((key) => [key, mockStorage[key] ?? null])),
  );
  (AsyncStorage.multiSet as jest.Mock).mockImplementation((pairs: [string, string][]) => {
    pairs.forEach(([key, value]) => { mockStorage[key] = value; });
    return Promise.resolve();
  });
  (AsyncStorage.multiGet as jest.Mock).mockImplementation((keys: string[]) =>
    Promise.resolve(keys.map((key) => [key, mockStorage[key] ?? null])),
  );
  (AsyncStorage.multiSet as jest.Mock).mockImplementation((pairs: [string, string][]) => {
    pairs.forEach(([key, value]) => {
      mockStorage[key] = value;
    });
    return Promise.resolve();
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('pending level gift TTL', () => {
  it('stamps receipt on save and exposes a 72h expiry on load', async () => {
    await saveUnclaimedGift(5, makeGift('xp_50'));

    const items = await loadPendingLevelGiftInventory('en');
    expect(items).toHaveLength(1);
    expect(items[0]).toEqual(expect.objectContaining({
      level: 5,
      receivedAtMs: T0,
      expiresAtMs: T0 + GIFT_TTL_MS,
    }));
  });

  it('burns a gift older than 72h: gone from the list, storage and badge cache', async () => {
    await saveUnclaimedGift(5, makeGift('xp_50'));
    now = T0 + GIFT_TTL_MS + 1000;

    await expect(loadPendingLevelGiftInventory('en')).resolves.toEqual([]);
    expect(JSON.parse(mockStorage[UNCLAIMED_GIFTS_KEY])).toEqual({});
    expect(JSON.parse(mockStorage[UNCLAIMED_GIFT_RECEIVED_AT_KEY])).toEqual({});
    expect(mockStorage[PENDING_LEVEL_GIFT_COUNT_CACHE_KEY]).toBe('0');
  });

  it('keeps a gift alive strictly inside the 72h window', async () => {
    await saveUnclaimedGift(5, makeGift('xp_50'));
    now = T0 + GIFT_TTL_MS - 1000;

    const items = await loadPendingLevelGiftInventory('en');
    expect(items).toHaveLength(1);
  });

  it('grandfathers pre-timer gifts: countdown starts at first load, not in the past', async () => {
    mockStorage[UNCLAIMED_GIFTS_KEY] = JSON.stringify({ 9: makeGift('xp_50') });

    const items = await loadPendingLevelGiftInventory('en');
    expect(items).toHaveLength(1);
    expect(items[0].expiresAtMs).toBe(T0 + GIFT_TTL_MS);
    expect(JSON.parse(mockStorage[UNCLAIMED_GIFT_RECEIVED_AT_KEY])).toEqual({ 9: T0 });
  });

  it('burns an expired dual gift as a whole', async () => {
    await saveUnclaimedDualGift(7, { f2p: makeGift('xp_50'), prem: makeGift('xp_100') });
    now = T0 + GIFT_TTL_MS + 1;

    await expect(loadPendingLevelGiftInventory('en')).resolves.toEqual([]);
    expect(JSON.parse(mockStorage[UNCLAIMED_DUAL_GIFTS_KEY])).toEqual({});
  });

  it('clears the receipt stamp when a gift is claimed', async () => {
    await saveUnclaimedGift(5, makeGift('xp_50'));
    await markGiftClaimed(5);

    expect(JSON.parse(mockStorage[UNCLAIMED_GIFT_RECEIVED_AT_KEY])).toEqual({});
  });
});

describe('friend gift TTL', () => {
  const inventoryKey = () => friendGiftInventoryKey(captureAccountGeneration())!;
  const friendGift = (id: string, savedAt: number) => ({
    id,
    giftId: 'xp_boost_2x_24h',
    giftLabel: 'x2 XP',
    fromUid: 'friend-1',
    fromName: 'Adi',
    ts: savedAt,
    savedAt,
  });

  it('drops friend gifts older than 72h and rewrites storage', async () => {
    beginAccountGeneration('gift-ttl-user');
    mockStorage[inventoryKey()] = JSON.stringify([
      friendGift('fresh', T0 - 1000),
      friendGift('stale', T0 - GIFT_TTL_MS - 1000),
    ]);

    const alive = await loadStoredFriendGiftInventory(T0);
    expect(alive.map((gift) => gift.id)).toEqual(['fresh']);
    expect(JSON.parse(mockStorage[inventoryKey()]).map((g: { id: string }) => g.id)).toEqual(['fresh']);
  });

  it('expires from authoritative server timestamp rather than delayed local save time', () => {
    expect(friendGiftExpiresAtMs({ ts: T0 - GIFT_TTL_MS - 1, savedAt: T0 })).toBe(T0 - 1);
  });
});

describe('active bonuses without an own lifetime', () => {
  it('starts a 72h countdown at first sight and stores the stamp', async () => {
    mockStorage.wager_discount = '0.25';

    const items = await loadActiveLevelGiftInventory('ru', T0, 'en');
    const wager = items.find((item) => item.key === 'wager_discount');
    expect(wager?.expiresAtMs).toBe(T0 + GIFT_TTL_MS);
    expect(JSON.parse(mockStorage[GIFT_FIRST_SEEN_KEY])).toEqual({ wager_discount: T0 });
  });

  it('burns the bonus for real once the 72h window is over', async () => {
    mockStorage.wager_discount = '0.25';
    mockStorage.wager_discount_uses_v1 = '2';
    mockStorage[GIFT_FIRST_SEEN_KEY] = JSON.stringify({ wager_discount: T0 - GIFT_TTL_MS - 1000 });

    const items = await loadActiveLevelGiftInventory('ru', T0, 'en');
    expect(items.find((item) => item.key === 'wager_discount')).toBeUndefined();
    expect(mockStorage.wager_discount).toBeUndefined();
    expect(mockStorage.wager_discount_uses_v1).toBeUndefined();
    expect(JSON.parse(mockStorage[GIFT_FIRST_SEEN_KEY])).toEqual({});
  });

  it('clears the stamp when the bonus was spent so a re-grant starts fresh', async () => {
    mockStorage[GIFT_FIRST_SEEN_KEY] = JSON.stringify({ club_boost: T0 - 1000 });

    await loadActiveLevelGiftInventory('ru', T0, 'en');
    expect(JSON.parse(mockStorage[GIFT_FIRST_SEEN_KEY])).toEqual({});
  });

  it('passes natural expiries through for timed bonuses', async () => {
    const expiresAt = T0 + 10 * 60 * 1000;
    mockStorage.gift_xp_multiplier = JSON.stringify({ multiplier: 1.5, expiresAt });

    const items = await loadActiveLevelGiftInventory('ru', T0, 'en');
    expect(items.find((item) => item.key === 'gift_focus')?.expiresAtMs).toBe(expiresAt);
  });
});

describe('giftCountdownLabel', () => {
  it('formats hh:mm:ss with hours beyond 24', () => {
    expect(giftCountdownLabel(0)).toBe('00:00:00');
    expect(giftCountdownLabel(3661000)).toBe('01:01:01');
    expect(giftCountdownLabel(GIFT_TTL_MS)).toBe('72:00:00');
    expect(giftCountdownLabel(-5000)).toBe('00:00:00');
  });
});
