import type { PersonalPlanCompletedTask } from './personal_plan_progress';
import type { PersonalPlanDefinition, PlanMinutesChoice } from './personal_plan_catalog';
import { tasksForMinutes } from './personal_plan_catalog';
import { planTaskCompletionKey } from './personal_plan_progress';

export type PersonalPlanWeekStat = {
  weekIndex: number;
  totalDays: number;
  daysWithProgress: number;
  completedTasks: number;
  totalTasks: number;
  progressPct: number;
  isCurrent: boolean;
};

export type PersonalPlanDayStat = {
  dayIndex: number;
  progressPct: number;
  isCurrent: boolean;
  isUnlocked: boolean;
  isCompleted: boolean;
};

export type PersonalPlanStatsSummary = {
  planId: string;
  planName: string;
  currentDayIndex: number;
  totalDays: number;
  overallProgressPct: number;
  completedTasksTotal: number;
  totalTasksTotal: number;
  activeDaysCount: number;
  currentStreakDays: number;
  longestStreakDays: number;
  minutesPerDay: PlanMinutesChoice;
  estimatedMinutesInvested: number;
  weeks: PersonalPlanWeekStat[];
  days: PersonalPlanDayStat[];
};

type CompletedRecord = PersonalPlanCompletedTask | unknown;

function isCompleted(
  completedTasks: Record<string, CompletedRecord>,
  planInstanceId: string,
  taskId: string,
): boolean {
  return Boolean(completedTasks[planTaskCompletionKey(planInstanceId, taskId)]);
}

function completionRecord(value: CompletedRecord): PersonalPlanCompletedTask | null {
  if (value && typeof value === 'object' && 'completedAt' in value) {
    return value as PersonalPlanCompletedTask;
  }
  return null;
}

/**
 * Returns the set of unique YYYY-MM-DD strings on which at least one plan task
 * was completed, derived from completedAt timestamps.
 */
export function activeDayKeys(
  completedTasks: Record<string, CompletedRecord>,
  planInstanceId: string,
): string[] {
  const prefix = `${planInstanceId}::`;
  const days = new Set<string>();
  for (const [key, value] of Object.entries(completedTasks)) {
    if (planInstanceId && !key.startsWith(prefix)) continue;
    const record = completionRecord(value);
    if (!record?.completedAt) continue;
    const dayKey = record.completedAt.slice(0, 10);
    if (dayKey.length === 10) days.add(dayKey);
  }
  return [...days].sort();
}

function dayKeyToOrdinal(dayKey: string): number {
  // YYYY-MM-DD -> days since epoch, comparison-safe without Date.now()
  const [y, m, d] = dayKey.split('-').map((part) => Number(part));
  if (!y || !m || !d) return 0;
  // Approximate ordinal (good enough for consecutive-day diffs within a plan).
  return y * 372 + m * 31 + d;
}

/**
 * Longest run of consecutive calendar days present in the sorted day keys.
 */
export function longestStreak(sortedDayKeys: string[]): number {
  if (sortedDayKeys.length === 0) return 0;
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sortedDayKeys.length; i += 1) {
    const prev = dayKeyToOrdinal(sortedDayKeys[i - 1]);
    const curr = dayKeyToOrdinal(sortedDayKeys[i]);
    if (curr - prev === 1) {
      run += 1;
      longest = Math.max(longest, run);
    } else if (curr !== prev) {
      run = 1;
    }
  }
  return longest;
}

/**
 * Current "days in a row" streak.
 *
 * When `todayKey` (YYYY-MM-DD) is given, the streak only counts if the most recent
 * active day is today or yesterday — otherwise the run is considered broken and we
 * return 0. This makes "дней подряд" honest: a week of inactivity resets it to 0
 * instead of showing a stale run. `todayKey` is passed in (not read via Date.now())
 * so the function stays pure and deterministic for tests.
 *
 * Without `todayKey` it keeps the legacy behaviour (run ending at the latest active day).
 */
export function trailingStreak(sortedDayKeys: string[], todayKey?: string): number {
  if (sortedDayKeys.length === 0) return 0;

  if (todayKey) {
    const today = dayKeyToOrdinal(todayKey);
    const latest = dayKeyToOrdinal(sortedDayKeys[sortedDayKeys.length - 1]);
    // Active day must be today or yesterday, else the current streak is broken.
    if (today - latest > 1) return 0;
  }

  let run = 1;
  for (let i = sortedDayKeys.length - 1; i > 0; i -= 1) {
    const curr = dayKeyToOrdinal(sortedDayKeys[i]);
    const prev = dayKeyToOrdinal(sortedDayKeys[i - 1]);
    if (curr - prev === 1) run += 1;
    else break;
  }
  return run;
}

export type BuildPersonalPlanStatsInput = {
  plan: PersonalPlanDefinition;
  planInstanceId: string;
  currentDayIndex: number;
  minutesPerDay: PlanMinutesChoice;
  completedTasks: Record<string, CompletedRecord>;
  /** Today as YYYY-MM-DD. Makes the current-streak honest (resets after a gap). */
  todayKey?: string;
};

export function buildPersonalPlanStats(
  input: BuildPersonalPlanStatsInput,
): PersonalPlanStatsSummary {
  const { plan, planInstanceId, currentDayIndex, minutesPerDay, completedTasks, todayKey } = input;

  const weekMap = new Map<number, PersonalPlanWeekStat>();
  let completedTasksTotal = 0;
  let totalTasksTotal = 0;
  const daysWithAnyProgress = new Set<number>();

  for (const day of plan.days) {
    const dayTasks = tasksForMinutes(day, minutesPerDay);
    const completedInDay = dayTasks.filter((task) =>
      isCompleted(completedTasks, planInstanceId, task.id),
    ).length;

    completedTasksTotal += completedInDay;
    totalTasksTotal += dayTasks.length;
    if (completedInDay > 0) daysWithAnyProgress.add(day.dayIndex);

    const weekIndex = day.weekIndex || Math.ceil(day.dayIndex / 7);
    const existing = weekMap.get(weekIndex) ?? {
      weekIndex,
      totalDays: 0,
      daysWithProgress: 0,
      completedTasks: 0,
      totalTasks: 0,
      progressPct: 0,
      isCurrent: false,
    };
    existing.totalDays += 1;
    existing.completedTasks += completedInDay;
    existing.totalTasks += dayTasks.length;
    if (completedInDay > 0) existing.daysWithProgress += 1;
    if (day.dayIndex === currentDayIndex) existing.isCurrent = true;
    weekMap.set(weekIndex, existing);
  }

  const weeks = [...weekMap.values()]
    .sort((a, b) => a.weekIndex - b.weekIndex)
    .map((week) => ({
      ...week,
      progressPct: week.totalTasks > 0
        ? Math.round((week.completedTasks / week.totalTasks) * 100)
        : 0,
    }));

  // Per-day route progress (moved here from the plan screen so the day-by-day
  // breakdown lives in stats, not on the plan). isUnlocked mirrors the plan's
  // gating: any day up to the current one, plus the next day once today is ≥50%.
  const currentDay = plan.days.find((day) => day.dayIndex === currentDayIndex);
  const currentDayTasks = currentDay ? tasksForMinutes(currentDay, minutesPerDay) : [];
  const currentDayDone = currentDayTasks.filter((task) =>
    isCompleted(completedTasks, planInstanceId, task.id),
  ).length;
  const currentDayProgressPct = currentDayTasks.length > 0
    ? Math.round((currentDayDone / currentDayTasks.length) * 100)
    : 0;

  const days: PersonalPlanDayStat[] = plan.days.map((day) => {
    const dayTasks = tasksForMinutes(day, minutesPerDay);
    const completedInDay = dayTasks.filter((task) =>
      isCompleted(completedTasks, planInstanceId, task.id),
    ).length;
    const progressPct = dayTasks.length > 0
      ? Math.round((completedInDay / dayTasks.length) * 100)
      : 0;
    return {
      dayIndex: day.dayIndex,
      progressPct,
      isCurrent: day.dayIndex === currentDayIndex,
      isUnlocked: day.dayIndex <= currentDayIndex
        || (day.dayIndex === currentDayIndex + 1 && currentDayProgressPct >= 50),
      isCompleted: dayTasks.length > 0 && completedInDay >= dayTasks.length,
    };
  });

  const dayKeys = activeDayKeys(completedTasks, planInstanceId);
  const overallProgressPct = totalTasksTotal > 0
    ? Math.round((completedTasksTotal / totalTasksTotal) * 100)
    : 0;

  // Rough minutes invested: completed tasks weighted by avg minutes/task.
  const avgMinutesPerTask = totalTasksTotal > 0
    ? plan.days.reduce((sum, day) => {
        const dayTasks = tasksForMinutes(day, minutesPerDay);
        return sum + dayTasks.reduce((s, t) => s + t.minutes, 0);
      }, 0) / totalTasksTotal
    : 0;

  return {
    planId: plan.id,
    planName: plan.name,
    currentDayIndex,
    totalDays: plan.days.length,
    overallProgressPct,
    completedTasksTotal,
    totalTasksTotal,
    activeDaysCount: daysWithAnyProgress.size,
    currentStreakDays: trailingStreak(dayKeys, todayKey),
    longestStreakDays: longestStreak(dayKeys),
    minutesPerDay,
    estimatedMinutesInvested: Math.round(completedTasksTotal * avgMinutesPerTask),
    weeks,
    days,
  };
}
