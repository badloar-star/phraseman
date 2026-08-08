import { getCachedLeagueStateSync } from './league_open_cache_policy';
import { getLeagueResultZoneSize } from './league_engine';

/**
 * «Горячие 2 часа»: в последние 2 часа недели лиги участники зоны вылета
 * получают ×2 к заработанному XP — драма камбэков вместо тихого вылета.
 * Данные зоны берутся из локального кэша лиги (getCachedLeagueStateSync) —
 * сетевых вызовов на пути начисления XP нет, при любых сомнениях множитель 1.
 */

export const LEAGUE_HOT_HOURS_WINDOW_MS = 2 * 60 * 60 * 1000;
export const LEAGUE_HOT_HOURS_MULTIPLIER = 2;

/** Конец текущей ISO-недели лиги (понедельник 00:00 UTC, как getWeekId). */
export function leagueWeekEndsAtUtcMs(now: number): number {
  const d = new Date(now);
  const dayStartUtc = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const dow = new Date(dayStartUtc).getUTCDay() || 7;
  return dayStartUtc + (8 - dow) * 86_400_000;
}

export function isLeagueHotHoursActive(now: number): boolean {
  const left = leagueWeekEndsAtUtcMs(now) - now;
  return left > 0 && left <= LEAGUE_HOT_HOURS_WINDOW_MS;
}

/** Чистая функция: ×2, если сейчас горячие часы и игрок в зоне вылета. */
export function resolveLeagueHotHoursMultiplier(input: {
  now: number;
  group: ReadonlyArray<{ points: number; isMe?: boolean }>;
}): number {
  if (!isLeagueHotHoursActive(input.now)) return 1;
  const group = Array.isArray(input.group) ? input.group : [];
  if (group.length < 2) return 1;
  const sorted = [...group].sort((a, b) => (Number(b.points) || 0) - (Number(a.points) || 0));
  const myIndex = sorted.findIndex((m) => m.isMe);
  if (myIndex < 0) return 1;
  const relegationStartIndex = Math.max(0, sorted.length - getLeagueResultZoneSize(sorted.length));
  return myIndex >= relegationStartIndex ? LEAGUE_HOT_HOURS_MULTIPLIER : 1;
}

/** Множитель для XP-шва xp_manager: ×2 только в окне и только зоне вылета. */
export async function getLeagueHotHoursMultiplier(now: number = Date.now()): Promise<number> {
  try {
    if (!isLeagueHotHoursActive(now)) return 1;
    const state = getCachedLeagueStateSync();
    if (!state?.group) return 1;
    return resolveLeagueHotHoursMultiplier({ now, group: state.group });
  } catch {
    return 1;
  }
}
