export type TodayMetrics = {
  minutes: number;
  xp: number;
  lessons: number;
};

type ActivityDayLike = {
  date: string;
  minutes: number;
  xp: number;
  metrics: { lessons: number };
};

const ZERO_TODAY_METRICS: TodayMetrics = { minutes: 0, xp: 0, lessons: 0 };

function nonNegativeInteger(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0;
}

export function selectTodayMetricsFromActivity(
  days: readonly ActivityDayLike[],
  nowMs = Date.now(),
): TodayMetrics {
  const todayKey = new Date(nowMs).toISOString().slice(0, 10);
  const today = days.find(day => day.date === todayKey);
  if (!today) return ZERO_TODAY_METRICS;
  return {
    minutes: nonNegativeInteger(today.minutes),
    xp: nonNegativeInteger(today.xp),
    lessons: nonNegativeInteger(today.metrics.lessons),
  };
}
