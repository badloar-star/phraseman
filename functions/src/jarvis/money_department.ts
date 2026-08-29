import type { AppTier } from './app_tier';
import { tierThresholdMultiplier } from './app_tier';
import { buildDecision, type Decision, type DecisionTrigger } from './decision';
import type { FetchMoneySourceResult } from './money_firestore_fetcher';
import {
  MONEY_REPORT_COLLECTIONS,
  aggregateMoneyRows,
  buildMoneyEvidence,
  diagnosePersonalEconomy,
  type MoneyReportCollection,
} from './money_source_reader';
import { buildMetricTree, explainMetricChange } from './metric_tree';

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

/**
 * Вчерашняя точка из истории бизнес-тиров.
 *
 * зачем необязательная: истории может не быть (первый запуск, чтение упало).
 * Департамент обязан работать и без неё — просто без разбора по частям.
 * Выдумывать «вчера было ноль» нельзя: это превратило бы первый запуск
 * в рапорт о катастрофическом росте.
 */
export interface MoneyYesterdayPoint {
  readonly newPaying: number;
  readonly renewals: number;
  readonly refunds: number;
}

export interface RunMoneyDepartmentInput {
  readonly fetches: readonly FetchMoneySourceResult[];
  readonly trigger: DecisionTrigger;
  readonly question?: string;
  readonly nowMs: number;
  readonly appTier?: AppTier;
  readonly yesterday?: MoneyYesterdayPoint | null;
}

export interface RunMoneyDepartmentResult {
  readonly decisions: readonly Decision[];
}

interface RefundSpike {
  readonly refunds: number;
  readonly newPaying: number;
  readonly rate: number;
}

const PERSONAL_ECONOMY_SOURCES = Object.freeze([
  // зачем (2026-08-29): вместо двух мёртвых client_economy_* — обезличенный
  // дневной агрегат; проверки цепочки делает клиент, сюда идут счётчики.
  'economy_daily_stats',
  'external_economy_events',
] as const);

function trustworthy(fetch: FetchMoneySourceResult | undefined): fetch is FetchMoneySourceResult {
  return Boolean(fetch)
    && (fetch!.state === 'ready' || fetch!.state === 'empty')
    && !fetch!.truncated
    && fetch!.droppedCount === 0;
}

function missingFetch(sourceId: MoneyReportCollection, nowMs: number): FetchMoneySourceResult {
  return Object.freeze({
    sourceId,
    state: 'error' as const,
    truncated: false,
    droppedCount: 0,
    rows: Object.freeze([]),
    observedAtMs: nowMs,
  });
}

function requiredFetches(
  fetches: readonly FetchMoneySourceResult[],
  nowMs: number,
): readonly FetchMoneySourceResult[] {
  return MONEY_REPORT_COLLECTIONS.map((sourceId) => {
    const matches = fetches.filter((fetch) => fetch.sourceId === sourceId);
    return matches.length === 1 ? matches[0] : missingFetch(sourceId, nowMs);
  });
}

function findRefundSpike(fetches: readonly FetchMoneySourceResult[], appTier: AppTier): RefundSpike | null {
  const revenuecat = fetches.find((fetch) => fetch.sourceId === 'revenuecat_premium_events');
  if (!trustworthy(revenuecat)) return null;
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

/**
 * Раскладывает сегодняшние деньги по составляющим и называет ту, что
 * объясняет сдвиг.
 *
 * зачем брать вчерашнюю точку из истории, а не тянуть второй период из
 * RevenueCat: история уже собирается суточным кроном и содержит ровно эти
 * три числа. Второй запрос к событиям удвоил бы чтения ради того, что
 * уже посчитано.
 */
function explainMoneyBreakdown(
  fetches: readonly FetchMoneySourceResult[],
  yesterday: MoneyYesterdayPoint | null,
): string {
  if (!yesterday) return '';
  const revenuecat = fetches.find((fetch) => fetch.sourceId === 'revenuecat_premium_events');
  if (!trustworthy(revenuecat)) return '';
  const today = aggregateMoneyRows(revenuecat.rows);

  return explainMetricChange(buildMetricTree({
    metric: 'Денежные события',
    branches: [
      { name: 'Новые платящие', current: today.newPaying, previous: yesterday.newPaying },
      { name: 'Продления', current: today.renewals, previous: yesterday.renewals },
      // зачем возвраты со знаком минус: они уменьшают итог, и в дереве
      // должны двигаться в ту же сторону, что и общая сумма.
      // зачем inverted (аудит 2026-08-16): без этого флага текст выходил
      // перевёрнутым — «Возвраты просела», когда возвратов стало больше.
      { name: 'Возвраты', current: -today.refunds, previous: -yesterday.refunds, inverted: true },
    ],
  }));
}

export function runMoneyDepartment(input: RunMoneyDepartmentInput): RunMoneyDepartmentResult {
  const fetches = requiredFetches(input.fetches, input.nowMs);
  const evidence = fetches.map((fetch) => buildMoneyEvidence({
    sourceId: fetch.sourceId,
    state: fetch.state,
    truncated: fetch.truncated,
    droppedCount: fetch.droppedCount,
    rows: fetch.rows,
    observedAtMs: fetch.observedAtMs,
  }));

  const completeEvidence = evidence.every((item) => item.trustworthy);
  const appTier: AppTier = input.appTier ?? 'seed';
  const spike = completeEvidence ? findRefundSpike(fetches, appTier) : null;
  const personalFetches = PERSONAL_ECONOMY_SOURCES.map((sourceId) => fetches.find((fetch) => fetch.sourceId === sourceId));
  const economy = completeEvidence && personalFetches.every(trustworthy) ? diagnosePersonalEconomy(fetches) : null;
  const economyAnomaly = economy !== null && (economy.invalidRows > 0
    || economy.revisionDiscontinuities > 0
    || economy.balanceDiscontinuities > 0
    || economy.duplicateExternalFacts > 0);

  const shouldDecide = input.trigger === 'owner_request' || Boolean(spike) || economyAnomaly || !completeEvidence;
  if (!shouldDecide) return { decisions: [] };

  const economyFinding = economy
    ? `Экономика: ${economy.operationCount} клиентских операций, ${economy.externalEventCount} внешних событий; некорректных строк ${economy.invalidRows}, разрывов ревизии ${economy.revisionDiscontinuities}, разрывов баланса ${economy.balanceDiscontinuities}, повторов внешних фактов ${economy.duplicateExternalFacts}.`
    : '';
  // зачем разбор (аудит 2026-08-16): «денег меньше» — это констатация,
  // с которой владелец идёт искать причину сам. Дерево называет часть,
  // объясняющую сдвиг, и делает это детерминированным кодом, а не догадкой.
  const breakdown = completeEvidence ? explainMoneyBreakdown(fetches, input.yesterday ?? null) : '';
  const finding = [
    buildFindingText(spike, fetches, completeEvidence),
    breakdown,
    economyFinding,
  ].filter(Boolean).join(' ');
  const question = input.question ?? (spike ? 'Растут ли возвраты относительно новых платящих?' : 'Есть ли аномалии в деньгах за последние сутки?');

  const decision = buildDecision({
    department: 'money',
    mode: 'observe',
    trigger: input.trigger,
    question,
    finding,
    hypothesis: economyAnomaly
      ? 'Нарушена непрерывность append-only журнала либо в выборке есть некорректный/повторный экономический факт.'
      : spike
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
    recommendation: economyAnomaly
      ? 'Проверить владельцев и операции, вошедшие в разрывы экономического журнала'
      : spike ? 'Проверить недавние изменения paywall/цены' : 'Продолжить наблюдение без вмешательства',
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
