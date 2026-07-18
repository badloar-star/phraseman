import type { TrainerDashboard, TrainerQueue } from './trainer_store';

const PRACTICE_HALL_FALLBACK_ORDER: readonly TrainerQueue[] = ['phrases', 'words', 'arena'];

/**
 * The hall exposes one start action, but never merges or mutates the underlying
 * queues. We first honour the dashboard's priority calculation; if its target
 * was cleared while the screen was open, use a stable fallback order. This
 * keeps routing deterministic and makes every queued error reachable.
 */
export function selectPracticeHallQueue(dashboard: TrainerDashboard): TrainerQueue | null {
  const recommended = dashboard.nextQueue;
  if (recommended && (dashboard.due[recommended] ?? 0) > 0) return recommended;
  return PRACTICE_HALL_FALLBACK_ORDER.find((queue) => (dashboard.due[queue] ?? 0) > 0) ?? null;
}

/** A short session is one minute for up to three errors, then roughly one minute per three, capped at twelve. */
export function practiceHallDurationMinutes(errorCount: number): number {
  return Math.max(1, Math.min(12, Math.ceil(Math.max(0, errorCount) / 3)));
}

export type PracticeHallTrendDay = {
  date: string;
  active: boolean;
  future?: boolean;
};

export type PracticeHallTrendPoint = { date: string; value: 0 | 1 };

/** Preserve only observed dates: future placeholders must never be presented as user results. */
export function buildPracticeHallTrend(days: readonly PracticeHallTrendDay[]): PracticeHallTrendPoint[] {
  return days
    .filter((day) => !day.future)
    .map((day) => ({ date: day.date, value: day.active ? 1 : 0 }));
}

/** The viewport is always bounded, so a pan cannot create empty chart space. */
export function clampPracticeHallTrendOffset(totalDays: number, rangeDays: number, offset: number): number {
  return Math.max(0, Math.min(Math.max(0, totalDays - rangeDays), Math.round(offset)));
}

/** Returns a stable, contiguous date window for the chart's selected range. */
export function visiblePracticeHallTrendWindow(
  points: readonly PracticeHallTrendPoint[],
  rangeDays: number,
  offset: number,
): PracticeHallTrendPoint[] {
  const start = clampPracticeHallTrendOffset(points.length, rangeDays, offset);
  return points.slice(start, start + rangeDays);
}
