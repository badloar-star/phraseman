import type { JarvisPlan, JarvisPlanLifecycleStatus } from './jarvis_plans';

/**
 * Проверка результата принятого совета и учёт реакции владельца.
 *
 * зачем этот модуль (владелец 2026-08-15, «не учится»): результат принятого
 * совета не проверялся НИКОГДА. У системы не было ни одного сигнала,
 * отличающего хороший совет от плохого, — а без внешнего сигнала агент не
 * способен улучшаться в принципе (Huang et al., ICLR 2024: модели не умеют
 * самокорректироваться на собственных рассуждениях). Считалось при этом,
 * сколько раз СИСТЕМА написала, а не сколько раз владелец сказал «нет».
 *
 * зачем судить по наблюдаемости темы, а не по successMetric: successMetric —
 * свободный текст («Приток новых пользователей остаётся стабильным»), машинно
 * сверить его нельзя. А вот факт «та же тема снова в снимке» — машинный и
 * уже собирается каждый прогон. Проблема ушла — совет сработал; осталась —
 * не сработал. Это грубее, но честно и не требует выдумывать метрику.
 *
 * Модуль чистый: без Firestore и сети, чтобы все правила проверялись тестами.
 */

/**
 * Через сколько после согласия судить о результате.
 *
 * зачем неделя, а не сутки: изменения не успевают проявиться за день, и
 * поспешный вердикт «не сработало» обесценил бы всю проверку.
 */
export const OUTCOME_CHECK_DELAY_MS = 7 * 24 * 60 * 60 * 1_000;

/** Столько отказов подряд по одной теме означают «больше не предлагай». */
export const EXHAUSTED_AFTER_REJECTIONS = 3;

/** Столько несработавших советов подряд лишают тему доверия. */
export const DISTRUST_AFTER_FAILURES = 2;

export type PlanOutcomeVerdict =
  | 'worked'
  | 'did_not_work'
  | 'too_early'
  | 'not_applicable';

export interface PlanOutcomeInput {
  readonly plan: JarvisPlan;
  /** Наблюдается ли та же тема в свежем снимке данных. */
  readonly stillObserved: boolean;
  readonly nowMs: number;
}

export interface PlanOutcome {
  readonly verdict: PlanOutcomeVerdict;
  /** Новый статус плана; null — статус менять не нужно. */
  readonly nextStatus: JarvisPlanLifecycleStatus | null;
}

const NOT_APPLICABLE: PlanOutcome = Object.freeze({ verdict: 'not_applicable', nextStatus: null });

/**
 * Судит, сработал ли принятый совет.
 *
 * Проверяются только планы в статусе `accepted`: открытые ещё не приняты,
 * отклонённые владелец закрыл сам, а уже осуждённые повторно не судят.
 */
export function judgePlanOutcome(input: PlanOutcomeInput): PlanOutcome {
  if (input.plan.status !== 'accepted') return NOT_APPLICABLE;

  // зачем требовать отметку: неделя отсчитывается ОТ СОГЛАСИЯ. Нет времени
  // согласия — нет точки отсчёта, а выдумывать её значит судить наугад.
  const acceptedAtMs = input.plan.acceptedAtMs;
  if (typeof acceptedAtMs !== 'number' || !Number.isFinite(acceptedAtMs)) return NOT_APPLICABLE;

  if (input.nowMs - acceptedAtMs < OUTCOME_CHECK_DELAY_MS) {
    return Object.freeze({ verdict: 'too_early', nextStatus: null });
  }

  return input.stillObserved
    // зачем возвращать в открытые, а не архивировать: совет не помог, проблема
    // жива — молчать о ней было бы той самой молчаливой ложью.
    ? Object.freeze({ verdict: 'did_not_work', nextStatus: 'open' as const })
    : Object.freeze({ verdict: 'worked', nextStatus: 'resolved' as const });
}

export interface TopicFeedbackCounts {
  readonly rejections: number;
  readonly acceptances: number;
  readonly worked: number;
  readonly didNotWork: number;
}

export interface TopicFeedback {
  /** Владелец отказывался столько раз, что тему пора перестать предлагать. */
  readonly exhausted: boolean;
  /** Советам по этой теме ещё можно верить. */
  readonly trustworthy: boolean;
}

/**
 * Что система знает о реакции владельца на тему.
 *
 * зачем согласие обнуляет счёт отказов: владелец мог отказываться, пока было
 * не до того, а потом принять. Считать старые «нет» после согласия — значит
 * заглушить тему, которая как раз оказалась нужной.
 */
export function summarizeTopicFeedback(counts: TopicFeedbackCounts): TopicFeedback {
  const rejectionsThatCount = counts.acceptances > 0 ? 0 : counts.rejections;
  return Object.freeze({
    exhausted: rejectionsThatCount >= EXHAUSTED_AFTER_REJECTIONS,
    trustworthy: counts.didNotWork < DISTRUST_AFTER_FAILURES || counts.worked > 0,
  });
}
