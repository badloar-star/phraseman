// Персист боевого пропуска Арены поверх AsyncStorage, привязанный к сезону.
//
// Хранит: суммарные BP-очки сезона и множества забранных уровней (free/premium).
// При смене сезона данные не «протухают» автоматически — читаем по ключу сезона,
// поэтому новый сезон стартует с нуля естественным образом.
//
// Награды выдаются через addShardsRaw (осколки) — без новой серверной экономики.
// Косметика (ауры/рамки/звания) пока фиксируется локально как «разблокирована».

import AsyncStorage from '@react-native-async-storage/async-storage';
import { seasonIdForDate } from './arena_season_math';

const BP_POINTS_PREFIX = 'arena_bp_points_v1:';
const BP_CLAIMED_FREE_PREFIX = 'arena_bp_claimed_free_v1:';
const BP_CLAIMED_PREMIUM_PREFIX = 'arena_bp_claimed_premium_v1:';
const BP_COSMETICS_PREFIX = 'arena_bp_cosmetics_v1:';

export function currentSeasonId(now: Date = new Date()): string {
  return seasonIdForDate(now);
}

function pointsKey(seasonId: string): string {
  return `${BP_POINTS_PREFIX}${seasonId}`;
}
function claimedFreeKey(seasonId: string): string {
  return `${BP_CLAIMED_FREE_PREFIX}${seasonId}`;
}
function claimedPremiumKey(seasonId: string): string {
  return `${BP_CLAIMED_PREMIUM_PREFIX}${seasonId}`;
}
function cosmeticsKey(seasonId: string): string {
  return `${BP_COSMETICS_PREFIX}${seasonId}`;
}

function parseIntSafe(raw: string | null): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 0;
}

function parseLevelSet(raw: string | null): Set<number> {
  if (!raw) return new Set();
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is number => Number.isFinite(x)).map((x) => Math.trunc(x)));
  } catch {
    return new Set();
  }
}

export async function getBattlePassPoints(seasonId: string = currentSeasonId()): Promise<number> {
  try {
    return parseIntSafe(await AsyncStorage.getItem(pointsKey(seasonId)));
  } catch {
    return 0;
  }
}

/** Прибавить очки пропуска за матч. Возвращает новое суммарное значение. */
export async function addBattlePassPoints(
  delta: number,
  seasonId: string = currentSeasonId(),
): Promise<number> {
  const safe = Number.isFinite(delta) && delta > 0 ? Math.trunc(delta) : 0;
  if (safe === 0) return getBattlePassPoints(seasonId);
  try {
    const current = await getBattlePassPoints(seasonId);
    const next = current + safe;
    await AsyncStorage.setItem(pointsKey(seasonId), String(next));
    return next;
  } catch {
    return getBattlePassPoints(seasonId);
  }
}

export async function getClaimedFreeLevels(seasonId: string = currentSeasonId()): Promise<Set<number>> {
  try {
    return parseLevelSet(await AsyncStorage.getItem(claimedFreeKey(seasonId)));
  } catch {
    return new Set();
  }
}

export async function getClaimedPremiumLevels(seasonId: string = currentSeasonId()): Promise<Set<number>> {
  try {
    return parseLevelSet(await AsyncStorage.getItem(claimedPremiumKey(seasonId)));
  } catch {
    return new Set();
  }
}

async function persistLevelSet(key: string, set: ReadonlySet<number>): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify([...set].sort((a, b) => a - b)));
  } catch {
    // молча — пропуск не критичен для прохождения матчей
  }
}

/** Отметить уровень бесплатной награды как забранный. Возвращает обновлённое множество. */
export async function markFreeClaimed(
  level: number,
  seasonId: string = currentSeasonId(),
): Promise<Set<number>> {
  const set = await getClaimedFreeLevels(seasonId);
  set.add(Math.trunc(level));
  await persistLevelSet(claimedFreeKey(seasonId), set);
  return set;
}

/** Отметить уровень премиум-награды как забранный. Возвращает обновлённое множество. */
export async function markPremiumClaimed(
  level: number,
  seasonId: string = currentSeasonId(),
): Promise<Set<number>> {
  const set = await getClaimedPremiumLevels(seasonId);
  set.add(Math.trunc(level));
  await persistLevelSet(claimedPremiumKey(seasonId), set);
  return set;
}

/** Разблокированная косметика пропуска (id ауры/рамки/звания). */
export async function getUnlockedCosmetics(seasonId: string = currentSeasonId()): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(cosmeticsKey(seasonId));
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export async function unlockCosmetic(
  cosmeticId: string,
  seasonId: string = currentSeasonId(),
): Promise<void> {
  if (!cosmeticId) return;
  try {
    const list = await getUnlockedCosmetics(seasonId);
    if (list.includes(cosmeticId)) return;
    await AsyncStorage.setItem(cosmeticsKey(seasonId), JSON.stringify([...list, cosmeticId]));
  } catch {
    // молча
  }
}

const AURA_OWNED_KEY = 'avatar_aura_owned_v1';
const ACTIVE_AURA_KEY = 'user_avatar_aura';
// Кэши лидербордов/профилей, которые надо сбросить, чтобы новая аура показалась сразу.
const AURA_DEPENDENT_CACHE_KEYS = [
  'global_lb_cache_v4',
  'leaderboard_cache_v1',
  'arena_top100_snapshot_v8',
  'arena_top100_remote_at_v1',
  'arena_rating_screen_cache_v1',
  'friend_profiles_cache_v1',
];

/**
 * Выдать игроку ауру как награду пропуска: записать ВЛАДЕНИЕ (avatar_aura_owned_v1)
 * и сделать её АКТИВНОЙ (user_avatar_aura), сбросить кэши лидербордов и синкнуть в облако,
 * чтобы аура сразу появилась у аватара и в лидерборде арены.
 *
 * @returns true если владение записано (или уже было), false при ошибке хранилища.
 */
export async function grantArenaAura(auraId: string, equip: boolean = true): Promise<boolean> {
  if (!auraId) return false;
  try {
    const raw = await AsyncStorage.getItem(AURA_OWNED_KEY);
    let owned: Record<string, boolean> = {};
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') owned = parsed as Record<string, boolean>;
      } catch {
        owned = {};
      }
    }
    if (!owned[auraId]) {
      owned = { ...owned, [auraId]: true };
      await AsyncStorage.setItem(AURA_OWNED_KEY, JSON.stringify(owned));
    }
    if (equip) {
      await AsyncStorage.setItem(ACTIVE_AURA_KEY, auraId);
      await AsyncStorage.multiRemove(AURA_DEPENDENT_CACHE_KEYS);
      // Лениво синкнем владение/активную ауру в облако (ключи в SYNC_KEYS).
      try {
        const { syncToCloud } = await import('./cloud_sync');
        void syncToCloud({ forceNow: true });
      } catch {
        // синк не критичен для владения
      }
    }
    return true;
  } catch {
    return false;
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
