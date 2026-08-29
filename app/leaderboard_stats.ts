// ════════════════════════════════════════════════════════════════════════════
// leaderboard_stats.ts — Чтение предвычисленных перцентильных порогов
//
// Cloud Function computeLeaderboardStatsCron пишет leaderboard_stats/global
// каждый час. Клиент читает его один раз и кэширует на час локально.
//
// Активный пользователь получает точный перцентиль через lookupPercentile()
// без дополнительных Firestore запросов.
// ════════════════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { DebugLogger } from './debug-logger';

const CACHE_KEY = 'leaderboard_stats_cache_v2';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 час
export const MIN_PERCENTILE_SAMPLE_XP = 5000;

export interface GlobalLeaderboardStats {
  totalUsers: number;
  updatedAt: number;
  minimumSampleXp?: number;
  xpThresholds: number[];
  streakThresholds: number[];
  weekXpThresholds: number[];
  daily7xpThresholds: number[];
  daily7timeMsThresholds: number[];
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

let _memCache: { data: GlobalLeaderboardStats; fetchedAt: number } | null = null;

/**
 * Загружает leaderboard_stats/global из Firestore (кэш 1 час в памяти + AsyncStorage).
 * Возвращает null если нет сети или функция ещё ни разу не отработала.
 */
export async function fetchLeaderboardStats(): Promise<GlobalLeaderboardStats | null> {
  // Память — самый быстрый кэш
  if (_memCache && Date.now() - _memCache.fetchedAt < CACHE_TTL_MS) {
    return _memCache.data;
  }

  // AsyncStorage — переживает перезапуск приложения
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) {
      const cached: { data: GlobalLeaderboardStats; fetchedAt: number } = JSON.parse(raw);
      if (Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        _memCache = cached;
        return cached.data;
      }
    }
  } catch (e) {
      // 
      DebugLogger.error('leaderboard_stats:raw', e instanceof Error ? e : new Error(String(e)), 'warning');
    }

  // Firestore
  const db = getFirestore();
  if (!db) return null;
  try {
    const snap = await db.collection('leaderboard_stats').doc('global').get();
    if (!snap.exists) return null;
    const data = snap.data() as GlobalLeaderboardStats;
    _memCache = { data, fetchedAt: Date.now() };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(_memCache)).catch(() => {});
    return data;
  } catch {
    return null;
  }
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
  for (let i = 0; i < thresholds.length; i++) {
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
  /** Размер выборки (количество пользователей в базе) */
  totalUsers: number;
}

/**
 * Вычисляет все доступные перцентили для одного пользователя.
 * myWeekXp = очки текущей недели (week_points_v2).
 */
export async function computeAllPercentiles(opts: {
  myXp: number;
  myStreak: number;
  myWeekXp: number;
  myDaily7xp: number;
  myDaily7timeMs: number;
}): Promise<AllPercentiles> {
  const empty: AllPercentiles = {
    xp: null, streak: null, weekXp: null,
    daily7xp: null, daily7timeMs: null, totalUsers: 0,
  };
  const stats = await fetchLeaderboardStats();
  if (!stats) return empty;

  const isInAppSample = opts.myXp >= percentileSampleXpFloor(stats);

  return {
    xp: isInAppSample ? lookupPercentile(stats.xpThresholds, opts.myXp) : null,
    streak: isInAppSample ? lookupPercentile(stats.streakThresholds, opts.myStreak) : null,
    weekXp: isInAppSample ? lookupPercentile(stats.weekXpThresholds, opts.myWeekXp) : null,
    daily7xp: isInAppSample ? lookupPercentile(stats.daily7xpThresholds, opts.myDaily7xp) : null,
    daily7timeMs: isInAppSample ? lookupPercentile(stats.daily7timeMsThresholds, opts.myDaily7timeMs) : null,
    totalUsers: stats.totalUsers,
  };
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
