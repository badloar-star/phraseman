import type { DailyTask, TaskProgress } from './daily_tasks';

/** Completion state wins over stale legacy counters when drawing progress. */
export function dailyTaskProgressFraction(
  task: Pick<DailyTask, 'target'>,
  row: TaskProgress | undefined,
): number {
  if (row?.completed || row?.claimed) return 1;
  if (!Number.isFinite(task.target) || task.target <= 0) return 0;
  const current = Number.isFinite(row?.current) ? row?.current ?? 0 : 0;
  return Math.max(0, Math.min(1, current / task.target));
}

export function dailyTaskProgressCurrent(
  task: Pick<DailyTask, 'target'>,
  row: TaskProgress | undefined,
): number {
  if (row?.completed || row?.claimed) return Math.max(0, task.target);
  const current = Number.isFinite(row?.current) ? row?.current ?? 0 : 0;
  return Math.max(0, Math.min(current, Math.max(0, task.target)));
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
