import Purchases, { type CustomerInfo } from 'react-native-purchases';

import {
  isCurrentAccountGeneration,
  withAccountTransitionLockWithDeadline,
  type AccountGenerationToken,
} from './account_generation';

const RC_ACCOUNT_COMMIT_LOCK_TIMEOUT_MS = 1_500;

export type RevenueCatAccountResult<T> =
  | { status: 'ok'; value: T }
  | { status: 'stale' };

function generationIsCurrent(token: AccountGenerationToken): token is AccountGenerationToken & { stableId: string } {
  return !!token.stableId && isCurrentAccountGeneration(token, token.stableId);
}

async function exactRevenueCatIdentityMatches(token: AccountGenerationToken): Promise<boolean> {
  if (!generationIsCurrent(token)) return false;
  const appUserId = await Purchases.getAppUserID().catch(() => '');
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

/** Revalidates exact SDK identity after lock acquisition and before the first local side effect. */
export async function commitRevenueCatResultForGeneration<T>(
  token: AccountGenerationToken,
  commit: (isCurrent: () => boolean) => Promise<T>,
): Promise<RevenueCatAccountResult<T>> {
  const locked = await withAccountTransitionLockWithDeadline(async (): Promise<RevenueCatAccountResult<T>> => {
    if (!await exactRevenueCatIdentityMatches(token)) return { status: 'stale' };
    const isCurrent = () => generationIsCurrent(token);
    const value = await commit(isCurrent);
    return isCurrent() ? { status: 'ok', value } : { status: 'stale' };
  }, RC_ACCOUNT_COMMIT_LOCK_TIMEOUT_MS);
  return locked.completed ? locked.value : { status: 'stale' };
}
