import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import {
  beginAccountGeneration,
  captureAccountGeneration,
  invalidateAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLockWithDeadline,
  type AccountGenerationToken,
} from './account_generation';
import { readAccountDeletePendingAuthRaw } from './account_delete_quarantine';
import {
  completeAuthRecoveryHandoffViaServer,
  quiesceCloudSyncForAccountTransition,
  restoreFromCloudDetailed,
  saveAccountSwitchEmergencyBackup,
  wipeLocalAccountDataForCleanInstallRecoveryWhileLocked,
} from './cloud_sync';
import { clearCompletedCleanInstallRecoveryJournalIfExact } from './auth_clean_install_recovery_journal';
import { beginPremiumAccountTransition, waitForPremiumAccountWorkIdleWithDeadline } from './premium_guard';
import { syncRevenueCatIdentity } from './revenuecat_init';
import { loadShardsFromCloud } from './shards_system';
import { getStableId, setStableId } from './stable_id';
import { beginCleanInstallRecoveryTransition } from './auth_clean_install_recovery_transition';
import { emitAppEvent } from './events';

export const AUTH_CLEAN_INSTALL_ADOPTION_KEY = 'auth_clean_install_recovery_adoption_v1';

const DEADLINE_MAX_FUTURE_MS = 65 * 60 * 1000;
const TRANSITION_TIMEOUT_MS = 10_000;

type AdoptionJournal = Readonly<{
  version: 1;
  phase: 'prepared' | 'completed';
  recoveryEventId: string;
  sourceStableId: string;
  targetStableId: string;
  sourceAuthUidHash: string;
  expectedUidHash: string;
  sourceAccountGeneration: number;
  handoffAcknowledgeUntil: number;
  cleanRecoveryJournalRawHash: string;
}>;

export type CleanInstallRecoveryAdoptionInput = Readonly<{
  customToken: string;
  recoveryEventId: string;
  sourceStableId: string;
  targetStableId: string;
  sourceAuthUid: string;
  expectedUid: string;
  sourceAccountGeneration: number;
  handoffAcknowledgeUntil: number;
  cleanRecoveryJournalRaw: string;
}>;

export type CleanInstallRecoveryAdoptionResult =
  | Readonly<{ result: 'completed' | 'ack_pending' | 'none' }>
  | Readonly<{ result: 'quarantined'; reason: string }>;

function codedError(code: string): Error { return new Error(code); }

function strictId(value: unknown, code: string, maxLength = 160): string {
  if (typeof value !== 'string') throw codedError(code);
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength || normalized.includes('/')) throw codedError(code);
  return normalized;
}

function positiveInteger(value: unknown, code: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || !Number.isFinite(value) || value <= 0) {
    throw codedError(code);
  }
  return value;
}

function jwtLike(value: unknown): value is string {
  return typeof value === 'string'
    && value.length > 80
    && value.length <= 8_192
    && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value);
}

function authInstance(): any {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const value = require('@react-native-firebase/auth').default();
  if (!value || typeof value.signInWithCustomToken !== 'function') {
    throw codedError('clean_recovery_default_auth_unavailable');
  }
  return value;
}

function authIdentity(auth: any): { uid: string; isAnonymous: boolean } | null {
  const uid = typeof auth?.currentUser?.uid === 'string' ? auth.currentUser.uid.trim() : '';
  if (!uid) return null;
  return { uid, isAnonymous: auth.currentUser?.isAnonymous === true };
}

async function hash(value: string): Promise<string> {
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    value,
    { encoding: Crypto.CryptoEncoding.HEX },
  );
  if (!/^[a-f0-9]{64}$/i.test(digest)) throw codedError('clean_recovery_hash_failed');
  return digest.toLowerCase();
}

function validateDeadline(value: unknown): number {
  const deadline = positiveInteger(value, 'clean_recovery_handoff_deadline_invalid');
  const now = Date.now();
  if (deadline <= now || deadline > now + DEADLINE_MAX_FUTURE_MS) {
    throw codedError('clean_recovery_handoff_deadline_invalid');
  }
  return deadline;
}

function assertDeadlineActive(journal: AdoptionJournal): void {
  if (journal.handoffAcknowledgeUntil <= Date.now()) {
    throw codedError('clean_recovery_handoff_deadline_expired');
  }
}

async function assertNoPendingDelete(): Promise<void> {
  let raw: string | null;
  try { raw = await readAccountDeletePendingAuthRaw(); } catch { throw codedError('account_delete_guard_unavailable'); }
  if (raw !== null) throw codedError('account_delete_pending');
}

function assertHydratedAnonymous(auth: any, expectedUid: string): void {
  const identity = authIdentity(auth);
  if (!identity) throw codedError('clean_recovery_default_auth_not_hydrated');
  if (!identity.isAnonymous) throw codedError('clean_recovery_default_auth_not_anonymous');
  if (identity.uid !== expectedUid) throw codedError('clean_recovery_source_auth_uid_changed');
}

function assertSourceGeneration(token: AccountGenerationToken, sourceStableId: string): void {
  if (
    token.phase !== 'active'
    || token.stableId !== sourceStableId
    || !isCurrentAccountGeneration(token, sourceStableId)
  ) throw codedError('clean_recovery_source_generation_changed');
}

function assertTransitionGeneration(token: AccountGenerationToken): void {
  const current = captureAccountGeneration();
  if (
    token.phase !== 'transitioning'
    || current.phase !== 'transitioning'
    || token.generation !== current.generation
  ) throw codedError('clean_recovery_source_generation_changed');
}

const JOURNAL_KEYS = [
  'version', 'phase', 'recoveryEventId', 'sourceStableId', 'targetStableId',
  'sourceAuthUidHash', 'expectedUidHash', 'sourceAccountGeneration',
  'handoffAcknowledgeUntil', 'cleanRecoveryJournalRawHash',
] as const;

function parseJournal(raw: string): AdoptionJournal {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw codedError('clean_recovery_adoption_journal_invalid'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw codedError('clean_recovery_adoption_journal_invalid');
  }
  const data = value as Record<string, unknown>;
  const keys = Object.keys(data);
  if (keys.length !== JOURNAL_KEYS.length || keys.some(key => !JOURNAL_KEYS.includes(key as any))) {
    throw codedError('clean_recovery_adoption_journal_invalid');
  }
  const sourceAuthUidHash = strictId(data.sourceAuthUidHash, 'clean_recovery_adoption_journal_invalid');
  const expectedUidHash = strictId(data.expectedUidHash, 'clean_recovery_adoption_journal_invalid');
  const cleanRecoveryJournalRawHash = strictId(
    data.cleanRecoveryJournalRawHash,
    'clean_recovery_adoption_journal_invalid',
  );
  if (
    data.version !== 1
    || (data.phase !== 'prepared' && data.phase !== 'completed')
    || !/^[a-f0-9]{64}$/.test(sourceAuthUidHash)
    || !/^[a-f0-9]{64}$/.test(expectedUidHash)
    || !/^[a-f0-9]{64}$/.test(cleanRecoveryJournalRawHash)
  ) throw codedError('clean_recovery_adoption_journal_invalid');
  return {
    version: 1,
    phase: data.phase,
    recoveryEventId: strictId(data.recoveryEventId, 'clean_recovery_adoption_journal_invalid'),
    sourceStableId: strictId(data.sourceStableId, 'clean_recovery_adoption_journal_invalid'),
    targetStableId: strictId(data.targetStableId, 'clean_recovery_adoption_journal_invalid'),
    sourceAuthUidHash,
    expectedUidHash,
    sourceAccountGeneration: positiveInteger(
      data.sourceAccountGeneration,
      'clean_recovery_adoption_journal_invalid',
    ),
    handoffAcknowledgeUntil: positiveInteger(
      data.handoffAcknowledgeUntil,
      'clean_recovery_adoption_journal_invalid',
    ),
    cleanRecoveryJournalRawHash,
  };
}

async function persistJournal(journal: AdoptionJournal): Promise<string> {
  const raw = JSON.stringify(journal);
  await AsyncStorage.setItem(AUTH_CLEAN_INSTALL_ADOPTION_KEY, raw);
  if (await AsyncStorage.getItem(AUTH_CLEAN_INSTALL_ADOPTION_KEY) !== raw) {
    throw codedError('clean_recovery_adoption_journal_persist_failed');
  }
  return raw;
}

async function clearJournalIfExact(raw: string): Promise<boolean> {
  if (await AsyncStorage.getItem(AUTH_CLEAN_INSTALL_ADOPTION_KEY) !== raw) return false;
  await AsyncStorage.removeItem(AUTH_CLEAN_INSTALL_ADOPTION_KEY);
  if (await AsyncStorage.getItem(AUTH_CLEAN_INSTALL_ADOPTION_KEY) !== null) {
    throw codedError('clean_recovery_adoption_journal_clear_failed');
  }
  return true;
}

function isTransient(error: unknown): boolean {
  const row = error && typeof error === 'object' ? error as { code?: unknown } : {};
  return ['functions/unavailable', 'functions/cancelled', 'auth/network-request-failed']
    .includes(String(row.code ?? '').toLowerCase());
}

async function finishTargetAdoption(
  journal: AdoptionJournal,
  cleanRecoveryJournalRaw: string,
): Promise<CleanInstallRecoveryAdoptionResult> {
  const auth = authInstance();
  const identity = authIdentity(auth);
  if (!identity || identity.isAnonymous || await hash(identity.uid) !== journal.expectedUidHash) {
    return { result: 'quarantined', reason: 'auth_uid_mismatch' };
  }
  const currentStableId = strictId(await getStableId(), 'clean_recovery_local_stable_missing');
  if (currentStableId !== journal.sourceStableId && currentStableId !== journal.targetStableId) {
    return { result: 'quarantined', reason: 'stable_id_mismatch' };
  }
  if (currentStableId === journal.sourceStableId) {
    assertDeadlineActive(journal);
    await wipeLocalAccountDataForCleanInstallRecoveryWhileLocked();
    await setStableId(journal.targetStableId);
  }
  const targetGeneration = beginAccountGeneration(journal.targetStableId);
  const isCurrent = () => isCurrentAccountGeneration(targetGeneration, journal.targetStableId);
  assertDeadlineActive(journal);
  try {
    await completeAuthRecoveryHandoffViaServer(journal.recoveryEventId);
  } catch (error) {
    return isTransient(error)
      ? { result: 'ack_pending' }
      : { result: 'quarantined', reason: 'ack_rejected' };
  }
  if (!isCurrent()) return { result: 'quarantined', reason: 'target_generation_changed' };
  const restoreResult = await restoreFromCloudDetailed();
  if (restoreResult === 'failed') {
    return { result: 'quarantined', reason: 'restore_failed' };
  }
  if (!isCurrent()) return { result: 'quarantined', reason: 'target_generation_changed' };
  await loadShardsFromCloud(isCurrent);
  if (!isCurrent()) return { result: 'quarantined', reason: 'target_generation_changed' };
  await syncRevenueCatIdentity(isCurrent);
  if (!isCurrent()) return { result: 'quarantined', reason: 'target_generation_changed' };
  const completedRaw = await persistJournal({ ...journal, phase: 'completed' });
  if (!await clearCompletedCleanInstallRecoveryJournalIfExact(cleanRecoveryJournalRaw, {
    targetStableId: journal.targetStableId,
    recoveryEventId: journal.recoveryEventId,
  })) return { result: 'quarantined', reason: 'clean_journal_clear_failed' };
  if (!await clearJournalIfExact(completedRaw)) {
    return { result: 'quarantined', reason: 'adoption_journal_changed' };
  }
  // зачем: аудит зависшего Plus (2026-08-04) — beginPremiumAccountTransition() выше
  // сбрасывает PremiumContext в false и держит его так, пока не придёт
  // 'auth_provider_linked' (обычный вход его шлёт, этот путь — нет). Без эмита
  // syncRevenueCatIdentity() внутри finishTargetAdoption уже мог записать реальный
  // премиум в AsyncStorage, а экран всё равно показывал бы пейвол до следующего
  // случайного триггера reload() (сворачивание/покупка/перезапуск).
  emitAppEvent('auth_provider_linked');
  return { result: 'completed' };
}

let operationInFlight: Promise<CleanInstallRecoveryAdoptionResult> | null = null;

export function adoptCleanInstallRecoveryHandoff(
  input: CleanInstallRecoveryAdoptionInput,
): Promise<CleanInstallRecoveryAdoptionResult> {
  if (operationInFlight) return Promise.reject(codedError('clean_recovery_adoption_in_progress'));
  const releaseSharedTransition = beginCleanInstallRecoveryTransition();
  const task = adoptInternal(input).finally(() => {
    if (operationInFlight === task) operationInFlight = null;
    releaseSharedTransition();
  });
  operationInFlight = task;
  return task;
}

async function adoptInternal(
  input: CleanInstallRecoveryAdoptionInput,
): Promise<CleanInstallRecoveryAdoptionResult> {
  if (!jwtLike(input.customToken)) throw codedError('clean_recovery_custom_token_invalid');
  const sourceStableId = strictId(input.sourceStableId, 'clean_recovery_source_stable_invalid');
  const targetStableId = strictId(input.targetStableId, 'clean_recovery_target_stable_invalid');
  if (sourceStableId === targetStableId) throw codedError('clean_recovery_distinct_target_required');
  const sourceAuthUid = strictId(input.sourceAuthUid, 'clean_recovery_source_auth_uid_invalid', 128);
  const expectedUid = strictId(input.expectedUid, 'clean_recovery_expected_uid_invalid', 128);
  const recoveryEventId = strictId(input.recoveryEventId, 'clean_recovery_event_invalid');
  const sourceAccountGeneration = positiveInteger(
    input.sourceAccountGeneration,
    'clean_recovery_source_generation_invalid',
  );
  const handoffAcknowledgeUntil = validateDeadline(input.handoffAcknowledgeUntil);
  const cleanRecoveryJournalRaw = strictId(
    input.cleanRecoveryJournalRaw,
    'clean_recovery_journal_required',
    16_384,
  );
  if (await AsyncStorage.getItem('auth_clean_install_recovery_v1') !== cleanRecoveryJournalRaw) {
    throw codedError('clean_recovery_journal_changed');
  }
  await assertNoPendingDelete();
  if (String(await getStableId() ?? '').trim() !== sourceStableId) {
    throw codedError('clean_recovery_source_stable_changed');
  }
  const sourceGeneration = captureAccountGeneration();
  if (sourceGeneration.generation !== sourceAccountGeneration) {
    throw codedError('clean_recovery_source_generation_changed');
  }
  assertSourceGeneration(sourceGeneration, sourceStableId);
  const auth = authInstance();
  assertHydratedAnonymous(auth, sourceAuthUid);

  const sourceAuthUidHash = await hash(sourceAuthUid);
  const expectedUidHash = await hash(expectedUid);
  const cleanRecoveryJournalRawHash = await hash(cleanRecoveryJournalRaw);
  const transitionGeneration = invalidateAccountGeneration();
  beginPremiumAccountTransition();
  if (!await waitForPremiumAccountWorkIdleWithDeadline(TRANSITION_TIMEOUT_MS)) {
    throw codedError('clean_recovery_premium_quiesce_failed');
  }
  if (!await quiesceCloudSyncForAccountTransition(TRANSITION_TIMEOUT_MS)) {
    throw codedError('clean_recovery_sync_quiesce_failed');
  }
  assertHydratedAnonymous(auth, sourceAuthUid);
  assertTransitionGeneration(transitionGeneration);
  await assertNoPendingDelete();
  if (!await saveAccountSwitchEmergencyBackup('clean_install_recovery', sourceStableId)) {
    throw codedError('clean_recovery_source_backup_failed');
  }
  assertHydratedAnonymous(auth, sourceAuthUid);
  assertTransitionGeneration(transitionGeneration);
  await assertNoPendingDelete();
  const journal: AdoptionJournal = {
    version: 1,
    phase: 'prepared',
    recoveryEventId,
    sourceStableId,
    targetStableId,
    sourceAuthUidHash,
    expectedUidHash,
    sourceAccountGeneration,
    handoffAcknowledgeUntil,
    cleanRecoveryJournalRawHash,
  };
  await persistJournal(journal);
  const locked = await withAccountTransitionLockWithDeadline(async () => {
    assertDeadlineActive(journal);
    const credential = await auth.signInWithCustomToken(input.customToken);
    const returnedUid = String(credential?.user?.uid ?? '').trim();
    if (returnedUid !== expectedUid || authIdentity(auth)?.uid !== expectedUid) {
      return { result: 'quarantined', reason: 'auth_uid_mismatch' } as const;
    }
    return finishTargetAdoption(journal, cleanRecoveryJournalRaw);
  }, TRANSITION_TIMEOUT_MS);
  if (!locked.completed) throw codedError('clean_recovery_transition_lock_timeout');
  return locked.value;
}

export function resumeCleanInstallRecoveryAdoption(): Promise<CleanInstallRecoveryAdoptionResult> {
  if (operationInFlight) return operationInFlight;
  const releaseSharedTransition = beginCleanInstallRecoveryTransition();
  const task = resumeInternal().finally(() => {
    if (operationInFlight === task) operationInFlight = null;
    releaseSharedTransition();
  });
  operationInFlight = task;
  return task;
}

async function resumeInternal(): Promise<CleanInstallRecoveryAdoptionResult> {
  const rawJournal = await AsyncStorage.getItem(AUTH_CLEAN_INSTALL_ADOPTION_KEY);
  if (!rawJournal) return { result: 'none' };
  let journal: AdoptionJournal;
  try { journal = parseJournal(rawJournal); } catch { return { result: 'quarantined', reason: 'journal_invalid' }; }
  if (journal.phase === 'completed') {
    const cleanRaw = await AsyncStorage.getItem('auth_clean_install_recovery_v1');
    if (cleanRaw !== null) {
      if (await hash(cleanRaw) !== journal.cleanRecoveryJournalRawHash) {
        return { result: 'quarantined', reason: 'clean_journal_mismatch' };
      }
      if (!await clearCompletedCleanInstallRecoveryJournalIfExact(cleanRaw, {
        targetStableId: journal.targetStableId,
        recoveryEventId: journal.recoveryEventId,
      })) return { result: 'quarantined', reason: 'clean_journal_clear_failed' };
    }
    if (!await clearJournalIfExact(rawJournal)) {
      return { result: 'quarantined', reason: 'adoption_journal_changed' };
    }
    return { result: 'completed' };
  }
  if (
    journal.handoffAcknowledgeUntil <= Date.now()
    || journal.handoffAcknowledgeUntil > Date.now() + DEADLINE_MAX_FUTURE_MS
  ) {
    return { result: 'quarantined', reason: 'ack_expired' };
  }
  await assertNoPendingDelete();
  const cleanRecoveryJournalRaw = await AsyncStorage.getItem('auth_clean_install_recovery_v1');
  if (!cleanRecoveryJournalRaw || await hash(cleanRecoveryJournalRaw) !== journal.cleanRecoveryJournalRawHash) {
    return { result: 'quarantined', reason: 'clean_journal_mismatch' };
  }
  invalidateAccountGeneration();
  beginPremiumAccountTransition();
  if (!await waitForPremiumAccountWorkIdleWithDeadline(TRANSITION_TIMEOUT_MS)) {
    return { result: 'quarantined', reason: 'premium_quiesce_failed' };
  }
  if (!await quiesceCloudSyncForAccountTransition(TRANSITION_TIMEOUT_MS)) {
    return { result: 'quarantined', reason: 'sync_quiesce_failed' };
  }
  await assertNoPendingDelete();
  const locked = await withAccountTransitionLockWithDeadline(
    () => finishTargetAdoption(journal, cleanRecoveryJournalRaw),
    TRANSITION_TIMEOUT_MS,
  );
  return locked.completed
    ? locked.value
    : { result: 'quarantined', reason: 'transition_lock_timeout' };
}
