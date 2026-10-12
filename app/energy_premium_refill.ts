// ═════════════════════════════════════════════════════════════════════
// energy_premium_refill.ts — запись «полной энергии» после подтверждённого Plus (сохранение на диск; UI обновляет EnergyContext).
//
// зачем (координатор 12.10, 🔴 ВЗАИМНАЯ БЛОКИРОВКА после оплаты): commitRevenueCatResultForGeneration держит замок аккаунта
// (withAccountTransitionLockWithDeadline) и ВНУТРИ зовёт refillToMax. Прежний refillToMax брал тот же замок заново без lease —
// замок не реентерабелен, второй вход ждёт хвост очереди, то есть конец внешней работы, а внешняя ждёт refill: вечное ожидание.
// Окно покупки крутилось бесконечно, замок аккаунта оставался занятым — вставали выход, облачная синхронизация, слушатель
// RevenueCat. Повторный вход в замок возможен ТОЛЬКО через lease держателя (account_generation.ts: inheritedLease), поэтому
// держатель передаёт lease сюда, а вызов без lease (вне замка) берёт замок сам — как раньше.
// Вынесено из EnergyContext, чтобы путь проверялся тестом на НАСТОЯЩЕМ замке (tests/paywall_refill_lock_reentry.test.ts).
// ═════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
  type AccountTransitionLockLease,
} from './account_generation';
import { BONUS_ENERGY_KEY, readBonusEnergyForMutation } from './bonus_energy_store';
import { DebugLogger } from './debug-logger';
import { createFullEnergyState, type EnergyStateV2 } from './energy_state_v2';
import { requireGiftAccountStorageKey } from './gift_account_storage';
import { withStorageLock } from './storage_mutex';

export const PREMIUM_REFILL_ENERGY_KEY = 'energy_state';

export type PremiumEnergyRefillCommit = Readonly<{
  freshDynMax: number;
  refilledBonus: number;
  state: EnergyStateV2;
}>;

export type PremiumEnergyRefillParams = Readonly<{
  isCurrent: () => boolean;
  accountToken: AccountGenerationToken;
  readDynMax: () => Promise<number>;
  /** Lease держателя замка аккаунта: передаётся, когда вызывающий УЖЕ внутри withAccountTransitionLock*. */
  lease?: AccountTransitionLockLease;
}>;

/** Пишет полную энергию (и полный бонус) под замком аккаунта и storage-замком; null — не записано (смена аккаунта/сбой). */
export async function persistPremiumEnergyRefill(params: PremiumEnergyRefillParams): Promise<PremiumEnergyRefillCommit | null> {
  const { isCurrent, accountToken, readDynMax, lease } = params;
  const startedAtMs = Date.now();
  console.log(`[ACCOUNT-LOCK] refillToMax:enter ${JSON.stringify({ lease: lease ? 'yes' : 'no', generation: accountToken.generation })}`);
  let outcome = 'not_current';
  try {
    const committed = await withAccountTransitionLock(async () => {
      for (let attempt = 0; attempt < 2 && isCurrent(); attempt += 1) {
        try {
          return await withStorageLock(async () => {
            if (!isCurrent() || !isCurrentAccountGeneration(accountToken)) return null;
            const freshDynMax = await readDynMax();
            const currentBonus = await readBonusEnergyForMutation(accountToken);
            if (!isCurrent() || !isCurrentAccountGeneration(accountToken)) return null;
            const state = createFullEnergyState(Date.now(), freshDynMax);
            const refilledBonus = currentBonus?.capacity ?? 0;
            const writes: [string, string][] = [[PREMIUM_REFILL_ENERGY_KEY, JSON.stringify(state)]];
            if (currentBonus) {
              writes.push([
                requireGiftAccountStorageKey(BONUS_ENERGY_KEY, accountToken),
                JSON.stringify({ ...currentBonus, amount: refilledBonus }),
              ]);
            }
            await AsyncStorage.multiSet(writes);
            return { freshDynMax, refilledBonus, state };
          });
        } catch (e) {
          outcome = `write_failed_attempt_${attempt + 1}`;
          DebugLogger.error('EnergyContext:refillToMax', e instanceof Error ? e : new Error(String(e)), 'warning');
        }
      }
      return null;
    }, lease);
    if (committed) outcome = 'written';
    return committed;
  } finally {
    console.log(`[ACCOUNT-LOCK] refillToMax:exit ${JSON.stringify({ lease: lease ? 'yes' : 'no', outcome, ms: Date.now() - startedAtMs })}`);
  }
}
