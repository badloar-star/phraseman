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

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
