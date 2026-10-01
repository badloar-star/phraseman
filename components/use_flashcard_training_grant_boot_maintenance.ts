// Разовое обслуживание журнала незавершённых входов в тренировки карточек.
//
// зачем (PM-210, владелец: «просроченные записи не чистятся»):
// `maintainFlashcardTrainingPendingGrants` был написан и покрыт тестами, но НИКТО его
// не вызывал — запись о входе, оборванном крашем/убийством процесса, жила в журнале
// вечно, а списанная за неё энергия не возвращалась. Запускаем ОДИН раз на поколение
// аккаунта: после первого кадра (InteractionManager), только локально (AsyncStorage,
// без сети). Возврат энергии идёт через тот же адаптер, что и у экранов сессий
// (`refundActivityStart` из EnergyProvider), поэтому живём внутри провайдера, а не
// в `_layout.tsx`.
import { useEffect, useRef } from 'react';
import { InteractionManager } from 'react-native';

import { captureAccountGeneration, type AccountGenerationToken } from '../app/account_generation';
import { DebugLogger, reportSwallowed } from '../app/debug-logger';

const LOG = '[STARTUP-READS]';

type RefundEnergy = (operationId: string, reason: string) => Promise<void>;

// Ключи «stableId:generation», для которых обслуживание уже запускалось в этом процессе.
const maintainedGenerations = new Set<string>();
let bootMaintenanceDone = false;

export async function runFlashcardTrainingGrantMaintenanceOnce(
  token: AccountGenerationToken,
  refundEnergy: RefundEnergy,
): Promise<void> {
  const startedAtMs = Date.now();
  // Первый проход в процессе — 'boot' (заодно чистит осиротевшие манифесты),
  // после смены аккаунта — 'account'.
  const trigger = bootMaintenanceDone ? 'account' : 'boot';
  bootMaintenanceDone = true;
  try {
    const grants = await import('../app/flashcard_training_pending_grant');
    const account = await grants.resolveFlashcardTrainingPendingGrantAccount(token);
    if (!account) {
      DebugLogger.info(LOG, `flashcard_pending_grants: skipped (account unavailable, phase=${token.phase})`);
      return;
    }
    const result = await grants.maintainFlashcardTrainingPendingGrants(account, trigger, refundEnergy);
    DebugLogger.info(LOG, `flashcard_pending_grants: trigger=${trigger} result=${JSON.stringify(result)} tookMs=${Date.now() - startedAtMs}`);
  } catch (error) {
    reportSwallowed('use_flashcard_training_grant_boot_maintenance:maintain', error);
  }
}

export function useFlashcardTrainingGrantBootMaintenance(
  energyReady: boolean,
  refundEnergy: RefundEnergy,
): void {
  const refundRef = useRef(refundEnergy);
  refundRef.current = refundEnergy;

  useEffect(() => {
    if (!energyReady) return undefined;
    const token = captureAccountGeneration();
    const stableId = token.stableId?.trim();
    if (!stableId || token.phase !== 'active') {
      DebugLogger.info(LOG, `flashcard_pending_grants: not scheduled (stableId=${stableId ? 'yes' : 'no'}, phase=${token.phase})`);
      return undefined;
    }
    const key = `${stableId}:${token.generation}`;
    if (maintainedGenerations.has(key)) return undefined;
    let cancelled = false;
    const task = InteractionManager.runAfterInteractions(() => {
      if (cancelled || maintainedGenerations.has(key)) return;
      maintainedGenerations.add(key);
      // guard-ok: функция сама ловит и логирует любую ошибку (reportSwallowed).
      void runFlashcardTrainingGrantMaintenanceOnce(
        token,
        (operationId, reason) => refundRef.current(operationId, reason),
      );
    });
    return () => {
      cancelled = true;
      task.cancel?.();
    };
  }, [energyReady]);
}
