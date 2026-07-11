import AsyncStorage from '@react-native-async-storage/async-storage';
import { captureAccountGeneration, type AccountGenerationToken } from './account_generation';
import {
  rollF2pLevelGiftForUser,
  rollPremiumLevelGiftForUser,
  sanitizeLevelGiftForStudyTarget,
  type GiftDef,
} from './level_gift_system';
import { storageStudyTarget, type RuntimeStudyTarget } from './target_storage_keys';
import {
  CLAIMED_DUAL_LEVELS_KEY,
  CLAIMED_GIFTS_KEY,
  PARTIAL_DUAL_CLAIMED_LEVELS_KEY,
  PENDING_LEVEL_GIFT_COUNT_CACHE_KEY,
  UNCLAIMED_DUAL_GIFTS_KEY,
  UNCLAIMED_GIFTS_KEY,
} from './level_up_storage_keys';

export {
  CLAIMED_DUAL_LEVELS_KEY,
  CLAIMED_GIFTS_KEY,
  PARTIAL_DUAL_CLAIMED_LEVELS_KEY,
  PENDING_LEVEL_GIFT_COUNT_CACHE_KEY,
  UNCLAIMED_DUAL_GIFTS_KEY,
  UNCLAIMED_GIFTS_KEY,
} from './level_up_storage_keys';

export interface PremPair {
  f2p: GiftDef;
  prem: GiftDef;
}

export const LEVEL_GIFT_ENTITLEMENT_FAILED = 'failed' as const;

export type LevelGiftEntitlementResult =
  | { status: 'persisted' | 'already_pending'; level: number; kind: 'single'; gift: GiftDef }
  | { status: 'persisted' | 'already_pending'; level: number; kind: 'dual'; pair: PremPair }
  | { status: 'already_claimed'; level: number }
  | { status: typeof LEVEL_GIFT_ENTITLEMENT_FAILED; level: number };

export interface EnsureLevelGiftEntitlementOptions {
  premium?: boolean;
  studyTarget?: RuntimeStudyTarget;
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

let pendingInventoryCache: {
  target: ReturnType<typeof storageStudyTarget>;
  account: AccountGenerationToken;
  items: PendingLevelGiftInventoryItem[];
} | null = null;

const isSameAccountGeneration = (left: AccountGenerationToken, right: AccountGenerationToken): boolean =>
  left.generation === right.generation
  && left.stableId === right.stableId
  && left.phase === right.phase;

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
  const account = captureAccountGeneration();
  return pendingInventoryCache?.target === target
    && isSameAccountGeneration(pendingInventoryCache.account, account)
    ? [...pendingInventoryCache.items]
    : [];
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

export const saveRemainingGiftAfterPartialDualClaim = async (
  level: number,
  remainingGift: GiftDef,
): Promise<void> => {
  try {
    const [dualRaw, singleRaw, partialRaw] = await AsyncStorage.multiGet([
      UNCLAIMED_DUAL_GIFTS_KEY,
      UNCLAIMED_GIFTS_KEY,
      PARTIAL_DUAL_CLAIMED_LEVELS_KEY,
    ]);
    const dualMap = parseJsonRecord<PremPair>(dualRaw[1]);
    delete dualMap[level];
    const singleMap = parseJsonRecord<GiftDef>(singleRaw[1]);
    singleMap[level] = remainingGift;
    const partialLevels = parseJsonLevelArray(partialRaw[1]);
    if (!partialLevels.includes(level)) partialLevels.push(level);

    await AsyncStorage.multiSet([
      [UNCLAIMED_DUAL_GIFTS_KEY, JSON.stringify(dualMap)],
      [UNCLAIMED_GIFTS_KEY, JSON.stringify(singleMap)],
      [PARTIAL_DUAL_CLAIMED_LEVELS_KEY, JSON.stringify(partialLevels)],
    ]);
    await refreshPendingGiftCountCache();
  } catch {
    // Best effort persistence; entitlement read-back will reject conflicting state.
  }
};

export const markDualGiftPartClaimed = async (level: number, part: DualGiftPart): Promise<void> => {
  try {
    const dualRaw = await AsyncStorage.getItem(UNCLAIMED_DUAL_GIFTS_KEY);
    const map = parseJsonRecord<PremPair>(dualRaw);
    const pair = map[level];
    if (!pair) return;

    const remainingGift = part === 'f2p' ? pair.prem : pair.f2p;
    if (remainingGift) {
      await saveRemainingGiftAfterPartialDualClaim(level, remainingGift);
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

export const loadPendingLevelGiftInventory = async (
  studyTarget?: RuntimeStudyTarget,
): Promise<PendingLevelGiftInventoryItem[]> => {
  const account = captureAccountGeneration();
  const [single, dual] = await Promise.all([
    loadUnclaimedGifts(),
    loadUnclaimedDualGifts(),
  ]);
  if (!isSameAccountGeneration(account, captureAccountGeneration())) return [];
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
  pendingInventoryCache = { target, account, items };
  return items;
};

export const loadPendingLevelGiftCount = async (studyTarget?: RuntimeStudyTarget): Promise<number> => {
  const items = await loadPendingLevelGiftInventory(studyTarget);
  const count = items.reduce((sum, item) => sum + item.giftCount, 0);
  await writePendingGiftCountCache(count);
  return count;
};

const giftIdsMatch = (actual: GiftDef | undefined, expected: GiftDef): boolean =>
  actual?.id === expected.id;

const pairIdsMatch = (actual: PremPair | undefined, expected: PremPair): boolean =>
  giftIdsMatch(actual?.f2p, expected.f2p) && giftIdsMatch(actual?.prem, expected.prem);

const readBackEntitlement = async (level: number): Promise<{ single?: GiftDef; dual?: PremPair }> => {
  const [singleRaw, dualRaw] = await AsyncStorage.multiGet([
    UNCLAIMED_GIFTS_KEY,
    UNCLAIMED_DUAL_GIFTS_KEY,
  ]);
  return {
    single: parseJsonRecord<GiftDef>(singleRaw[1])[level],
    dual: parseJsonRecord<PremPair>(dualRaw[1])[level],
  };
};

export const ensureLevelGiftEntitlement = async (
  level: number,
  options: EnsureLevelGiftEntitlementOptions = {},
): Promise<LevelGiftEntitlementResult> => {
  if (!Number.isInteger(level) || level <= 0) return { status: LEVEL_GIFT_ENTITLEMENT_FAILED, level };

  try {
    const [singleRaw, dualRaw, claimedRaw, partialRaw] = await AsyncStorage.multiGet([
      UNCLAIMED_GIFTS_KEY,
      UNCLAIMED_DUAL_GIFTS_KEY,
      CLAIMED_GIFTS_KEY,
      PARTIAL_DUAL_CLAIMED_LEVELS_KEY,
    ]);
    const single = parseJsonRecord<GiftDef>(singleRaw[1]);
    const dual = parseJsonRecord<PremPair>(dualRaw[1]);
    const claimed = parseJsonRecord<string>(claimedRaw[1]);
    const partialLevels = parseJsonLevelArray(partialRaw[1]);

    if (single[level] && dual[level]) {
      return { status: LEVEL_GIFT_ENTITLEMENT_FAILED, level };
    }

    if (dual[level]) {
      return { status: 'already_pending', level, kind: 'dual', pair: dual[level] };
    }

    const existingSingle = single[level];
    if (existingSingle) {
      if (!options.premium || claimed[level] || partialLevels.includes(level)) {
        return { status: 'already_pending', level, kind: 'single', gift: existingSingle };
      }

      const pair: PremPair = {
        f2p: existingSingle,
        prem: await rollPremiumLevelGiftForUser(level, { studyTarget: options.studyTarget }),
      };
      await saveUnclaimedDualGift(level, pair);
      const persisted = await readBackEntitlement(level);
      return !persisted.single && pairIdsMatch(persisted.dual, pair)
        ? { status: 'persisted', level, kind: 'dual', pair: persisted.dual! }
        : { status: LEVEL_GIFT_ENTITLEMENT_FAILED, level };
    }

    if (claimed[level]) return { status: 'already_claimed', level };

    if (options.premium) {
      const pair: PremPair = {
        f2p: await rollF2pLevelGiftForUser(level, {
          premiumSafe: true,
          studyTarget: options.studyTarget,
        }),
        prem: await rollPremiumLevelGiftForUser(level, { studyTarget: options.studyTarget }),
      };
      await saveUnclaimedDualGift(level, pair);
      const persisted = await readBackEntitlement(level);
      return !persisted.single && pairIdsMatch(persisted.dual, pair)
        ? { status: 'persisted', level, kind: 'dual', pair: persisted.dual! }
        : { status: LEVEL_GIFT_ENTITLEMENT_FAILED, level };
    }

    const gift = await rollF2pLevelGiftForUser(level, { studyTarget: options.studyTarget });
    await saveUnclaimedGift(level, gift);
    const persisted = await readBackEntitlement(level);
    return !persisted.dual && giftIdsMatch(persisted.single, gift)
      ? { status: 'persisted', level, kind: 'single', gift: persisted.single! }
      : { status: LEVEL_GIFT_ENTITLEMENT_FAILED, level };
  } catch {
    return { status: LEVEL_GIFT_ENTITLEMENT_FAILED, level };
  }
};

const parseJsonLevelArray = (raw: string | null): number[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((level): level is number => Number.isInteger(level) && level > 0)
      : [];
  } catch {
    return [];
  }
};

/**
 * Гарантия подарка за уровень (декуплировано от показа модала).
 *
 * Раньше подарок роллился и сохранялся ТОЛЬКО когда открывался модал уровня.
 * Если модал не показывался (краш/закрытие приложения/гонка на старте), подарок
 * терялся навсегда. Теперь эту функцию вызываем ПРЯМО в момент детекции
 * level-up (xp_manager): для каждого нового уровня подарок катается один раз и
 * сразу кладётся в инвентарь. Идемпотентно: если для уровня уже есть подарок
 * (single/dual) или он уже забран — ничего не делаем и возвращаем сохранённый.
 * Возвращаемый подарок используем как preRolledGift для модала, чтобы то, что
 * показали, совпадало с тем, что лежит в разделе «Подарки».
 */
export const ensureUnclaimedGiftForLevel = async (
  level: number,
  studyTarget?: RuntimeStudyTarget,
): Promise<GiftDef | null> => {
  const result = await ensureLevelGiftEntitlement(level, { studyTarget });
  const gift = result.status === 'persisted' || result.status === 'already_pending'
    ? result.kind === 'single' ? result.gift : result.pair.f2p
    : null;
  return gift ? sanitizeLevelGiftForStudyTarget(gift, storageStudyTarget(studyTarget)) : null;
};
