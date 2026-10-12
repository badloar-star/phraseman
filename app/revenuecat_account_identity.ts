import Purchases, { type CustomerInfo } from 'react-native-purchases';

import {
  isCurrentAccountGeneration,
  withAccountTransitionLockWithDeadline,
  type AccountGenerationToken,
  type AccountTransitionLockLease,
} from './account_generation';
import { reportSwallowed } from './debug-logger';

const RC_ACCOUNT_COMMIT_LOCK_TIMEOUT_MS = 1_500;

export type RevenueCatAccountResult<T> =
  | { status: 'ok'; value: T }
  | { status: 'stale' };

function generationIsCurrent(token: AccountGenerationToken): token is AccountGenerationToken & { stableId: string } {
  return !!token.stableId && isCurrentAccountGeneration(token, token.stableId);
}

async function exactRevenueCatIdentityMatches(token: AccountGenerationToken): Promise<boolean> {
  if (!generationIsCurrent(token)) return false;
  const appUserId = await Purchases.getAppUserID().catch((error: unknown) => {
    // зачем: PM-229 — сбой чтения RevenueCat-личности = «не совпало», но причина должна быть видна.
    reportSwallowed('revenuecat_account_identity:get_app_user_id', error);
    return '';
  });
  return generationIsCurrent(token) && appUserId === token.stableId;
}

/** Runs a system store operation without holding the account transition lock. */
export async function runRevenueCatOperationForGeneration<T>(
  token: AccountGenerationToken,
  operation: () => Promise<T>,
): Promise<RevenueCatAccountResult<T>> {
  if (!await exactRevenueCatIdentityMatches(token)) return { status: 'stale' };
  const value = await operation();
  if (!generationIsCurrent(token)) return { status: 'stale' };
  if (!await exactRevenueCatIdentityMatches(token)) return { status: 'stale' };
  return { status: 'ok', value };
}

export async function readRevenueCatCustomerInfoForGeneration(
  token: AccountGenerationToken,
): Promise<CustomerInfo | null> {
  const result = await runRevenueCatOperationForGeneration(token, () => Purchases.getCustomerInfo());
  return result.status === 'ok' ? result.value : null;
}

/**
 * Revalidates exact SDK identity after lock acquisition and before the first local side effect.
 *
 * зачем lease в колбэке (координатор 12.10, 🔴 взаимная блокировка после оплаты): колбэк выполняется ПОД замком аккаунта.
 * Замок не реентерабелен — любой вложенный withAccountTransitionLock без lease ждёт конца этой же работы и вешает покупку
 * навсегда. Всё, что внутри берёт замок (пополнение энергии), обязано получить этот lease.
 *
 * ⛔ lease действителен ТОЛЬКО пока колбэк не вернулся (замок отпускается в finally). Не передавать его в фоновые
 * вызовы без await (`void work(lease)`, таймер, подписка): такой вызов входит по lease сразу, а продолжает работать уже
 * ПОСЛЕ отпускания замка — его запись пересечётся с чужой (выход из аккаунта, восстановление) без всякой очереди.
 * Нужна фоновая работа — пусть берёт замок сама, без lease, после возврата колбэка.
 */
export async function commitRevenueCatResultForGeneration<T>(
  token: AccountGenerationToken,
  commit: (isCurrent: () => boolean, lease: AccountTransitionLockLease) => Promise<T>,
): Promise<RevenueCatAccountResult<T>> {
  const locked = await withAccountTransitionLockWithDeadline(async (lease): Promise<RevenueCatAccountResult<T>> => {
    if (!await exactRevenueCatIdentityMatches(token)) return { status: 'stale' };
    const isCurrent = () => generationIsCurrent(token);
    const value = await commit(isCurrent, lease);
    return isCurrent() ? { status: 'ok', value } : { status: 'stale' };
  }, RC_ACCOUNT_COMMIT_LOCK_TIMEOUT_MS);
  return locked.completed ? locked.value : { status: 'stale' };
}
