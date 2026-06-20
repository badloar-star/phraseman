import { loadPercentileData } from './daily_analytics_sync';
import { triLang, type Lang } from '../constants/i18n';

/**
 * "Compare with other learners" for the plan day-done screen.
 *
 * Reuses the already-deployed leaderboard percentile pipeline (leaderboard_stats/global,
 * computed by computeLeaderboardStatsCron). Plan XP already flows into the learner's
 * 7-day XP (daily7xp), so after finishing a day we can show "you're ahead of X% today"
 * with NO extra Cloud Function. Best-effort: returns null when there isn't enough data.
 */

export type PlanDayComparison = {
  /** Percentile rank: the learner is ahead of this share of users (0-99). */
  aheadOfPercent: number;
  /** "You're in the top N%" — the complement, clamped to >= 1. */
  topPercent: number;
  /** Total users in the comparison sample. */
  totalUsers: number;
};

/**
 * Load the day comparison. Returns null when the learner doesn't yet qualify for the
 * percentile sample (too little XP) or stats are unavailable — the done screen then
 * simply omits the comparison line rather than showing a fake number.
 */
export async function loadPlanDayComparison(): Promise<PlanDayComparison | null> {
  try {
    const { percentiles } = await loadPercentileData(0);
    const aheadOf = percentiles.daily7xp;
    if (aheadOf === null || aheadOf === undefined) return null;

    const aheadOfPercent = Math.max(0, Math.min(99, Math.round(aheadOf)));
    const topPercent = Math.max(1, 100 - aheadOfPercent);

    return {
      aheadOfPercent,
      topPercent,
      totalUsers: Math.max(0, percentiles.totalUsers),
    };
  } catch {
    return null;
  }
}

/** Short, encouraging localized line for the comparison (Bible tone: numbers, no fluff). */
export function planDayComparisonLine(comparison: PlanDayComparison, lang: Lang = 'ru'): string {
  const top = comparison.topPercent;
  return triLang(lang, {
    ru: `Ты в топ ${top}% за сегодня`,
    uk: `Ти в топ ${top}% за сьогодні`,
    es: `Estás en el top ${top}% de hoy`,
    'pt-BR': `Você está no top ${top}% de hoje`,
    vi: `Hôm nay bạn thuộc top ${top}%`,
    id: `Kamu masuk top ${top}% hari ini`,
    tr: `Bugün ilk %${top} içindesin`,
    pl: `Dziś jesteś w top ${top}%`,
  });
}
