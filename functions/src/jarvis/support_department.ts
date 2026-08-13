import type { AppTier } from './app_tier';
import { buildDecision, normalizeEvidence, type Decision, type DecisionTrigger, type Evidence } from './decision';
import type { FetchSupportSourceResult } from './support_firestore_fetcher';

/**
 * Департамент «Скорость поддержки» — следит, чтобы живые люди не ждали ответа
 * днями.
 *
 * зачем без масштабирования по тиру: человек, написавший в поддержку, ждёт
 * ответа одинаково на базе в сто и в сто тысяч. Тир здесь сознательно НЕ
 * смягчает пороги — как в «Платежах» и «Безопасности».
 *
 * Департамент только НАБЛЮДАЕТ. Отправкой занимается отдельный guarded
 * auto-reply контур с kill switch, аудитом и at-most-once SMTP-протоколом.
 */

/** Сутки без ответа — уже стыдно перед написавшим. */
export const SUPPORT_STALE_MS = 24 * 60 * 60 * 1_000;

/** Столько писем в очереди — разбор перестал успевать за потоком. */
export const SUPPORT_QUEUE_THRESHOLD = 10;

const HOUR_MS = 60 * 60 * 1_000;
const DAY_MS = 24 * HOUR_MS;

export interface RunSupportDepartmentInput {
  readonly fetch: FetchSupportSourceResult;
  readonly trigger: DecisionTrigger;
  readonly question?: string;
  readonly nowMs: number;
  /** Принимается для единообразия API, но на пороги НЕ влияет — см. выше. */
  readonly appTier?: AppTier;
}

export interface RunSupportDepartmentResult {
  readonly decisions: readonly Decision[];
}

/** «3 дня» читается мгновенно, «72 часа» — нет. */
function humanDuration(ms: number): string {
  if (ms >= DAY_MS) {
    const days = Math.floor(ms / DAY_MS);
    return `${days} ${days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}`;
  }
  const hours = Math.max(1, Math.floor(ms / HOUR_MS));
  return `${hours} ${hours === 1 ? 'час' : hours < 5 ? 'часа' : 'часов'}`;
}

/** Только времена и количества — ни адресов, ни текстов писем. */
function buildSupportEvidence(fetch: FetchSupportSourceResult): Evidence {
  const actionableWaiting = fetch.actionableWaitingCount ?? fetch.waitingCount;
  const oldestActionableWaitingMs = fetch.oldestActionableWaitingMs !== undefined
    ? fetch.oldestActionableWaitingMs
    : fetch.oldestWaitingMs;
  return normalizeEvidence({
    sourceId: 'support_inbox',
    state: fetch.state,
    count: actionableWaiting,
    truncated: false,
    droppedCount: 0,
    observedAtMs: fetch.observedAtMs,
    digest: JSON.stringify({
      actionableWaiting,
      oldestActionableWaitingMs,
      legacyWaiting: fetch.legacyWaitingCount ?? 0,
      answered: fetch.answeredCount,
      medianReplyMs: fetch.medianReplyMs,
    }),
  });
}

export function runSupportDepartment(input: RunSupportDepartmentInput): RunSupportDepartmentResult {
  const evidence = [buildSupportEvidence(input.fetch)];
  const trustworthy = evidence.some((item) => item.trustworthy);

  const waiting = input.fetch.actionableWaitingCount ?? input.fetch.waitingCount ?? 0;
  const oldest = input.fetch.oldestActionableWaitingMs !== undefined
    ? (input.fetch.oldestActionableWaitingMs ?? 0)
    : (input.fetch.oldestWaitingMs ?? 0);
  const legacyWaiting = input.fetch.legacyWaitingCount ?? 0;
  const median = input.fetch.medianReplyMs;

  const stale = oldest >= SUPPORT_STALE_MS;
  const queue = waiting >= SUPPORT_QUEUE_THRESHOLD;

  // Legacy-хвост не исчезает и не архивируется: он показывается владельцу по
  // запросу. Но scheduled-дайджест говорит только о письмах, которые triage
  // подтвердил как человеческие. Иначе неразмеченный spam становится вечной
  // ежедневной «срочностью».
  const shouldDecide = input.trigger === 'owner_request' || stale || queue || !trustworthy;
  if (!shouldDecide) return { decisions: [] };

  const medianText = median === null ? 'скорость ответа пока не измерена' : `обычно отвечаете за ${humanDuration(median)}`;

  // Порядок важен: чей-то долгий несостоявшийся ответ важнее размера очереди.
  const finding = !trustworthy
    ? 'Не удалось прочитать ящик поддержки — источник недоступен, состояние очереди неизвестно.'
    : stale
      ? `Самое старое письмо ждёт ответа уже ${humanDuration(oldest)}; всего в очереди ${waiting}. Для сравнения, ${medianText}.`
      : queue
        ? `${waiting} писем ждут ответа. Пока ни одно не висит дольше суток, но очередь растёт.`
        : waiting > 0
          ? `${waiting} актуальных писем в очереди, самое старое ждёт ${humanDuration(oldest)}. ${medianText.charAt(0).toUpperCase()}${medianText.slice(1)}.`
          : legacyWaiting > 0
            ? `Проверенная очередь поддержки разобрана. ${legacyWaiting} неразмеченных legacy-писем остаются видимыми для разовой категоризации, но не считаются доказанным SLA-инцидентом.`
            : `Очередь поддержки разобрана, ${medianText}.`;

  const question = input.question ?? (stale
    ? 'Почему письмо висит без ответа больше суток?'
    : queue
      ? 'Почему копится очередь в поддержке?'
      : 'Как обстоят дела с ответами в поддержке?');

  const decision = buildDecision({
    department: 'support',
    mode: 'observe',
    trigger: input.trigger,
    question,
    finding,
    hypothesis: stale
      ? 'Вероятная причина — письмо требует разбирательства и его отложили, а напоминания нет.'
      : queue
        ? 'Вероятная причина — поток обращений вырос: возможно, после релиза или сбоя.'
        : 'Недостаточно данных для гипотезы.',
    options: stale
      ? [
        { title: 'Проверить ошибки и лимиты автоматических ответов', cost: 0, risk: 'low' },
        { title: 'Проверить письма со статусом доставки «неизвестно»', cost: 0, risk: 'low' },
      ]
      : queue
        ? [
          { title: 'Разобрать очередь и посмотреть, о чём пишут чаще всего', cost: 0, risk: 'low' },
          { title: 'Проверить, не связан ли поток с недавним релизом', cost: 0, risk: 'low' },
        ]
        : [
          { title: 'Продолжить наблюдение без вмешательства', cost: 0, risk: 'low' },
          { title: 'Запросить у владельца дополнительный контекст', cost: 0, risk: 'low' },
        ],
    recommendation: stale
      ? 'Проверить ошибки и лимиты автоматических ответов'
      : queue
        ? 'Разобрать очередь и посмотреть, о чём пишут чаще всего'
        : 'Продолжить наблюдение без вмешательства',
    risk: stale
      ? 'Человек, не получивший ответа несколько дней, обычно не пишет второй раз — он уходит и оставляет плохой отзыв'
      : queue
        ? 'Очередь продолжит расти, и в ней потеряется действительно срочное обращение'
        : 'Пропустить начало проблемы, если поток вырастет позже',
    cost: 0,
    successMetric: stale
      ? 'Ни одного письма старше суток в следующем снимке'
      : queue
        ? `Очередь ниже ${SUPPORT_QUEUE_THRESHOLD} писем в следующем снимке`
        : 'Очередь поддержки остаётся разобранной',
    rollback: 'Департамент только наблюдает; автоматические ответы выключаются в Gmail Support без изменения данных письма',
    evidence,
    nowMs: input.nowMs,
  });

  return { decisions: [decision] };
}
