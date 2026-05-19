/**
 * statsCache — module-level pre-load cache for the Statistics screen.
 *
 * Call `preloadStats()` on the Home screen focus so that by the time the
 * user navigates to streak_stats.tsx the data is already ready.
 * streak_stats.tsx reads `getStatsCache()` to initialise useState values,
 * preventing any visible loading flash.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getXPMultiplier, getActiveBoosts } from './club_boosts';
import { readGiftMultiplier, readGiftXpBank } from './level_gift_system';
import { checkStreakLossPending, getMyWeekPoints } from './hall_of_fame_utils';
import { loadLeagueState } from './league_engine';
import { getShardsBalance } from './shards_system';
import { getForegroundDailyMsMap } from './foreground_usage_ms';
import { getTrainerCounts } from './trainer_store';
import { loadPendingLevelGiftCount, readPendingLevelGiftCountCache } from './level_gift_inventory';

const STATS_PRELOAD_CACHE_KEY = 'stats_preload_cache_v2';
const DAYS_SHOW = 14;
const MIN_ACTIVE_MS = 60_000;

export interface StatsCachedDay {
  date: string;
  dayNum: string;
  points: number;
  active: boolean;
  streak: number;
}

export interface StatsCachedTimeDay {
  date: string;
  dayNum: string;
  ms: number;
  active: boolean;
}

export interface StatsPreloadData {
  days: StatsCachedDay[];
  allDays: StatsCachedDay[];
  allTimeDays: StatsCachedTimeDay[];
  totalStreak: number;
  bestStreak: number;
  totalPoints: number;
  activeDays: number;
  freezeActive: boolean;
  premiumFreezeUsed: boolean;
  comebackActive: boolean;
  clubBoostMultiplier: number;
  clubBoostExpiresAt: number;
  giftMultiplier: number;
  giftExpiresAt: number;
  giftXpBankRemaining: number;
  chainShieldDays: number;
  shardsBalance: number;
  totalXP: number;
  weekPoints: number;
  hadPremiumEver: boolean;
  /** Синхрон с `LeagueState.leagueId` (индекс лиги, число) */
  engineLeagueId: number | null;
  myName: string;
  streakAtRisk: boolean;
  /** Только слова + фразы, без arena. CTA в тренажер показываем с 5+. */
  trainerPracticeDue: number;
  pendingGiftCount: number;
  /** true once a successful preload has completed */
  loaded: boolean;
  updatedAt: number;
}

const DEFAULT_CACHE: StatsPreloadData = {
  days: [],
  allDays: [],
  allTimeDays: [],
  totalStreak: 0,
  bestStreak: 0,
  totalPoints: 0,
  activeDays: 0,
  freezeActive: false,
  premiumFreezeUsed: false,
  comebackActive: false,
  clubBoostMultiplier: 1,
  clubBoostExpiresAt: 0,
  giftMultiplier: 1,
  giftExpiresAt: 0,
  giftXpBankRemaining: 0,
  chainShieldDays: 0,
  shardsBalance: 0,
  totalXP: 0,
  weekPoints: 0,
  hadPremiumEver: false,
  engineLeagueId: null,
  myName: '',
  streakAtRisk: false,
  trainerPracticeDue: 0,
  pendingGiftCount: 0,
  loaded: false,
  updatedAt: 0,
};

let _cache: StatsPreloadData = { ...DEFAULT_CACHE };
let _preloadInFlight = false;
let _hydratePromise: Promise<void> | null = null;

const toDateStr = (d: Date) => d.toISOString().split('T')[0];

const getLast14 = (): string[] => {
  const days: string[] = [];
  for (let i = DAYS_SHOW - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(toDateStr(d));
  }
  return days;
};

const extractPoints = (val: any): number => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  if (typeof val === 'object' && typeof val.points === 'number') return val.points;
  return 0;
};

const extractStreak = (val: any): number => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'object' && typeof val.streak === 'number') return val.streak;
  return 0;
};

function normalizeDayRow(row: any): StatsCachedDay | null {
  const date = String(row?.date ?? '').trim();
  if (!date) return null;
  return {
    date,
    dayNum: String(row?.dayNum ?? new Date(`${date}T12:00:00`).getDate()),
    points: Math.max(0, Math.floor(Number(row?.points) || 0)),
    active: !!row?.active,
    streak: Math.max(0, Math.floor(Number(row?.streak) || 0)),
  };
}

function normalizeTimeDayRow(row: any): StatsCachedTimeDay | null {
  const date = String(row?.date ?? '').trim();
  if (!date) return null;
  const ms = Math.max(0, Math.floor(Number(row?.ms) || 0));
  return {
    date,
    dayNum: String(row?.dayNum ?? new Date(`${date}T12:00:00`).getDate()),
    ms,
    active: !!row?.active,
  };
}

function normalizeStatsCache(value: Partial<StatsPreloadData> | null | undefined): StatsPreloadData {
  const days = Array.isArray(value?.days)
    ? value.days.map(normalizeDayRow).filter((row): row is StatsCachedDay => !!row)
    : [];
  const allDays = Array.isArray(value?.allDays)
    ? value.allDays.map(normalizeDayRow).filter((row): row is StatsCachedDay => !!row)
    : [];
  const allTimeDays = Array.isArray(value?.allTimeDays)
    ? value.allTimeDays.map(normalizeTimeDayRow).filter((row): row is StatsCachedTimeDay => !!row)
    : [];

  return {
    ...DEFAULT_CACHE,
    ...value,
    days,
    allDays,
    allTimeDays,
    totalStreak: Math.max(0, Math.floor(Number(value?.totalStreak) || 0)),
    bestStreak: Math.max(0, Math.floor(Number(value?.bestStreak) || 0)),
    totalPoints: Math.max(0, Math.floor(Number(value?.totalPoints) || 0)),
    activeDays: Math.max(0, Math.floor(Number(value?.activeDays) || 0)),
    clubBoostMultiplier: Math.max(1, Number(value?.clubBoostMultiplier) || 1),
    clubBoostExpiresAt: Math.max(0, Number(value?.clubBoostExpiresAt) || 0),
    giftMultiplier: Math.max(1, Number(value?.giftMultiplier) || 1),
    giftExpiresAt: Math.max(0, Number(value?.giftExpiresAt) || 0),
    giftXpBankRemaining: Math.max(0, Math.floor(Number(value?.giftXpBankRemaining) || 0)),
    chainShieldDays: Math.max(0, Math.floor(Number(value?.chainShieldDays) || 0)),
    shardsBalance: Math.max(0, Math.floor(Number(value?.shardsBalance) || 0)),
    totalXP: Math.max(0, Math.floor(Number(value?.totalXP) || 0)),
    weekPoints: Math.max(0, Math.floor(Number(value?.weekPoints) || 0)),
    engineLeagueId: value?.engineLeagueId == null ? null : Math.max(0, Math.floor(Number(value.engineLeagueId) || 0)),
    myName: String(value?.myName ?? ''),
    trainerPracticeDue: Math.max(0, Math.floor(Number(value?.trainerPracticeDue) || 0)),
    pendingGiftCount: Math.max(0, Math.floor(Number(value?.pendingGiftCount) || 0)),
    loaded: value?.loaded === true,
    updatedAt: Math.max(0, Number(value?.updatedAt) || 0),
  };
}

function buildActivityRows(
  statsMap: Record<string, any>,
  fgDaily: Record<string, number>,
): Pick<StatsPreloadData, 'days' | 'allDays' | 'allTimeDays' | 'bestStreak' | 'totalPoints' | 'activeDays'> {
  const dates = getLast14();
  const days: StatsCachedDay[] = dates.map(dateStr => {
    const val = statsMap[dateStr];
    const pts = extractPoints(val);
    return {
      date: dateStr,
      dayNum: String(new Date(`${dateStr}T12:00:00`).getDate()),
      points: pts,
      active: pts > 0,
      streak: extractStreak(val),
    };
  });

  const todayStr = toDateStr(new Date());
  const statsKeys = Object.keys(statsMap).sort();
  const firstUsageDate = statsKeys.length > 0 ? statsKeys[0] : todayStr;
  const firstDay = new Date(`${firstUsageDate}T12:00:00`);
  const todayDay = new Date(`${todayStr}T12:00:00`);
  const sixtyDaysAgo = new Date(todayDay);
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 59);
  const startDate = firstDay > sixtyDaysAgo ? firstDay : sixtyDaysAgo;

  const allDays: StatsCachedDay[] = [];
  const cursor = new Date(startDate);
  while (cursor <= todayDay) {
    const dateStr = toDateStr(cursor);
    const val = statsMap[dateStr];
    const pts = extractPoints(val);
    allDays.push({
      date: dateStr,
      dayNum: String(cursor.getDate()),
      points: pts,
      active: pts > 0,
      streak: extractStreak(val),
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  const allTimeDays: StatsCachedTimeDay[] = allDays.map((d) => {
    const ms = Math.max(0, Math.floor(Number(fgDaily[d.date]) || 0));
    return {
      date: d.date,
      dayNum: d.dayNum,
      ms,
      active: ms >= MIN_ACTIVE_MS,
    };
  });

  let bestStreak = 0;
  let curStreak = 0;
  for (const d of days) {
    if (d.active) {
      curStreak += 1;
      bestStreak = Math.max(bestStreak, curStreak);
    } else {
      curStreak = 0;
    }
  }

  const values = Object.values(statsMap);
  return {
    days,
    allDays,
    allTimeDays,
    bestStreak,
    totalPoints: values.reduce((sum: number, val: any) => sum + extractPoints(val), 0),
    activeDays: values.filter((val: any) => extractPoints(val) > 0).length,
  };
}

export function rememberStatsCache(next: Partial<StatsPreloadData>): StatsPreloadData {
  const normalized = normalizeStatsCache({
    ..._cache,
    ...next,
    loaded: true,
    updatedAt: Date.now(),
  });
  _cache = normalized;
  AsyncStorage.setItem(STATS_PRELOAD_CACHE_KEY, JSON.stringify(normalized)).catch(() => {});
  return normalized;
}

export async function hydrateStatsCacheFromStorage(): Promise<void> {
  if (_cache.loaded) return;
  if (_hydratePromise) return _hydratePromise;
  _hydratePromise = AsyncStorage.getItem(STATS_PRELOAD_CACHE_KEY)
    .then((raw) => {
      if (!raw || _cache.loaded) return;
      const parsed = normalizeStatsCache(JSON.parse(raw));
      if (parsed.loaded) _cache = parsed;
    })
    .catch(() => {})
    .finally(() => {
      _hydratePromise = null;
    });
  return _hydratePromise;
}

export function getStatsCache(): StatsPreloadData {
  return _cache;
}

/**
 * Kept for older call sites. Do not reset to defaults: the statistics screen
 * must keep showing the last good snapshot while fresh data loads invisibly.
 */
export function invalidateStatsCache(): void {
  _preloadInFlight = false;
}

async function buildFreshStatsSnapshot(): Promise<StatsPreloadData> {
  const todayStr = new Date().toISOString().split('T')[0];

  const [
    streakVal,
    xpStored,
    statsRaw,
    freezeRaw,
    freeUsedRaw,
    comebackRaw,
    csRaw,
    hadPrem,
    name,
    fgDaily,
  ] = await Promise.all([
    AsyncStorage.getItem('streak_count'),
    AsyncStorage.getItem('user_total_xp'),
    AsyncStorage.getItem('daily_stats'),
    AsyncStorage.getItem('streak_freeze'),
    AsyncStorage.getItem('premium_free_freeze_used'),
    AsyncStorage.getItem('comeback_active'),
    AsyncStorage.getItem('chain_shield'),
    AsyncStorage.getItem('had_premium_ever'),
    AsyncStorage.getItem('user_name'),
    getForegroundDailyMsMap(),
  ]);

  const statsMap: Record<string, any> = statsRaw ? JSON.parse(statsRaw) : {};
  const activityRows = buildActivityRows(statsMap, fgDaily);

  const freeze = freezeRaw ? JSON.parse(freezeRaw) : null;
  const freezeIsActive = !!(freeze?.active && freeze?.date === todayStr);

  let chainShieldDays = 0;
  if (csRaw) {
    const cs = JSON.parse(csRaw);
    const granted = cs.grantedAt ? new Date(cs.grantedAt) : null;
    const total = cs.daysLeft || 0;
    if (granted && total > 0) {
      const daysPassed = Math.floor((Date.now() - granted.getTime()) / 86400000);
      chainShieldDays = Math.max(0, total - daysPassed);
    } else {
      chainShieldDays = total;
    }
  }

  const [clubM, gm, giftXpBank, shardsBalance, wp, { willLose }, ls, trainerCounts, pendingGiftCount] = await Promise.all([
    getXPMultiplier(),
    readGiftMultiplier(),
    readGiftXpBank(),
    getShardsBalance(),
    getMyWeekPoints(),
    checkStreakLossPending(),
    loadLeagueState(),
    getTrainerCounts(),
    loadPendingLevelGiftCount().catch(() => readPendingLevelGiftCountCache()),
  ]);

  let clubBoostExpiresAt = 0;
  if (clubM > 1) {
    const activeBoosts = await getActiveBoosts();
    const xpBoost = activeBoosts.find((b: any) => b.id.startsWith('xp_'));
    if (xpBoost) clubBoostExpiresAt = xpBoost.activatedAt + xpBoost.durationMs;
  }

  let giftExpiresAt = 0;
  if (gm > 1) {
    const raw = await AsyncStorage.getItem('gift_xp_multiplier');
    if (raw) {
      const state = JSON.parse(raw);
      giftExpiresAt = state.expiresAt || 0;
    }
  }

  return normalizeStatsCache({
    ...activityRows,
    totalStreak: parseInt(streakVal || '0') || 0,
    freezeActive: freezeIsActive,
    premiumFreezeUsed: freeUsedRaw === 'true',
    comebackActive: comebackRaw === todayStr,
    clubBoostMultiplier: clubM,
    clubBoostExpiresAt,
    giftMultiplier: gm,
    giftExpiresAt,
    giftXpBankRemaining: giftXpBank.remaining,
    chainShieldDays,
    shardsBalance,
    totalXP: parseInt(xpStored || '0') || activityRows.totalPoints * 5,
    weekPoints: wp,
    hadPremiumEver: hadPrem === '1',
    // leagueId 0 (Медь) is valid — do not use || null
    engineLeagueId: ls != null ? ls.leagueId : null,
    myName: name || '',
    streakAtRisk: willLose && !freezeIsActive,
    trainerPracticeDue: trainerCounts.words + trainerCounts.phrases,
    pendingGiftCount,
    loaded: true,
    updatedAt: Date.now(),
  });
}

export async function refreshStatsCache(): Promise<StatsPreloadData | null> {
  await hydrateStatsCacheFromStorage();
  if (_preloadInFlight) return _cache.loaded ? _cache : null;
  _preloadInFlight = true;
  try {
    const fresh = await buildFreshStatsSnapshot();
    return rememberStatsCache(fresh);
  } catch {
    return _cache.loaded ? _cache : null;
  } finally {
    _preloadInFlight = false;
  }
}

/**
 * Pre-fetches all data needed by streak_stats.tsx.
 * Safe to call multiple times — concurrent calls are de-duplicated.
 * Does NOT throw; errors are swallowed so callers can fire-and-forget.
 */
export async function preloadStats(): Promise<void> {
  await refreshStatsCache();
}

void hydrateStatsCacheFromStorage();

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
