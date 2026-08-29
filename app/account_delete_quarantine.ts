import AsyncStorage from '@react-native-async-storage/async-storage';

export const ACCOUNT_DELETE_PENDING_AUTH_KEY = 'account_delete_pending_auth_v1';
export const ACCOUNT_DELETE_PENDING_AUTH_SECURE_KEY = 'account_delete_pending_auth_v2';
export const ACCOUNT_DELETE_PENDING_AUTH_ANCHOR_KEY = 'account_delete_pending_auth_anchor_v2';
export const ACCOUNT_DELETE_PENDING_AUTH_TTL_MS = 7 * 24 * 60 * 60_000;

export const ACCOUNT_DELETE_TRANSITION_PHASES = [
  'prepared',
  'local_data_cleared',
  'server_enqueued',
  'provider_signed_out',
  'provider_identity_verified',
  'old_stable_cleared',
  'anonymous_authenticated',
  'provider_stable_created',
  'stable_link_verified',
  'ready',
] as const;

export type AccountDeleteTransitionPhase = typeof ACCOUNT_DELETE_TRANSITION_PHASES[number];
export type AccountDeleteRetiredSubject = 'stable' | 'auth' | 'closure' | 'unknown';

export interface AccountDeletePendingAuthLock {
  operationId: string;
  providerUid: string;
  stableId: string | null;
  serverRetiredStableId?: string;
  source: 'local' | 'remote';
  phase: AccountDeleteTransitionPhase;
  createdAt: number;
  expiresAt: number;
  retiredSubject?: AccountDeleteRetiredSubject;
  /** High-entropy bearer proof. SecureStore only; never copied to AsyncStorage. */
  credentialSafeCapability?: string;
  freshAuthUid?: string;
  freshStableId?: string;
  /** One-way terminal proof permitting crash-safe guard cleanup. */
  cleanupAuthorized?: true;
}

interface AccountDeletePendingAuthAnchor {
  version: 1 | 2 | 3;
  operationId: string;
  providerUid: string;
  deletedStableId: string | null;
  serverRetiredStableId?: string;
  source: 'local' | 'remote';
  createdAt: number;
  retiredSubject?: AccountDeleteRetiredSubject;
  credentialSafeCapability?: string;
  terminalPhase?: 'ready';
  freshAuthUid?: string;
  freshStableId?: string;
  cleanupAuthorized?: true;
}

export type AccountDeletePendingAuthInspection =
  | { status: 'empty' | 'malformed'; lock: null }
  | { status: 'expired'; lock: AccountDeletePendingAuthLock }
  | { status: 'active'; lock: AccountDeletePendingAuthLock };

type SecureStoreModule = typeof import('expo-secure-store');
type KnownGuardState = 'unknown' | 'none' | AccountDeleteTransitionPhase | 'malformed';
let knownGuardState: KnownGuardState = 'unknown';
let knownDeletedProviderUid: string | null = null;

export function cleanAccountDeleteLockId(raw: string | null | undefined): string | null {
  const value = typeof raw === 'string' ? raw.trim() : '';
  return value.length > 0 ? value : null;
}

function normalizeRetiredSubject(raw: unknown): AccountDeleteRetiredSubject | undefined {
  return raw === 'stable' || raw === 'auth' || raw === 'closure' || raw === 'unknown'
    ? raw
    : undefined;
}

function normalizeTransitionPhase(raw: unknown, hasPhase = true): AccountDeleteTransitionPhase | null {
  // Legacy `local_cleared` proved only that the device-side wipe completed.
  // It did not durably prove the server enqueue survived. Resume from the
  // pre-enqueue phase so a local deletion cannot be forgotten after restart;
  // the later sign-out/stable-clear steps are intentionally idempotent.
  if (!hasPhase || raw === 'local_cleared') return 'local_data_cleared';
  return (ACCOUNT_DELETE_TRANSITION_PHASES as readonly unknown[]).includes(raw)
    ? raw as AccountDeleteTransitionPhase
    : null;
}

function phaseRequiresFreshAuth(phase: AccountDeleteTransitionPhase): boolean {
  return phase === 'anonymous_authenticated'
    || phase === 'provider_identity_verified'
    || phase === 'provider_stable_created'
    || phase === 'stable_link_verified'
    || phase === 'ready';
}

function phaseRequiresFreshStable(phase: AccountDeleteTransitionPhase): boolean {
  return phase === 'anonymous_authenticated'
    || phase === 'provider_stable_created'
    || phase === 'stable_link_verified'
    || phase === 'ready';
}

function legacyOperationId(
  providerUid: string,
  stableId: string | null,
  createdAt: number,
): string {
  return `legacy:${providerUid}:${stableId ?? 'none'}:${createdAt}`;
}

export function createAccountDeleteOperationId(
  providerUid: string,
  stableId: string | null,
  createdAt: number,
): string {
  return `${createdAt}:${providerUid}:${stableId ?? 'none'}:${Math.random().toString(36).slice(2, 12)}`;
}

export function inspectAccountDeletePendingAuth(
  raw: string | null | undefined,
  now = Date.now(),
): AccountDeletePendingAuthInspection {
  if (typeof raw !== 'string' || raw.trim().length === 0) return { status: 'empty', lock: null };
  try {
    const parsed = JSON.parse(raw) as Partial<AccountDeletePendingAuthLock>;
    const providerUid = cleanAccountDeleteLockId(parsed.providerUid);
    const stableId = cleanAccountDeleteLockId(parsed.stableId ?? null);
    const serverRetiredStableId = cleanAccountDeleteLockId(parsed.serverRetiredStableId);
    const createdAt = Number(parsed.createdAt);
    const expiresAt = Number(parsed.expiresAt);
    const source: AccountDeletePendingAuthLock['source'] =
      parsed.source === 'remote' ? 'remote' : 'local';
    const hasPhase = Object.prototype.hasOwnProperty.call(parsed, 'phase');
    const phase = normalizeTransitionPhase(parsed.phase, hasPhase);
    const freshAuthUid = cleanAccountDeleteLockId(parsed.freshAuthUid);
    const freshStableId = cleanAccountDeleteLockId(parsed.freshStableId);
    const credentialSafeCapability = cleanAccountDeleteLockId(parsed.credentialSafeCapability);
    if (
      !providerUid
      || !phase
      || !Number.isFinite(createdAt)
      || !Number.isFinite(expiresAt)
      || expiresAt <= createdAt
      || (phaseRequiresFreshAuth(phase) && !freshAuthUid)
      || (phaseRequiresFreshStable(phase) && !freshStableId)
    ) {
      return { status: 'malformed', lock: null };
    }
    const operationId = cleanAccountDeleteLockId(parsed.operationId)
      ?? legacyOperationId(providerUid, stableId, createdAt);
    const lock: AccountDeletePendingAuthLock = {
      operationId,
      providerUid,
      stableId,
      ...(serverRetiredStableId ? { serverRetiredStableId } : {}),
      source,
      phase,
      createdAt,
      expiresAt,
      ...(normalizeRetiredSubject(parsed.retiredSubject)
        ? { retiredSubject: normalizeRetiredSubject(parsed.retiredSubject) }
        : {}),
      ...(credentialSafeCapability ? { credentialSafeCapability } : {}),
      ...(freshAuthUid ? { freshAuthUid } : {}),
      ...(freshStableId ? { freshStableId } : {}),
      ...(parsed.cleanupAuthorized === true ? { cleanupAuthorized: true as const } : {}),
    };
    return expiresAt <= now ? { status: 'expired', lock } : { status: 'active', lock };
  } catch {
    return { status: 'malformed', lock: null };
  }
}

function inspectAnchor(raw: string | null | undefined): AccountDeletePendingAuthAnchor | null {
  if (typeof raw !== 'string' || raw.trim().length === 0) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AccountDeletePendingAuthAnchor>;
    const operationId = cleanAccountDeleteLockId(parsed.operationId);
    const providerUid = cleanAccountDeleteLockId(parsed.providerUid);
    const deletedStableIdTypeValid =
      parsed.deletedStableId === null
      || (
        typeof parsed.deletedStableId === 'string'
        && parsed.deletedStableId.trim().length > 0
      );
    const deletedStableId = cleanAccountDeleteLockId(parsed.deletedStableId ?? null);
    const serverRetiredStableId = cleanAccountDeleteLockId(parsed.serverRetiredStableId);
    const source = parsed.source === 'remote' ? 'remote' : parsed.source === 'local' ? 'local' : null;
    const createdAt = parsed.createdAt;
    if (
      (parsed.version !== 1 && parsed.version !== 2 && parsed.version !== 3)
      || !operationId
      || !providerUid
      || !deletedStableIdTypeValid
      || !source
      || typeof createdAt !== 'number'
      || !Number.isFinite(createdAt)
    ) return null;
    const retiredSubject = normalizeRetiredSubject(parsed.retiredSubject);
    if (parsed.version === 2 && !retiredSubject) return null;
    const credentialSafeCapability = cleanAccountDeleteLockId(parsed.credentialSafeCapability);
    const freshAuthUid = cleanAccountDeleteLockId(parsed.freshAuthUid);
    const freshStableId = cleanAccountDeleteLockId(parsed.freshStableId);
    if (
      parsed.version === 3
      && (
        parsed.terminalPhase !== 'ready'
        || parsed.cleanupAuthorized !== true
        || !freshAuthUid
        || !freshStableId
      )
    ) return null;
    return {
      version: parsed.version,
      operationId,
      providerUid,
      deletedStableId,
      ...(serverRetiredStableId ? { serverRetiredStableId } : {}),
      source,
      createdAt,
      ...(retiredSubject ? { retiredSubject } : {}),
      ...(credentialSafeCapability ? { credentialSafeCapability } : {}),
      ...(parsed.version === 3 ? {
        terminalPhase: 'ready' as const,
        freshAuthUid: freshAuthUid!,
        freshStableId: freshStableId!,
        cleanupAuthorized: true as const,
      } : {}),
    };
  } catch {
    return null;
  }
}

function inspectSecureLock(
  raw: string | null | undefined,
  now = Date.now(),
): AccountDeletePendingAuthInspection {
  if (typeof raw !== 'string' || raw.trim().length === 0) return { status: 'empty', lock: null };
  try {
    const parsed = JSON.parse(raw) as Partial<AccountDeletePendingAuthLock>;
    const phase = normalizeTransitionPhase(parsed.phase);
    const freshAuthUid = cleanAccountDeleteLockId(parsed.freshAuthUid);
    const freshStableId = cleanAccountDeleteLockId(parsed.freshStableId);
    const serverRetiredStableId = cleanAccountDeleteLockId(parsed.serverRetiredStableId);
    const credentialSafeCapability = cleanAccountDeleteLockId(parsed.credentialSafeCapability);
    if (
      !phase
      || typeof parsed.operationId !== 'string'
      || parsed.operationId.trim().length === 0
      || typeof parsed.providerUid !== 'string'
      || parsed.providerUid.trim().length === 0
      || !(parsed.stableId === null || typeof parsed.stableId === 'string')
      || (typeof parsed.stableId === 'string' && parsed.stableId.trim().length === 0)
      || (parsed.source !== 'local' && parsed.source !== 'remote')
      || typeof parsed.createdAt !== 'number'
      || !Number.isFinite(parsed.createdAt)
      || typeof parsed.expiresAt !== 'number'
      || !Number.isFinite(parsed.expiresAt)
      || parsed.expiresAt <= parsed.createdAt
      || (phaseRequiresFreshAuth(phase) && !freshAuthUid)
      || (phaseRequiresFreshStable(phase) && !freshStableId)
    ) {
      return { status: 'malformed', lock: null };
    }
    const lock: AccountDeletePendingAuthLock = {
      operationId: parsed.operationId.trim(),
      providerUid: parsed.providerUid.trim(),
      stableId: cleanAccountDeleteLockId(parsed.stableId),
      ...(serverRetiredStableId ? { serverRetiredStableId } : {}),
      source: parsed.source,
      phase,
      createdAt: parsed.createdAt,
      expiresAt: parsed.expiresAt,
      ...(normalizeRetiredSubject(parsed.retiredSubject)
        ? { retiredSubject: normalizeRetiredSubject(parsed.retiredSubject) }
        : {}),
      ...(credentialSafeCapability ? { credentialSafeCapability } : {}),
      ...(freshAuthUid ? { freshAuthUid } : {}),
      ...(freshStableId ? { freshStableId } : {}),
      ...(parsed.cleanupAuthorized === true ? { cleanupAuthorized: true as const } : {}),
    };
    return lock.expiresAt <= now ? { status: 'expired', lock } : { status: 'active', lock };
  } catch {
    return { status: 'malformed', lock: null };
  }
}

function anchorForLock(lock: AccountDeletePendingAuthLock): AccountDeletePendingAuthAnchor {
  const terminal = lock.phase === 'ready'
    && lock.cleanupAuthorized === true
    && !!lock.freshAuthUid
    && !!lock.freshStableId;
  return {
    version: terminal ? 3 : lock.retiredSubject ? 2 : 1,
    operationId: lock.operationId,
    providerUid: lock.providerUid,
    deletedStableId: lock.stableId,
    ...(lock.serverRetiredStableId ? { serverRetiredStableId: lock.serverRetiredStableId } : {}),
    source: lock.source,
    createdAt: lock.createdAt,
    ...(lock.retiredSubject ? { retiredSubject: lock.retiredSubject } : {}),
    ...(lock.credentialSafeCapability
      ? { credentialSafeCapability: lock.credentialSafeCapability }
      : {}),
    ...(terminal ? {
      terminalPhase: 'ready' as const,
      freshAuthUid: lock.freshAuthUid!,
      freshStableId: lock.freshStableId!,
      cleanupAuthorized: true as const,
    } : {}),
  };
}

function anchorMatchesLock(
  anchor: AccountDeletePendingAuthAnchor,
  lock: AccountDeletePendingAuthLock,
): boolean {
  return (
    anchor.operationId === lock.operationId
    && anchor.providerUid === lock.providerUid
    && anchor.deletedStableId === lock.stableId
    && anchor.serverRetiredStableId === lock.serverRetiredStableId
    && anchor.source === lock.source
    && anchor.createdAt === lock.createdAt
    && anchor.retiredSubject === lock.retiredSubject
    && (!anchor.credentialSafeCapability
      || anchor.credentialSafeCapability === lock.credentialSafeCapability)
    && (anchor.version !== 3 || (
      lock.phase === 'ready'
      && lock.cleanupAuthorized === true
      && anchor.freshAuthUid === lock.freshAuthUid
      && anchor.freshStableId === lock.freshStableId
    ))
  );
}

function preparedLockFromAnchor(anchor: AccountDeletePendingAuthAnchor): AccountDeletePendingAuthLock {
  if (anchor.version === 3) {
    return {
      operationId: anchor.operationId,
      providerUid: anchor.providerUid,
      stableId: anchor.deletedStableId,
      ...(anchor.serverRetiredStableId ? { serverRetiredStableId: anchor.serverRetiredStableId } : {}),
      source: anchor.source,
      phase: 'ready',
      createdAt: anchor.createdAt,
      expiresAt: anchor.createdAt + ACCOUNT_DELETE_PENDING_AUTH_TTL_MS,
      ...(anchor.retiredSubject ? { retiredSubject: anchor.retiredSubject } : {}),
      ...(anchor.credentialSafeCapability
        ? { credentialSafeCapability: anchor.credentialSafeCapability }
        : {}),
      freshAuthUid: anchor.freshAuthUid!,
      freshStableId: anchor.freshStableId!,
      cleanupAuthorized: true,
    };
  }
  return {
    operationId: anchor.operationId,
    providerUid: anchor.providerUid,
    stableId: anchor.deletedStableId,
    ...(anchor.serverRetiredStableId ? { serverRetiredStableId: anchor.serverRetiredStableId } : {}),
    source: anchor.source,
    phase: 'prepared',
    createdAt: anchor.createdAt,
    expiresAt: anchor.createdAt + ACCOUNT_DELETE_PENDING_AUTH_TTL_MS,
    ...(anchor.retiredSubject ? { retiredSubject: anchor.retiredSubject } : {}),
    ...(anchor.credentialSafeCapability
      ? { credentialSafeCapability: anchor.credentialSafeCapability }
      : {}),
  };
}

function mirrorLock(lock: AccountDeletePendingAuthLock): AccountDeletePendingAuthLock {
  const { credentialSafeCapability: _secret, ...publicLock } = lock;
  return publicLock;
}

function rememberGuardState(raw: string | null): void {
  const inspection = inspectAccountDeletePendingAuth(raw);
  if (inspection.status === 'empty') {
    knownGuardState = 'none';
    knownDeletedProviderUid = null;
  } else if (inspection.status === 'malformed') {
    knownGuardState = 'malformed';
    knownDeletedProviderUid = null;
  } else if (inspection.lock) {
    knownGuardState = inspection.lock.phase;
    knownDeletedProviderUid = inspection.lock.providerUid;
  } else {
    knownGuardState = 'malformed';
    knownDeletedProviderUid = null;
  }
}

function getSecureStore(): SecureStoreModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-secure-store') as SecureStoreModule;
  } catch {
    return null;
  }
}

async function exactSecureWrite(
  secureStore: SecureStoreModule,
  key: string,
  raw: string,
): Promise<boolean> {
  try {
    await secureStore.setItemAsync(key, raw);
    return await secureStore.getItemAsync(key) === raw;
  } catch {
    return false;
  }
}

export async function persistAccountDeletePendingAuthLock(
  lock: AccountDeletePendingAuthLock,
): Promise<boolean> {
  const secureStore = getSecureStore();
  if (!secureStore) return false;
  const normalizedInspection = inspectSecureLock(JSON.stringify(lock));
  if (!normalizedInspection.lock) return false;
  const normalized = normalizedInspection.lock;
  const anchor = anchorForLock(normalized);
  const anchorRaw = JSON.stringify(anchor);
  const lockRaw = JSON.stringify(normalized);

  let existingAnchorRaw: string | null;
  try {
    existingAnchorRaw = await secureStore.getItemAsync(ACCOUNT_DELETE_PENDING_AUTH_ANCHOR_KEY);
  } catch {
    return false;
  }
  if (existingAnchorRaw !== null) {
    const existingAnchor = inspectAnchor(existingAnchorRaw);
    if (!existingAnchor || !anchorMatchesLock(existingAnchor, normalized)) return false;
    if (existingAnchorRaw !== anchorRaw
      && !await exactSecureWrite(secureStore, ACCOUNT_DELETE_PENDING_AUTH_ANCHOR_KEY, anchorRaw)) {
      return false;
    }
  } else if (!await exactSecureWrite(secureStore, ACCOUNT_DELETE_PENDING_AUTH_ANCHOR_KEY, anchorRaw)) {
    return false;
  }

  if (!await exactSecureWrite(secureStore, ACCOUNT_DELETE_PENDING_AUTH_SECURE_KEY, lockRaw)) {
    return false;
  }
  rememberGuardState(lockRaw);
  await AsyncStorage.setItem(
    ACCOUNT_DELETE_PENDING_AUTH_KEY,
    JSON.stringify(mirrorLock(normalized)),
  ).catch(() => {});
  return true;
}

export async function restoreAccountDeletePendingAuthMirror(
  lock: AccountDeletePendingAuthLock,
): Promise<void> {
  await AsyncStorage.setItem(ACCOUNT_DELETE_PENDING_AUTH_KEY, JSON.stringify(mirrorLock(lock)));
}

export type AccountDeleteTransitionAdvanceError =
  | 'transition_record_unavailable'
  | 'transition_operation_mismatch'
  | 'transition_phase_conflict'
  | 'transition_persist_failed'
  | 'transition_readback_mismatch'
  | 'transition_retired_auth_reuse'
  | 'transition_retired_stable_reuse'
  | 'transition_fresh_auth_required'
  | 'transition_fresh_stable_required';

export type AccountDeleteTransitionAdvanceResult =
  | { ok: true; lock: AccountDeletePendingAuthLock }
  | { ok: false; code: AccountDeleteTransitionAdvanceError };

const accountDeleteMutationTails = new Map<string, Promise<void>>();
const accountDeleteAdvanceFlights = new Map<string, Promise<AccountDeleteTransitionAdvanceResult>>();

function serializeAccountDeleteMutation<T>(operationId: string, work: () => Promise<T>): Promise<T> {
  const previous = accountDeleteMutationTails.get(operationId) ?? Promise.resolve();
  const run = previous.catch(() => {}).then(work);
  const tail = run.then(() => undefined, () => undefined);
  accountDeleteMutationTails.set(operationId, tail);
  void tail.finally(() => {
    if (accountDeleteMutationTails.get(operationId) === tail) {
      accountDeleteMutationTails.delete(operationId);
    }
  });
  return run;
}

function nextTransitionPhase(lock: AccountDeletePendingAuthLock): AccountDeleteTransitionPhase | null {
  const stableOnly = lock.retiredSubject === 'stable';
  switch (lock.phase) {
    case 'prepared': return 'local_data_cleared';
    case 'local_data_cleared': return 'server_enqueued';
    case 'server_enqueued': return stableOnly ? 'provider_identity_verified' : 'provider_signed_out';
    case 'provider_signed_out':
    case 'provider_identity_verified': return 'old_stable_cleared';
    case 'old_stable_cleared': return stableOnly ? 'provider_stable_created' : 'anonymous_authenticated';
    case 'anonymous_authenticated':
    case 'provider_stable_created': return 'stable_link_verified';
    case 'stable_link_verified': return 'ready';
    case 'ready': return null;
    default: return null;
  }
}

function validateFreshProof(
  lock: AccountDeletePendingAuthLock,
  phase: AccountDeleteTransitionPhase,
  proof: Partial<Pick<AccountDeletePendingAuthLock, 'freshAuthUid' | 'freshStableId'>>,
): AccountDeleteTransitionAdvanceError | null {
  const freshAuthUid = cleanAccountDeleteLockId(proof.freshAuthUid ?? lock.freshAuthUid);
  const freshStableId = cleanAccountDeleteLockId(proof.freshStableId ?? lock.freshStableId);
  if (phaseRequiresFreshAuth(phase) && !freshAuthUid) return 'transition_fresh_auth_required';
  if (phaseRequiresFreshStable(phase) && !freshStableId) return 'transition_fresh_stable_required';
  // A stable-only remote guard uses a synthetic provider anchor. It proves the
  // current provider UID is live; every other anchor is a retired auth UID.
  if (
    freshAuthUid
    && lock.retiredSubject !== 'stable'
    && freshAuthUid === lock.providerUid
  ) return 'transition_retired_auth_reuse';
  if (
    freshStableId
    && (freshStableId === lock.stableId || freshStableId === lock.serverRetiredStableId)
  ) {
    return 'transition_retired_stable_reuse';
  }
  return null;
}

async function advanceAccountDeletePendingAuthLockSerialized(
  expected: AccountDeletePendingAuthLock,
  phase: AccountDeleteTransitionPhase,
  proof: Partial<Pick<AccountDeletePendingAuthLock, 'freshAuthUid' | 'freshStableId'>> = {},
): Promise<AccountDeleteTransitionAdvanceResult> {
  let current: AccountDeletePendingAuthLock | null = null;
  try {
    const inspection = inspectAccountDeletePendingAuth(await readAccountDeletePendingAuthRaw());
    current = inspection.lock;
  } catch {
    return { ok: false, code: 'transition_record_unavailable' };
  }
  if (!current) return { ok: false, code: 'transition_record_unavailable' };
  if (current.operationId !== expected.operationId) {
    return { ok: false, code: 'transition_operation_mismatch' };
  }
  if (current.phase !== expected.phase || nextTransitionPhase(current) !== phase) {
    return { ok: false, code: 'transition_phase_conflict' };
  }
  const proofError = validateFreshProof(current, phase, proof);
  if (proofError) return { ok: false, code: proofError };
  const next: AccountDeletePendingAuthLock = {
    ...current,
    phase,
    ...(cleanAccountDeleteLockId(proof.freshAuthUid)
      ? { freshAuthUid: cleanAccountDeleteLockId(proof.freshAuthUid)! }
      : {}),
    ...(cleanAccountDeleteLockId(proof.freshStableId)
      ? { freshStableId: cleanAccountDeleteLockId(proof.freshStableId)! }
      : {}),
    ...(phase === 'ready' ? { cleanupAuthorized: true as const } : {}),
  };
  if (!await persistAccountDeletePendingAuthLock(next)) {
    return { ok: false, code: 'transition_persist_failed' };
  }
  try {
    const readBack = inspectAccountDeletePendingAuth(await readAccountDeletePendingAuthRaw()).lock;
    if (!readBack || JSON.stringify(readBack) !== JSON.stringify(next)) {
      return { ok: false, code: 'transition_readback_mismatch' };
    }
    return { ok: true, lock: readBack };
  } catch {
    return { ok: false, code: 'transition_readback_mismatch' };
  }
}

/** Exact-next durable phase transition with operation CAS and verified read-back. */
export function advanceAccountDeletePendingAuthLock(
  expected: AccountDeletePendingAuthLock,
  phase: AccountDeleteTransitionPhase,
  proof: Partial<Pick<AccountDeletePendingAuthLock, 'freshAuthUid' | 'freshStableId'>> = {},
): Promise<AccountDeleteTransitionAdvanceResult> {
  const flightKey = `${expected.operationId}:${expected.phase}->${phase}`;
  const existing = accountDeleteAdvanceFlights.get(flightKey);
  if (existing) return existing;
  const flight = serializeAccountDeleteMutation(
    expected.operationId,
    () => advanceAccountDeletePendingAuthLockSerialized(expected, phase, proof),
  );
  accountDeleteAdvanceFlights.set(flightKey, flight);
  void flight.finally(() => {
    if (accountDeleteAdvanceFlights.get(flightKey) === flight) {
      accountDeleteAdvanceFlights.delete(flightKey);
    }
  });
  return flight;
}

export type FreshPostDeletionIdentityResult =
  | { status: 'ready'; authUid: string; stableId: string }
  | { status: 'pending_offline'; phase: AccountDeleteTransitionPhase }
  | { status: 'pending_auth'; phase: AccountDeleteTransitionPhase }
  | { status: 'fatal_local_guard'; phase: AccountDeleteTransitionPhase | null };

type AnonymousIdentityProof =
  | { ok: true; authUid: string; stableId: string; isAnonymous: boolean }
  | { ok: false; failure: string };

type AuthoritativeIdentityProof = {
  ok: boolean;
  authUid: string | null;
  stableId: string | null;
};

export type PostDeleteFreshIdentityTransitionDependencies = {
  wipeLocal(): Promise<boolean>;
  enqueueDeletion(): Promise<boolean>;
  signOutProvider(): Promise<boolean>;
  clearOldStable(): Promise<boolean>;
  authenticateAnonymously(): Promise<AnonymousIdentityProof>;
  linkAuthoritatively(authUid: string, stableId: string): Promise<AuthoritativeIdentityProof>;
  adoptAuthoritativeStable(stableId: string): Promise<boolean>;
  beginAccountGeneration(stableId: string): void;
  persistPhase(
    expected: AccountDeletePendingAuthLock,
    phase: AccountDeleteTransitionPhase,
    proof: Partial<Pick<AccountDeletePendingAuthLock, 'freshAuthUid' | 'freshStableId'>>,
  ): Promise<AccountDeleteTransitionAdvanceResult>;
  clearTransition(): Promise<boolean>;
  emitLocalWipeReady?(): void;
  emitReady(authUid: string, stableId: string): void;
};

/** Dependency-controlled monotonic runner used by the app coordinator and crash-cut tests. */
export async function runPostDeleteFreshIdentityTransition(
  initial: AccountDeletePendingAuthLock,
  deps: PostDeleteFreshIdentityTransitionDependencies,
): Promise<FreshPostDeletionIdentityResult> {
  let lock = initial;
  // A crash/reload can resume after the durable local wipe but before the
  // original UI handoff observed its event. Re-emitting is idempotent at the
  // root navigator and guarantees that no deleted account route survives as a
  // frozen native sheet while network/auth completion continues in background.
  if (lock.phase !== 'prepared') deps.emitLocalWipeReady?.();
  const persist = async (
    phase: AccountDeleteTransitionPhase,
    proof: Partial<Pick<AccountDeletePendingAuthLock, 'freshAuthUid' | 'freshStableId'>> = {},
  ): Promise<boolean> => {
    const result = await deps.persistPhase(lock, phase, proof);
    if (!result.ok) return false;
    lock = result.lock;
    return true;
  };

  for (;;) {
    switch (lock.phase) {
      case 'prepared':
        if (!await deps.wipeLocal()) return { status: 'fatal_local_guard', phase: lock.phase };
        if (!await persist('local_data_cleared')) return { status: 'fatal_local_guard', phase: lock.phase };
        deps.emitLocalWipeReady?.();
        break;
      case 'local_data_cleared':
        if (lock.source === 'local' && !await deps.enqueueDeletion()) {
          return { status: 'pending_offline', phase: lock.phase };
        }
        if (!await persist('server_enqueued')) return { status: 'fatal_local_guard', phase: lock.phase };
        break;
      case 'server_enqueued':
        if (!await deps.signOutProvider()) return { status: 'pending_auth', phase: lock.phase };
        if (!await persist('provider_signed_out')) return { status: 'fatal_local_guard', phase: lock.phase };
        break;
      case 'provider_signed_out':
        if (!await deps.clearOldStable()) return { status: 'fatal_local_guard', phase: lock.phase };
        if (!await persist('old_stable_cleared')) return { status: 'fatal_local_guard', phase: lock.phase };
        break;
      case 'old_stable_cleared': {
        const fresh = await deps.authenticateAnonymously();
        if (!fresh.ok || !fresh.isAnonymous || !fresh.authUid || fresh.authUid === lock.providerUid) {
          return { status: 'pending_auth', phase: lock.phase };
        }
        if (!fresh.stableId || fresh.stableId === lock.stableId) {
          return { status: 'fatal_local_guard', phase: lock.phase };
        }
        if (!await persist('anonymous_authenticated', {
          freshAuthUid: fresh.authUid,
          freshStableId: fresh.stableId,
        })) return { status: 'fatal_local_guard', phase: lock.phase };
        break;
      }
      case 'anonymous_authenticated': {
        const authUid = lock.freshAuthUid!;
        const stableId = lock.freshStableId!;
        const linked = await deps.linkAuthoritatively(authUid, stableId);
        const canonicalStableId = cleanAccountDeleteLockId(linked.stableId);
        if (!linked.ok || linked.authUid !== authUid || !canonicalStableId) {
          return { status: 'pending_auth', phase: lock.phase };
        }
        // The callable owns canonicalization and may legitimately return a
        // different stable id for this exact fresh auth uid. Accept that
        // authoritative id, but never allow either retired account anchor to
        // become current again.
        if (
          canonicalStableId === lock.stableId
          || canonicalStableId === lock.serverRetiredStableId
        ) {
          return { status: 'fatal_local_guard', phase: lock.phase };
        }
        if (!await persist('stable_link_verified', { freshStableId: canonicalStableId })) {
          return { status: 'fatal_local_guard', phase: lock.phase };
        }
        break;
      }
      case 'stable_link_verified':
        if (!await deps.adoptAuthoritativeStable(lock.freshStableId!)) {
          return { status: 'pending_auth', phase: lock.phase };
        }
        deps.beginAccountGeneration(lock.freshStableId!);
        if (!await persist('ready')) return { status: 'fatal_local_guard', phase: lock.phase };
        break;
      case 'ready':
        if (!await deps.clearTransition()) return { status: 'fatal_local_guard', phase: lock.phase };
        deps.emitReady(lock.freshAuthUid!, lock.freshStableId!);
        return { status: 'ready', authUid: lock.freshAuthUid!, stableId: lock.freshStableId! };
      case 'provider_identity_verified':
      case 'provider_stable_created':
        // Stable-only one-tap provider recovery is executed by auth_provider,
        // which retains the live provider credential and never enters anon auth.
        return { status: 'pending_auth', phase: lock.phase };
      default:
        return { status: 'fatal_local_guard', phase: null };
    }
  }
}

async function readSecureRecord(
  secureStore: SecureStoreModule,
  key: string,
): Promise<{ readable: boolean; raw: string | null }> {
  try {
    return { readable: true, raw: await secureStore.getItemAsync(key) };
  } catch {
    return { readable: false, raw: null };
  }
}

/**
 * Признак «замка удаления в хранилище точно нет».
 *
 * зачем: экран «Нужна безопасная проверка» показывался пользователям, которые
 * НИЧЕГО не удаляли. Причина — readAccountDeletePendingAuthRaw() бросает
 * исключение и на «замок есть, но повреждён», и на «хранилище просто не
 * прочиталось» (Keychain недоступен при заблокированном экране, пересборке
 * dev-билда, первом старте). Вызывающий не мог различить эти случаи и на любой
 * бросок закрывал приложение. Теперь на «не удалось прочитать» ставим этот флаг
 * на ошибке: замка не видели — значит блокировать пользователя не за что.
 */
export const ACCOUNT_DELETE_GUARD_NO_LOCK_SEEN = 'accountDeleteGuardNoLockSeen';

function unreadableGuardError(code: string): Error {
  const error = new Error(code);
  (error as Error & { [ACCOUNT_DELETE_GUARD_NO_LOCK_SEEN]?: boolean })[ACCOUNT_DELETE_GUARD_NO_LOCK_SEEN] = true;
  return error;
}

/**
 * true = ошибка чтения, при которой мы НЕ видели замка удаления.
 * Такую ошибку нельзя трактовать как «в хранилище лежит чужой аккаунт».
 */
export function isAccountDeleteGuardNoLockSeenError(error: unknown): boolean {
  return Boolean(
    error
    && typeof error === 'object'
    && (error as { [ACCOUNT_DELETE_GUARD_NO_LOCK_SEEN]?: boolean })[ACCOUNT_DELETE_GUARD_NO_LOCK_SEEN] === true,
  );
}

export async function readAccountDeletePendingAuthRaw(): Promise<string | null> {
  const secureStore = getSecureStore();
  // Модуль SecureStore отсутствует целиком (Expo Go / web / кривой линк) — это
  // не «замок повреждён», это «проверить нечем и следов удаления не видели».
  if (!secureStore) throw unreadableGuardError('account_delete_guard_secure_store_unavailable');

  const [recordResult, anchorResult] = await Promise.all([
    readSecureRecord(secureStore, ACCOUNT_DELETE_PENDING_AUTH_SECURE_KEY),
    readSecureRecord(secureStore, ACCOUNT_DELETE_PENDING_AUTH_ANCHOR_KEY),
  ]);
  const recordInspection = recordResult.readable
    ? inspectSecureLock(recordResult.raw)
    : { status: 'malformed' as const, lock: null };
  const recordLock = recordInspection.status === 'active' || recordInspection.status === 'expired'
    ? recordInspection.lock
    : null;
  const anchor = anchorResult.readable ? inspectAnchor(anchorResult.raw) : null;

  if (
    recordLock
    && !anchor
    && !(recordLock.phase === 'ready' && recordLock.cleanupAuthorized === true)
  ) {
    knownGuardState = 'malformed';
    throw new Error('account_delete_guard_anchor_required');
  }
  if (recordLock && anchor && !anchorMatchesLock(anchor, recordLock)) {
    knownGuardState = 'malformed';
    throw new Error('account_delete_guard_disagreement');
  }
  if (recordLock && anchor) {
    const raw = JSON.stringify(recordLock);
    rememberGuardState(raw);
    return raw;
  }
  if (recordLock && !anchor) {
    const raw = JSON.stringify(recordLock);
    rememberGuardState(raw);
    return raw;
  }
  if (anchor) {
    const reconstructed = preparedLockFromAnchor(anchor);
    const raw = JSON.stringify(reconstructed);
    rememberGuardState(raw);
    return raw;
  }
  if (!recordResult.readable || !anchorResult.readable) {
    // Сюда попадаем, когда ни в записи, ни в якоре не оказалось валидного
    // замка, но хотя бы одно чтение сорвалось (Keychain недоступен). Следов
    // удаления НЕ видели — помечаем ошибку, чтобы старт не закрывал приложение.
    knownGuardState = 'malformed';
    throw unreadableGuardError('account_delete_guard_secure_read_failed');
  }

  // Only when both authoritative records are confirmed absent may the v1
  // AsyncStorage mirror be consulted as a stricter migration source.
  if (recordResult.raw === null && anchorResult.raw === null) {
    const legacyMirror = await AsyncStorage.getItem(ACCOUNT_DELETE_PENDING_AUTH_KEY);
    if (legacyMirror === null) {
      rememberGuardState(null);
      return null;
    }
    const legacyInspection = inspectAccountDeletePendingAuth(legacyMirror);
    if (legacyInspection.status === 'malformed' || legacyInspection.status === 'empty') {
      knownGuardState = 'malformed';
      throw new Error('account_delete_guard_legacy_malformed');
    }
    if (!legacyInspection.lock || !await persistAccountDeletePendingAuthLock(legacyInspection.lock)) {
      throw new Error('account_delete_guard_migration_failed');
    }
    const migrated = JSON.stringify(legacyInspection.lock);
    rememberGuardState(migrated);
    return migrated;
  }

  knownGuardState = 'malformed';
  throw new Error('account_delete_guard_secure_malformed');
}

async function clearAccountDeletePendingAuthLockSerialized(
  operationId: string,
): Promise<void> {
  const current = inspectAccountDeletePendingAuth(await readAccountDeletePendingAuthRaw()).lock;
  if (
    !current
    || current.operationId !== operationId
    || current.phase !== 'ready'
    || current.cleanupAuthorized !== true
  ) throw new Error('account_delete_guard_cleanup_not_authorized');
  const secureStore = getSecureStore();
  if (!secureStore) throw new Error('account_delete_guard_secure_store_unavailable');
  // Remove the non-authoritative migration mirror first. If the process dies
  // during a later SecureStore delete, at least one secure record still keeps
  // the operation quarantined; a stale v1 mirror can never resurrect it.
  await AsyncStorage.removeItem(ACCOUNT_DELETE_PENDING_AUTH_KEY);
  if (await AsyncStorage.getItem(ACCOUNT_DELETE_PENDING_AUTH_KEY) !== null) {
    throw new Error('account_delete_guard_mirror_clear_mismatch');
  }
  await secureStore.deleteItemAsync(ACCOUNT_DELETE_PENDING_AUTH_ANCHOR_KEY);
  await secureStore.deleteItemAsync(ACCOUNT_DELETE_PENDING_AUTH_SECURE_KEY);
  const [record, anchor] = await Promise.all([
    secureStore.getItemAsync(ACCOUNT_DELETE_PENDING_AUTH_SECURE_KEY),
    secureStore.getItemAsync(ACCOUNT_DELETE_PENDING_AUTH_ANCHOR_KEY),
  ]);
  if (record !== null || anchor !== null) throw new Error('account_delete_guard_secure_clear_mismatch');
  knownGuardState = 'none';
  knownDeletedProviderUid = null;
}

export async function clearAccountDeletePendingAuthLock(): Promise<void> {
  const current = inspectAccountDeletePendingAuth(await readAccountDeletePendingAuthRaw()).lock;
  if (!current) throw new Error('account_delete_guard_cleanup_not_authorized');
  return serializeAccountDeleteMutation(
    current.operationId,
    () => clearAccountDeletePendingAuthLockSerialized(current.operationId),
  );
}

export function shouldQuarantineAccountDeleteIdentity(
  raw: string | null | undefined,
  authUser: { uid?: string | null; isAnonymous?: boolean | null } | null | undefined,
  now = Date.now(),
): boolean {
  const inspection = inspectAccountDeletePendingAuth(raw, now);
  if (inspection.status === 'empty') return false;
  if (inspection.status === 'malformed' || !inspection.lock) return true;
  if (inspection.lock.phase === 'prepared' || inspection.lock.phase === 'local_data_cleared') return true;
  const currentUid = cleanAccountDeleteLockId(authUser?.uid);
  if (!currentUid || authUser?.isAnonymous === true) return false;
  return currentUid === inspection.lock.providerUid;
}

export async function isAccountDeleteIdentityQuarantined(
  authUser?: { uid?: string | null; isAnonymous?: boolean | null } | null,
): Promise<boolean> {
  const raw = await readAccountDeletePendingAuthRaw();
  return shouldQuarantineAccountDeleteIdentity(raw, authUser);
}

export async function assertAccountDeleteStableIdentityAvailable(
  candidateStableId?: string | null,
): Promise<void> {
  const raw = await readAccountDeletePendingAuthRaw();
  const inspection = inspectAccountDeletePendingAuth(raw);
  // зачем (аудит 2026-08-29): у замка в фазе prepared/local_data_cleared НЕ
  // БЫЛО легального выхода — даже просроченный (7 дней!) он бросал и держал
  // устройство в вечном карантине; ровно так владелец потерял вход. Просрочка
  // означает: устройство неделю не смогло довести удаление — держать человека
  // снаружи дальше бессмысленно и жестоко. Сервер к этому моменту защищён
  // сам: permanent denial + tombstone не пустят старую identity, а вход
  // провайдера проверяет замок отдельно. Отпускаем С ПРИЧИНОЙ в critical.
  if (
    inspection.status === 'expired'
    && (inspection.lock.phase === 'prepared' || inspection.lock.phase === 'local_data_cleared')
  ) {
    const { DebugLogger } = require('./debug-logger') as typeof import('./debug-logger');
    DebugLogger.error(
      'account_delete_quarantine:expired_released',
      new Error(`phase=${inspection.lock.phase} ageMs=${Date.now() - inspection.lock.createdAt}`),
      'critical',
    );
    return;
  }
  if (
    inspection.status === 'malformed'
    || inspection.status === 'active' && (
      inspection.lock.phase === 'prepared' || inspection.lock.phase === 'local_data_cleared'
    )
  ) {
    throw new Error('account_delete_identity_quarantined');
  }
  if (
    inspection.lock
    && candidateStableId
    && cleanAccountDeleteLockId(candidateStableId) === inspection.lock.stableId
  ) {
    throw new Error('account_delete_deleted_stable_id_denied');
  }
}

export function isAccountDeleteIdentityQuarantinedFromKnownState(
  authUser?: { uid?: string | null; isAnonymous?: boolean | null } | null,
): boolean {
  if (knownGuardState === 'none') return false;
  if (
    knownGuardState !== 'unknown'
    && knownGuardState !== 'malformed'
    && knownGuardState !== 'prepared'
    && knownGuardState !== 'local_data_cleared'
  ) {
    const currentUid = cleanAccountDeleteLockId(authUser?.uid);
    return !!currentUid
      && authUser?.isAnonymous !== true
      && currentUid === knownDeletedProviderUid;
  }
  return true;
}
