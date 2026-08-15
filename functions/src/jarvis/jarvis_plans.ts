import type { Decision, Department } from './decision';
import {
  buildInternalFollowUpTask,
  type JarvisInternalFollowUpTask,
} from './jarvis_follow_up_tasks';
import { hashDecision } from './issue_decision_buttons';
import { decisionTopicKey } from './decision_topic';

/**
 * Раздел «Планы» — постоянный архив всех находок Джарвиса.
 *
 * зачем (владелец 2026-08-04): Telegram-сводка живёт секунду во внимании
 * владельца, а старые сообщения теряются в истории чата. Раздел «Планы» в
 * админке хранит КАЖДУЮ находку навсегда, независимо от того, что произошло
 * в Telegram — список, полный текст по клику, копирование, статус.
 *
 * зачем id = contentHash решения, а не автогенерированный: повторный
 * суточный прогон почти всегда возвращает ТУ ЖЕ находку (тот же смысл →
 * тот же contentHash, см. decision.ts) — план обязан обновиться на месте,
 * а не задублироваться. Owner-статус (resolved/archived) при этом не
 * должен молча откатиться на 'open' только потому, что крон снова увидел
 * ту же проблему.
 */

export const JARVIS_PLANS_COLLECTION = 'jarvis_plans';

/**
 * Жизненный цикл находки.
 *
 * зачем добавлены 'accepted' и 'vanished' (владелец 2026-08-15):
 * раньше согласие владельца оставляло план 'open' навсегда, а исчезнувшая
 * проблема висела открытой вечно — список открытых рос и обесценивался,
 * а кнопка «принять» не завершала ничего. Теперь у находки есть конец:
 *  - accepted — владелец согласился, ждём проверки результата через неделю;
 *  - resolved — результат подтвердил, что сработало (ставит проверка);
 *  - vanished — проблема ушла из данных сама, без вмешательства;
 *  - archived — владелец отклонил.
 */
export type JarvisPlanLifecycleStatus =
  | 'open'
  | 'accepted'
  | 'resolved'
  | 'vanished'
  | 'archived';

/** Статусы, которые автомат не имеет права перебивать: владелец уже высказался. */
export const OWNER_DECIDED_STATUSES: readonly JarvisPlanLifecycleStatus[] = Object.freeze([
  'accepted', 'resolved', 'archived',
]);

export interface JarvisPlan {
  readonly id: string;
  /**
   * Адрес ТЕМЫ — устойчив к смене счётчиков внутри той же находки.
   * Совпадает с id: одна проблема = один документ, сколько бы ни менялись числа.
   */
  readonly topicKey: string;
  /**
   * Хеш текущего содержания. Меняется вместе с любым числом в тексте —
   * по нему видно, что формулировка обновилась, и на нём держится защита
   * «одобрение прежней версии больше не действует».
   */
  readonly contentHash: string;
  /** Короткая версия id, запечатанная в Telegram approval token. */
  readonly approvalDecisionHash?: string;
  readonly department: Department;
  readonly question: string;
  readonly finding: string;
  readonly hypothesis: string;
  readonly options: readonly Decision['options'][number][];
  readonly recommendation: string;
  readonly risk: string;
  readonly cost: number;
  readonly successMetric: string;
  readonly rollback: string;
  readonly confidence: number;
  /** Развёрнутое, понятное описание от LLM-обогатителя. null — ещё не сгенерировано. */
  readonly narrative: string | null;
  readonly ownerDecision?: {
    readonly action: 'approve' | 'reject';
    readonly decidedAtMs: number;
    readonly source: 'telegram';
  };
  /** Optional for backward compatibility with plans written before safe follow-ups existed. */
  readonly followUpTask?: JarvisInternalFollowUpTask;
  readonly status: JarvisPlanLifecycleStatus;
  /** Когда владелец согласился — от этого момента отсчитывается проверка результата. */
  readonly acceptedAtMs?: number;
  /**
   * Чем закончился принятый совет.
   *
   * зачем хранить: это единственный настоящий факт о собственной пользе,
   * который система когда-либо получает. Без него она не отличает
   * сработавший совет от бесполезного.
   */
  readonly outcome?: {
    readonly verdict: 'worked' | 'did_not_work';
    readonly checkedAtMs: number;
  };
  /** Когда проблема перестала наблюдаться в данных. */
  readonly vanishedAtMs?: number;
  readonly createdAtMs: number;
  readonly updatedAtMs: number;
}

/**
 * Строит/обновляет запись плана из готового решения департамента.
 *
 * @param existing текущая запись с этим же id (contentHash), если уже была
 *   сохранена раньше — её lifecycle-статус (owner решил resolved/archived)
 *   сохраняется, обновляется только updatedAtMs и текст (на случай, если
 *   формулировка решения поменялась при том же смысловом хеше).
 */
export function buildPlanFromDecision(
  decision: Decision,
  existing: JarvisPlan | null,
  nowMs: number,
  options: { readonly followUpTasksEnabled?: boolean } = {},
): JarvisPlan {
  const followUpTask = buildInternalFollowUpTask({
    decision,
    existing: existing?.followUpTask ?? null,
    nowMs,
    enabled: options.followUpTasksEnabled === true,
  });
  // зачем id по теме, а не по contentHash (владелец 2026-08-15, «пишет одно
  // и то же»): contentHash меняется вместе с любым числом в тексте находки,
  // поэтому каждое утро заводился НОВЫЙ документ про ту же проблему, а старый
  // оставался открытым. Тема устойчива к счётчикам — одна проблема, один план.
  const topicKey = decisionTopicKey(decision);
  return Object.freeze({
    id: topicKey,
    topicKey,
    contentHash: decision.contentHash,
    approvalDecisionHash: hashDecision(decision),
    department: decision.department,
    question: decision.question,
    finding: decision.finding,
    hypothesis: decision.hypothesis,
    options: decision.options,
    recommendation: decision.recommendation,
    risk: decision.risk,
    cost: decision.cost,
    successMetric: decision.successMetric,
    rollback: decision.rollback,
    confidence: decision.confidence,
    narrative: existing?.narrative ?? null,
    ...(existing?.ownerDecision ? { ownerDecision: existing.ownerDecision } : {}),
    ...(followUpTask ? { followUpTask } : {}),
    // зачем сохранять статус существующего плана: владелец уже мог отметить
    // его решённым/архивным — повторный прогон крона с идентичной находкой
    // не должен тихо вернуть план в открытые.
    status: existing?.status ?? 'open',
    createdAtMs: existing?.createdAtMs ?? nowMs,
    updatedAtMs: nowMs,
  });
}
