export type TodayActivityProgress = readonly [number, number, number];

export type TodayActivityHistoryRow = Readonly<{
  dayKey: string;
  progress: TodayActivityProgress;
  targets: TodayActivityProgress;
}>;

function clampProgress(value: number, target: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(target) || target <= 0) return 0;
  return Math.min(Math.max(0, Math.floor(value)), Math.floor(target));
}

function normalizedProgress(progress: readonly number[], targets: readonly number[]): TodayActivityProgress {
  return [
    clampProgress(progress[0] ?? 0, targets[0] ?? 0),
    clampProgress(progress[1] ?? 0, targets[1] ?? 0),
    clampProgress(progress[2] ?? 0, targets[2] ?? 0),
  ];
}

/**
 * Ряды компактной ленты. Нулевые дни не рисуются: отсутствие сохранённого факта
 * не выдаётся за день с занятием.
 */
export function buildTodayActivityHistory(
  todayDayKey: string,
  progress: readonly number[],
  targets: readonly number[],
): readonly TodayActivityHistoryRow[] {
  const safeTargets = normalizedProgress(targets, targets);
  const today = normalizedProgress(progress, safeTargets);
  if (today.every((value) => value <= 0)) return [];
  return [Object.freeze({ dayKey: todayDayKey, progress: today, targets: safeTargets })];
}

/* expo-router: utility module, not a visible route. */
export default function __TodayActivityHistoryRouteShim() { return null; }
