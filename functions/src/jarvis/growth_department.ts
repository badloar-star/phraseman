import { buildDecision, type Decision, type DecisionTrigger } from './decision';
import type { FetchGrowthSourceResult } from './growth_firestore_fetcher';
import { aggregateGrowthRows, buildGrowthEvidence } from './growth_source_reader';

/**
 * Департамент «Рост» — третий департамент Джарвиса (решение владельца
 * 2026-08-02). Читает только users.created_at — приток новых пользователей.
 *
 * зачем правило именно такое: настоящее удержание/отток в проекте считается
 * только через BigQuery (отдельная платная инфраструктура), полное
 * сканирование users (как в re_engage_push.ts) владелец отклонил как
 * противоречащее Firebase-экономии. Без истории предыдущих периодов внутри
 * одного снапшота нельзя честно утверждать «упало относительно вчера» —
 * поэтому единственный сигнал, который не выдумывает тренд: полный ноль
 * новых регистраций за сутки. Это уже само по себе достаточно необычно,
 * чтобы владелец на это посмотрел.
 */

export interface RunGrowthDepartmentInput {
  readonly fetches: readonly FetchGrowthSourceResult[];
  readonly trigger: DecisionTrigger;
  readonly question?: string;
  readonly nowMs: number;
}

export interface RunGrowthDepartmentResult {
  readonly decisions: readonly Decision[];
}

export function runGrowthDepartment(input: RunGrowthDepartmentInput): RunGrowthDepartmentResult {
  const evidence = input.fetches.map((fetch) => buildGrowthEvidence({
    sourceId: fetch.sourceId,
    state: fetch.state,
    truncated: fetch.truncated,
    droppedCount: fetch.droppedCount,
    rows: fetch.rows,
    observedAtMs: fetch.observedAtMs,
  }));

  const usersFetch = input.fetches.find((fetch) => fetch.sourceId === 'users');
  const aggregate = usersFetch ? aggregateGrowthRows(usersFetch.rows) : null;
  const anyTrustworthy = evidence.some((item) => item.trustworthy);
  const zeroSignups = anyTrustworthy && aggregate !== null && aggregate.totalCount === 0;

  const shouldDecide = input.trigger === 'owner_request' || zeroSignups || !anyTrustworthy;
  if (!shouldDecide) return { decisions: [] };

  const finding = !anyTrustworthy
    ? 'Не удалось прочитать новых пользователей за последние сутки — источник недоступен.'
    : aggregate!.totalCount === 0
      ? 'За последние сутки нет новых пользователей — 0 регистраций.'
      : `За последние сутки зарегистрировалось ${aggregate!.totalCount} новых пользователей.`;

  const question = input.question ?? (zeroSignups ? 'Почему нет новых регистраций за сутки?' : 'Сколько новых пользователей за последние сутки?');

  const decision = buildDecision({
    department: 'growth',
    mode: 'observe',
    trigger: input.trigger,
    question,
    finding,
    hypothesis: zeroSignups
      ? 'Возможна проблема с онбордингом, магазином приложений или маркетинговым каналом.'
      : 'Недостаточно данных для гипотезы.',
    options: zeroSignups
      ? [
        { title: 'Проверить статус приложения в сторах', cost: 0, risk: 'low' },
        { title: 'Проверить работоспособность онбординга вручную', cost: 1, risk: 'low' },
      ]
      : [
        { title: 'Продолжить наблюдение без вмешательства', cost: 0, risk: 'low' },
        { title: 'Запросить у владельца дополнительный контекст', cost: 0, risk: 'low' },
      ],
    recommendation: zeroSignups ? 'Проверить статус приложения в сторах' : 'Продолжить наблюдение без вмешательства',
    risk: zeroSignups ? 'Пропустить настоящую причину, если она не в сторах и не в онбординге' : 'Пропустить начало спада, если он появится позже',
    cost: 0,
    successMetric: zeroSignups ? 'Новые регистрации появляются в следующем суточном снапшоте' : 'Приток новых пользователей остаётся стабильным',
    rollback: 'Не применимо — департамент только наблюдает',
    evidence,
    nowMs: input.nowMs,
  });

  return { decisions: [decision] };
}
