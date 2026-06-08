import AsyncStorage from '@react-native-async-storage/async-storage';
import { sanitizeLevelGiftForStudyTarget, type GiftDef } from './level_gift_system';
import { storageStudyTarget, type RuntimeStudyTarget } from './target_storage_keys';

export const UNCLAIMED_GIFTS_KEY = 'unclaimed_level_gifts';
export const CLAIMED_GIFTS_KEY = 'claimed_level_gifts';
export const UNCLAIMED_DUAL_GIFTS_KEY = 'unclaimed_level_gifts_dual_v1';
export const CLAIMED_DUAL_LEVELS_KEY = 'claimed_level_gift_dual_flag_v1';
export const PENDING_LEVEL_GIFT_COUNT_CACHE_KEY = 'pending_level_gift_count_cache_v1';

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

let pendingInventoryCache: { target: ReturnType<typeof storageStudyTarget>; items: PendingLevelGiftInventoryItem[] } | null = null;

const parseJsonRecord = <T>(raw: string | null): Record<number, T> => {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    if (Array.isArray(parsed)) {
      return parsed.reduce<Record<number, T>>((acc, item) => {
        const level = Number(item?.level);
        const gift = item?.gift ?? item;
        if (Number.isFinite(level) && gift) acc[level] = gift as T;
        return acc;
      }, {});
    }
    return parsed as Record<number, T>;
  } catch {
    return {};
  }
};

const writePendingGiftCountCache = async (count: number): Promise<void> => {
  try {
    await AsyncStorage.setItem(PENDING_LEVEL_GIFT_COUNT_CACHE_KEY, String(Math.max(0, Math.floor(count))));
  } catch {
    // Header cache only; the source of truth remains the inventory maps.
  }
};

export const readPendingLevelGiftCountCache = async (): Promise<number> => {
  try {
    const raw = await AsyncStorage.getItem(PENDING_LEVEL_GIFT_COUNT_CACHE_KEY);
    return Math.max(0, Math.floor(Number(raw) || 0));
  } catch {
    return 0;
  }
};

const refreshPendingGiftCountCache = async (): Promise<number> => {
  const count = await loadPendingLevelGiftCount();
  await writePendingGiftCountCache(count);
  return count;
};

export const getPendingLevelGiftInventoryCache = (studyTarget?: RuntimeStudyTarget): PendingLevelGiftInventoryItem[] => {
  const target = storageStudyTarget(studyTarget);
  return pendingInventoryCache?.target === target ? [...pendingInventoryCache.items] : [];
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
    const [singleRaw, dualRaw] = await AsyncStorage.multiGet([UNCLAIMED_GIFTS_KEY, UNCLAIMED_DUAL_GIFTS_KEY]);
    const map = parseJsonRecord<GiftDef>(singleRaw[1]);
    map[level] = gift;
    const dualMap = parseJsonRecord<PremPair>(dualRaw[1]);
    delete dualMap[level];
    // Атомарно обновляем оба хранилища
    await AsyncStorage.multiSet([
      [UNCLAIMED_GIFTS_KEY, JSON.stringify(map)],
      [UNCLAIMED_DUAL_GIFTS_KEY, JSON.stringify(dualMap)],
    ]);
    await refreshPendingGiftCountCache();
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
    await refreshPendingGiftCountCache();
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
    const [dualRaw, singleRaw] = await AsyncStorage.multiGet([UNCLAIMED_DUAL_GIFTS_KEY, UNCLAIMED_GIFTS_KEY]);
    const dualMap = parseJsonRecord<PremPair>(dualRaw[1]);
    dualMap[level] = pair;
    const singleMap = parseJsonRecord<GiftDef>(singleRaw[1]);
    delete singleMap[level];
    // Атомарно обновляем оба хранилища, чтобы исключить рассинхрон при сбое
    await AsyncStorage.multiSet([
      [UNCLAIMED_DUAL_GIFTS_KEY, JSON.stringify(dualMap)],
      [UNCLAIMED_GIFTS_KEY, JSON.stringify(singleMap)],
    ]);
    await refreshPendingGiftCountCache();
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
    await refreshPendingGiftCountCache();
  } catch {
    // Best effort cleanup.
  }
};

export const markDualGiftPartClaimed = async (level: number, part: DualGiftPart): Promise<void> => {
  try {
    const [dualRaw, singleRaw] = await AsyncStorage.multiGet([UNCLAIMED_DUAL_GIFTS_KEY, UNCLAIMED_GIFTS_KEY]);
    const map = parseJsonRecord<PremPair>(dualRaw[1]);
    const pair = map[level];
    if (!pair) return;

    const remainingGift = part === 'f2p' ? pair.prem : pair.f2p;
    delete map[level];

    const singleMap = parseJsonRecord<GiftDef>(singleRaw[1]);
    if (remainingGift) {
      singleMap[level] = remainingGift;
    }
    // Атомарно записываем оба хранилища — исключаем потерю второго подарка при сбое
    await AsyncStorage.multiSet([
      [UNCLAIMED_DUAL_GIFTS_KEY, JSON.stringify(map)],
      [UNCLAIMED_GIFTS_KEY, JSON.stringify(singleMap)],
    ]);
    await refreshPendingGiftCountCache();
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

export const loadPendingLevelGiftInventory = async (
  studyTarget?: RuntimeStudyTarget,
): Promise<PendingLevelGiftInventoryItem[]> => {
  const [single, dual] = await Promise.all([
    loadUnclaimedGifts(),
    loadUnclaimedDualGifts(),
  ]);
  const target = storageStudyTarget(studyTarget);
  const sanitizeGift = (gift: GiftDef): GiftDef => sanitizeLevelGiftForStudyTarget(gift, target);

  const singleItems: PendingLevelGiftInventoryItem[] = Object.entries(single)
    .map(([level, gift]) => ({
      kind: 'single' as const,
      level: Number(level),
      gift: sanitizeGift(gift),
      giftCount: 1 as const,
    }));
  const dualItems: PendingLevelGiftInventoryItem[] = Object.entries(dual)
    .flatMap(([level, pair]) => {
      const f2p = pair.f2p ? sanitizeGift(pair.f2p) : null;
      const prem = pair.prem ? sanitizeGift(pair.prem) : null;
      const items: PendingLevelGiftInventoryItem[] = [];
      if (f2p) {
        items.push({
          kind: 'single' as const,
          level: Number(level),
          gift: f2p,
          giftCount: 1 as const,
          dualPart: 'f2p' as const,
        });
      }
      if (prem) {
        items.push({
          kind: 'single' as const,
          level: Number(level),
          gift: prem,
          giftCount: 1 as const,
          dualPart: 'prem' as const,
        });
      }
      return items;
    });

  const items = [...singleItems, ...dualItems]
    .filter((item) => Number.isFinite(item.level))
    .sort((a, b) => {
      if (b.level !== a.level) return b.level - a.level;
      const partOrder = (item: PendingLevelGiftInventoryItem): number =>
        item.kind === 'single' && item.dualPart === 'prem' ? 1 : 0;
      return partOrder(a) - partOrder(b);
    });
  pendingInventoryCache = { target, items };
  return items;
};

export const loadPendingLevelGiftCount = async (studyTarget?: RuntimeStudyTarget): Promise<number> => {
  const items = await loadPendingLevelGiftInventory(studyTarget);
  const count = items.reduce((sum, item) => sum + item.giftCount, 0);
  await writePendingGiftCountCache(count);
  return count;
};
