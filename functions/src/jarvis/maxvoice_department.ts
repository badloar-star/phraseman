import { buildDecision, normalizeEvidence, type Decision, type DecisionTrigger, type Evidence } from './decision';
import type { FetchMaxvoiceSourceResult } from './maxvoice_firestore_fetcher';

export const MAXVOICE_CONNECTION_MIN_SAMPLE = 20;
export const MAXVOICE_CONNECTION_MIN_RATIO = 0.9;
export const MAXVOICE_REVIEW_MIN_SAMPLE = 20;
export const MAXVOICE_REVIEW_MIN_RATIO = 0.95;
export const MAXVOICE_RECONNECT_MIN_SAMPLE = 10;
export const MAXVOICE_RECONNECT_MIN_RATIO = 0.7;
export const MAXVOICE_FIRST_AUDIO_MIN_SAMPLE = 20;
export const MAXVOICE_FIRST_AUDIO_SLOW_MAX_RATIO = 0.1;

export interface RunMaxvoiceDepartmentInput {
  readonly fetch: FetchMaxvoiceSourceResult;
  readonly trigger: DecisionTrigger;
  readonly question?: string;
  readonly nowMs: number;
}

export interface RunMaxvoiceDepartmentResult {
  readonly decisions: readonly Decision[];
}

function evidenceOf(fetch: FetchMaxvoiceSourceResult): Evidence {
  return normalizeEvidence({
    sourceId: 'max_voice_ops_daily',
    state: fetch.state,
    count: fetch.callsStarted,
    truncated: false,
    droppedCount: 0,
    observedAtMs: fetch.observedAtMs,
    digest: JSON.stringify({
      sampledDays: fetch.sampledDays,
      mintRejections: fetch.mintRejections,
      callsStarted: fetch.callsStarted,
      callsConnected: fetch.callsConnected,
      callsCompleted: fetch.callsCompleted,
      reviewsReady: fetch.reviewsReady,
      reconnectAttempts: fetch.reconnectAttempts,
      reconnectRecovered: fetch.reconnectRecovered,
      firstAudioGte8s: fetch.firstAudioGte8s,
    }),
  });
}

function percent(value: number): number {
  return Math.round(value * 100);
}

function decision(input: RunMaxvoiceDepartmentInput, evidence: Evidence, spec: {
  readonly finding: string;
  readonly hypothesis: string;
  readonly recommendation: string;
  readonly risk: string;
  readonly successMetric: string;
  readonly severityHint: 'P1' | 'P2' | 'P3';
}): Decision {
  return buildDecision({
    department: 'maxvoice',
    mode: 'observe',
    trigger: input.trigger,
    question: input.question ?? 'Насколько надёжно работает MAX?',
    finding: spec.finding,
    hypothesis: spec.hypothesis,
    options: [
      { title: 'Проверить этапы звонка и последние изменения', cost: 0, risk: 'low' },
      { title: 'Продолжить наблюдение без автоматического вмешательства', cost: 0, risk: 'low' },
    ],
    recommendation: spec.recommendation,
    risk: spec.risk,
    cost: 0,
    successMetric: spec.successMetric,
    rollback: 'Не применимо — департамент только наблюдает и ничего не меняет',
    evidence: [evidence],
    actionability: 'evidence_only',
    severityHint: spec.severityHint,
    nowMs: input.nowMs,
  });
}

export function runMaxvoiceDepartment(input: RunMaxvoiceDepartmentInput): RunMaxvoiceDepartmentResult {
  const evidence = evidenceOf(input.fetch);
  if (!evidence.trustworthy) {
    return { decisions: [decision(input, evidence, {
      finding: 'Не удалось прочитать свежие агрегаты MAX — надёжность звонков сейчас неизвестна.',
      hypothesis: 'Источник недоступен, устарел или нарушил ожидаемую схему; это не доказательство сбоя звонков.',
      recommendation: 'Проверить обновление max_voice_ops_daily и повторить чтение.',
      risk: 'Без свежего агрегата реальные сбои могут остаться незаметными.',
      successMetric: 'Свежий семидневный агрегат снова читается без ошибок.',
      severityHint: 'P1',
    })] };
  }

  const starts = input.fetch.callsStarted ?? 0;
  const connected = input.fetch.callsConnected ?? 0;
  const completed = input.fetch.callsCompleted ?? 0;
  const reviews = input.fetch.reviewsReady ?? 0;
  const reconnectAttempts = input.fetch.reconnectAttempts ?? 0;
  const reconnectRecovered = input.fetch.reconnectRecovered ?? 0;
  const slowFirstAudio = input.fetch.firstAudioGte8s ?? 0;
  const decisions: Decision[] = [];

  if (starts >= MAXVOICE_CONNECTION_MIN_SAMPLE && connected / starts < MAXVOICE_CONNECTION_MIN_RATIO) {
    const ratio = percent(connected / starts);
    decisions.push(decision(input, evidence, {
      finding: `Соединение с MAX успешно только в ${ratio}% запусков (${connected} из ${starts}).`,
      hypothesis: 'Агрегат подтверждает этап сбоя, но не доказывает причину без транспортных логов.',
      recommendation: 'Проверить mint, первый heartbeat и сетевые ошибки по этапам без содержимого разговора.',
      risk: 'Человек видит подготовку, но не получает начавшийся разговор.',
      successMetric: 'Успешное соединение MAX не ниже 90% при выборке от 20 запусков.',
      severityHint: 'P1',
    }));
  }

  if (completed >= MAXVOICE_REVIEW_MIN_SAMPLE && reviews / completed < MAXVOICE_REVIEW_MIN_RATIO) {
    const ratio = percent(reviews / completed);
    decisions.push(decision(input, evidence, {
      finding: `Разбор MAX готов только после ${ratio}% завершённых звонков (${reviews} из ${completed}).`,
      hypothesis: 'Сбой находится между завершением звонка и durable receipt; агрегат не раскрывает содержание разговора.',
      recommendation: 'Проверить очередь финализации, retry и terminal receipts.',
      risk: 'Пользователь завершает разговор, но не получает обещанный учебный результат.',
      successMetric: 'Готовый разбор не ниже 95% при выборке от 20 завершённых звонков.',
      severityHint: 'P1',
    }));
  }

  if (reconnectAttempts >= MAXVOICE_RECONNECT_MIN_SAMPLE && reconnectRecovered / reconnectAttempts < MAXVOICE_RECONNECT_MIN_RATIO) {
    const ratio = percent(reconnectRecovered / reconnectAttempts);
    decisions.push(decision(input, evidence, {
      finding: `Связь с MAX восстановлена только в ${ratio}% попыток (${reconnectRecovered} из ${reconnectAttempts}).`,
      hypothesis: 'Агрегат показывает слабое восстановление, но не различает причину потери сети.',
      recommendation: 'Проверить reconnect token, таймауты и честное terminal-состояние.',
      risk: 'Разговор зависает или завершается после краткого сетевого сбоя.',
      successMetric: 'Восстановление связи не ниже 70% при выборке от 10 попыток.',
      severityHint: 'P2',
    }));
  }

  if (connected >= MAXVOICE_FIRST_AUDIO_MIN_SAMPLE && slowFirstAudio / connected > MAXVOICE_FIRST_AUDIO_SLOW_MAX_RATIO) {
    const ratio = percent(slowFirstAudio / connected);
    decisions.push(decision(input, evidence, {
      finding: `Первый звук MAX ждут 8 секунд или дольше в ${ratio}% соединений (${slowFirstAudio} из ${connected}).`,
      hypothesis: 'Задержка подтверждена агрегатом, но её источник может быть в провайдере, сети или аудиомаршруте.',
      recommendation: 'Разделить задержку подготовки, соединения и первого удалённого аудио.',
      risk: 'Пользователь воспринимает начавшийся звонок как зависший.',
      successMetric: 'Доля первого аудио от 8 секунд не выше 10% при выборке от 20 соединений.',
      severityHint: 'P2',
    }));
  }

  if (decisions.length > 0) return { decisions: Object.freeze(decisions) };

  const sampleGates = [
    starts >= MAXVOICE_CONNECTION_MIN_SAMPLE,
    completed >= MAXVOICE_REVIEW_MIN_SAMPLE,
    reconnectAttempts >= MAXVOICE_RECONNECT_MIN_SAMPLE,
    connected >= MAXVOICE_FIRST_AUDIO_MIN_SAMPLE,
  ];
  if (!sampleGates.some(Boolean)) {
    return { decisions: [decision(input, evidence, {
      finding: `Для оценки надёжности MAX пока недостаточно данных: ${starts} запусков за ${input.fetch.sampledDays} дн.`,
      hypothesis: 'Маленькая выборка не позволяет честно объявить MAX исправным или сломанным.',
      recommendation: 'Накопить минимальную выборку и не делать вывод по единичным звонкам.',
      risk: 'Ранний процент на малой выборке создаст ложное чувство здоровья или аварии.',
      successMetric: 'Накоплено минимум 20 запусков/завершений или 10 попыток reconnect.',
      severityHint: 'P3',
    })] };
  }

  if (input.trigger !== 'owner_request') return { decisions: [] };
  const incomplete = sampleGates.some((ready) => !ready);
  return { decisions: [decision(input, evidence, {
    finding: incomplete
      ? 'Доступные метрики MAX не нарушают пороги, но часть выборок ещё недостаточна для общего вывода.'
      : 'По достаточным выборкам пороговые нарушения надёжности MAX не обнаружены.',
    hypothesis: 'Агрегаты описывают только техническую надёжность и не оценивают качество обучения или содержание разговора.',
    recommendation: 'Продолжить наблюдение по тем же контент-свободным агрегатам.',
    risk: 'Редкий сбой может не проявиться в агрегате выбранного окна.',
    successMetric: 'Все четыре показателя остаются внутри утверждённых порогов.',
    severityHint: 'P3',
  })] };
}
