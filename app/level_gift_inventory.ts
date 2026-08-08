import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
} from './account_generation';
import {
  rollF2pLevelGiftForUser,
  rollPremiumLevelGiftForUser,
  isKnownLevelGiftId,
  ALL_LEVEL_GIFT_DEFS,
  sanitizeLevelGiftForPremium,
  sanitizeLevelGiftForStudyTarget,
  type GiftDef,
  type GiftRarity,
} from './level_gift_system';
import { storageStudyTarget, type RuntimeStudyTarget } from './target_storage_keys';
import { GIFT_TTL_MS } from './gift_expiry';
import {
  CLAIMED_DUAL_LEVELS_KEY,
  CLAIMED_GIFTS_KEY,
  PARTIAL_DUAL_CLAIMED_LEVELS_KEY,
  PENDING_LEVEL_GIFT_COUNT_CACHE_KEY,
  LEVEL_SPIN_GIFT_JOURNAL_KEY,
  UNCLAIMED_DUAL_GIFTS_KEY,
  UNCLAIMED_GIFTS_KEY,
  UNCLAIMED_GIFT_RECEIVED_AT_KEY,
} from './level_up_storage_keys';
import { getVerifiedPremiumStatus } from './premium_guard';

export {
  CLAIMED_DUAL_LEVELS_KEY,
  CLAIMED_GIFTS_KEY,
  PARTIAL_DUAL_CLAIMED_LEVELS_KEY,
  PENDING_LEVEL_GIFT_COUNT_CACHE_KEY,
  UNCLAIMED_DUAL_GIFTS_KEY,
  UNCLAIMED_GIFTS_KEY,
  UNCLAIMED_GIFT_RECEIVED_AT_KEY,
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
  accountToken?: AccountGenerationToken;
}

export type DualGiftPart = 'f2p' | 'prem';

export type PendingLevelGiftInventoryItem =
  | {
      kind: 'single';
      level: number;
      gift: GiftDef;
      giftCount: 1;
      dualPart?: DualGiftPart;
      spinOccurrence?: {
        requestId: string;
        lane: 'base' | 'premium';
        occurrenceId: string;
      };
      /** Мс получения подарка (уровень взят). */
      receivedAtMs: number;
      /** Мс сгорания: receivedAtMs + 72ч; после — подарок исчезает из раздела. */
      expiresAtMs: number;
    }
  | {
      kind: 'dual';
      level: number;
      pair: PremPair;
      giftCount: 2;
      receivedAtMs: number;
      expiresAtMs: number;
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

const isAccountTokenCurrent = (accountToken?: AccountGenerationToken): boolean =>
  !accountToken || isCurrentAccountGeneration(accountToken);

// зачем (2026-08-02, владелец): у каждого полученного подарка — индивидуальный
// таймер 72ч с момента получения; просроченный сгорает и исчезает из раздела.
const parseReceivedAtMap = (raw: string | null): Record<number, number> => {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const map: Record<number, number> = {};
    for (const [level, ts] of Object.entries(parsed as Record<string, unknown>)) {
      const lv = Number(level);
      const ms = Number(ts);
      if (Number.isFinite(lv) && Number.isFinite(ms) && ms > 0) map[lv] = ms;
    }
    return map;
  } catch {
    return {};
  }
};

/** Штампует момент получения подарка уровня (не перезаписывает существующий). */
const stampGiftReceivedAt = async (
  level: number,
  accountToken?: AccountGenerationToken,
): Promise<void> => {
  try {
    const raw = await AsyncStorage.getItem(UNCLAIMED_GIFT_RECEIVED_AT_KEY);
    if (!isAccountTokenCurrent(accountToken)) return;
    const map = parseReceivedAtMap(raw);
    if (map[level]) return;
    map[level] = Date.now();
    await AsyncStorage.setItem(UNCLAIMED_GIFT_RECEIVED_AT_KEY, JSON.stringify(map));
  } catch {
    // Таймер — best effort; выдачу подарка не блокируем (гранфазер догонит).
  }
};

const clearGiftReceivedAt = async (
  level: number,
  accountToken?: AccountGenerationToken,
): Promise<void> => {
  try {
    const raw = await AsyncStorage.getItem(UNCLAIMED_GIFT_RECEIVED_AT_KEY);
    if (!raw || !isAccountTokenCurrent(accountToken)) return;
    const map = parseReceivedAtMap(raw);
    if (map[level] == null) return;
    delete map[level];
    await AsyncStorage.setItem(UNCLAIMED_GIFT_RECEIVED_AT_KEY, JSON.stringify(map));
  } catch {
    // Осиротевший штамп вычистит загрузка инвентаря.
  }
};

/**
 * Пересинхронизировать пуш «подарок сгорит через 6 часов» под ближайший срок.
 * зачем (2026-08-02, владелец): пуш про потерю своего добра — двигатель
 * возвратов. Вызывается при каждой смене состава (получение/клейм/сгорание);
 * lazy-import, чтобы тяжёлый notifications.ts не грузился на холодном старте.
 */
export const resyncGiftExpiryPush = async (): Promise<void> => {
  try {
    const [singleRaw, dualRaw, receivedRaw] = await AsyncStorage.multiGet([
      UNCLAIMED_GIFTS_KEY,
      UNCLAIMED_DUAL_GIFTS_KEY,
      UNCLAIMED_GIFT_RECEIVED_AT_KEY,
    ]);
    const single = parseJsonRecord<GiftDef>(singleRaw[1]);
    const dual = parseJsonRecord<PremPair>(dualRaw[1]);
    const stamps = parseReceivedAtMap(receivedRaw[1]);
    const pendingLevels = [...new Set(
      [...Object.keys(single), ...Object.keys(dual)].map(Number).filter(Number.isFinite),
    )];
    const expiries = pendingLevels
      .map((level) => stamps[level])
      .filter((ms): ms is number => Number.isFinite(ms) && ms > 0)
      .map((ms) => ms + GIFT_TTL_MS);
    const earliest = expiries.length > 0 ? Math.min(...expiries) : null;
    const { syncGiftExpiringNotification } = await import('./notifications');
    await syncGiftExpiringNotification(earliest);
  } catch {
    // Пуш — best effort; инвентарь важнее.
  }
};

const resyncGiftExpiryPushBestEffort = (): void => {
  void resyncGiftExpiryPush();
};

const withInventoryMutationGuard = async (
  accountToken: AccountGenerationToken | undefined,
  mutation: () => Promise<void>,
): Promise<void> => {
  if (!isAccountTokenCurrent(accountToken)) return;
  await mutation();
};

const writePendingGiftCountCache = async (
  count: number,
  accountToken?: AccountGenerationToken,
): Promise<void> => {
  try {
    if (!isAccountTokenCurrent(accountToken)) return;
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

const refreshPendingGiftCountCache = async (accountToken?: AccountGenerationToken): Promise<number> => {
  const count = await loadPendingLevelGiftCount(undefined, accountToken);
  await writePendingGiftCountCache(count, accountToken);
  return count;
};

export const getPendingLevelGiftInventoryCache = (studyTarget?: RuntimeStudyTarget): PendingLevelGiftInventoryItem[] => {
  const target = storageStudyTarget(studyTarget);
  const account = captureAccountGeneration();
  return pendingInventoryCache?.target === target
    && isSameAccountGeneration(pendingInventoryCache.account, account)
    // Сгоревший подарок не должен мигать даже один кадр из тёплого кэша.
    ? pendingInventoryCache.items.filter((item) => item.expiresAtMs > Date.now())
    : [];
};

/** Save claimed gift rarity for display purposes. */
export const saveClaimedGiftRarity = async (
  level: number,
  rarity: string,
  accountToken?: AccountGenerationToken,
): Promise<void> => {
  try {
    await withInventoryMutationGuard(accountToken, async () => {
      const raw = await AsyncStorage.getItem(CLAIMED_GIFTS_KEY);
      if (!isAccountTokenCurrent(accountToken)) return;
      const map = parseJsonRecord<string>(raw);
      map[level] = rarity;
      await AsyncStorage.setItem(CLAIMED_GIFTS_KEY, JSON.stringify(map));
    });
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
export const saveUnclaimedGift = async (
  level: number,
  gift: GiftDef,
  accountToken?: AccountGenerationToken,
): Promise<void> => {
  try {
    await withInventoryMutationGuard(accountToken, async () => {
      const [singleRaw, dualRaw] = await AsyncStorage.multiGet([UNCLAIMED_GIFTS_KEY, UNCLAIMED_DUAL_GIFTS_KEY]);
      if (!isAccountTokenCurrent(accountToken)) return;
      const map = parseJsonRecord<GiftDef>(singleRaw[1]);
      map[level] = gift;
      const dualMap = parseJsonRecord<PremPair>(dualRaw[1]);
      delete dualMap[level];
      await AsyncStorage.multiSet([
        [UNCLAIMED_GIFTS_KEY, JSON.stringify(map)],
        [UNCLAIMED_DUAL_GIFTS_KEY, JSON.stringify(dualMap)],
      ]);
      await stampGiftReceivedAt(level, accountToken);
      await refreshPendingGiftCountCache(accountToken);
      resyncGiftExpiryPushBestEffort();
    });
  } catch {
    // A missed cache write should not block the level-up flow.
  }
};

/** Mark a single gift as claimed. */
export const markGiftClaimed = async (
  level: number,
  accountToken?: AccountGenerationToken,
): Promise<void> => {
  try {
    await withInventoryMutationGuard(accountToken, async () => {
      const raw = await AsyncStorage.getItem(UNCLAIMED_GIFTS_KEY);
      if (!raw || !isAccountTokenCurrent(accountToken)) return;
      const map = parseJsonRecord<GiftDef>(raw);
      delete map[level];
      await AsyncStorage.setItem(UNCLAIMED_GIFTS_KEY, JSON.stringify(map));
      await clearGiftReceivedAt(level, accountToken);
      await refreshPendingGiftCountCache(accountToken);
      resyncGiftExpiryPushBestEffort();
    });
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

export const saveUnclaimedDualGift = async (
  level: number,
  pair: PremPair,
  accountToken?: AccountGenerationToken,
): Promise<void> => {
  try {
    await withInventoryMutationGuard(accountToken, async () => {
      const [dualRaw, singleRaw] = await AsyncStorage.multiGet([UNCLAIMED_DUAL_GIFTS_KEY, UNCLAIMED_GIFTS_KEY]);
      if (!isAccountTokenCurrent(accountToken)) return;
      const dualMap = parseJsonRecord<PremPair>(dualRaw[1]);
      dualMap[level] = pair;
      const singleMap = parseJsonRecord<GiftDef>(singleRaw[1]);
      delete singleMap[level];
      await AsyncStorage.multiSet([
        [UNCLAIMED_DUAL_GIFTS_KEY, JSON.stringify(dualMap)],
        [UNCLAIMED_GIFTS_KEY, JSON.stringify(singleMap)],
      ]);
      await stampGiftReceivedAt(level, accountToken);
      await refreshPendingGiftCountCache(accountToken);
      resyncGiftExpiryPushBestEffort();
    });
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

export const markDualGiftClaimed = async (
  level: number,
  accountToken?: AccountGenerationToken,
): Promise<void> => {
  try {
    await withInventoryMutationGuard(accountToken, async () => {
      const raw = await AsyncStorage.getItem(UNCLAIMED_DUAL_GIFTS_KEY);
      if (!raw || !isAccountTokenCurrent(accountToken)) return;
      const map = parseJsonRecord<PremPair>(raw);
      delete map[level];
      await AsyncStorage.setItem(UNCLAIMED_DUAL_GIFTS_KEY, JSON.stringify(map));
      await clearGiftReceivedAt(level, accountToken);
      await refreshPendingGiftCountCache(accountToken);
      resyncGiftExpiryPushBestEffort();
    });
  } catch {
    // Best effort cleanup.
  }
};

const saveRemainingGiftAfterPartialDualClaimUnsafe = async (
  level: number,
  remainingGift: GiftDef,
  accountToken?: AccountGenerationToken,
): Promise<void> => {
  const [dualRaw, singleRaw, partialRaw] = await AsyncStorage.multiGet([
    UNCLAIMED_DUAL_GIFTS_KEY,
    UNCLAIMED_GIFTS_KEY,
    PARTIAL_DUAL_CLAIMED_LEVELS_KEY,
  ]);
  if (!isAccountTokenCurrent(accountToken)) return;
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
  await refreshPendingGiftCountCache(accountToken);
};

export const saveRemainingGiftAfterPartialDualClaim = async (
  level: number,
  remainingGift: GiftDef,
  accountToken?: AccountGenerationToken,
): Promise<void> => {
  try {
    await withInventoryMutationGuard(accountToken, () =>
      saveRemainingGiftAfterPartialDualClaimUnsafe(level, remainingGift, accountToken));
  } catch {
    // Best effort persistence; entitlement read-back will reject conflicting state.
  }
};

export const markDualGiftPartClaimed = async (
  level: number,
  part: DualGiftPart,
  accountToken?: AccountGenerationToken,
): Promise<void> => {
  try {
    await withInventoryMutationGuard(accountToken, async () => {
      const dualRaw = await AsyncStorage.getItem(UNCLAIMED_DUAL_GIFTS_KEY);
      if (!isAccountTokenCurrent(accountToken)) return;
      const map = parseJsonRecord<PremPair>(dualRaw);
      const pair = map[level];
      if (!pair) return;

      const remainingGift = part === 'f2p' ? pair.prem : pair.f2p;
      if (remainingGift) {
        await saveRemainingGiftAfterPartialDualClaimUnsafe(level, remainingGift, accountToken);
      }
    });
  } catch {
    // Best effort cleanup.
  }
};

export const restoreDualGiftPartAfterFailedClaim = async (
  level: number,
  failedPart: DualGiftPart,
  failedGift: GiftDef,
  accountToken?: AccountGenerationToken,
): Promise<void> => {
  try {
    await withInventoryMutationGuard(accountToken, async () => {
      const [dualRaw, singleRaw, partialRaw, claimedRaw] = await AsyncStorage.multiGet([
        UNCLAIMED_DUAL_GIFTS_KEY,
        UNCLAIMED_GIFTS_KEY,
        PARTIAL_DUAL_CLAIMED_LEVELS_KEY,
        CLAIMED_GIFTS_KEY,
      ]);
      if (!isAccountTokenCurrent(accountToken)) return;
      const dualMap = parseJsonRecord<PremPair>(dualRaw[1]);
      const singleMap = parseJsonRecord<GiftDef>(singleRaw[1]);
      const remainingGift = singleMap[level];
      if (!remainingGift) {
        singleMap[level] = failedGift;
      } else {
        dualMap[level] = failedPart === 'f2p'
          ? { f2p: failedGift, prem: remainingGift }
          : { f2p: remainingGift, prem: failedGift };
        delete singleMap[level];
      }
      const partialLevels = parseJsonLevelArray(partialRaw[1]).filter(item => item !== level);
      const claimedMap = parseJsonRecord<GiftRarity>(claimedRaw[1]);
      delete claimedMap[level];
      await AsyncStorage.multiSet([
        [UNCLAIMED_DUAL_GIFTS_KEY, JSON.stringify(dualMap)],
        [UNCLAIMED_GIFTS_KEY, JSON.stringify(singleMap)],
        [PARTIAL_DUAL_CLAIMED_LEVELS_KEY, JSON.stringify(partialLevels)],
        [CLAIMED_GIFTS_KEY, JSON.stringify(claimedMap)],
      ]);
      await refreshPendingGiftCountCache(accountToken);
      resyncGiftExpiryPushBestEffort();
    });
  } catch {
    // The failed reward remains recoverable by the entitlement reconciler.
  }
};

export const setLevelHadDualClaim = async (
  level: number,
  accountToken?: AccountGenerationToken,
): Promise<void> => {
  try {
    await withInventoryMutationGuard(accountToken, async () => {
      const raw = await AsyncStorage.getItem(CLAIMED_DUAL_LEVELS_KEY);
      if (!isAccountTokenCurrent(accountToken)) return;
      const set: number[] = raw ? JSON.parse(raw) : [];
      if (!set.includes(level)) {
        set.push(level);
        await AsyncStorage.setItem(CLAIMED_DUAL_LEVELS_KEY, JSON.stringify(set));
      }
    });
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
  const [single, dual, receivedAtRaw, isPremium, spinJournalRaw] = await Promise.all([
    loadUnclaimedGifts(),
    loadUnclaimedDualGifts(),
    AsyncStorage.getItem(UNCLAIMED_GIFT_RECEIVED_AT_KEY).catch(() => null),
    getVerifiedPremiumStatus().catch(() => false),
    AsyncStorage.getItem(LEVEL_SPIN_GIFT_JOURNAL_KEY).catch(() => null),
  ]);
  if (!isSameAccountGeneration(account, captureAccountGeneration())) return [];
  const target = storageStudyTarget(studyTarget);
  const sanitizeGift = (gift: GiftDef): GiftDef => {
    const targetSafe = sanitizeLevelGiftForStudyTarget(gift, target);
    return isPremium ? sanitizeLevelGiftForPremium(targetSafe) : targetSafe;
  };
  let eligibilityChanged = false;
  if (isPremium) {
    Object.entries(single).forEach(([level, gift]) => {
      const safe = sanitizeGift(gift);
      if (safe.id !== gift.id) {
        single[Number(level)] = safe;
        eligibilityChanged = true;
      }
    });
    Object.entries(dual).forEach(([level, pair]) => {
      const f2p = sanitizeGift(pair.f2p);
      const prem = sanitizeGift(pair.prem);
      if (f2p.id !== pair.f2p.id || prem.id !== pair.prem.id) {
        dual[Number(level)] = { f2p, prem };
        eligibilityChanged = true;
      }
    });
  }

  // зачем (2026-08-02, владелец): подарки живут 72ч с получения. Просроченные
  // сгорают прямо здесь (единственная точка чтения инвентаря), штампы без
  // подарка вычищаются, а подаркам без штампа (выданы до таймеров) отсчёт
  // стартует сейчас — никто не теряет подарок в момент обновления приложения.
  const nowMs = Date.now();
  const receivedAt = parseReceivedAtMap(receivedAtRaw);
  const pendingLevels = [...new Set(
    [...Object.keys(single), ...Object.keys(dual)].map(Number).filter(Number.isFinite),
  )];
  let receivedAtChanged = false;
  const expiredLevels: number[] = [];
  for (const level of pendingLevels) {
    if (!receivedAt[level]) {
      receivedAt[level] = nowMs;
      receivedAtChanged = true;
    }
    if (nowMs >= receivedAt[level] + GIFT_TTL_MS) expiredLevels.push(level);
  }
  for (const stampedLevel of Object.keys(receivedAt).map(Number)) {
    if (!pendingLevels.includes(stampedLevel)) {
      delete receivedAt[stampedLevel];
      receivedAtChanged = true;
    }
  }
  for (const level of expiredLevels) {
    delete single[level];
    delete dual[level];
    delete receivedAt[level];
    receivedAtChanged = true;
  }
  if (isSameAccountGeneration(account, captureAccountGeneration())) {
    try {
      if (expiredLevels.length > 0 || eligibilityChanged) {
        await AsyncStorage.multiSet([
          [UNCLAIMED_GIFTS_KEY, JSON.stringify(single)],
          [UNCLAIMED_DUAL_GIFTS_KEY, JSON.stringify(dual)],
          [UNCLAIMED_GIFT_RECEIVED_AT_KEY, JSON.stringify(receivedAt)],
        ]);
      } else if (receivedAtChanged) {
        await AsyncStorage.setItem(UNCLAIMED_GIFT_RECEIVED_AT_KEY, JSON.stringify(receivedAt));
      }
    } catch {
      // Сгоревшее вычистим при следующем чтении.
    }
  }

  const giftLifetime = (level: number): { receivedAtMs: number; expiresAtMs: number } => {
    const receivedAtMs = receivedAt[level] ?? nowMs;
    return { receivedAtMs, expiresAtMs: receivedAtMs + GIFT_TTL_MS };
  };

  const singleItems: PendingLevelGiftInventoryItem[] = Object.entries(single)
    .filter(([, gift]) => isKnownLevelGiftId(gift.id))
    .map(([level, gift]) => ({
      kind: 'single' as const,
      level: Number(level),
      gift: sanitizeGift(gift),
      giftCount: 1 as const,
      ...giftLifetime(Number(level)),
    }));
  const dualItems: PendingLevelGiftInventoryItem[] = Object.entries(dual)
    .flatMap(([level, pair]) => {
      if (!pair.f2p || !pair.prem
        || !isKnownLevelGiftId(pair.f2p.id)
        || !isKnownLevelGiftId(pair.prem.id)) return [];
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
          ...giftLifetime(Number(level)),
        });
      }
      if (prem) {
        items.push({
          kind: 'single' as const,
          level: Number(level),
          gift: prem,
          giftCount: 1 as const,
          dualPart: 'prem' as const,
          ...giftLifetime(Number(level)),
        });
      }
      return items;
    });

  const spinItems: PendingLevelGiftInventoryItem[] = (() => {
    try {
      const parsed = spinJournalRaw ? JSON.parse(spinJournalRaw) as unknown : [];
      if (!Array.isArray(parsed)) return [];
      const owner = account.stableId;
      return parsed.flatMap((rawEntry): PendingLevelGiftInventoryItem[] => {
        const entry = rawEntry as {
          owner?: unknown;
          requestId?: unknown;
          level?: unknown;
          receivedAtMs?: unknown;
          expiresAtMs?: unknown;
          occurrences?: unknown;
        };
        const requestId = String(entry.requestId ?? '');
        const level = Number(entry.level);
        const receivedAtMs = Number(entry.receivedAtMs);
        const expiresAtMs = Number(entry.expiresAtMs);
        if (!owner || entry.owner !== owner || !/^[A-Za-z0-9_-]{16,96}$/.test(requestId)
          || !Number.isInteger(level) || level < 1
          || !Number.isFinite(receivedAtMs) || !Number.isFinite(expiresAtMs)
          || expiresAtMs <= nowMs || !Array.isArray(entry.occurrences)) return [];
        return entry.occurrences.flatMap((rawOccurrence): PendingLevelGiftInventoryItem[] => {
          const occurrence = rawOccurrence as {
            occurrenceId?: unknown;
            lane?: unknown;
            giftId?: unknown;
            claimed?: unknown;
          };
          const lane = occurrence.lane === 'premium' ? 'premium' : occurrence.lane === 'base' ? 'base' : null;
          const giftId = String(occurrence.giftId ?? '');
          if (!lane || occurrence.claimed === true || !isKnownLevelGiftId(giftId)) return [];
          const definition = ALL_LEVEL_GIFT_DEFS.find((gift) => gift.id === giftId);
          if (!definition) return [];
          const authority = { requestId, lane, giftId } as const;
          const gift: GiftDef = {
            ...definition,
            spinRewardReceipt: authority,
            choices: definition.choices?.map((choice) => ({
              ...choice,
              spinRewardReceipt: { requestId, lane, giftId: choice.id },
            })),
          };
          return [{
            kind: 'single',
            level,
            gift,
            giftCount: 1,
            receivedAtMs,
            expiresAtMs,
            spinOccurrence: {
              requestId,
              lane,
              occurrenceId: String(occurrence.occurrenceId ?? `level-spin:${requestId}:${lane}`),
            },
          }];
        });
      });
    } catch {
      return [];
    }
  })();

  const items = [...singleItems, ...dualItems, ...spinItems]
    .filter((item) => Number.isFinite(item.level))
    .sort((a, b) => {
      if (b.level !== a.level) return b.level - a.level;
      const partOrder = (item: PendingLevelGiftInventoryItem): number =>
        item.kind === 'single' && item.dualPart === 'prem' ? 1 : 0;
      return partOrder(a) - partOrder(b);
    });
  pendingInventoryCache = { target, account, items };
  if (expiredLevels.length > 0) {
    // Бейдж «подарков: N» не должен считать сгоревшие.
    await writePendingGiftCountCache(items.reduce((sum, item) => sum + item.giftCount, 0));
  }
  if (expiredLevels.length > 0 || receivedAtChanged) {
    // Состав/сроки поменялись — пуш «сгорит через 6 часов» целится в новый ближайший.
    resyncGiftExpiryPushBestEffort();
  }
  return items;
};

export const markLevelSpinGiftOccurrenceClaimed = async (
  requestId: string,
  lane: 'base' | 'premium',
  accountToken?: AccountGenerationToken,
): Promise<void> => {
  const token = accountToken ?? captureAccountGeneration();
  await withAccountTransitionLock(async () => {
    if (!isCurrentAccountGeneration(token)) return;
    const raw = await AsyncStorage.getItem(LEVEL_SPIN_GIFT_JOURNAL_KEY);
    if (!isCurrentAccountGeneration(token)) return;
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return;
    const next = parsed.map((rawEntry) => {
      const entry = rawEntry as { owner?: unknown; requestId?: unknown; occurrences?: unknown };
      if (entry.owner !== token.stableId || entry.requestId !== requestId || !Array.isArray(entry.occurrences)) {
        return rawEntry;
      }
      return {
        ...entry,
        occurrences: entry.occurrences.map((rawOccurrence) => {
          const occurrence = rawOccurrence as { lane?: unknown };
          return occurrence.lane === lane ? { ...occurrence, claimed: true } : rawOccurrence;
        }),
      };
    });
    if (!isCurrentAccountGeneration(token)) return;
    await AsyncStorage.setItem(LEVEL_SPIN_GIFT_JOURNAL_KEY, JSON.stringify(next));
  });
};

export const loadPendingLevelGiftCount = async (
  studyTarget?: RuntimeStudyTarget,
  accountToken?: AccountGenerationToken,
): Promise<number> => {
  const items = await loadPendingLevelGiftInventory(studyTarget);
  const count = items.reduce((sum, item) => sum + item.giftCount, 0);
  await writePendingGiftCountCache(count, accountToken);
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
  if (!isAccountTokenCurrent(options.accountToken)) return { status: LEVEL_GIFT_ENTITLEMENT_FAILED, level };

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
    if (!isAccountTokenCurrent(options.accountToken)) return { status: LEVEL_GIFT_ENTITLEMENT_FAILED, level };

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
      if (!isAccountTokenCurrent(options.accountToken)) return { status: LEVEL_GIFT_ENTITLEMENT_FAILED, level };
      await saveUnclaimedDualGift(level, pair, options.accountToken);
      if (!isAccountTokenCurrent(options.accountToken)) return { status: LEVEL_GIFT_ENTITLEMENT_FAILED, level };
      const persisted = await readBackEntitlement(level);
      if (!isAccountTokenCurrent(options.accountToken)) return { status: LEVEL_GIFT_ENTITLEMENT_FAILED, level };
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
      if (!isAccountTokenCurrent(options.accountToken)) return { status: LEVEL_GIFT_ENTITLEMENT_FAILED, level };
      await saveUnclaimedDualGift(level, pair, options.accountToken);
      if (!isAccountTokenCurrent(options.accountToken)) return { status: LEVEL_GIFT_ENTITLEMENT_FAILED, level };
      const persisted = await readBackEntitlement(level);
      if (!isAccountTokenCurrent(options.accountToken)) return { status: LEVEL_GIFT_ENTITLEMENT_FAILED, level };
      return !persisted.single && pairIdsMatch(persisted.dual, pair)
        ? { status: 'persisted', level, kind: 'dual', pair: persisted.dual! }
        : { status: LEVEL_GIFT_ENTITLEMENT_FAILED, level };
    }

    const gift = await rollF2pLevelGiftForUser(level, { studyTarget: options.studyTarget });
    if (!isAccountTokenCurrent(options.accountToken)) return { status: LEVEL_GIFT_ENTITLEMENT_FAILED, level };
    await saveUnclaimedGift(level, gift, options.accountToken);
    if (!isAccountTokenCurrent(options.accountToken)) return { status: LEVEL_GIFT_ENTITLEMENT_FAILED, level };
    const persisted = await readBackEntitlement(level);
    if (!isAccountTokenCurrent(options.accountToken)) return { status: LEVEL_GIFT_ENTITLEMENT_FAILED, level };
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
