import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadPendingLevelGiftCount,
  loadPendingLevelGiftInventory,
  markDualGiftClaimed,
  markDualGiftPartClaimed,
  markGiftClaimed,
  saveUnclaimedDualGift,
  saveUnclaimedGift,
} from '../app/level_gift_inventory';
import type { GiftDef } from '../app/level_gift_system';

jest.mock('@react-native-async-storage/async-storage');

const mockStorage: Record<string, string> = {};

const makeGift = (id: string, rarity: GiftDef['rarity'] = 'common'): GiftDef => ({
  id,
  rarity,
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
  Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) =>
    Promise.resolve(mockStorage[key] ?? null),
  );
  (AsyncStorage.setItem as jest.Mock).mockImplementation((key: string, value: string) => {
    mockStorage[key] = value;
    return Promise.resolve();
  });
});

describe('level gift inventory', () => {
  it('lists pending single gifts and counts them as one gift each', async () => {
    await saveUnclaimedGift(5, makeGift('xp_bank_150'));
    await saveUnclaimedGift(10, makeGift('shards_6', 'rare'));

    await expect(loadPendingLevelGiftCount()).resolves.toBe(2);
    await expect(loadPendingLevelGiftInventory()).resolves.toMatchObject([
      { kind: 'single', level: 10, giftCount: 1, gift: { id: 'shards_6' } },
      { kind: 'single', level: 5, giftCount: 1, gift: { id: 'xp_bank_150' } },
    ]);
  });

  it('lists dual gifts as individually claimable gifts and counts both chests', async () => {
    await saveUnclaimedGift(20, makeGift('xp_bank_300'));
    await saveUnclaimedDualGift(20, {
      f2p: makeGift('shards_10', 'rare'),
      prem: makeGift('premium_xp_bank_1000', 'epic'),
    });

    await expect(loadPendingLevelGiftCount()).resolves.toBe(2);
    await expect(loadPendingLevelGiftInventory()).resolves.toMatchObject([
      {
        kind: 'single',
        level: 20,
        giftCount: 1,
        dualPart: 'f2p',
        gift: { id: 'shards_10' },
      },
      {
        kind: 'single',
        level: 20,
        giftCount: 1,
        dualPart: 'prem',
        gift: { id: 'premium_xp_bank_1000' },
      },
    ]);
  });

  it('keeps the second gift pending when one dual gift part is claimed', async () => {
    await saveUnclaimedDualGift(20, {
      f2p: makeGift('shards_10', 'rare'),
      prem: makeGift('premium_xp_bank_1000', 'epic'),
    });

    await markDualGiftPartClaimed(20, 'f2p');

    await expect(loadPendingLevelGiftCount()).resolves.toBe(1);
    await expect(loadPendingLevelGiftInventory()).resolves.toMatchObject([
      {
        kind: 'single',
        level: 20,
        giftCount: 1,
        gift: { id: 'premium_xp_bank_1000' },
      },
    ]);
  });

  it('removes pending gifts after claim', async () => {
    await saveUnclaimedGift(5, makeGift('xp_50'));
    await saveUnclaimedDualGift(30, {
      f2p: makeGift('xp_bank_600'),
      prem: makeGift('prem_shards_20'),
    });

    await markGiftClaimed(5);
    await markDualGiftClaimed(30);

    await expect(loadPendingLevelGiftCount()).resolves.toBe(0);
    await expect(loadPendingLevelGiftInventory()).resolves.toEqual([]);
  });
});
