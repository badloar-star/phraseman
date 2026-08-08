import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { beginAccountGeneration, invalidateAccountGeneration } from './account_generation';
import {
  completeAuthRecoveryHandoffViaServer,
  quiesceCloudSyncForAccountTransition,
} from './cloud_sync';
import { getStableId } from './stable_id';

export const AUTH_RECOVERY_PENDING_ACK_KEY = 'auth_recovery_pending_ack_v1';

const HANDOFF_ACK_MAX_FUTURE_MS = 65 * 60 * 1000;
const QUIESCE_TIMEOUT_MS = 10_000;

type PendingAckJournal = Readonly<{
  recoveryEventId: string;
  stableId: string;
  handoffAcknowledgeUntil: number;
  expectedUidHash: string;
}>;

export type AuthRecoveryAdoptionInput = Readonly<{
  customToken: string;
  recoveryEventId: string;
  stableId: string;
  expectedUid: string;
  handoffAcknowledgeUntil: number;
}>;

export type AuthRecoveryAdoptionResult =
  | Readonly<{ result: 'completed' }>
  | Readonly<{ result: 'ack_pending' }>
  | Readonly<{ result: 'none' }>
  | Readonly<{ result: 'quarantined'; reason: string }>;

function codedError(code: string, cause?: unknown): Error {
  const error = new Error(code);
  if (cause !== undefined) (error as Error & { cause?: unknown }).cause = cause;
  return error;
}

function opaqueId(value: unknown, code: string, maxLength = 160): string {
  const normalized = String(value ?? '').trim();
  if (!normalized || normalized.length > maxLength || normalized.includes('/')) {
    throw codedError(code);
  }
  return normalized;
}

function jwtLike(value: unknown): value is string {
  return typeof value === 'string'
    && value.length > 80
    && value.length <= 8_192
    && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value);
}

function authInstance(): any {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const auth = require('@react-native-firebase/auth').default();
  if (!auth || typeof auth.signInWithCustomToken !== 'function') {
    throw codedError('auth_recovery_default_auth_unavailable');
  }
  return auth;
}

function currentUid(auth: any): string | null {
  const uid = auth?.currentUser?.uid;
  return typeof uid === 'string' && uid.trim() ? uid.trim() : null;
}

async function hashUid(uid: string): Promise<string> {
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    uid,
    { encoding: Crypto.CryptoEncoding.HEX },
  );
  if (!/^[a-f0-9]{64}$/i.test(digest)) throw codedError('auth_recovery_uid_hash_failed');
  return digest.toLowerCase();
}

function validateDeadline(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw codedError('auth_recovery_handoff_deadline_invalid');
  }
  const now = Date.now();
  if (value <= now || value > now + HANDOFF_ACK_MAX_FUTURE_MS) {
    throw codedError('auth_recovery_handoff_deadline_invalid');
  }
  return value;
}

function parseJournal(raw: string): PendingAckJournal {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw codedError('auth_recovery_ack_journal_invalid');
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw codedError('auth_recovery_ack_journal_invalid');
  }
  const data = value as Record<string, unknown>;
  const recoveryEventId = opaqueId(data.recoveryEventId, 'auth_recovery_ack_journal_invalid');
  const stableId = opaqueId(data.stableId, 'auth_recovery_ack_journal_invalid');
  const deadline = data.handoffAcknowledgeUntil;
  const expectedUidHash = String(data.expectedUidHash ?? '').trim().toLowerCase();
  if (
    typeof deadline !== 'number'
    || !Number.isFinite(deadline)
    || !/^[a-f0-9]{64}$/.test(expectedUidHash)
  ) {
    throw codedError('auth_recovery_ack_journal_invalid');
  }
  return {
    recoveryEventId,
    stableId,
    handoffAcknowledgeUntil: deadline,
    expectedUidHash,
  };
}

async function persistJournal(journal: PendingAckJournal): Promise<string> {
  const raw = JSON.stringify(journal);
  await AsyncStorage.setItem(AUTH_RECOVERY_PENDING_ACK_KEY, raw);
  if (await AsyncStorage.getItem(AUTH_RECOVERY_PENDING_ACK_KEY) !== raw) {
    throw codedError('auth_recovery_ack_journal_persist_failed');
  }
  return raw;
}

async function clearJournalIfExact(raw: string): Promise<void> {
  if (await AsyncStorage.getItem(AUTH_RECOVERY_PENDING_ACK_KEY) !== raw) return;
  await AsyncStorage.removeItem(AUTH_RECOVERY_PENDING_ACK_KEY);
}

function isTransientAckFailure(error: unknown): boolean {
  const record = error && typeof error === 'object'
    ? error as { code?: unknown; message?: unknown }
    : {};
  const code = String(record.code ?? '').trim().toLowerCase();
  const message = String(record.message ?? error ?? '').trim().toLowerCase();
  const serverMessage = message.replace(/^\[[^\]]+\]\s*/, '');
  if (
    code === 'functions/unavailable'
    || code === 'unavailable'
    || code === 'functions/cancelled'
    || code === 'cancelled'
    || code === 'auth/network-request-failed'
    || code === 'network-request-failed'
  ) return true;
  if (code === 'functions/deadline-exceeded' || code === 'deadline-exceeded') {
    return !message.includes('recovery_handoff_ack_expired');
  }
  if (code === 'functions/internal' || code === 'internal') {
    return serverMessage === 'recovery_handoff_unavailable';
  }
  if (code) return false;
  return /^timeout_[a-z0-9_]+(?:_\d+ms)?$/.test(serverMessage);
}

let operationInFlight: Promise<AuthRecoveryAdoptionResult> | null = null;

export function adoptAuthRecoveryHandoffOnDefaultAuth(
  input: AuthRecoveryAdoptionInput,
): Promise<AuthRecoveryAdoptionResult> {
  if (operationInFlight) return Promise.reject(codedError('auth_recovery_adoption_in_progress'));
  const task = adoptInternal(input).finally(() => {
    if (operationInFlight === task) operationInFlight = null;
  });
  operationInFlight = task;
  return task;
}

async function adoptInternal(input: AuthRecoveryAdoptionInput): Promise<AuthRecoveryAdoptionResult> {
  if (!jwtLike(input?.customToken)) throw codedError('auth_recovery_custom_token_invalid');
  const recoveryEventId = opaqueId(input.recoveryEventId, 'auth_recovery_event_id_invalid');
  const stableId = opaqueId(input.stableId, 'auth_recovery_stable_id_invalid');
  const expectedUid = opaqueId(input.expectedUid, 'auth_recovery_expected_uid_invalid', 128);
  const handoffAcknowledgeUntil = validateDeadline(input.handoffAcknowledgeUntil);
  const localStableId = String(await getStableId() ?? '').trim();
  if (localStableId !== stableId) throw codedError('auth_recovery_local_stable_mismatch');

  const expectedUidHash = await hashUid(expectedUid);
  const journal: PendingAckJournal = {
    recoveryEventId,
    stableId,
    handoffAcknowledgeUntil,
    expectedUidHash,
  };
  const auth = authInstance();
  const previousUid = currentUid(auth);
  invalidateAccountGeneration();

  let rawJournal = '';
  try {
    if (!await quiesceCloudSyncForAccountTransition(QUIESCE_TIMEOUT_MS)) {
      throw codedError('auth_recovery_sync_quiesce_failed');
    }
    rawJournal = await persistJournal(journal);
    if (String(await getStableId() ?? '').trim() !== stableId) {
      throw codedError('auth_recovery_local_stable_mismatch');
    }
  } catch (error) {
    if (rawJournal) await clearJournalIfExact(rawJournal).catch(() => {});
    beginAccountGeneration(localStableId);
    throw error;
  }

  let credential: any;
  try {
    credential = await auth.signInWithCustomToken(input.customToken);
  } catch (error) {
    if (currentUid(auth) === previousUid) {
      await clearJournalIfExact(rawJournal).catch(() => {});
      beginAccountGeneration(localStableId);
      throw error;
    }
    return { result: 'quarantined', reason: 'sign_in_error_after_auth_change' };
  }

  const returnedUid = String(credential?.user?.uid ?? '').trim();
  if (returnedUid !== expectedUid || currentUid(auth) !== expectedUid) {
    return { result: 'quarantined', reason: 'auth_uid_mismatch' };
  }
  if (String(await getStableId() ?? '').trim() !== stableId) {
    return { result: 'quarantined', reason: 'stable_id_changed' };
  }

  try {
    await completeAuthRecoveryHandoffViaServer(recoveryEventId);
  } catch (error) {
    return isTransientAckFailure(error)
      ? { result: 'ack_pending' }
      : { result: 'quarantined', reason: 'ack_rejected' };
  }
  beginAccountGeneration(stableId);
  try {
    await clearJournalIfExact(rawJournal);
  } catch {
    return { result: 'ack_pending' };
  }
  return { result: 'completed' };
}

export function resumePendingRecoveryHandoffAck(): Promise<AuthRecoveryAdoptionResult> {
  if (operationInFlight) return operationInFlight;
  const task = resumeInternal().finally(() => {
    if (operationInFlight === task) operationInFlight = null;
  });
  operationInFlight = task;
  return task;
}

async function resumeInternal(): Promise<AuthRecoveryAdoptionResult> {
  const raw = await AsyncStorage.getItem(AUTH_RECOVERY_PENDING_ACK_KEY);
  if (!raw) return { result: 'none' };
  let journal: PendingAckJournal;
  try {
    journal = parseJournal(raw);
  } catch {
    return { result: 'quarantined', reason: 'journal_invalid' };
  }
  if (journal.handoffAcknowledgeUntil <= Date.now()) {
    return { result: 'quarantined', reason: 'ack_expired' };
  }
  if (String(await getStableId() ?? '').trim() !== journal.stableId) {
    return { result: 'quarantined', reason: 'stable_id_mismatch' };
  }
  const auth = authInstance();
  const uid = currentUid(auth);
  if (!uid || await hashUid(uid) !== journal.expectedUidHash) {
    return { result: 'quarantined', reason: 'auth_uid_mismatch' };
  }
  try {
    await completeAuthRecoveryHandoffViaServer(journal.recoveryEventId);
  } catch (error) {
    return isTransientAckFailure(error)
      ? { result: 'ack_pending' }
      : { result: 'quarantined', reason: 'ack_rejected' };
  }
  beginAccountGeneration(journal.stableId);
  try {
    await clearJournalIfExact(raw);
  } catch {
    return { result: 'ack_pending' };
  }
  return { result: 'completed' };
}
