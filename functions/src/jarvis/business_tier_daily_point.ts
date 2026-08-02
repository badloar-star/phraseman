import {
  bucketRawEventsByDay,
  dayKeyFromMs,
  revenueProxyOf,
  type BusinessTierHistoryPoint,
  type RawRevenueEventForBucketing,
} from './business_tier_history';

/**
 * Точка истории за СЕГОДНЯ, которую пишет суточный крон.
 *
 * зачем отдельно от бэкфилла: у ежедневной точки есть то, чего у
 * ретроактивной быть не может — настоящий замер активных пользователей на
 * этот день. Бэкфилл ставит activeUsers: null (историю активности никто не
 * хранил), крон заполняет её реальным числом начиная с момента включения.
 */

export interface BuildDailyHistoryPointInput {
  readonly nowMs: number;
  readonly totalUsers: number;
  /** null, если .count() активных не удался — прочерк честнее нуля. */
  readonly activeUsers: number | null;
  /** Кумулятив на предыдущей записанной точке — источник newUsers за сегодня. */
  readonly previousCumulativeUsers: number;
  readonly revenueRows: readonly RawRevenueEventForBucketing[];
}

function safeCount(value: number): number {
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

export function buildDailyHistoryPoint(input: BuildDailyHistoryPointInput): BusinessTierHistoryPoint {
  const dayKey = dayKeyFromMs(input.nowMs);
  const cumulativeUsers = safeCount(input.totalUsers);
  // зачем max(0): аккаунты удаляются, тотал может уменьшиться — отрицательные
  // «новые пользователи» на графике были бы бессмыслицей.
  const newUsers = Math.max(0, cumulativeUsers - safeCount(input.previousCumulativeUsers));

  const byDay = bucketRawEventsByDay([], input.revenueRows);
  const today = byDay.get(dayKey);

  return Object.freeze({
    dayKey,
    cumulativeUsers,
    newUsers,
    newPaying: today?.newPaying ?? 0,
    renewals: today?.renewals ?? 0,
    refunds: today?.refunds ?? 0,
    revenueProxy: revenueProxyOf(today?.newPaying ?? 0, today?.renewals ?? 0, today?.refunds ?? 0),
    grossUsdMicros: today?.grossUsdMicros ?? 0,
    mrrEquivalentProceedsUsdMicros: today?.mrrEquivalentProceedsUsdMicros ?? 0,
    // Нет событий вовсе — 'unavailable': это «денег в этот день не наблюдалось»,
    // а не уверенный «ноль дохода».
    dayMoneyCoverage: today?.dayMoneyCoverage ?? 'unavailable',
    activeUsers: input.activeUsers,
  });
}
