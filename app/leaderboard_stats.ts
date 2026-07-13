// ════════════════════════════════════════════════════════════════════════════
// leaderboard_stats.ts — Чтение предвычисленных перцентильных порогов
//
// Cloud Function computeLeaderboardStatsCron пишет leaderboard_stats/global
// ежедневно. Клиент читает его один раз и кэширует на час локально.
//
// Активный пользователь получает точный перцентиль через lookupPercentile()
// без дополнительных Firestore запросов.
// ════════════════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';

const CACHE_KEY = 'leaderboard_stats_cache_v2';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 час
export const MIN_PERCENTILE_SAMPLE_XP = 5000;
/** The daily cron may be delayed; allow its 24-hour cadence plus a six-hour execution margin. */
export const LEADERBOARD_STATS_MAX_SOURCE_AGE_MS = 30 * 60 * 60 * 1000;
/** Allow small Firestore/server clock skew without hiding otherwise current statistics. */
export const LEADERBOARD_STATS_MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;

export interface GlobalLeaderboardStats {
  totalUsers: number;
  updatedAt: number;
  minimumSampleXp?: number;
  xpThresholds: number[];
  streakThresholds: number[];
  weekXpThresholds: number[];
  daily7xpThresholds: number[];
  daily7timeMsThresholds: number[];
  arenaXpThresholds: number[];
}

const getFirestore = () => {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-firebase/firestore').default();
  } catch {
    return null;
  }
};

interface LeaderboardStatsCacheEntry {
  data: GlobalLeaderboardStats;
  fetchedAt: number;
}

interface LeaderboardStatsLoadResult {
  data: GlobalLeaderboardStats;
  isStale: boolean;
}

let _memCache: LeaderboardStatsCacheEntry | null = null;

export function isLeaderboardStatsSourceStale(updatedAt: number, now: number): boolean {
  const sourceAgeMs = now - updatedAt;
  if (sourceAgeMs < 0) return -sourceAgeMs > LEADERBOARD_STATS_MAX_FUTURE_SKEW_MS;
  return sourceAgeMs > LEADERBOARD_STATS_MAX_SOURCE_AGE_MS;
}

function hasFiniteThresholds(value: unknown): value is number[] {
  return Array.isArray(value)
    && value.length === 99
    && value.every((threshold, index) => typeof threshold === 'number'
      && Number.isFinite(threshold)
      && threshold >= 0
      && (index === 0 || threshold >= (value[index - 1] as number)));
}

function isValidLeaderboardStats(value: unknown): value is GlobalLeaderboardStats {
  if (!value || typeof value !== 'object') return false;
  const stats = value as Partial<GlobalLeaderboardStats>;
  return typeof stats.totalUsers === 'number'
    && Number.isFinite(stats.totalUsers)
    && Number.isInteger(stats.totalUsers)
    && stats.totalUsers >= 0
    && typeof stats.updatedAt === 'number'
    && Number.isFinite(stats.updatedAt)
    && stats.updatedAt > 0
    && (stats.minimumSampleXp === undefined
      || (typeof stats.minimumSampleXp === 'number'
        && Number.isFinite(stats.minimumSampleXp)
        && stats.minimumSampleXp > 0))
    && hasFiniteThresholds(stats.xpThresholds)
    && hasFiniteThresholds(stats.streakThresholds)
    && hasFiniteThresholds(stats.weekXpThresholds)
    && hasFiniteThresholds(stats.daily7xpThresholds)
    && hasFiniteThresholds(stats.daily7timeMsThresholds)
    && hasFiniteThresholds(stats.arenaXpThresholds);
}

function isValidCacheEntry(value: unknown): value is LeaderboardStatsCacheEntry {
  if (!value || typeof value !== 'object') return false;
  const cached = value as Partial<LeaderboardStatsCacheEntry>;
  return typeof cached.fetchedAt === 'number'
    && Number.isFinite(cached.fetchedAt)
    && cached.fetchedAt > 0
    && cached.fetchedAt <= Date.now()
    && isValidLeaderboardStats(cached.data);
}

/**
 * Инжектировать mock-данные для тестирования перцентилей без Firestore.
 * Mock использует тот же XP-порог активной выборки, что и production stats.
 * Вызывается из _admin_settings_testers.tsx.
 */
export function injectMockLeaderboardStats(): void {
  // 99 порогов: p1..p99. Значения подобраны так чтобы реальный пользователь
  // с типичными данными оказывался примерно в 70-85 перцентиле.
  const makeThresholds = (max: number): number[] =>
    Array.from({ length: 99 }, (_, i) => Math.round((max / 99) * i));
  const makeThresholdsAboveFloor = (floor: number, spread: number): number[] =>
    Array.from({ length: 99 }, (_, i) => floor + Math.round((spread / 99) * i));

  _memCache = {
    fetchedAt: Date.now(),
    data: {
      totalUsers: 12847,
      updatedAt: Date.now(),
      minimumSampleXp: MIN_PERCENTILE_SAMPLE_XP,
      xpThresholds:         makeThresholdsAboveFloor(MIN_PERCENTILE_SAMPLE_XP, 95_000),
      streakThresholds:     makeThresholds(60),      // цепочка 7–14д → top 30–50%
      weekXpThresholds:     makeThresholds(500),
      daily7xpThresholds:   makeThresholds(400),
      daily7timeMsThresholds: makeThresholds(7 * 60 * 60 * 1000), // 7 часов за неделю
      arenaXpThresholds:    makeThresholds(2000),
    },
  };
}

/** Сбросить mock — вернуться к реальным данным Firestore. */
export function clearMockLeaderboardStats(): void {
  _memCache = null;
}

/**
 * Загружает leaderboard_stats/global из Firestore (кэш 1 час в памяти + AsyncStorage).
 * Возвращает null если нет сети или функция ещё ни разу не отработала.
 */
async function fetchLeaderboardStatsWithMeta(): Promise<LeaderboardStatsLoadResult | null> {
  const now = Date.now();
  let staleCandidate: LeaderboardStatsCacheEntry | null = null;
  // Память — самый быстрый кэш
  if (_memCache && isValidCacheEntry(_memCache)) {
    if (now - _memCache.fetchedAt < CACHE_TTL_MS) {
      return {
        data: _memCache.data,
        isStale: isLeaderboardStatsSourceStale(_memCache.data.updatedAt, now),
      };
    }
    staleCandidate = _memCache;
  }

  // AsyncStorage — переживает перезапуск приложения
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) {
      const cached: unknown = JSON.parse(raw);
      if (isValidCacheEntry(cached) && now - cached.fetchedAt < CACHE_TTL_MS) {
        _memCache = cached;
        return {
          data: cached.data,
          isStale: isLeaderboardStatsSourceStale(cached.data.updatedAt, now),
        };
      }
      if (isValidCacheEntry(cached)
        && (!staleCandidate || cached.fetchedAt > staleCandidate.fetchedAt)) {
        staleCandidate = cached;
      }
    }
  } catch { /* */ }

  // Firestore
  const db = getFirestore();
  if (!db) {
    return staleCandidate ? { data: staleCandidate.data, isStale: true } : null;
  }
  try {
    const snap = await db.collection('leaderboard_stats').doc('global').get();
    if (!snap.exists) {
      return staleCandidate ? { data: staleCandidate.data, isStale: true } : null;
    }
    const data: unknown = snap.data();
    if (!isValidLeaderboardStats(data)) {
      return staleCandidate ? { data: staleCandidate.data, isStale: true } : null;
    }
    const fetchedAt = Date.now();
    _memCache = { data, fetchedAt };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(_memCache)).catch(() => {});
    return { data, isStale: isLeaderboardStatsSourceStale(data.updatedAt, fetchedAt) };
  } catch {
    return staleCandidate ? { data: staleCandidate.data, isStale: true } : null;
  }
}

export async function fetchLeaderboardStats(): Promise<GlobalLeaderboardStats | null> {
  return (await fetchLeaderboardStatsWithMeta())?.data ?? null;
}

/** Сбросить кэш (для pull-to-refresh). */
export function invalidateLeaderboardStatsCache(): void {
  _memCache = null;
}

/**
 * По таблице порогов (p1..p99) определяет, какой процент пользователей
 * данный пользователь обогнал. 0 = ниже всех, 99 = выше 99%.
 * Возвращает null если нет данных (thresholds пустой или myValue <= 0).
 */
export function lookupPercentile(thresholds: number[], myValue: number): number | null {
  if (!thresholds || thresholds.length === 0 || myValue <= 0) return null;
  let result = 0;
  for (let i = 0; i < Math.min(thresholds.length, 99); i++) {
    if (myValue > (thresholds[i] ?? 0)) result = i + 1;
    else break;
  }
  return result;
}

function percentileSampleXpFloor(stats: GlobalLeaderboardStats): number {
  const configured = Math.trunc(Number(stats.minimumSampleXp));
  return Number.isFinite(configured) && configured > 0 ? configured : MIN_PERCENTILE_SAMPLE_XP;
}

export interface AllPercentiles {
  /** По суммарному XP (все время) */
  xp: number | null;
  /** По текущей цепочке дней подряд */
  streak: number | null;
  /** По XP за текущую неделю */
  weekXp: number | null;
  /** По XP за последние 7 дней */
  daily7xp: number | null;
  /** По времени в приложении за последние 7 дней */
  daily7timeMs: number | null;
  /** По рейтингу Арены */
  arenaXp: number | null;
  /** Размер выборки (количество пользователей в базе) */
  totalUsers: number;
  sample: PercentileSampleMeta;
}

export type PercentileSampleStatus = 'unavailable' | 'below_sample_floor' | 'available';

export interface PercentileSampleMeta {
  status: PercentileSampleStatus;
  userTotalXp: number;
  minimumSampleXp: number;
  totalUsers: number;
  updatedAtMs: number | null;
  isStale: boolean;
}

/**
 * Вычисляет все доступные перцентили для одного пользователя.
 * myWeekXp = очки текущей недели (week_points_v2).
 * myArenaXp = arena_profiles.xp (0 если нет профиля).
 */
export async function computeAllPercentiles(opts: {
  myXp: number;
  myStreak: number;
  myWeekXp: number;
  myDaily7xp: number;
  myDaily7timeMs: number;
  myArenaXp: number;
}, statsOverride?: GlobalLeaderboardStats | null): Promise<AllPercentiles> {
  const empty: AllPercentiles = {
    xp: null, streak: null, weekXp: null,
    daily7xp: null, daily7timeMs: null, arenaXp: null, totalUsers: 0,
    sample: {
      status: 'unavailable',
      userTotalXp: opts.myXp,
      minimumSampleXp: MIN_PERCENTILE_SAMPLE_XP,
      totalUsers: 0,
      updatedAtMs: null,
      isStale: false,
    },
  };
  const loaded = statsOverride === undefined
    ? await fetchLeaderboardStatsWithMeta()
    : statsOverride === null
      ? null
      : { data: statsOverride, isStale: false };
  if (!loaded) return empty;

  const stats = loaded.data;
  const minimumSampleXp = percentileSampleXpFloor(stats);
  const hasAppWideSample = stats.totalUsers > 0;
  const isInAppSample = hasAppWideSample && opts.myXp >= minimumSampleXp;

  return {
    xp: isInAppSample ? lookupPercentile(stats.xpThresholds, opts.myXp) : null,
    streak: isInAppSample ? lookupPercentile(stats.streakThresholds, opts.myStreak) : null,
    weekXp: isInAppSample ? lookupPercentile(stats.weekXpThresholds, opts.myWeekXp) : null,
    daily7xp: isInAppSample ? lookupPercentile(stats.daily7xpThresholds, opts.myDaily7xp) : null,
    daily7timeMs: isInAppSample ? lookupPercentile(stats.daily7timeMsThresholds, opts.myDaily7timeMs) : null,
    arenaXp: lookupPercentile(stats.arenaXpThresholds, opts.myArenaXp),
    totalUsers: stats.totalUsers,
    sample: {
      status: !hasAppWideSample
        ? 'unavailable'
        : isInAppSample
          ? 'available'
          : 'below_sample_floor',
      userTotalXp: opts.myXp,
      minimumSampleXp,
      totalUsers: stats.totalUsers,
      updatedAtMs: Number.isFinite(stats.updatedAt) ? stats.updatedAt : null,
      isStale: loaded.isStale,
    },
  };
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
