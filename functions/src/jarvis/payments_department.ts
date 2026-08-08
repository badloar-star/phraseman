import type { AppTier } from './app_tier';
import { buildDecision, normalizeEvidence, type Decision, type DecisionTrigger, type Evidence } from './decision';
import type { FetchPaymentsSourceResult, PaymentFailureRow } from './payments_firestore_fetcher';

/**
 * Департамент «Платежи» — ловит СЛОМАННОЕ в оплате, в отличие от департамента
 * «Деньги», который считает успешную выручку.
 *
 * зачем без масштабирования по тиру: потерянный платёж — не статистика, а
 * конкретный человек, отдавший деньги и не получивший доступ. Один случай
 * на зрелой базе так же неприемлем, как на маленькой. Тир здесь сознательно
 * НЕ смягчает порог (в отличие от «Качества» и «Денег»).
 */

/** Столько отказов подряд за окно — признак сломанной интеграции, а не единичной ошибки. */
export const DENIAL_SPIKE_THRESHOLD = 10;

export interface RunPaymentsDepartmentInput {
  readonly fetches: readonly FetchPaymentsSourceResult[];
  readonly trigger: DecisionTrigger;
  readonly question?: string;
  readonly nowMs: number;
  /** Принимается для единообразия API, но на порог НЕ влияет — см. комментарий выше. */
  readonly appTier?: AppTier;
}

export interface RunPaymentsDepartmentResult {
  readonly decisions: readonly Decision[];
}

function countPaidUnfulfilled(fetches: readonly FetchPaymentsSourceResult[]): number {
  return fetches.reduce(
    (sum, fetch) => sum + fetch.rows.filter((row: PaymentFailureRow) => row.paidButUnfulfilled).length,
    0,
  );
}

function countOpenDenials(fetches: readonly FetchPaymentsSourceResult[]): number {
  return fetches
    .filter((fetch) => fetch.sourceId === 'revenuecat_premium_denials')
    .reduce((sum, fetch) => sum + fetch.rows.filter((row) => !row.resolved).length, 0);
}

/** Только счётчики — ни платёжных id, ни сырых апдейтов Telegram. */
function buildPaymentsEvidence(fetch: FetchPaymentsSourceResult): Evidence {
  const paidUnfulfilled = fetch.rows.filter((row) => row.paidButUnfulfilled).length;
  const unresolved = fetch.rows.filter((row) => !row.resolved).length;
  return normalizeEvidence({
    sourceId: fetch.sourceId,
    state: fetch.state,
    count: fetch.rows.length,
    truncated: fetch.truncated,
    droppedCount: fetch.droppedCount,
    observedAtMs: fetch.observedAtMs,
    digest: JSON.stringify({ failures: fetch.rows.length, unresolved, paidUnfulfilled }),
  });
}

export function runPaymentsDepartment(input: RunPaymentsDepartmentInput): RunPaymentsDepartmentResult {
  const evidence = input.fetches.map(buildPaymentsEvidence);
  const anyTrustworthy = evidence.some((item) => item.trustworthy);

  const lostPayments = countPaidUnfulfilled(input.fetches);
  const openDenials = countOpenDenials(input.fetches);
  const denialSpike = openDenials >= DENIAL_SPIKE_THRESHOLD;

  const shouldDecide = input.trigger === 'owner_request' || lostPayments > 0 || denialSpike || !anyTrustworthy;
  if (!shouldDecide) return { decisions: [] };

  // Порядок важен: потерянные деньги перекрывают всё остальное.
  const finding = !anyTrustworthy
    ? 'Не удалось прочитать журналы платёжных сбоев — источники недоступны.'
    : lostPayments > 0
      ? `${lostPayments} чел. заплатили, но доступ не выдался — деньги списаны, услуга не оказана.`
      : denialSpike
        ? `${openDenials} отказов в выдаче Plus за неделю — похоже на сбой интеграции, а не на единичные случаи.`
        : 'Платёжных сбоев за неделю не зафиксировано.';

  const question = input.question ?? (lostPayments > 0
    ? 'Почему у оплативших не выдался доступ?'
    : denialSpike
      ? 'Почему растут отказы в выдаче Plus?'
      : 'Есть ли проблемы с оплатами?');

  const urgent = lostPayments > 0;

  const decision = buildDecision({
    department: 'payments',
    mode: 'observe',
    trigger: input.trigger,
    question,
    finding,
    hypothesis: urgent
      ? 'Вероятная причина — сбой обработчика вебхука или рассинхронизация идентификаторов пользователя.'
      : denialSpike
        ? 'Вероятная причина — изменение формата событий RevenueCat или проблема со связыванием аккаунтов.'
        : 'Недостаточно данных для гипотезы.',
    options: urgent
      ? [
        { title: 'Выдать Plus вручную пострадавшим и разобрать причину', cost: 0, risk: 'low' },
        { title: 'Только разобрать причину, выдачу отложить', cost: 0, risk: 'high' },
      ]
      : denialSpike
        ? [
          { title: 'Проверить журнал отказов и формат событий RevenueCat', cost: 0, risk: 'low' },
          { title: 'Продолжить наблюдение ещё сутки', cost: 0, risk: 'medium' },
        ]
        : [
          { title: 'Продолжить наблюдение без вмешательства', cost: 0, risk: 'low' },
          { title: 'Запросить у владельца дополнительный контекст', cost: 0, risk: 'low' },
        ],
    recommendation: urgent
      ? 'Выдать Plus вручную пострадавшим и разобрать причину'
      : denialSpike
        ? 'Проверить журнал отказов и формат событий RevenueCat'
        : 'Продолжить наблюдение без вмешательства',
    risk: urgent
      ? 'Каждый час промедления — это человек, который заплатил и остался без услуги; дальше идут возврат и плохой отзыв'
      : denialSpike
        ? 'Отказы могут копиться незаметно, пока пользователи не начнут жаловаться'
        : 'Пропустить начало сбоя, если он появится позже',
    cost: 0,
    successMetric: urgent
      ? 'Ноль записей «заплатил, но не получил» в следующем суточном снапшоте'
      : denialSpike
        ? 'Число отказов возвращается к единичным значениям'
        : 'Платёжные сбои не появляются в следующем снапшоте',
    rollback: 'Не применимо — департамент только наблюдает, выдача Plus выполняется владельцем вручную',
    evidence,
    nowMs: input.nowMs,
  });

  return { decisions: [decision] };
}
