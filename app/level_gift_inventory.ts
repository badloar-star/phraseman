import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GiftDef } from './level_gift_system';

export const UNCLAIMED_GIFTS_KEY = 'unclaimed_level_gifts';
export const CLAIMED_GIFTS_KEY = 'claimed_level_gifts';
export const UNCLAIMED_DUAL_GIFTS_KEY = 'unclaimed_level_gifts_dual_v1';
export const CLAIMED_DUAL_LEVELS_KEY = 'claimed_level_gift_dual_flag_v1';

export interface PremPair {
  f2p: GiftDef;
  prem: GiftDef;
}

export type DualGiftPart = 'f2p' | 'prem';

export type PendingLevelGiftInventoryItem =
  | {
      kind: 'single';
      level: number;
      gift: GiftDef;
      giftCount: 1;
      dualPart?: DualGiftPart;
    }
  | {
      kind: 'dual';
      level: number;
      pair: PremPair;
      giftCount: 2;
    };

const parseJsonRecord = <T>(raw: string | null): Record<number, T> => {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<number, T>;
  } catch {
    return {};
  }
};

/** Save claimed gift rarity for display purposes. */
export const saveClaimedGiftRarity = async (level: number, rarity: string): Promise<void> => {
  try {
    const raw = await AsyncStorage.getItem(CLAIMED_GIFTS_KEY);
    const map = parseJsonRecord<string>(raw);
    map[level] = rarity;
    await AsyncStorage.setItem(CLAIMED_GIFTS_KEY, JSON.stringify(map));
  } catch {
    // Non-critical UI history.
  }
};

/** Load all claimed gift rarities. */
export const loadClaimedGiftRarities = async (): Promise<Record<number, string>> => {
  try {
    const raw = await AsyncStorage.getItem(CLAIMED_GIFTS_KEY);
    return parseJsonRecord<string>(raw);
  } catch {
    return {};
  }
};

/** Save a gift as pending for the given level. */
export const saveUnclaimedGift = async (level: number, gift: GiftDef): Promise<void> => {
  try {
    const raw = await AsyncStorage.getItem(UNCLAIMED_GIFTS_KEY);
    const map = parseJsonRecord<GiftDef>(raw);
    map[level] = gift;
    await AsyncStorage.setItem(UNCLAIMED_GIFTS_KEY, JSON.stringify(map));

    const dualRaw = await AsyncStorage.getItem(UNCLAIMED_DUAL_GIFTS_KEY);
    if (dualRaw) {
      const dualMap = parseJsonRecord<PremPair>(dualRaw);
      delete dualMap[level];
      await AsyncStorage.setItem(UNCLAIMED_DUAL_GIFTS_KEY, JSON.stringify(dualMap));
    }
  } catch {
    // A missed cache write should not block the level-up flow.
  }
};

/** Mark a single gift as claimed. */
export const markGiftClaimed = async (level: number): Promise<void> => {
  try {
    const raw = await AsyncStorage.getItem(UNCLAIMED_GIFTS_KEY);
    if (!raw) return;
    const map = parseJsonRecord<GiftDef>(raw);
    delete map[level];
    await AsyncStorage.setItem(UNCLAIMED_GIFTS_KEY, JSON.stringify(map));
  } catch {
    // Best effort cleanup.
  }
};

/** Load all pending single gifts. */
export const loadUnclaimedGifts = async (): Promise<Record<number, GiftDef>> => {
  try {
    const raw = await AsyncStorage.getItem(UNCLAIMED_GIFTS_KEY);
    return parseJsonRecord<GiftDef>(raw);
  } catch {
    return {};
  }
};

export const saveUnclaimedDualGift = async (level: number, pair: PremPair): Promise<void> => {
  try {
    const raw = await AsyncStorage.getItem(UNCLAIMED_DUAL_GIFTS_KEY);
    const map = parseJsonRecord<PremPair>(raw);
    map[level] = pair;
    await AsyncStorage.setItem(UNCLAIMED_DUAL_GIFTS_KEY, JSON.stringify(map));

    const singleRaw = await AsyncStorage.getItem(UNCLAIMED_GIFTS_KEY);
    if (singleRaw) {
      const singleMap = parseJsonRecord<GiftDef>(singleRaw);
      delete singleMap[level];
      await AsyncStorage.setItem(UNCLAIMED_GIFTS_KEY, JSON.stringify(singleMap));
    }
  } catch {
    // Best effort cache write.
  }
};

export const loadUnclaimedDualGifts = async (): Promise<Record<number, PremPair>> => {
  try {
    const raw = await AsyncStorage.getItem(UNCLAIMED_DUAL_GIFTS_KEY);
    return parseJsonRecord<PremPair>(raw);
  } catch {
    return {};
  }
};

export const markDualGiftClaimed = async (level: number): Promise<void> => {
  try {
    const raw = await AsyncStorage.getItem(UNCLAIMED_DUAL_GIFTS_KEY);
    if (!raw) return;
    const map = parseJsonRecord<PremPair>(raw);
    delete map[level];
    await AsyncStorage.setItem(UNCLAIMED_DUAL_GIFTS_KEY, JSON.stringify(map));
  } catch {
    // Best effort cleanup.
  }
};

export const markDualGiftPartClaimed = async (level: number, part: DualGiftPart): Promise<void> => {
  try {
    const raw = await AsyncStorage.getItem(UNCLAIMED_DUAL_GIFTS_KEY);
    if (!raw) return;
    const map = parseJsonRecord<PremPair>(raw);
    const pair = map[level];
    if (!pair) return;

    const remainingGift = part === 'f2p' ? pair.prem : pair.f2p;
    delete map[level];
    await AsyncStorage.setItem(UNCLAIMED_DUAL_GIFTS_KEY, JSON.stringify(map));

    if (remainingGift) {
      const singleRaw = await AsyncStorage.getItem(UNCLAIMED_GIFTS_KEY);
      const singleMap = parseJsonRecord<GiftDef>(singleRaw);
      singleMap[level] = remainingGift;
      await AsyncStorage.setItem(UNCLAIMED_GIFTS_KEY, JSON.stringify(singleMap));
    }
  } catch {
    // Best effort cleanup.
  }
};

export const setLevelHadDualClaim = async (level: number): Promise<void> => {
  try {
    const raw = await AsyncStorage.getItem(CLAIMED_DUAL_LEVELS_KEY);
    const set: number[] = raw ? JSON.parse(raw) : [];
    if (!set.includes(level)) {
      set.push(level);
      await AsyncStorage.setItem(CLAIMED_DUAL_LEVELS_KEY, JSON.stringify(set));
    }
  } catch {
    // Cosmetic progress state only.
  }
};

export const loadDualClaimedLevels = async (): Promise<Set<number>> => {
  try {
    const raw = await AsyncStorage.getItem(CLAIMED_DUAL_LEVELS_KEY);
    const levels: number[] = raw ? JSON.parse(raw) : [];
    return new Set(levels);
  } catch {
    return new Set();
  }
};

export const loadPendingLevelGiftInventory = async (): Promise<PendingLevelGiftInventoryItem[]> => {
  const [single, dual] = await Promise.all([
    loadUnclaimedGifts(),
    loadUnclaimedDualGifts(),
  ]);

  const singleItems: PendingLevelGiftInventoryItem[] = Object.entries(single)
    .map(([level, gift]) => ({
      kind: 'single' as const,
      level: Number(level),
      gift,
      giftCount: 1 as const,
    }));
  const dualItems: PendingLevelGiftInventoryItem[] = Object.entries(dual)
    .flatMap(([level, pair]) => ([
      {
        kind: 'single' as const,
        level: Number(level),
        gift: pair.f2p,
        giftCount: 1 as const,
        dualPart: 'f2p' as const,
      },
      {
        kind: 'single' as const,
        level: Number(level),
        gift: pair.prem,
        giftCount: 1 as const,
        dualPart: 'prem' as const,
      },
    ]));

  return [...singleItems, ...dualItems]
    .filter((item) => Number.isFinite(item.level))
    .sort((a, b) => {
      if (b.level !== a.level) return b.level - a.level;
      const partOrder = (item: PendingLevelGiftInventoryItem): number =>
        item.kind === 'single' && item.dualPart === 'prem' ? 1 : 0;
      return partOrder(a) - partOrder(b);
    });
};

export const loadPendingLevelGiftCount = async (): Promise<number> => {
  const items = await loadPendingLevelGiftInventory();
  return items.reduce((sum, item) => sum + item.giftCount, 0);
};
