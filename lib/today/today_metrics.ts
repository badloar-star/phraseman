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

type ActivityActiveDayLike = { date: string; active: boolean; future?: boolean };

/**
 * зачем: правила рекомендаций были мертвы из-за захардкоженного daysSinceLearning=null —
 * считаем разрыв по уже загруженному 365-дневному окну активности (без новых чтений):
 * сколько дней подряд перед сегодня ученик не занимался. null, если данных нет
 * или последний активный день — сегодня.
 */
export function selectDaysSinceLearningFromActivity(
  days: readonly ActivityActiveDayLike[],
  nowMs = Date.now(),
): number | null {
  const todayKey = new Date(nowMs).toISOString().slice(0, 10);
  const past = days.filter(day => !day.future && day.date < todayKey).sort((a, b) => a.date.localeCompare(b.date));
  if (past.length === 0) return null;
  const lastActiveIndex = [...past].reverse().findIndex(day => day.active);
  if (lastActiveIndex === -1) return null;
  return lastActiveIndex === 0 ? null : lastActiveIndex;
}
