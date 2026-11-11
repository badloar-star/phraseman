/*
 * Совместимая очистка прежнего механизма переноса Plus между аккаунтами.
 *
 * Владелец 2026-11-09 установил account-only контракт. Автоматический store sync
 * при смене stable_id запрещён; явное восстановление остаётся в purchase flows.
 * Этот модуль теперь только удаляет старые hold-записи безопасно для обновления.
 */
import type { CustomerInfo } from 'react-native-purchases';
import { identityErrorCode, identityTrace } from './identity_trace';
import { invalidatePremiumCache } from './premium_guard';
import {
  clearPlusTransferHold,
  readPlusTransferHold,
} from './plus_transfer_hold';

export const PLUS_TRANSFER_RETRY_MIN_INTERVAL_MS = 10 * 60 * 1000;
export const PLUS_TRANSFER_MAX_ATTEMPTS = 12;

export type PlusTransferTrigger = 'after_switch' | 'startup' | 'foreground';
export type PlusTransferCheckResult =
  | 'no_hold'
  | 'not_installed'
  | 'no_account'
  | 'account_changed'
  | 'expired'
  | 'attempts_exhausted'
  | 'rate_limited'
  | 'retry'
  | 'confirmed'
  | 'absent'
  | 'deferred_purchase_flow';

export type PlusTransferDeps = Readonly<{
  /** Привести appUserID RevenueCat к текущему аккаунту (logIn). true — совпал. */
  syncIdentity: () => Promise<boolean>;
  /** Записать подтверждённый store-Plus текущему аккаунту (под замком перехода). */
  persistConfirmedPremium: (info: CustomerInfo, isCurrent: () => boolean) => Promise<void>;
}>;

let checkInFlight: Promise<PlusTransferCheckResult> | null = null;

/**
 * Ставится из revenuecat_init после configure: передаёт RC-зависимости без
 * циклического импорта, вешает повтор на возврат из фона и делает проверку старта.
 */
export function installPlusTransferRunner(nextDeps: PlusTransferDeps): void {
  void nextDeps;
  void runPlusTransferCheck('startup');
}

export function runPlusTransferCheck(trigger: PlusTransferTrigger): Promise<PlusTransferCheckResult> {
  if (checkInFlight) return checkInFlight;
  const run = runPlusTransferCheckOnce(trigger)
    .catch((error: unknown): PlusTransferCheckResult => {
      identityTrace('[PLUS-TRANSFER]', 'check crashed', { trigger, code: identityErrorCode(error) }, { persist: true });
      return 'retry';
    })
    .finally(() => { if (checkInFlight === run) checkInFlight = null; });
  checkInFlight = run;
  return run;
}

async function runPlusTransferCheckOnce(trigger: PlusTransferTrigger): Promise<PlusTransferCheckResult> {
  const hold = await readPlusTransferHold();
  if (!hold) return 'no_hold';
  // Owner contract 2026-11-09: account activation must never invoke a store
  // receipt sync or move the previous owner's entitlement. Explicit restore
  // remains in paywall/manage-subscription flows; this legacy runner only
  // revokes old cross-account hold records left by prior builds.
  await clearPlusTransferHold('account_only_no_automatic_transfer');
  invalidatePremiumCache();
  identityTrace('[PLUS-TRANSFER]', 'restore result', {
    result: 'absent',
    trigger,
    heldPlus: hold.heldPlus,
  }, { persist: hold.heldPlus });
  return 'absent';
}

export function __resetPlusTransferRunnerForTests(): void {
  checkInFlight = null;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
