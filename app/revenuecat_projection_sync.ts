import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import { withCallableTimeout } from './callable_timeout';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';

const FUNCTIONS_REGION = 'us-central1';
const MAX_TRACKED_ACCOUNTS = 8;

type ReconcileResponse = {
  ok?: boolean;
  active?: boolean;
  reconciled?: boolean;
  source?: string;
  plan?: string;
  maxActive?: boolean;
};

type ReconcileCallable = (
  data: Readonly<Record<string, never>>,
) => Promise<{ data?: ReconcileResponse }>;

const successfulAccounts = new Map<string, true>();
const inFlightByAccount = new Map<string, Promise<boolean>>();
let reconcileCallable: ReconcileCallable | null = null;

function normalizedAccountId(stableUid: string): string {
  const value = String(stableUid ?? '').trim();
  if (!value || value.length > 160 || value.includes('/')) {
    throw new Error('revenuecat_projection_sync_account_invalid');
  }
  return value;
}

function rememberSuccess(stableUid: string): void {
  successfulAccounts.delete(stableUid);
  successfulAccounts.set(stableUid, true);
  while (successfulAccounts.size > MAX_TRACKED_ACCOUNTS) {
    const oldest = successfulAccounts.keys().next().value as string | undefined;
    if (!oldest) break;
    successfulAccounts.delete(oldest);
  }
}

function getReconcileCallable(): ReconcileCallable {
  if (!reconcileCallable) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getApp } = require('@react-native-firebase/app');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getFunctions, httpsCallable } = require('@react-native-firebase/functions');
    reconcileCallable = httpsCallable(
      getFunctions(getApp(), FUNCTIONS_REGION),
      'revenueCatPremiumReconcileMine',
    ) as ReconcileCallable;
  }
  return reconcileCallable;
}

export async function syncRevenueCatProjectionForAccount(stableUid: string): Promise<boolean> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return false;
  const accountId = normalizedAccountId(stableUid);
  if (successfulAccounts.has(accountId)) {
    successfulAccounts.delete(accountId);
    successfulAccounts.set(accountId, true);
    return true;
  }
  const existing = inFlightByAccount.get(accountId);
  if (existing) return existing;

  const pending = (async () => {
    await initFirebaseAppCheckIfAvailable().catch(() => false);
    const response = await withCallableTimeout(
      getReconcileCallable()({}),
      'revenueCatPremiumReconcileMine',
    );
    const active = response?.data?.ok === true
      && response.data.active === true
      && response.data.reconciled === true
      && response.data.source === 'revenuecat_v2';
    if (active) rememberSuccess(accountId);
    return active;
  })();
  inFlightByAccount.set(accountId, pending);
  try {
    return await pending;
  } finally {
    if (inFlightByAccount.get(accountId) === pending) inFlightByAccount.delete(accountId);
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
