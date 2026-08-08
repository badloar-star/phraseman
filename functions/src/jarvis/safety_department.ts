import type { AppTier } from './app_tier';
import { buildDecision, normalizeEvidence, type Decision, type DecisionTrigger, type Evidence } from './decision';
import type { FetchSafetySourceResult } from './safety_firestore_fetcher';

/**
 * Департамент «Безопасность» — следит за тем, что модерация не копится
 * необработанной, и отдельно — за флагами на детских аккаунтах.
 *
 * зачем без масштабирования по тиру (как в «Платежах»): необработанный флаг на
 * ребёнке — юридический риск и живой человек, а не доля процента. На базе в сто
 * тысяч он не становится приемлемее, чем на базе в сто. Тир здесь сознательно
 * НЕ смягчает пороги.
 *
 * Департамент только НАБЛЮДАЕТ. Баны, предупреждения и разбор конкретных
 * случаев остаются за владельцем: план прямо запрещает автоматизировать
 * блокировки и работу с правами.
 */

/** Столько необработанных флагов — уже очередь, а не текущая работа. */
export const SAFETY_BACKLOG_THRESHOLD = 20;

/** Столько новых флагов за сутки — всплеск, который стоит посмотреть глазами. */
export const SAFETY_SPIKE_THRESHOLD = 15;

export interface RunSafetyDepartmentInput {
  readonly fetch: FetchSafetySourceResult;
  readonly trigger: DecisionTrigger;
  readonly question?: string;
  readonly nowMs: number;
  /** Принимается для единообразия API, но на пороги НЕ влияет — см. комментарий выше. */
  readonly appTier?: AppTier;
}

export interface RunSafetyDepartmentResult {
  readonly decisions: readonly Decision[];
}

/** Только счётчики: ни uid, ни текста сообщений, ни категорий с деталями. */
function buildSafetyEvidence(fetch: FetchSafetySourceResult): Evidence {
  return normalizeEvidence({
    sourceId: 'safety_flags',
    state: fetch.state,
    count: fetch.openFlags,
    // зачем всегда «не усечено»: .count() считает на сервере всю коллекцию,
    // страницы и лимиты к нему не применяются — терять тут нечего.
    truncated: false,
    droppedCount: 0,
    observedAtMs: fetch.observedAtMs,
    digest: JSON.stringify({
      open: fetch.openFlags,
      openMinor: fetch.openMinorFlags,
      openAgeUnverified: fetch.openAgeUnverifiedFlags,
      openAgeUnavailable: fetch.openAgeUnavailableFlags,
      ageEvidence: fetch.ageEvidence,
      recent: fetch.recentFlags,
    }),
  });
}

function buildSafetyAgeEvidence(fetch: FetchSafetySourceResult): Evidence {
  const state = fetch.ageEvidence === 'unavailable'
    ? 'error'
    : fetch.ageEvidence === 'age_unverified'
      ? 'partial'
      : fetch.openFlags === 0
        ? 'empty'
        : 'ready';
  return normalizeEvidence({
    sourceId: 'safety_flags_age_verification',
    state,
    count: fetch.ageEvidence === 'age_unverified' ? null : 0,
    truncated: false,
    droppedCount: 0,
    observedAtMs: fetch.observedAtMs,
    digest: JSON.stringify({
      openAgeUnverified: fetch.openAgeUnverifiedFlags,
      openAgeUnavailable: fetch.openAgeUnavailableFlags,
      ageEvidence: fetch.ageEvidence,
    }),
  });
}

export function runSafetyDepartment(input: RunSafetyDepartmentInput): RunSafetyDepartmentResult {
  const evidence = [buildSafetyEvidence(input.fetch), buildSafetyAgeEvidence(input.fetch)];
  const trustworthy = evidence[0].trustworthy;

  const openMinor = input.fetch.openMinorFlags ?? 0;
  const open = input.fetch.openFlags ?? 0;
  const recent = input.fetch.recentFlags ?? 0;
  const openAgeUnverified = input.fetch.openAgeUnverifiedFlags ?? 0;
  const openAgeUnavailable = input.fetch.openAgeUnavailableFlags ?? 0;

  const minorRisk = openMinor > 0;
  const ageUnverified = input.fetch.ageEvidence === 'age_unverified' && openAgeUnverified > 0;
  const ageUnavailable = input.fetch.ageEvidence === 'unavailable' && openAgeUnavailable > 0;
  const backlog = open >= SAFETY_BACKLOG_THRESHOLD;
  const spike = recent >= SAFETY_SPIKE_THRESHOLD;

  const shouldDecide = input.trigger === 'owner_request' || open > 0 || minorRisk || spike || !trustworthy;
  if (!shouldDecide) return { decisions: [] };

  // Порядок важен: дети перекрывают любую очередь взрослых обращений.
  const baseFinding = !trustworthy
    ? 'Не удалось прочитать журнал модерации — источник недоступен, состояние безопасности неизвестно.'
    : minorRisk
      ? `${openMinor} необработанных сигналов на детских аккаунтах — это юридический риск, а не очередь.`
      : backlog
        ? `${open} сигналов модерации ждут разбора — очередь копится быстрее, чем разбирается.`
        : open > 0
          ? `${open} подтверждённых сигналов безопасности ждут ручного разбора владельцем.`
        : spike
          ? `${recent} новых сигналов за сутки — заметно больше обычного.`
          : 'Очередь модерации разобрана, необработанных сигналов на детских аккаунтах нет.';

  const finding = ageUnverified
    ? `${baseFinding} Для ${openAgeUnverified} открытых сигналов возраст сервером не подтверждён; это не доказательство отсутствия несовершеннолетних.`
    : ageUnavailable
      ? `${baseFinding} Для ${openAgeUnavailable} открытых сигналов серверный источник возраста недоступен.`
      : baseFinding;

  const question = input.question ?? (minorRisk
    ? 'Что с необработанными сигналами на детских аккаунтах?'
    : open > 0 || spike
      ? 'Почему копится очередь модерации?'
      : 'Всё ли в порядке с безопасностью?');

  const decision = buildDecision({
    department: 'safety',
    mode: 'observe',
    trigger: input.trigger,
    question,
    finding,
    hypothesis: minorRisk
      ? 'Детские аккаунты требуют разбора вручную, а очередь не отделяет их от общей.'
      : open > 0
        ? 'Вероятная причина — поток сигналов вырос, а разбор остался ручным.'
        : spike
          ? 'Вероятная причина — приток новых пользователей либо ложные срабатывания фильтра.'
          : 'Недостаточно данных для гипотезы.',
    options: minorRisk
      ? [
        { title: 'Разобрать сигналы на детских аккаунтах в первую очередь', cost: 0, risk: 'low' },
        { title: 'Разбирать очередь общим порядком', cost: 0, risk: 'high' },
      ]
      : open > 0 || spike
        ? [
          { title: 'Разобрать накопившуюся очередь модерации', cost: 0, risk: 'low' },
          { title: 'Посмотреть, не ложные ли это срабатывания фильтра', cost: 0, risk: 'low' },
        ]
        : [
          { title: 'Продолжить наблюдение без вмешательства', cost: 0, risk: 'low' },
          { title: 'Запросить у владельца дополнительный контекст', cost: 0, risk: 'low' },
        ],
    recommendation: minorRisk
      ? 'Разобрать сигналы на детских аккаунтах в первую очередь'
      : open > 0 || spike
        ? 'Разобрать накопившуюся очередь модерации'
        : 'Продолжить наблюдение без вмешательства',
    risk: minorRisk
      ? 'Необработанный сигнал на детском аккаунте — это и вред живому ребёнку, и претензия при проверке магазина приложений'
      : open > 0
        ? 'Очередь продолжит расти, и в ней потеряется действительно срочный случай'
        : spike
          ? 'За всплеском может стоять реальная проблема, которую видно только вручную'
          : 'Пропустить начало проблемы, если она появится позже',
    cost: 0,
    successMetric: minorRisk
      ? 'Ноль необработанных сигналов на детских аккаунтах в следующем суточном снимке'
      : open > 0 || spike
        ? 'Ноль необработанных сигналов безопасности в следующем снимке'
        : 'Очередь модерации остаётся разобранной',
    rollback: 'Не применимо — департамент только наблюдает, разбор и блокировки выполняет владелец вручную',
    evidencePolicy: 'all_trustworthy',
    actionability: open > 0 || spike || minorRisk ? 'confirmed_action' : 'evidence_only',
    severityHint: open > 0 || minorRisk ? 'P0' : spike || !trustworthy ? 'P1' : 'P3',
    evidence,
    nowMs: input.nowMs,
  });

  return { decisions: [decision] };
}
