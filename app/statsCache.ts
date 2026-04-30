/**
 * statsCache — module-level pre-load cache for the Statistics screen.
 *
 * Call `preloadStats()` on the Home screen focus so that by the time the
 * user navigates to streak_stats.tsx the data is already ready.
 * streak_stats.tsx reads `getStatsCache()` to initialise its useState values,
 * preventing any visible loading flash.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getXPMultiplier, getActiveBoosts } from './club_boosts';
import { readGiftMultiplier } from './level_gift_system';
import { checkStreakLossPending, getMyWeekPoints } from './hall_of_fame_utils';
import { loadLeagueState } from './league_engine';
import { getShardsBalance } from './shards_system';

export interface StatsPreloadData {
  totalStreak: number;
  freezeActive: boolean;
  premiumFreezeUsed: boolean;
  comebackActive: boolean;
  clubBoostMultiplier: number;
  clubBoostExpiresAt: number;
  giftMultiplier: number;
  giftExpiresAt: number;
  chainShieldDays: number;
  shardsBalance: number;
  totalXP: number;
  weekPoints: number;
  lessonsCompleted: number;
  lessonsProgressPct: number;
  hadPremiumEver: boolean;
  /** Синхрон с `LeagueState.leagueId` (индекс лиги, число) */
  engineLeagueId: number | null;
  myName: string;
  streakAtRisk: boolean;
  /** true once a successful preload has completed */
  loaded: boolean;
}

const DEFAULT_CACHE: StatsPreloadData = {
  totalStreak: 0,
  freezeActive: false,
  premiumFreezeUsed: false,
  comebackActive: false,
  clubBoostMultiplier: 1,
  clubBoostExpiresAt: 0,
  giftMultiplier: 1,
  giftExpiresAt: 0,
  chainShieldDays: 0,
  shardsBalance: 0,
  totalXP: 0,
  weekPoints: 0,
  lessonsCompleted: 0,
  lessonsProgressPct: 0,
  hadPremiumEver: false,
  engineLeagueId: null,
  myName: '',
  streakAtRisk: false,
  loaded: false,
};

let _cache: StatsPreloadData = { ...DEFAULT_CACHE };
let _preloadInFlight = false;

export function getStatsCache(): StatsPreloadData {
  return _cache;
}

/** Invalidate the cache so the next preloadStats() call always refetches. */
export function invalidateStatsCache(): void {
  _cache = { ...DEFAULT_CACHE };
  _preloadInFlight = false;
}

/**
 * Pre-fetches all data needed by streak_stats.tsx.
 * Safe to call multiple times — concurrent calls are de-duplicated.
 * Does NOT throw; errors are swallowed so callers can fire-and-forget.
 */
export async function preloadStats(): Promise<void> {
  if (_preloadInFlight) return;
  _preloadInFlight = true;
  try {
    const todayStr = new Date().toISOString().split('T')[0];

    const [
      streakVal,
      xpStored,
      freezeRaw,
      freeUsedRaw,
      comebackRaw,
      csRaw,
      hadPrem,
      name,
    ] = await Promise.all([
      AsyncStorage.getItem('streak_count'),
      AsyncStorage.getItem('user_total_xp'),
      AsyncStorage.getItem('streak_freeze'),
      AsyncStorage.getItem('premium_free_freeze_used'),
      AsyncStorage.getItem('comeback_active'),
      AsyncStorage.getItem('chain_shield'),
      AsyncStorage.getItem('had_premium_ever'),
      AsyncStorage.getItem('user_name'),
    ]);

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

    const [clubM, gm, shardsBalance, wp, { willLose }, ls] = await Promise.all([
      getXPMultiplier(),
      readGiftMultiplier(),
      getShardsBalance(),
      getMyWeekPoints(),
      checkStreakLossPending(),
      loadLeagueState(),
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

    const lessonKeys = Array.from({ length: 32 }, (_, i) => `lesson${i + 1}_progress`);
    const lessonResults = await AsyncStorage.multiGet(lessonKeys);
    let completedCount = 0;
    let totalCorrectAll = 0;
    for (const [, val] of lessonResults) {
      if (val) {
        const p: string[] = JSON.parse(val);
        const correct = p.filter(x => x === 'correct' || x === 'replay_correct').length;
        totalCorrectAll += correct;
        if (correct >= 45) completedCount++;
      }
    }

    _cache = {
      totalStreak: parseInt(streakVal || '0') || 0,
      freezeActive: freezeIsActive,
      premiumFreezeUsed: freeUsedRaw === 'true',
      comebackActive: comebackRaw === todayStr,
      clubBoostMultiplier: clubM,
      clubBoostExpiresAt,
      giftMultiplier: gm,
      giftExpiresAt,
      chainShieldDays,
      shardsBalance,
      totalXP: parseInt(xpStored || '0') || 0,
      weekPoints: wp,
      lessonsCompleted: completedCount,
      lessonsProgressPct: Math.min(100, Math.round(totalCorrectAll / (32 * 50) * 100)),
      hadPremiumEver: hadPrem === '1',
      // leagueId 0 (Медь) is valid — do not use || null
      engineLeagueId: ls != null ? ls.leagueId : null,
      myName: name || '',
      streakAtRisk: willLose && !freezeIsActive,
      loaded: true,
    };
  } catch {
    // swallow — cache stays at previous (or default) values
  } finally {
    _preloadInFlight = false;
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
