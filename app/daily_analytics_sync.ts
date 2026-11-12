// ════════════════════════════════════════════════════════════════════════════
// daily_analytics_sync.ts — локальная аналитика времени обучения.
// ════════════════════════════════════════════════════════════════════════════

import { getForegroundDailyMsMap } from './foreground_usage_ms';
import { getLocalDayKey } from './local_date';

// зачем (координатор 12.11): время по дням пишется по местному календарю — «последние 7 дней» тоже местные, иначе неделя сдвигалась на пояс
function getLast7Keys(): string[] {
  const keys: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    keys.push(getLocalDayKey(d));
  }
  return keys;
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
  } catch (e) {
    console.warn('[WEEK-TIME] время за 7 дней не прочитано — считаем 0:', e instanceof Error ? e.message : String(e));
    return 0;
  }
}

/**
 * Compatibility entry point: leaderboard analytics are no longer synchronized.
 */
export async function syncDailyAnalyticsIfNeeded(): Promise<void> {
  // Leaderboard analytics are retired. Study usage stays on-device.
}

export type PercentileResult = Readonly<{
  daily7timeMs: null;
}>;

/**
 * Returns local study-time data. Competitive percentile values are retired.
 */
export async function loadPercentileData(): Promise<{
  myTime7ms: number;
  percentiles: PercentileResult;
}> {
  const myTime7ms = await getLast7DaysTimeMs();
  return {
    myTime7ms,
    percentiles: { daily7timeMs: null },
  };
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
