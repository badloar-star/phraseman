/**
 * Q-COIN (b), координатор 01.10: разовая серверная сверка кошелька монет.
 *
 * зачем: при неподтверждённой локальной базе телефон держит разницу «только на
 * телефоне» (unconfirmedLocalLift) или спиновые начисления, которые кошелёк
 * больше не принимает. Сервер может поднять users/{uid}.stars ТОЛЬКО по своим
 * же записям до 2.0 (results спинов уровня без расписки в журнале) — число
 * телефона уходит лишь в лог. Квитанцию применяем один раз
 * (applyCoinReconcileReceiptV1 ставит метку в проекции).
 *
 * Стоимость: один вызов на человека за жизнь и только при нужде (разница > 0
 * или застрявшие спиновые начисления). Отказ/нет функции на сервере —
 * повторим на следующем старте; в рамках процесса — не чаще раза.
 */

import { captureAccountGeneration, isCurrentAccountGeneration, type AccountGenerationToken } from './account_generation';
import { DebugLogger } from './debug-logger';

const LOG = '[COIN-RECONCILE]';
const attemptedOwners = new Set<string>();

export async function runCoinReconcileV1Once(
  token: AccountGenerationToken = captureAccountGeneration(),
): Promise<'skipped' | 'applied' | 'not_needed' | 'failed'> {
  const owner = token.stableId?.trim();
  if (!owner || !isCurrentAccountGeneration(token, owner)) {
    DebugLogger.info(LOG, 'client:skip reason=no_identity');
    return 'skipped';
  }
  if (attemptedOwners.has(owner)) {
    DebugLogger.info(LOG, `client:skip reason=already_attempted_this_process owner=${owner.slice(0, 8)}`);
    return 'skipped';
  }
  attemptedOwners.add(owner); // guard-ok: метка процесса в памяти, не данные пользователя
  try {
    const grants = await import('./level_spin_star_grants');
    const need = await grants.readCoinReconcileV1Need(token);
    DebugLogger.info(LOG, `client:need owner=${owner.slice(0, 8)} needed=${need.needed} lift=${need.lift} unackedSpinCredits=${need.unackedSpinCredits} applied=${need.applied}`);
    if (!need.needed) return 'not_needed';
    const visible = await grants.readUnifiedLevelSpinStars(token);
    const { callCoinReconcileV1, isCommunityPacksCloudEnabled } = await import('./community_packs/functionsClient');
    if (!isCommunityPacksCloudEnabled()) {
      DebugLogger.info(LOG, 'client:skip reason=cloud_disabled');
      attemptedOwners.delete(owner);
      return 'skipped';
    }
    const startedAt = Date.now();
    const response = await callCoinReconcileV1({ ownerStableId: owner, clientVisibleBalance: visible.balance });
    DebugLogger.info(LOG, `client:response status=${response.status} raisedBy=${response.raisedBy} ops=${response.operationIds?.length ?? 0} seq=${response.starsSeq} ms=${Date.now() - startedAt}`);
    if (!isCurrentAccountGeneration(token, owner)) {
      DebugLogger.info(LOG, 'client:skip_apply reason=identity_changed');
      return 'skipped';
    }
    const result = await grants.applyCoinReconcileReceiptV1(token, {
      raisedBy: response.raisedBy,
      operationIds: response.operationIds ?? [],
      starsBalance: response.starsBalance,
      starsEarnedTotal: response.starsEarnedTotal,
      starsSeq: response.starsSeq,
    });
    DebugLogger.info(LOG, `client:applied applied=${result.applied} visible=${result.balance}`);
    return 'applied';
  } catch (error) {
    // Не немой catch: отказ сервера/нет функции — повтор на следующем старте.
    DebugLogger.warn(LOG, `client:catch error=${error instanceof Error ? error.message : String(error)}`);
    return 'failed';
  }
}

/** Только для тестов: сбросить «уже пробовали в этом процессе». */
export function __resetCoinReconcileV1ForTests(): void {
  attemptedOwners.clear();
}
