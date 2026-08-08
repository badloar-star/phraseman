import { tierThresholdMultiplier, type AppTier } from './app_tier';
import { buildDecision, normalizeEvidence, type Decision, type DecisionTrigger, type Evidence } from './decision';
import type { FetchRetentionSourceResult } from './retention_firestore_fetcher';

/**
 * Департамент «Удержание» — возвращаются ли люди.
 *
 * зачем ЗДЕСЬ тир смягчает порог (в отличие от «Платежей» и «Безопасности»):
 * удержание — доля, а не человек. На базе в сто активных доля скачет от пары
 * ушедших в отпуск, и будить владельца этим нельзя. На зрелой базе такое же
 * падение — уже настоящий сигнал. Поэтому порог делится на относительный
 * множитель тира: seed=2 делает его вдвое мягче, mature=1 оставляет строгим.
 *
 * Департамент только НАБЛЮДАЕТ. Рассылки и возвращающие пуши — решение
 * владельца: план запрещает автоматически писать пользователям.
 */

/** Ниже этой доли вернувшихся удержание слабое (для зрелой базы). */
export const RETENTION_WEAK_RATIO = 0.4;

/** Меньше этого числа активных — доли считать бессмысленно, это шум. */
export const RETENTION_MIN_BASE = 50;

export interface RunRetentionDepartmentInput {
  readonly fetch: FetchRetentionSourceResult;
  readonly trigger: DecisionTrigger;
  readonly question?: string;
  readonly nowMs: number;
  readonly appTier?: AppTier;
}

export interface RunRetentionDepartmentResult {
  readonly decisions: readonly Decision[];
}

/** Только доли и количества — ни одного uid. */
function buildRetentionEvidence(fetch: FetchRetentionSourceResult): Evidence {
  return normalizeEvidence({
    sourceId: 'users',
    state: fetch.state,
    count: fetch.activeMonth,
    truncated: false,
    droppedCount: 0,
    observedAtMs: fetch.observedAtMs,
    digest: JSON.stringify({ week: fetch.activeWeek, month: fetch.activeMonth }),
  });
}

export function runRetentionDepartment(input: RunRetentionDepartmentInput): RunRetentionDepartmentResult {
  const evidence = [buildRetentionEvidence(input.fetch)];
  const trustworthy = evidence.some((item) => item.trustworthy);

  const week = input.fetch.activeWeek ?? 0;
  const month = input.fetch.activeMonth ?? 0;

  // зачем делить, а не умножать: относительный множитель УБЫВАЕТ с ростом базы
  // (seed=2 … mature=1), а нам нужен порог, который на маленькой базе мягче.
  const multiplier = tierThresholdMultiplier(input.appTier ?? 'mature');
  const weakRatio = RETENTION_WEAK_RATIO / multiplier;

  const bigEnough = month >= RETENTION_MIN_BASE;
  const ratio = month > 0 ? week / month : null;
  const weak = bigEnough && ratio !== null && ratio < weakRatio;

  const shouldDecide = input.trigger === 'owner_request' || weak || !trustworthy;
  if (!shouldDecide) return { decisions: [] };

  const percent = ratio === null ? null : Math.round(ratio * 100);

  const finding = !trustworthy
    ? 'Не удалось прочитать активность пользователей — WAU/MAU неизвестен.'
    : month === 0
      ? 'За последний месяц активных пользователей не было — WAU/MAU пока не о чем считать.'
      : !bigEnough
        ? `Активных за месяц ${month} — слишком мало, чтобы судить о WAU/MAU по долям.`
        : weak
          ? `WAU/MAU: из ${month} активных за 30 дней на этой неделе были активны только ${week} — ${percent}%. Это частота активности, не когортное удержание.`
          : `WAU/MAU: из ${month} активных за 30 дней на этой неделе были активны ${week} — ${percent}%. Это частота активности, не когортное удержание.`;

  const question = input.question ?? (weak ? 'Почему люди перестают возвращаться?' : 'Как обстоят дела с возвращаемостью?');

  const decision = buildDecision({
    department: 'retention',
    mode: 'observe',
    trigger: input.trigger,
    question,
    finding,
    hypothesis: weak
    ? 'Этот снимок не доказывает причину. Нужны когортные данные и события воронки, чтобы объяснить изменение активности.'
      : 'Недостаточно данных для гипотезы.',
    options: weak
      ? [
        { title: 'Посмотреть, на каком уроке обрывается путь (департамент «Фабрика контента»)', cost: 0, risk: 'low' },
        { title: 'Спросить у нескольких ушедших, почему перестали заходить', cost: 0, risk: 'low' },
      ]
      : [
        { title: 'Продолжить наблюдение без вмешательства', cost: 0, risk: 'low' },
        { title: 'Запросить у владельца дополнительный контекст', cost: 0, risk: 'low' },
      ],
    recommendation: weak
      ? 'Посмотреть, на каком уроке обрывается путь (департамент «Фабрика контента»)'
      : 'Продолжить наблюдение без вмешательства',
    risk: weak
      ? 'Люди уходят тихо и не жалуются: без ответа на этот вопрос рост будет уходить в дырявое ведро'
      : 'Пропустить начало оттока, если он появится позже',
    cost: 0,
    successMetric: weak
      ? `Доля вернувшихся за неделю поднимается выше ${Math.round(weakRatio * 100)}%`
      : 'Доля вернувшихся остаётся на текущем уровне',
    rollback: 'Не применимо — департамент только наблюдает, рассылки запускает владелец',
    evidence,
    nowMs: input.nowMs,
  });

  return { decisions: [decision] };
}
