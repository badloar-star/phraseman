import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

export const AUTH_CLEAN_INSTALL_RECOVERY_KEY = 'auth_clean_install_recovery_v1';
export const AUTH_CLEAN_INSTALL_CHALLENGE_TTL_MS = 10 * 60 * 1000;

type RecoveryProvider = 'google' | 'apple';

export type CleanInstallRecoveryJournal = Readonly<{
  version: 1;
  phase: 'challenge' | 'confirmed';
  provider: RecoveryProvider;
  sourceStableId: string;
  requesterUidHash: string;
  sourceAuthUidHash: string;
  sourceAccountGeneration: number;
  challengeId: string;
  requestClientRequestId: string;
  confirmClientRequestId: string;
  createdAt: number;
  expiresAt: number;
  targetStableId?: string;
  recoveryEventId?: string;
  handoffRequestId?: string;
}>;

type JournalScope = Readonly<{
  provider: RecoveryProvider;
  sourceStableId: string;
  requesterUidHash: string;
  sourceAuthUidHash: string;
  sourceAccountGeneration: number;
  now?: number;
}>;

const CHALLENGE_KEYS = [
  'version',
  'phase',
  'provider',
  'sourceStableId',
  'requesterUidHash',
  'sourceAuthUidHash',
  'sourceAccountGeneration',
  'challengeId',
  'requestClientRequestId',
  'confirmClientRequestId',
  'createdAt',
  'expiresAt',
] as const;
const CONFIRMED_KEYS = [
  ...CHALLENGE_KEYS,
  'targetStableId',
  'recoveryEventId',
  'handoffRequestId',
] as const;

let journalMutationTail: Promise<void> = Promise.resolve();

async function withJournalMutation<T>(work: () => Promise<T>): Promise<T> {
  const previous = journalMutationTail;
  let release!: () => void;
  journalMutationTail = new Promise<void>((resolve) => { release = resolve; });
  await previous;
  try {
    return await work();
  } finally {
    release();
  }
}

function hasExactKeys(data: Record<string, unknown>, allowed: readonly string[]): boolean {
  const keys = Object.keys(data);
  return keys.length === allowed.length && keys.every((key) => allowed.includes(key));
}

function strictString(value: unknown, code: string, maxLength = 160): string {
  if (typeof value !== 'string') throw new Error(code);
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength || normalized.includes('/')) {
    throw new Error(code);
  }
  return normalized;
}

function challengeId(value: unknown): string {
  const normalized = strictString(value, 'clean_recovery_challenge_invalid');
  if (!/^[A-Za-z0-9_-]{24,160}$/.test(normalized)) {
    throw new Error('clean_recovery_challenge_invalid');
  }
  return normalized;
}

function uidHash(value: unknown): string {
  if (typeof value !== 'string') throw new Error('clean_recovery_scope_invalid');
  const normalized = value.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalized)) throw new Error('clean_recovery_scope_invalid');
  return normalized;
}

function finiteInteger(value: unknown, code: string, minimum = 0): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value) || value < minimum) {
    throw new Error(code);
  }
  return value;
}

function recoveryProvider(value: unknown): RecoveryProvider {
  if (value !== 'google' && value !== 'apple') throw new Error('clean_recovery_provider_invalid');
  return value;
}

function validateLifetime(createdAt: number, expiresAt: number): void {
  if (expiresAt <= createdAt || expiresAt > createdAt + AUTH_CLEAN_INSTALL_CHALLENGE_TTL_MS) {
    throw new Error('clean_recovery_journal_invalid');
  }
}

function parse(raw: string): CleanInstallRecoveryJournal {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error('clean_recovery_journal_invalid'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('clean_recovery_journal_invalid');
  }
  const data = value as Record<string, unknown>;
  const phase = data.phase;
  if (data.version !== 1 || (phase !== 'challenge' && phase !== 'confirmed')) {
    throw new Error('clean_recovery_journal_invalid');
  }
  if (!hasExactKeys(data, phase === 'challenge' ? CHALLENGE_KEYS : CONFIRMED_KEYS)) {
    throw new Error('clean_recovery_journal_invalid');
  }
  const createdAt = finiteInteger(data.createdAt, 'clean_recovery_journal_invalid');
  const expiresAt = finiteInteger(data.expiresAt, 'clean_recovery_journal_invalid');
  validateLifetime(createdAt, expiresAt);
  return {
    version: 1,
    phase,
    provider: recoveryProvider(data.provider),
    sourceStableId: strictString(data.sourceStableId, 'clean_recovery_journal_invalid'),
    requesterUidHash: uidHash(data.requesterUidHash),
    sourceAuthUidHash: uidHash(data.sourceAuthUidHash),
    sourceAccountGeneration: finiteInteger(
      data.sourceAccountGeneration,
      'clean_recovery_journal_invalid',
      1,
    ),
    challengeId: challengeId(data.challengeId),
    requestClientRequestId: strictString(data.requestClientRequestId, 'clean_recovery_journal_invalid'),
    confirmClientRequestId: strictString(data.confirmClientRequestId, 'clean_recovery_journal_invalid'),
    createdAt,
    expiresAt,
    ...(phase === 'confirmed' ? {
      targetStableId: strictString(data.targetStableId, 'clean_recovery_journal_invalid'),
      recoveryEventId: strictString(data.recoveryEventId, 'clean_recovery_journal_invalid'),
      handoffRequestId: strictString(data.handoffRequestId, 'clean_recovery_journal_invalid'),
    } : {}),
  };
}

async function persistVerifiedUnsafe(journal: CleanInstallRecoveryJournal): Promise<string> {
  const raw = JSON.stringify(journal);
  await AsyncStorage.setItem(AUTH_CLEAN_INSTALL_RECOVERY_KEY, raw);
  if (await AsyncStorage.getItem(AUTH_CLEAN_INSTALL_RECOVERY_KEY) !== raw) {
    throw new Error('clean_recovery_journal_persist_failed');
  }
  return raw;
}

export async function hashCleanInstallRequesterUid(uidRaw: string): Promise<string> {
  const uid = strictString(uidRaw, 'clean_recovery_requester_uid_invalid', 128);
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    uid,
    { encoding: Crypto.CryptoEncoding.HEX },
  );
  return uidHash(digest);
}

export async function persistCleanInstallChallenge(input: Readonly<{
  provider: RecoveryProvider;
  sourceStableId: string;
  requesterUidHash: string;
  sourceAuthUidHash: string;
  sourceAccountGeneration: number;
  challengeId: string;
  requestClientRequestId: string;
  confirmClientRequestId: string;
  expiresInSec: number;
  now?: number;
}>): Promise<string> {
  const now = finiteInteger(input.now ?? Date.now(), 'clean_recovery_time_invalid');
  const expiresInSec = finiteInteger(input.expiresInSec, 'clean_recovery_expiry_invalid', 1);
  const ttlMs = Math.min(expiresInSec * 1000, AUTH_CLEAN_INSTALL_CHALLENGE_TTL_MS);
  if (!Number.isSafeInteger(ttlMs)) throw new Error('clean_recovery_expiry_invalid');
  const next: CleanInstallRecoveryJournal = {
    version: 1,
    phase: 'challenge',
    provider: recoveryProvider(input.provider),
    sourceStableId: strictString(input.sourceStableId, 'clean_recovery_source_stable_invalid'),
    requesterUidHash: uidHash(input.requesterUidHash),
    sourceAuthUidHash: uidHash(input.sourceAuthUidHash),
    sourceAccountGeneration: finiteInteger(
      input.sourceAccountGeneration,
      'clean_recovery_source_generation_invalid',
      1,
    ),
    challengeId: challengeId(input.challengeId),
    requestClientRequestId: strictString(input.requestClientRequestId, 'clean_recovery_request_id_invalid'),
    confirmClientRequestId: strictString(input.confirmClientRequestId, 'clean_recovery_request_id_invalid'),
    createdAt: now,
    expiresAt: now + ttlMs,
  };
  return withJournalMutation(() => persistVerifiedUnsafe(next));
}

export async function readCleanInstallRecoveryJournal(scope: JournalScope): Promise<
  | { status: 'none' | 'expired' }
  | { status: 'quarantined'; reason: 'journal_invalid' | 'scope_mismatch' | 'confirmed_expired' }
  | { status: 'ready'; journal: CleanInstallRecoveryJournal; raw: string }
> {
  const raw = await AsyncStorage.getItem(AUTH_CLEAN_INSTALL_RECOVERY_KEY);
  if (!raw) return { status: 'none' };
  let journal: CleanInstallRecoveryJournal;
  try { journal = parse(raw); } catch { return { status: 'quarantined', reason: 'journal_invalid' }; }
  let scopeProvider: RecoveryProvider;
  let sourceStableId: string;
  let requesterUidHash: string;
  let sourceAuthUidHash: string;
  let sourceAccountGeneration: number;
  let now: number;
  try {
    scopeProvider = recoveryProvider(scope.provider);
    sourceStableId = strictString(scope.sourceStableId, 'clean_recovery_scope_invalid');
    requesterUidHash = uidHash(scope.requesterUidHash);
    sourceAuthUidHash = uidHash(scope.sourceAuthUidHash);
    sourceAccountGeneration = finiteInteger(
      scope.sourceAccountGeneration,
      'clean_recovery_scope_invalid',
      1,
    );
    now = finiteInteger(scope.now ?? Date.now(), 'clean_recovery_scope_invalid');
  } catch {
    return { status: 'quarantined', reason: 'scope_mismatch' };
  }
  if (journal.createdAt > now) {
    return { status: 'quarantined', reason: 'journal_invalid' };
  }
  if (
    journal.provider !== scopeProvider
    || journal.sourceStableId !== sourceStableId
    || journal.requesterUidHash !== requesterUidHash
    || journal.sourceAuthUidHash !== sourceAuthUidHash
    || journal.sourceAccountGeneration !== sourceAccountGeneration
  ) return { status: 'quarantined', reason: 'scope_mismatch' };
  if (journal.expiresAt <= now) {
    return journal.phase === 'confirmed'
      ? { status: 'quarantined', reason: 'confirmed_expired' }
      : { status: 'expired' };
  }
  return { status: 'ready', journal, raw };
}

export async function promoteCleanInstallRecoveryConfirmed(
  expectedRaw: string,
  input: Readonly<{
    targetStableId: string;
    recoveryEventId: string;
    handoffRequestId: string;
    handoffEligibleUntil: number;
    now?: number;
  }>,
): Promise<string> {
  return withJournalMutation(async () => {
    if (await AsyncStorage.getItem(AUTH_CLEAN_INSTALL_RECOVERY_KEY) !== expectedRaw) {
      throw new Error('clean_recovery_journal_changed');
    }
    const current = parse(expectedRaw);
    if (current.phase !== 'challenge') throw new Error('clean_recovery_journal_phase_invalid');
    const now = finiteInteger(input.now ?? Date.now(), 'clean_recovery_time_invalid');
    const handoffEligibleUntil = finiteInteger(
      input.handoffEligibleUntil,
      'clean_recovery_handoff_eligibility_invalid',
    );
    if (
      handoffEligibleUntil <= now
      || handoffEligibleUntil > now + AUTH_CLEAN_INSTALL_CHALLENGE_TTL_MS
    ) throw new Error('clean_recovery_handoff_eligibility_invalid');
    return persistVerifiedUnsafe({
      ...current,
      phase: 'confirmed',
      targetStableId: strictString(input.targetStableId, 'clean_recovery_target_stable_invalid'),
      recoveryEventId: strictString(input.recoveryEventId, 'clean_recovery_event_invalid'),
      handoffRequestId: strictString(input.handoffRequestId, 'clean_recovery_request_id_invalid'),
      createdAt: now,
      expiresAt: handoffEligibleUntil,
    });
  });
}

/** Only a pre-confirm challenge can be cancelled or cleared after expiry. */
export async function clearCleanInstallRecoveryJournalIfExact(expectedRaw: string): Promise<boolean> {
  return withJournalMutation(async () => {
    const currentRaw = await AsyncStorage.getItem(AUTH_CLEAN_INSTALL_RECOVERY_KEY);
    if (currentRaw !== expectedRaw) return false;
    let current: CleanInstallRecoveryJournal;
    try { current = parse(currentRaw); } catch { return false; }
    if (current.phase !== 'challenge') return false;
    await AsyncStorage.removeItem(AUTH_CLEAN_INSTALL_RECOVERY_KEY);
    if (await AsyncStorage.getItem(AUTH_CLEAN_INSTALL_RECOVERY_KEY) !== null) {
      throw new Error('clean_recovery_journal_clear_failed');
    }
    return true;
  });
}

/** Confirmed recovery is removed only after authoritative handoff completion. */
export async function clearCompletedCleanInstallRecoveryJournalIfExact(
  expectedRaw: string,
  completion: Readonly<{ targetStableId: string; recoveryEventId: string }>,
): Promise<boolean> {
  return withJournalMutation(async () => {
    const currentRaw = await AsyncStorage.getItem(AUTH_CLEAN_INSTALL_RECOVERY_KEY);
    if (currentRaw !== expectedRaw) return false;
    let current: CleanInstallRecoveryJournal;
    try { current = parse(currentRaw); } catch { return false; }
    if (
      current.phase !== 'confirmed'
      || current.targetStableId !== strictString(
        completion.targetStableId,
        'clean_recovery_target_stable_invalid',
      )
      || current.recoveryEventId !== strictString(
        completion.recoveryEventId,
        'clean_recovery_event_invalid',
      )
    ) return false;
    await AsyncStorage.removeItem(AUTH_CLEAN_INSTALL_RECOVERY_KEY);
    if (await AsyncStorage.getItem(AUTH_CLEAN_INSTALL_RECOVERY_KEY) !== null) {
      throw new Error('clean_recovery_journal_clear_failed');
    }
    return true;
  });
}
