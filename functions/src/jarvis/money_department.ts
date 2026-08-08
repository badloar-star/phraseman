import type { AppTier } from './app_tier';
import { tierThresholdMultiplier } from './app_tier';
import { buildDecision, type Decision, type DecisionTrigger } from './decision';
import type { FetchMoneySourceResult } from './money_firestore_fetcher';
import { aggregateMoneyRows, buildMoneyEvidence } from './money_source_reader';

/**
 * Департамент «Деньги» — второй департамент Джарвиса (решение владельца
 * 2026-08-02). Читает revenuecat_premium_events/paywall_funnel, решает,
 * есть ли скачок возвратов, и если да — строит Decision.
 * Департаменты не общаются между собой: только пишут Decision в журнал.
 *
 * зачем appTier: владелец 2026-08-02 — тот же % возвратов не должен звучать
 * одинаково тревожно на маленькой и на зрелой базе. Без явного тира считаем
 * его 'seed' (самый строгий порог) — отсутствие данных о масштабе не должно
 * само по себе делать департамент более шумным.
 */

/** Минимум новых платящих в знаменателе — иначе один возврат на двух
 * покупателей даёт 50% и это не сигнал, а шум маленькой выборки. */
const MIN_NEW_PAYING_FOR_SIGNAL = 5;
/** Базовый порог доли возвратов относительно новых платящих за сутки —
 * масштабируется tierThresholdMultiplier(appTier). */
const REFUND_RATE_SPIKE_THRESHOLD = 0.3;

export interface RunMoneyDepartmentInput {
  readonly fetches: readonly FetchMoneySourceResult[];
  readonly trigger: DecisionTrigger;
  readonly question?: string;
  readonly nowMs: number;
  readonly appTier?: AppTier;
}

export interface RunMoneyDepartmentResult {
  readonly decisions: readonly Decision[];
}

interface RefundSpike {
  readonly refunds: number;
  readonly newPaying: number;
  readonly rate: number;
}

function findRefundSpike(fetches: readonly FetchMoneySourceResult[], appTier: AppTier): RefundSpike | null {
  const revenuecat = fetches.find((fetch) => fetch.sourceId === 'revenuecat_premium_events');
  if (!revenuecat) return null;
  const aggregate = aggregateMoneyRows(revenuecat.rows);
  if (aggregate.newPaying < MIN_NEW_PAYING_FOR_SIGNAL) return null;
  const rate = aggregate.refunds / aggregate.newPaying;
  const threshold = REFUND_RATE_SPIKE_THRESHOLD * tierThresholdMultiplier(appTier);
  if (rate < threshold) return null;
  return { refunds: aggregate.refunds, newPaying: aggregate.newPaying, rate };
}

function buildFindingText(
  spike: RefundSpike | null,
  fetches: readonly FetchMoneySourceResult[],
  completeEvidence: boolean,
): string {
  if (spike) {
    const pct = Math.round(spike.rate * 100);
    return `За последние сутки ${spike.refunds} возвратов на ${spike.newPaying} новых платящих (${pct}%) — заметно выше обычного.`;
  }
  if (!completeEvidence) {
    return 'Один из обязательных денежных источников недоступен — доступный источник не показал событий, но полная картина не доказана.';
  }
  const revenuecat = fetches.find((fetch) => fetch.sourceId === 'revenuecat_premium_events');
  const aggregate = revenuecat ? aggregateMoneyRows(revenuecat.rows) : null;
  return aggregate
    ? `За последние сутки ${aggregate.newPaying} новых платящих, ${aggregate.refunds} возвратов — без явного скачка.`
    : 'Недостаточно данных о новых платящих за последние сутки.';
}

export function runMoneyDepartment(input: RunMoneyDepartmentInput): RunMoneyDepartmentResult {
  const evidence = input.fetches.map((fetch) => buildMoneyEvidence({
    sourceId: fetch.sourceId,
    state: fetch.state,
    truncated: fetch.truncated,
    droppedCount: fetch.droppedCount,
    rows: fetch.rows,
    observedAtMs: fetch.observedAtMs,
  }));

  const appTier: AppTier = input.appTier ?? 'seed';
  const spike = findRefundSpike(input.fetches, appTier);
  const completeEvidence = evidence.length > 0 && evidence.every((item) => item.trustworthy);

  const shouldDecide = input.trigger === 'owner_request' || Boolean(spike) || !completeEvidence;
  if (!shouldDecide) return { decisions: [] };

  const finding = buildFindingText(spike, input.fetches, completeEvidence);
  const question = input.question ?? (spike ? 'Растут ли возвраты относительно новых платящих?' : 'Есть ли аномалии в деньгах за последние сутки?');

  const decision = buildDecision({
    department: 'money',
    mode: 'observe',
    trigger: input.trigger,
    question,
    finding,
    hypothesis: spike
      ? 'Вероятная причина — проблема с ценой, качеством подписки или недавним изменением paywall.'
      : 'Недостаточно данных для гипотезы.',
    options: spike
      ? [
        { title: 'Проверить недавние изменения paywall/цены', cost: 0, risk: 'low' },
        { title: 'Связаться с частью пользователей, оформивших возврат', cost: 2, risk: 'medium' },
      ]
      : [
        { title: 'Продолжить наблюдение без вмешательства', cost: 0, risk: 'low' },
        { title: 'Запросить у владельца дополнительный контекст', cost: 0, risk: 'low' },
      ],
    recommendation: spike ? 'Проверить недавние изменения paywall/цены' : 'Продолжить наблюдение без вмешательства',
    risk: spike ? 'Возврат вложений на выяснение причины, если скачок окажется шумом' : 'Пропустить начало скачка, если он появится позже',
    cost: spike ? 0 : 0,
    successMetric: spike ? 'Доля возвратов возвращается ниже порога в следующем суточном снапшоте' : 'Отсутствие новых скачков в следующем суточном снапшоте',
    rollback: 'Вернуть предыдущую цену/конфигурацию paywall',
    evidence,
    evidencePolicy: 'all_trustworthy',
    nowMs: input.nowMs,
  });

  return { decisions: [decision] };
}
