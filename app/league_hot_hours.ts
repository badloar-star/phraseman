import {
  SUPER_SUNDAY_MULTIPLIER,
  isSuperSundayUtc,
  superSundayEndsAtUtcMs,
} from '../modules/economy/super_sunday_runes';

/**
 * Compatibility facade for callers that still use the old hot-hours module.
 * Super Sunday is the full UTC Sunday and is independent of league rank.
 */

export const LEAGUE_HOT_HOURS_WINDOW_MS = 24 * 60 * 60 * 1000;
export const LEAGUE_HOT_HOURS_MULTIPLIER = SUPER_SUNDAY_MULTIPLIER;

/** Конец текущей ISO-недели лиги (понедельник 00:00 UTC, как getWeekId). */
export function leagueWeekEndsAtUtcMs(now: number): number {
  if (isSuperSundayUtc(now)) return superSundayEndsAtUtcMs(now);
  const d = new Date(now);
  const dayStartUtc = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const dow = new Date(dayStartUtc).getUTCDay() || 7;
  return dayStartUtc + (8 - dow) * 86_400_000;
}

export function isLeagueHotHoursActive(now: number): boolean {
  return isSuperSundayUtc(now);
}

/** Rank-independent facade: group is accepted only for API compatibility. */
export function resolveLeagueHotHoursMultiplier(input: {
  now: number;
  group: ReadonlyArray<{ points: number; isMe?: boolean }>;
}): number {
  return isLeagueHotHoursActive(input.now) ? LEAGUE_HOT_HOURS_MULTIPLIER : 1;
}

/** Deprecated: XP no longer consumes this multiplier. */
export async function getLeagueHotHoursMultiplier(now: number = Date.now()): Promise<number> {
  return isLeagueHotHoursActive(now) ? LEAGUE_HOT_HOURS_MULTIPLIER : 1;
}
