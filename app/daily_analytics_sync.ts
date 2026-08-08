// ════════════════════════════════════════════════════════════════════════════
// daily_analytics_sync.ts — Синк ежедневной аналитики в leaderboard/{uid}
//
// Пишет в Firestore поля daily7xp и daily7time_ms — сумма за последние 7 дней.
// Частота: не более 1 раза в сутки (ключ AsyncStorage daily_analytics_synced_v1).
//
// Перцентили теперь считаются через leaderboard_stats.ts (глобальные пороги
// из Cloud Function) — работает для ВСЕХ пользователей, не только топ-130.
// ════════════════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { ensureAnonUser, ensureStableAuthLinkForStableId } from './cloud_sync';
import { getForegroundDailyMsMap } from './foreground_usage_ms';
import { computeAllPercentiles, type AllPercentiles } from './leaderboard_stats';
import { getMyWeekPoints } from './hall_of_fame_utils';

const SYNCED_DATE_KEY = 'daily_analytics_synced_v1';

const FUNCTIONS_REGION = 'us-central1';

function callable<TReq, TRes>(name: string) {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getApp } = require('@react-native-firebase/app');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getFunctions, httpsCallable } = require('@react-native-firebase/functions');
    return httpsCallable(getFunctions(getApp(), FUNCTIONS_REGION), name) as (data: TReq) => Promise<{ data: TRes }>;
  } catch {
    return null;
  }
}

function todayDateStr(): string {
  return new Date().toISOString().split('T')[0]!;
}

function getLast7Keys(): string[] {
  const keys: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    keys.push(d.toISOString().split('T')[0]!);
  }
  return keys;
}

/** Суммарный XP за последние 7 дней из daily_stats AsyncStorage. */
export async function getLast7DaysXp(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem('daily_stats');
    if (!raw) return 0;
    const statsMap: Record<string, unknown> = JSON.parse(raw);
    const keys = getLast7Keys();
    let total = 0;
    for (const k of keys) {
      const val = statsMap[k];
      if (val === null || val === undefined) continue;
      if (typeof val === 'number') total += val;
      else if (typeof val === 'object' && val !== null && typeof (val as any).points === 'number') {
        total += (val as any).points;
      }
    }
    return Math.max(0, Math.round(total));
  } catch {
    return 0;
  }
}

/** Суммарное foreground-время за последние 7 дней (мс). */
export async function getLast7DaysTimeMs(): Promise<number> {
  try {
    const map = await getForegroundDailyMsMap();
    const keys = getLast7Keys();
    let total = 0;
    for (const k of keys) {
      total += map[k] ?? 0;
    }
    return Math.max(0, Math.round(total));
  } catch {
    return 0;
  }
}

/**
 * Синхронизировать daily7xp и daily7time_ms в leaderboard/{uid}.
 * Вызывается при открытии экрана статистики; пишет не чаще 1 раза в сутки.
 */
export async function syncDailyAnalyticsIfNeeded(): Promise<void> {
  if (!CLOUD_SYNC_ENABLED) return;
  const fn = callable<{ stableId?: string; daily7xp: number; daily7time_ms: number }, { ok: boolean }>('leaderboardUpdateDailyAnalytics');
  if (!fn) return;

  const today = todayDateStr();
  try {
    const last = await AsyncStorage.getItem(SYNCED_DATE_KEY);
    if (last === today) return;
  } catch {
    return;
  }

  const uid = await ensureAnonUser();
  if (!uid) return;
  await ensureStableAuthLinkForStableId(uid).catch(() => false);

  try {
    const [xp7, time7] = await Promise.all([getLast7DaysXp(), getLast7DaysTimeMs()]);
    await fn({ stableId: uid, daily7xp: xp7, daily7time_ms: time7 });
    await AsyncStorage.setItem(SYNCED_DATE_KEY, today);
  } catch {
    // нет сети — попробуем завтра
  }
}

// Реэкспорт для обратной совместимости
export type { AllPercentiles as PercentileResult };

/**
 * Загружает личные данные и считает ВСЕ перцентили через глобальные пороги.
 * Работает для любого пользователя независимо от его места в рейтинге.
 *
 */
export async function loadPercentileData(): Promise<{
  myXp7: number;
  myTime7ms: number;
  percentiles: AllPercentiles;
}> {
  const [myXp7, myTime7ms, streakRaw, xpRaw, myWeekXp] = await Promise.all([
    getLast7DaysXp(),
    getLast7DaysTimeMs(),
    AsyncStorage.getItem('streak_count'),
    AsyncStorage.getItem('user_total_xp'),
    getMyWeekPoints(),
  ]);

  const myStreak = parseInt(streakRaw ?? '0', 10) || 0;
  const myXp = parseInt(xpRaw ?? '0', 10) || 0;

  const percentiles = await computeAllPercentiles({
    myXp,
    myStreak,
    myWeekXp,
    myDaily7xp: myXp7,
    myDaily7timeMs: myTime7ms,
  });

  return { myXp7, myTime7ms, percentiles };
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
