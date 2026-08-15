import type { Decision } from './decision';
import { decisionTopicKey } from './decision_topic';

/**
 * Не повторять совет, который владелец только что отклонил (бриф в181-190:
 * память между сессиями).
 *
 * зачем окно, а не «навсегда»: отклонение вчера не значит запрет обсуждать
 * это вечно. Если проблема не решилась, Джарвис обязан напомнить снова —
 * иначе владелец о ней забудет, а найденное реально сломано.
 *
 * Модуль чистый: без Firestore, чтение журнала подтверждений делает
 * вызывающий и передаёт готовую карту «хеш решения → когда отклонили».
 */

/** Три дня — достаточно, чтобы не спамить тем же советом на следующий день. */
export const REJECTION_MEMORY_MS = 3 * 24 * 60 * 60 * 1_000;

/**
 * Ключ темы отказа: адресует ВОПРОС, а не сегодняшнее значение счётчика.
 *
 * зачем отдельно от hashDecision: тот считается от finding и recommendation
 * целиком, вместе с живыми числами, и это правильно для кнопок — кнопка
 * одобряет конкретную формулировку, показанную владельцу. Но для памяти
 * отказов такой ключ бесполезен: отклонили при «125 писем», назавтра стало
 * «126 писем» — хеш другой, отказ забыт, и совет приходит снова. Владелец
 * 2026-08-15 назвал это «пишет одно и то же» и «не учится» — это один баг.
 *
 * зачем реэкспорт, а не своя реализация: ключей темы в проекте было уже два,
 * посчитанных по-разному. Один источник истины — `decision_topic.ts`; имя
 * оставлено прежним, чтобы не трогать вызывающих.
 */
export const rejectionTopicKey = decisionTopicKey;

export interface FilterOutRecentlyRejectedInput {
  readonly decisions: readonly Decision[];
  readonly hashOf: (decision: Decision) => string;
  /** Хеш решения → когда его последний раз отклонили (мс). */
  readonly rejectedHashes: ReadonlyMap<string, number>;
  readonly nowMs: number;
}

export function filterOutRecentlyRejected(input: FilterOutRecentlyRejectedInput): Decision[] {
  return input.decisions.filter((decision) => {
    const rejectedAtMs = input.rejectedHashes.get(input.hashOf(decision));
    if (rejectedAtMs === undefined) return true;
    return input.nowMs - rejectedAtMs > REJECTION_MEMORY_MS;
  });
}
