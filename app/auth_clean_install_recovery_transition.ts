import AsyncStorage from '@react-native-async-storage/async-storage';

const HARD_DURABLE_GUARD_KEYS = [
  'auth_clean_install_recovery_v1',
  'auth_clean_install_recovery_adoption_v1',
] as const;
const REQUEST_INTENT_KEY = 'auth_clean_install_recovery_request_intent_v1';
const DURABLE_GUARD_KEYS = [...HARD_DURABLE_GUARD_KEYS, REQUEST_INTENT_KEY] as const;

let activeOwners = 0;
let accountMutationReservations = 0;

function requestIntentIsActive(raw: string | null, now: number): boolean {
  if (raw === null) return false;
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return true;
    const createdAt = value.createdAt;
    const expiresAt = value.expiresAt;
    const guardExpiresAt = value.guardExpiresAt ?? expiresAt;
    if (
      typeof createdAt !== 'number' || !Number.isInteger(createdAt)
      || typeof expiresAt !== 'number' || !Number.isInteger(expiresAt)
      || typeof guardExpiresAt !== 'number' || !Number.isInteger(guardExpiresAt)
      || expiresAt <= createdAt
      || guardExpiresAt < createdAt
      || guardExpiresAt > expiresAt
    ) return true;
    return expiresAt > now && guardExpiresAt > now;
  } catch {
    return true;
  }
}

function durableRecoveryStateIsActive(
  rows: readonly (readonly [string, string | null])[],
  getNow: () => number,
): boolean {
  for (const [key, raw] of rows) {
    if (raw === null) continue;
    if (key !== REQUEST_INTENT_KEY || requestIntentIsActive(raw, getNow())) return true;
  }
  return false;
}

async function readDurableGuardRows(): Promise<readonly (readonly [string, string | null])[]> {
  try {
    return await AsyncStorage.multiGet([...DURABLE_GUARD_KEYS]);
  } catch {
    throw new Error('clean_recovery_transition_guard_unavailable');
  }
}

/** Returns an idempotent release handle shared by coordinator and adoption. */
export function beginCleanInstallRecoveryTransition(): () => void {
  if (accountMutationReservations > 0) {
    throw new Error('clean_recovery_account_transition_active');
  }
  activeOwners += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    activeOwners = Math.max(0, activeOwners - 1);
  };
}

export function isCleanInstallRecoveryTransitionActive(): boolean {
  return activeOwners > 0;
}

/** Account sign-in/switch/delete must fail closed while memory or durable recovery state exists. */
export async function assertNoCleanInstallRecoveryTransition(): Promise<void> {
  if (isCleanInstallRecoveryTransitionActive() || accountMutationReservations > 0) {
    throw new Error('clean_recovery_transition_active');
  }
  const rows = await readDurableGuardRows();
  if (
    isCleanInstallRecoveryTransitionActive()
    || accountMutationReservations > 0
    || durableRecoveryStateIsActive(rows, Date.now)
  ) {
    throw new Error('clean_recovery_transition_active');
  }
}

/**
 * Exclusively reserves a sign-out/delete transition before the async durable
 * guard read. Recovery owners check the same counter synchronously, closing the
 * check-then-await race in both arrival orders. The caller must release in a
 * finally block after the whole account mutation has settled.
 */
export async function reserveCleanInstallRecoveryAccountTransition(
  now?: number,
): Promise<() => void> {
  if (isCleanInstallRecoveryTransitionActive() || accountMutationReservations > 0) {
    throw new Error('clean_recovery_transition_active');
  }
  accountMutationReservations += 1;
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    accountMutationReservations = Math.max(0, accountMutationReservations - 1);
  };
  try {
    const rows = await readDurableGuardRows();
    if (
      isCleanInstallRecoveryTransitionActive()
      || durableRecoveryStateIsActive(rows, () => now ?? Date.now())
    ) {
      throw new Error('clean_recovery_transition_active');
    }
    return release;
  } catch (error) {
    release();
    throw error;
  }
}
