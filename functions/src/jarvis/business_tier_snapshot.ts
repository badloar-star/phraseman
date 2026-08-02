import {
  computeBusinessHealth,
  type BusinessTier,
} from './business_tier';
import type { BusinessTierFinancialCoverage } from './business_tier_history';
import type { RecentHistoryPoint } from './business_tier_history_store';

/**
 * Текущий срез для панели — тир, прогресс и свежие метрики.
 *
 * зачем считать MRR из УЖЕ прочитанной истории, а не отдельным запросом:
 * панель всё равно тянет историю для графика, и месячный доход честно
 * выводится как сумма месячных эквивалентов за скользящее окно —
 * ноль дополнительных чтений Firestore (Firebase-экономия).
 *
 * зачем окно 30 дней: MRR — это МЕСЯЧНЫЙ доход. Сумма за сутки была бы
 * дневной выручкой, названной чужим именем — цифра, вводящая в заблуждение
 * ровно там, где владелец принимает решения о деньгах.
 */

export const MRR_WINDOW_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1_000;
const USD_MICROS = 1_000_000;

export interface BuildBusinessTierSnapshotInput {
  readonly history: readonly RecentHistoryPoint[];
  readonly totalUsers: number;
  /** null, если срез активных не удалось прочитать — прочерк, а не ноль. */
  readonly activeUsers: number | null;
  readonly storedPeakTier: BusinessTier | null;
  readonly nowMs: number;
}

export interface BusinessTierSnapshot {
  /** false — истории ещё нет (бэкфилл не запускали): UI обязан звать к запуску, а не рисовать нули. */
  readonly hasData: boolean;
  /** Показываемый тир — достигнутый максимум (храповик). */
  readonly tier: BusinessTier;
  /** Где метрики находятся сейчас — может быть ниже показанного. */
  readonly currentTier: BusinessTier;
  readonly belowPeak: boolean;
  readonly bindingMetric: 'mrrUsd' | 'activeUsers';
  /** null, если в окне нет ни одного дня с известной суммой. */
  readonly mrrUsd: number | null;
  readonly moneyCoverage: BusinessTierFinancialCoverage;
  readonly totalUsers: number;
  readonly activeUsers: number | null;
  readonly historyDays: number;
}

const COVERAGE_RANK: Readonly<Record<BusinessTierFinancialCoverage, number>> = Object.freeze({
  complete: 2, partial: 1, unavailable: 0,
});

function worstCoverage(a: BusinessTierFinancialCoverage, b: BusinessTierFinancialCoverage): BusinessTierFinancialCoverage {
  return COVERAGE_RANK[a] <= COVERAGE_RANK[b] ? a : b;
}

export function buildBusinessTierSnapshot(input: BuildBusinessTierSnapshotInput): BusinessTierSnapshot {
  const cutoffKey = new Date(input.nowMs - MRR_WINDOW_DAYS * DAY_MS).toISOString().slice(0, 10);
  const window = input.history.filter((point) => point.dayKey > cutoffKey);

  let micros = 0;
  let coverage: BusinessTierFinancialCoverage = 'unavailable';
  let sawAnyMoneyDay = false;
  for (const point of window) {
    micros += point.mrrEquivalentProceedsUsdMicros;
    if (point.dayMoneyCoverage !== 'unavailable') {
      coverage = sawAnyMoneyDay ? worstCoverage(coverage, point.dayMoneyCoverage) : point.dayMoneyCoverage;
      sawAnyMoneyDay = true;
    } else if (sawAnyMoneyDay) {
      coverage = 'partial'; // часть окна без данных — не выдаём сумму за полную
    }
  }

  const mrrUsd = sawAnyMoneyDay ? micros / USD_MICROS : null;
  const safeTotal = Number.isFinite(input.totalUsers) && input.totalUsers >= 0 ? input.totalUsers : 0;

  // зачем 0 для активных при null: классификатор обязан получить число, а
  // отсутствие измерения не даёт права утверждать масштаб — самый строгий
  // (нулевой) вход честнее оптимистичной подстановки тотала.
  const health = computeBusinessHealth(
    { mrrUsd: mrrUsd ?? 0, activeUsers: input.activeUsers ?? 0 },
    input.storedPeakTier,
  );

  return Object.freeze({
    hasData: input.history.length > 0,
    tier: health.tier,
    currentTier: health.currentTier,
    belowPeak: health.belowPeak,
    bindingMetric: health.bindingMetric,
    mrrUsd,
    moneyCoverage: coverage,
    totalUsers: safeTotal,
    activeUsers: input.activeUsers,
    historyDays: input.history.length,
  });
}
