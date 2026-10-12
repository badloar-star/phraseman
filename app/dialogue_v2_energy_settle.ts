// зачем (координатор 12.10, E10 из R1_DIALOGS_OPTIMISTIC_UI.md): энергия за вход в диалог списывается на брифинге и
// закрепляется первым ответом собеседника. Если диалог не состоялся (сервис упал на первом ходе ИЛИ сессия так и не
// стартовала) — «человек ничего не получил», энергию возвращаем. Решение одно на попытку (ключ — id операции списания):
// первое решение забирает id СИНХРОННО, до любого await, поэтому двойной вызов и гонка «возврат ↔ первый ответ» дают ровно
// одно действие. Второй рубеж — локальный журнал энергии: возврат по тому же id идемпотентен, возврат после подтверждения
// и подтверждение после возврата он отклоняет сам.

export type DialogueEnergySettleOutcome = 'acknowledge' | 'refund';

export type DialogueEnergySettleActions = Readonly<{
  acknowledge: (operationId: string) => Promise<boolean>;
  refund: (operationId: string, reason: string) => Promise<void>;
}>;

export type DialogueEnergySettleResult =
  | 'acknowledged'
  | 'refunded'
  | 'skipped_no_operation'
  | 'skipped_already_settled'
  | 'skipped_no_actions'
  | 'failed';

export type DialogueEnergySettler = Readonly<{
  settle: (outcome: DialogueEnergySettleOutcome, reason: string) => Promise<DialogueEnergySettleResult>;
  peek: () => Readonly<{ operationId: string | null; settledAs: DialogueEnergySettleOutcome | null }>;
}>;

type SettlerDeps = Readonly<{
  getActions: () => DialogueEnergySettleActions | null;
  /** Тост «Энергия возвращена» — только после того, как журнал подтвердил возврат. */
  onRefunded: () => void;
  scenarioId?: string | null;
}>;

const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

export function createDialogueEnergySettler(initialOperationId: string | null, deps: SettlerDeps): DialogueEnergySettler {
  let operationId: string | null = initialOperationId;
  let settledAs: DialogueEnergySettleOutcome | null = null;
  const scenarioId = deps.scenarioId ?? null;

  const settle = async (outcome: DialogueEnergySettleOutcome, reason: string): Promise<DialogueEnergySettleResult> => {
    const claimed = operationId;
    if (!claimed) {
      const skip = settledAs ? 'skipped_already_settled' : 'skipped_no_operation';
      // guard-ok: ранний выход пишет причину и чем попытка уже рассчитана
      console.log('[ENERGY-REFUND] dialogue:settle skipped', JSON.stringify({ outcome, reason, skip, settledAs, scenarioId }));
      return skip;
    }
    const actions = deps.getActions();
    if (!actions) {
      // guard-ok: id не забираем — решение можно принять позже, когда энергия смонтирована
      console.warn('[ENERGY-REFUND] dialogue:settle no energy actions yet', JSON.stringify({ outcome, reason, operationId: claimed, scenarioId }));
      return 'skipped_no_actions';
    }
    // Забираем id до await — второй вызов (двойной тап, гонка эффектов) увидит пустой id и выйдет.
    operationId = null;
    settledAs = outcome;
    console.log('[ENERGY-REFUND] dialogue:settle decided', JSON.stringify({ outcome, reason, operationId: claimed, scenarioId }));
    if (outcome === 'acknowledge') {
      try {
        const ok = await actions.acknowledge(claimed);
        console.log('[ENERGY-REFUND] dialogue:acknowledge done', JSON.stringify({ operationId: claimed, ok, reason }));
        return 'acknowledged';
      } catch (error: unknown) {
        console.warn('[ENERGY-REFUND] dialogue:acknowledge failed', JSON.stringify({ operationId: claimed, reason, message: errorMessage(error) }));
        return 'failed';
      }
    }
    try {
      await actions.refund(claimed, reason);
    } catch (error: unknown) {
      // Возврат не записался — id возвращаем: следующая причина (повтор старта, сбой хода) попробует снова,
      // а журнал по тому же id не вернёт дважды.
      operationId = claimed;
      settledAs = null;
      console.warn('[ENERGY-REFUND] dialogue:refund failed → re-armed', JSON.stringify({ operationId: claimed, reason, message: errorMessage(error) }));
      return 'failed';
    }
    console.log('[ENERGY-REFUND] dialogue:refund done → toast', JSON.stringify({ operationId: claimed, reason, scenarioId }));
    deps.onRefunded();
    return 'refunded';
  };

  return Object.freeze({
    settle,
    peek: () => Object.freeze({ operationId, settledAs }),
  });
}
