import type { Decision, Department } from './decision';
import {
  buildInternalFollowUpTask,
  type JarvisInternalFollowUpTask,
} from './jarvis_follow_up_tasks';

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

export type JarvisPlanLifecycleStatus = 'open' | 'resolved' | 'archived';

export interface JarvisPlan {
  readonly id: string;
  readonly contentHash: string;
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
  /** Optional for backward compatibility with plans written before safe follow-ups existed. */
  readonly followUpTask?: JarvisInternalFollowUpTask;
  readonly status: JarvisPlanLifecycleStatus;
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
  return Object.freeze({
    id: decision.contentHash,
    contentHash: decision.contentHash,
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
    ...(followUpTask ? { followUpTask } : {}),
    // зачем сохранять статус существующего плана: владелец уже мог отметить
    // его решённым/архивным — повторный прогон крона с идентичной находкой
    // не должен тихо вернуть план в открытые.
    status: existing?.status ?? 'open',
    createdAtMs: existing?.createdAtMs ?? nowMs,
    updatedAtMs: nowMs,
  });
}
