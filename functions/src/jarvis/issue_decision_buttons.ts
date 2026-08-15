import { createHash } from 'node:crypto';
import { logger } from 'firebase-functions';
import type { Decision } from './decision';
import { issueApprovalToken } from './approval_store';
import { rejectionTopicKey } from './recent_rejections';
import type { OwnerConfig } from './approval_webhook_core';
import { buildDecisionKeyboard, MAX_BUTTON_ROWS, type DecisionButtonSpec, type InlineKeyboard } from './telegram_buttons';

/**
 * Выдаёт по паре кнопок «принять/отклонить» на каждое решение сводки.
 *
 * зачем хеш решения в токене: кнопка обязана быть привязана к КОНКРЕТНОМУ
 * решению. Иначе нажатие «принять» из вчерашнего сообщения подтвердило бы
 * сегодняшнюю, совсем другую находку.
 */

const DEPARTMENT_LABEL: Record<string, string> = {
  quality: 'Качество',
  money: 'Деньги',
  growth: 'Рост',
  content: 'Контент',
  payments: 'Платежи',
  safety: 'Безопасность',
  support: 'Поддержка',
  factory: 'Фабрика',
  retention: 'Удержание',
};

/** Отпечаток решения: департамент + суть находки. */
export function hashDecision(decision: Decision): string {
  const material = `${decision.department}|${decision.finding ?? ''}|${decision.recommendation ?? ''}`;
  return createHash('sha256').update(material, 'utf8').digest('hex').slice(0, 16);
}

export interface IssueDecisionButtonsInput {
  readonly db: FirebaseFirestore.Firestore;
  readonly decisions: readonly Decision[];
  readonly config: OwnerConfig;
  readonly nowMs: number;
}

/**
 * Возвращает клавиатуру или null, если выдать токены не удалось.
 * Никогда не бросает: сводка важнее кнопок и должна уйти в любом случае.
 */
export async function issueDecisionButtons(
  input: IssueDecisionButtonsInput,
): Promise<InlineKeyboard | null> {
  // Столько же, сколько строк в клавиатуре: лишние токены были бы мусором.
  const shown = input.decisions
    .filter((decision) => decision.actionability === 'confirmed_action')
    .slice(0, MAX_BUTTON_ROWS);
  if (shown.length === 0) return null;

  try {
    const specs: DecisionButtonSpec[] = [];
    for (const decision of shown) {
      const decisionHash = hashDecision(decision);
      const common = {
        db: input.db,
        decisionHash,
        // зачем обе величины: decisionHash гасит именно ту формулировку,
        // что владелец видел на кнопке; тема переживает смену счётчиков
        // и не даёт вчерашнему «нет» забыться к завтрашнему прогону.
        decisionTopicKey: rejectionTopicKey(decision),
        department: decision.department,
        ownerTelegramUserId: input.config.ownerTelegramUserId,
        ownerTelegramChatId: input.config.ownerTelegramChatId,
        nowMs: input.nowMs,
      };
      // guard-ok: две записи на решение, максимум пять решений — это десять
      // операций раз в сутки, а не скан коллекции.
      const [approve, reject] = await Promise.all([
        issueApprovalToken({ ...common, action: 'approve' }),
        issueApprovalToken({ ...common, action: 'reject' }),
      ]);
      specs.push({
        label: DEPARTMENT_LABEL[decision.department] ?? decision.department,
        approveData: approve.callbackData,
        rejectData: reject.callbackData,
      });
    }
    return buildDecisionKeyboard(specs);
  } catch (error) {
    // Не смогли выдать кнопки — сводка всё равно уйдёт текстом.
    logger.warn('jarvis_digest: issuing approval buttons failed', error);
    return null;
  }
}
