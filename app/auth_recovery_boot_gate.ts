import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import { invalidateAccountGeneration } from './account_generation';
import { beginPremiumAccountTransition } from './premium_guard';
import {
  ACCOUNT_PROVIDER_HANDOFF_KEY,
  ACCOUNT_SWITCH_COMPLETION_RECEIPT_KEY,
  ACCOUNT_SWITCH_QUARANTINE_KEY,
  announceAccountSwitchQuarantineFailure,
  announceAccountSwitchQuarantinePresence,
} from './account_switch_quarantine';
import {
  AUTH_RECOVERY_PENDING_ACK_KEY,
  resumePendingRecoveryHandoffAck,
  type AuthRecoveryAdoptionResult,
} from './auth_recovery_adoption';
import { quiesceCloudSyncForAccountTransition } from './cloud_sync';
import {
  AUTH_CLEAN_INSTALL_ADOPTION_KEY,
  resumeCleanInstallRecoveryAdoption,
} from './auth_clean_install_recovery_adoption';
import { AUTH_CLEAN_INSTALL_RECOVERY_KEY } from './auth_clean_install_recovery_journal';
import { DebugLogger } from './debug-logger';

const DEFAULT_AUTH_HYDRATION_TIMEOUT_MS = 8_000;
const MAX_AUTH_HYDRATION_TIMEOUT_MS = 30_000;
const BOOT_QUIESCE_TIMEOUT_MS = 5_000;

type AdoptionQuarantineReason = Extract<
  AuthRecoveryAdoptionResult,
  { result: 'quarantined' }
>['reason'];

export type AuthRecoveryBootGateResult =
  | Readonly<{ result: 'proceed' }>
  | Readonly<{
    result: 'blocked_transient';
    reason:
      | 'ack_pending'
      | 'auth_hydration_timeout'
      | 'auth_subscription_failed'
      | 'cancelled'
      | 'journal_read_failed'
      | 'quiesce_failed'
      | 'resume_failed';
  }>
  | Readonly<{
    result: 'blocked_quarantined';
    reason:
      | AdoptionQuarantineReason
      | 'auth_uid_missing'
      | 'clean_recovery_confirmation_pending'
      | 'clean_recovery_journal_invalid';
  }>;

export type AuthRecoveryBootGateOptions = Readonly<{
  timeoutMs?: number;
  signal?: AbortSignal;
}>;

type AuthHydrationResult =
  | Readonly<{ result: 'ready'; uid: string | null }>
  | Readonly<{ result: 'timeout' | 'subscription_failed' | 'cancelled' }>;

let bootGateAttempt: Promise<AuthRecoveryBootGateResult> | null = null;

function boundedTimeout(value: number | undefined): number {
  if (!Number.isFinite(value) || Number(value) <= 0) return DEFAULT_AUTH_HYDRATION_TIMEOUT_MS;
  return Math.min(Math.floor(Number(value)), MAX_AUTH_HYDRATION_TIMEOUT_MS);
}

function waitForPersistedDefaultAuth(
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<AuthHydrationResult> {
  if (signal?.aborted) return Promise.resolve({ result: 'cancelled' });

  return new Promise(resolve => {
    let settled = false;
    let unsubscribe: (() => void) | null = null;
    let unsubscribeWhenAssigned = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = (): void => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      signal?.removeEventListener('abort', onAbort);
      if (unsubscribe) {
        const current = unsubscribe;
        unsubscribe = null;
        try { current(); } catch (e) {
      // best-effort listener cleanup
      DebugLogger.error('auth_recovery_boot_gate:current', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
      } else {
        // Firebase may deliver the cached persisted user synchronously while
        // onAuthStateChanged is still returning its unsubscribe function.
        unsubscribeWhenAssigned = true;
      }
    };
    const finish = (result: AuthHydrationResult): void => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };
    const onAbort = (): void => finish({ result: 'cancelled' });

    signal?.addEventListener('abort', onAbort, { once: true });
    timer = setTimeout(() => finish({ result: 'timeout' }), timeoutMs);
    try {
      const nextUnsubscribe = auth().onAuthStateChanged(user => {
        const uid = String(user?.uid ?? '').trim();
        // The first emission, including null, proves persistence hydration is
        // complete. Null is not equivalent to "listener has not fired yet".
        finish({ result: 'ready', uid: uid || null });
      });
      unsubscribe = nextUnsubscribe;
      if (unsubscribeWhenAssigned) {
        unsubscribe = null;
        try { nextUnsubscribe(); } catch (e) {
      // best-effort listener cleanup
      DebugLogger.error('auth_recovery_boot_gate:uid', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
      }
    } catch {
      finish({ result: 'subscription_failed' });
    }
  });
}

async function runBootGateAttempt(
  options: AuthRecoveryBootGateOptions,
): Promise<AuthRecoveryBootGateResult> {
  let pendingJournal: string | null;
  let cleanRecoveryJournal: string | null;
  let cleanAdoptionJournal: string | null;
  let accountSwitchJournal: string | null;
  let accountSwitchReceipt: string | null;
  let providerHandoffJournal: string | null;
  try {
    // Presence only: parsing and validation belong exclusively to the adoption
    // module. The boot seam must not copy secret/identity journal fields.
    [
      pendingJournal,
      cleanRecoveryJournal,
      cleanAdoptionJournal,
      accountSwitchJournal,
      accountSwitchReceipt,
      providerHandoffJournal,
    ] = await Promise.all([
      AsyncStorage.getItem(AUTH_RECOVERY_PENDING_ACK_KEY),
      AsyncStorage.getItem(AUTH_CLEAN_INSTALL_RECOVERY_KEY),
      AsyncStorage.getItem(AUTH_CLEAN_INSTALL_ADOPTION_KEY),
      AsyncStorage.getItem(ACCOUNT_SWITCH_QUARANTINE_KEY),
      AsyncStorage.getItem(ACCOUNT_SWITCH_COMPLETION_RECEIPT_KEY),
      AsyncStorage.getItem(ACCOUNT_PROVIDER_HANDOFF_KEY),
    ]);
  } catch {
    invalidateAccountGeneration();
    beginPremiumAccountTransition();
    announceAccountSwitchQuarantineFailure('journal_read_failed');
    return { result: 'blocked_transient', reason: 'journal_read_failed' };
  }
  let cleanPhase: 'challenge' | 'confirmed' | null = null;
  if (cleanRecoveryJournal !== null) {
    try {
      const parsed = JSON.parse(cleanRecoveryJournal) as { phase?: unknown };
      cleanPhase = parsed?.phase === 'challenge'
        ? 'challenge'
        : parsed?.phase === 'confirmed'
          ? 'confirmed'
          : null;
    } catch {
      cleanPhase = null;
    }
    if (cleanPhase === null) {
      invalidateAccountGeneration();
      return { result: 'blocked_quarantined', reason: 'clean_recovery_journal_invalid' };
    }
  }
  const hasCleanAdoption = typeof cleanAdoptionJournal === 'string';
  if (!hasCleanAdoption && cleanPhase === 'confirmed') {
    invalidateAccountGeneration();
    return { result: 'blocked_quarantined', reason: 'clean_recovery_confirmation_pending' };
  }
  const hasAccountSwitch = [
    accountSwitchJournal,
    accountSwitchReceipt,
    providerHandoffJournal,
  ].some((value) => typeof value === 'string');
  const hasPendingRecovery = typeof pendingJournal === 'string';
  if (!hasPendingRecovery && !hasCleanAdoption && !hasAccountSwitch) return { result: 'proceed' };

  // From this point forward ordinary cloud work must remain unable to capture
  // the pre-recovery identity, including every timeout/error/cancel outcome.
  invalidateAccountGeneration();

  if (hasAccountSwitch) {
    beginPremiumAccountTransition();
    // The recovery wall must appear before Firebase hydration/network waits.
    // This import is state-only; runtime auth/cloud dependencies stay lazy.
    try {
      announceAccountSwitchQuarantinePresence();
    } catch {
      return { result: 'blocked_transient', reason: 'resume_failed' };
    }
  }

  const hydration = await waitForPersistedDefaultAuth(
    boundedTimeout(options.timeoutMs),
    options.signal,
  );
  if (hydration.result === 'cancelled') {
    return { result: 'blocked_transient', reason: 'cancelled' };
  }
  if (hydration.result === 'timeout') {
    return { result: 'blocked_transient', reason: 'auth_hydration_timeout' };
  }
  if (hydration.result === 'subscription_failed') {
    return { result: 'blocked_transient', reason: 'auth_subscription_failed' };
  }
  if (hydration.result !== 'ready') {
    return { result: 'blocked_transient', reason: 'auth_subscription_failed' };
  }
  if (hydration.uid === null && !hasAccountSwitch) {
    return { result: 'blocked_quarantined', reason: 'auth_uid_missing' };
  }

  let quiesced = false;
  try {
    quiesced = await quiesceCloudSyncForAccountTransition(BOOT_QUIESCE_TIMEOUT_MS);
  } catch {
    quiesced = false;
  }
  if (!quiesced) return { result: 'blocked_transient', reason: 'quiesce_failed' };
  if (options.signal?.aborted) return { result: 'blocked_transient', reason: 'cancelled' };

  if (hasAccountSwitch) {
    try {
      // Lazy by design: the no-journal first frame must not initialize any
      // account-switch dependencies or consume the 1s startup budget.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { resumeRuntimeAccountSwitchQuarantine } = require('./account_switch_quarantine') as {
        resumeRuntimeAccountSwitchQuarantine: () => Promise<{
          result: 'none' | 'completed' | 'retryable' | 'quarantined';
          reason?: string;
        }>;
      };
      const resumedSwitch = await resumeRuntimeAccountSwitchQuarantine();
      if (resumedSwitch.result === 'completed' || resumedSwitch.result === 'none') {
        return { result: 'proceed' };
      }
      return resumedSwitch.result === 'retryable'
        ? { result: 'blocked_transient', reason: 'resume_failed' }
        : { result: 'blocked_quarantined', reason: resumedSwitch.reason ?? 'account_switch_quarantined' };
    } catch {
      return { result: 'blocked_transient', reason: 'resume_failed' };
    }
  }

  let resumed: AuthRecoveryAdoptionResult;
  try {
    resumed = hasCleanAdoption
      ? await resumeCleanInstallRecoveryAdoption()
      : await resumePendingRecoveryHandoffAck();
  } catch {
    return { result: 'blocked_transient', reason: 'resume_failed' };
  }
  if (resumed.result === 'none' || resumed.result === 'completed') {
    return { result: 'proceed' };
  }
  if (resumed.result === 'ack_pending') {
    return { result: 'blocked_transient', reason: 'ack_pending' };
  }
  return { result: 'blocked_quarantined', reason: resumed.reason };
}

/**
 * One fail-closed pre-cloud attempt per JS boot. Concurrent callers share the
 * same promise so only one Auth listener, quiesce, and ACK attempt can exist.
 */
export function runAuthRecoveryBootGate(
  options: AuthRecoveryBootGateOptions = {},
): Promise<AuthRecoveryBootGateResult> {
  if (!bootGateAttempt) {
    const attempt = runBootGateAttempt(options);
    bootGateAttempt = attempt;
    void attempt.finally(() => {
      if (bootGateAttempt === attempt) bootGateAttempt = null;
    }).catch(() => {});
  }
  return bootGateAttempt;
}
