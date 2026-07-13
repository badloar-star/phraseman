import type { Lang } from '../constants/i18n';
import type { AllPercentiles } from './leaderboard_stats';
import type { LifetimeProfileStats } from './lifetime_profile_stats';
import type { StatsInsightsSnapshot } from './stats_insights_analysis';
import { storageStudyTarget, type RuntimeStudyTarget } from './target_storage_keys';

type WeekInput = {
  activeDays7: number;
  minutes7: number;
  xp7: number;
  bestDayLabel: string | null;
  dailyMinutes7: number[];
  currentPeriodDates: string[];
};

type TimeDay = { date: string; ms: number };

type ActivityInput = {
  days: { date: string; active: boolean; future: boolean }[];
  activeDays: number;
  currentStreak: number;
  longestStreak: number;
  last30ActiveDays: number;
  bestMonth: { year: number; month: number } | null;
  goal: { chosen: boolean; activeDays: number; goal: number };
};

type PercentilesInput = Pick<AllPercentiles, 'sample' | 'xp' | 'daily7xp' | 'daily7timeMs'>;

type LifetimeInput = Pick<LifetimeProfileStats,
  'wordsLearned' | 'phrasesLearned' | 'quizzesTotal' | 'arenaWins' | 'appDaysUnion'>;

export type BuildStatsInsightsSnapshotInput = {
  lang: Lang;
  studyTarget: RuntimeStudyTarget;
  week: WeekInput;
  timeDays: readonly TimeDay[];
  activity: ActivityInput;
  percentiles: PercentilesInput;
  lifetime: LifetimeInput;
};

export type StatsInsightsLoadStatus = 'loading' | 'ready' | 'unavailable';

export function isCurrentStatsInsightsLoadCycle(cycleId: number, currentCycleId: number): boolean {
  return Number.isSafeInteger(cycleId) && cycleId === currentCycleId;
}

export async function finishStatsInsightsLoadCycle(
  cycleId: number,
  pending: Promise<unknown>,
  getCurrentCycleId: () => number,
): Promise<number | null> {
  await pending;
  return isCurrentStatsInsightsLoadCycle(cycleId, getCurrentCycleId()) ? cycleId : null;
}

export function canBuildStatsInsightsSnapshotForCycle(input: {
  cycleId: number;
  currentCycleId: number;
  completedCycleId: number;
  activityStatus: StatsInsightsLoadStatus;
  percentilesStatus: StatsInsightsLoadStatus;
  lifetimeStatus: StatsInsightsLoadStatus;
  hasActivity: boolean;
  hasLifetime: boolean;
}): boolean {
  return isCurrentStatsInsightsLoadCycle(input.cycleId, input.currentCycleId)
    && input.completedCycleId === input.cycleId
    && input.activityStatus === 'ready'
    && input.percentilesStatus !== 'loading'
    && input.lifetimeStatus === 'ready'
    && input.hasActivity
    && input.hasLifetime;
}

export function notesForStatsInsightsFingerprint<T>(
  currentFingerprint: string | null,
  state: { fingerprint: string; notes: T } | null,
): T | null {
  return currentFingerprint !== null && state?.fingerprint === currentFingerprint ? state.notes : null;
}

export function shouldRenderStatsComparison(hasResolvedPercentiles: boolean): boolean {
  return hasResolvedPercentiles;
}

function addUtcDays(dateKey: string, amount: number): string {
  const [year, month, day] = dateKey.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1, day + amount)).toISOString().slice(0, 10);
}

function previousSevenMinutes(currentDates: readonly string[], rows: readonly TimeDay[]): number | null {
  if (currentDates.length !== 7 || !/^\d{4}-\d{2}-\d{2}$/.test(currentDates[0] ?? '')) return null;
  const byDate = new Map(rows.map((row) => [row.date, row.ms]));
  const priorDates = Array.from({ length: 7 }, (_, index) => addUtcDays(currentDates[0]!, index - 7));
  if (!priorDates.every((date) => byDate.has(date))) return null;
  return Math.round(priorDates.reduce((sum, date) => sum + Math.max(0, byDate.get(date) ?? 0), 0) / 60_000);
}

function previousThirtyActiveDays(days: ActivityInput['days']): number | null {
  const observed = days.filter((day) => !day.future).sort((a, b) => a.date.localeCompare(b.date));
  if (observed.length < 60) return null;
  return observed.slice(-60, -30).filter((day) => day.active).length;
}

function bestMonthLabel(bestMonth: ActivityInput['bestMonth'], lang: Lang): string | null {
  if (!bestMonth) return null;
  try {
    return new Intl.DateTimeFormat(lang, { month: 'long', year: 'numeric', timeZone: 'UTC' })
      .format(new Date(Date.UTC(bestMonth.year, bestMonth.month - 1, 1)));
  } catch {
    return `${String(bestMonth.month).padStart(2, '0')}.${bestMonth.year}`;
  }
}

export function buildStatsInsightsSnapshot(input: BuildStatsInsightsSnapshotInput): StatsInsightsSnapshot {
  const goalPct = input.activity.goal.chosen
    ? Math.round((input.activity.goal.activeDays / Math.max(1, input.activity.goal.goal)) * 100)
    : 0;

  return {
    lang: input.lang,
    studyTarget: storageStudyTarget(input.studyTarget),
    week: {
      activeDays7: input.week.activeDays7,
      minutes7: input.week.minutes7,
      xp7: input.week.xp7,
      previousMinutes7: previousSevenMinutes(input.week.currentPeriodDates, input.timeDays),
      bestDayLabel: input.week.bestDayLabel,
      dailyMinutes7: [...input.week.dailyMinutes7],
    },
    longTerm: {
      activeDays365: input.activity.activeDays,
      currentStreak: input.activity.currentStreak,
      longestStreak: input.activity.longestStreak,
      bestMonthLabel: bestMonthLabel(input.activity.bestMonth, input.lang),
      last30ActiveDays: input.activity.last30ActiveDays,
      previous30ActiveDays: previousThirtyActiveDays(input.activity.days),
      goalPct: Math.max(0, Math.min(100, goalPct)),
    },
    comparison: {
      sample: input.percentiles.sample,
      totalXpPercentile: input.percentiles.xp,
      daily7XpPercentile: input.percentiles.daily7xp,
      daily7TimePercentile: input.percentiles.daily7timeMs,
    },
    lifetime: {
      words: input.lifetime.wordsLearned,
      phrases: input.lifetime.phrasesLearned,
      quizzes: input.lifetime.quizzesTotal,
      arenaWins: input.lifetime.arenaWins,
      daysActive: input.lifetime.appDaysUnion,
    },
    weakCategories: [],
  };
}
