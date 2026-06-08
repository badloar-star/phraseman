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
 * Streak ending at the most recent active day (relative to that latest day,
 * not "today" — avoids Date.now() and stays deterministic for tests).
 */
export function trailingStreak(sortedDayKeys: string[]): number {
  if (sortedDayKeys.length === 0) return 0;
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
};

export function buildPersonalPlanStats(
  input: BuildPersonalPlanStatsInput,
): PersonalPlanStatsSummary {
  const { plan, planInstanceId, currentDayIndex, minutesPerDay, completedTasks } = input;

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
    currentStreakDays: trailingStreak(dayKeys),
    longestStreakDays: longestStreak(dayKeys),
    minutesPerDay,
    estimatedMinutesInvested: Math.round(completedTasksTotal * avgMinutesPerTask),
    weeks,
  };
}
