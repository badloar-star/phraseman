import type { BusinessTierFinancialCoverage } from './business_tier_history';
import type { RecentHistoryPoint } from './business_tier_history_store';

/**
 * Даунсемплинг истории для ответа панели.
 *
 * зачем: план прямо требует не возвращать неограниченную историю. Последние
 * RECENT_DAILY_DAYS дней отдаются по дням (там важна разрешающая способность
 * графика), всё старше сжимается в недели — иначе через пару лет 700+ точек
 * сделают SVG шумным, а payload раздутым без пользы для глаза.
 *
 * зачем разделять stock и flow: кумулятив/активные — это УРОВЕНЬ на конец
 * периода (берём последнее значение), деньги — ПОТОК за период (суммируем).
 * Суммирование уровня — классическая ошибка, от которой график роста
 * «взлетает» кратно на ровном месте.
 */

export const RECENT_DAILY_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1_000;

export interface BusinessHistoryWeekPoint {
  readonly weekKey: string;
  readonly cumulativeUsers: number;
  readonly activeUsers: number | null;
  readonly newUsers: number;
  readonly newPaying: number;
  readonly renewals: number;
  readonly refunds: number;
  readonly grossUsdMicros: number;
  readonly mrrEquivalentProceedsUsdMicros: number;
  readonly dayMoneyCoverage: BusinessTierFinancialCoverage;
}

export interface DownsampledBusinessHistory {
  readonly daily: readonly RecentHistoryPoint[];
  readonly weekly: readonly BusinessHistoryWeekPoint[];
}

/** ISO-неделя 'YYYY-Www' — сортируется лексикографически, стабильна через год. */
function isoWeekKey(dayKey: string): string {
  const [year, month, day] = dayKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const dayNum = (date.getUTCDay() + 6) % 7; // понедельник = 0
  date.setUTCDate(date.getUTCDate() - dayNum + 3); // ближайший четверг
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  const week = 1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * DAY_MS));
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

const COVERAGE_RANK: Readonly<Record<BusinessTierFinancialCoverage, number>> = Object.freeze({
  complete: 2, partial: 1, unavailable: 0,
});

function worstCoverage(a: BusinessTierFinancialCoverage, b: BusinessTierFinancialCoverage): BusinessTierFinancialCoverage {
  return COVERAGE_RANK[a] <= COVERAGE_RANK[b] ? a : b;
}

function aggregateWeek(weekKey: string, days: readonly RecentHistoryPoint[]): BusinessHistoryWeekPoint {
  const last = days[days.length - 1];
  let newUsers = 0;
  let newPaying = 0;
  let renewals = 0;
  let refunds = 0;
  let grossUsdMicros = 0;
  let mrrEquivalentProceedsUsdMicros = 0;
  let coverage: BusinessTierFinancialCoverage = 'complete';
  // зачем последнее НЕ-null: у бэкфилла активные известны не каждый день;
  // если в неделе есть хоть одно реальное измерение — честнее показать его,
  // чем схлопнуть всю неделю в «нет данных» из-за пустого хвоста.
  let lastKnownActive: number | null = null;

  for (const day of days) {
    newUsers += day.newUsers;
    newPaying += day.newPaying;
    renewals += day.renewals;
    refunds += day.refunds;
    grossUsdMicros += day.grossUsdMicros;
    mrrEquivalentProceedsUsdMicros += day.mrrEquivalentProceedsUsdMicros;
    coverage = worstCoverage(coverage, day.dayMoneyCoverage);
    if (day.activeUsers !== null) lastKnownActive = day.activeUsers;
  }

  return Object.freeze({
    weekKey,
    cumulativeUsers: last.cumulativeUsers,
    activeUsers: lastKnownActive,
    newUsers,
    newPaying,
    renewals,
    refunds,
    grossUsdMicros,
    mrrEquivalentProceedsUsdMicros,
    dayMoneyCoverage: coverage,
  });
}

export function downsampleBusinessHistory(
  points: readonly RecentHistoryPoint[],
  nowMs: number,
  recentDailyDays: number = RECENT_DAILY_DAYS,
): DownsampledBusinessHistory {
  if (points.length === 0) return Object.freeze({ daily: [], weekly: [] });

  const sorted = [...points].sort((a, b) => (a.dayKey < b.dayKey ? -1 : a.dayKey > b.dayKey ? 1 : 0));
  const cutoffKey = new Date(nowMs - recentDailyDays * DAY_MS).toISOString().slice(0, 10);

  const daily = sorted.filter((p) => p.dayKey > cutoffKey);
  const older = sorted.filter((p) => p.dayKey <= cutoffKey);

  const groups = new Map<string, RecentHistoryPoint[]>();
  for (const day of older) {
    const key = isoWeekKey(day.dayKey);
    const group = groups.get(key);
    if (group) group.push(day);
    else groups.set(key, [day]);
  }

  const weekly = Array.from(groups.keys())
    .sort()
    .map((weekKey) => aggregateWeek(weekKey, groups.get(weekKey) ?? []));

  return Object.freeze({ daily: Object.freeze(daily), weekly: Object.freeze(weekly) });
}
