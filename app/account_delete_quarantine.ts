import AsyncStorage from '@react-native-async-storage/async-storage';

export const ACCOUNT_DELETE_PENDING_AUTH_KEY = 'account_delete_pending_auth_v1';
export const ACCOUNT_DELETE_PENDING_AUTH_SECURE_KEY = 'account_delete_pending_auth_v2';
export const ACCOUNT_DELETE_PENDING_AUTH_ANCHOR_KEY = 'account_delete_pending_auth_anchor_v2';
export const ACCOUNT_DELETE_PENDING_AUTH_TTL_MS = 7 * 24 * 60 * 60_000;

export interface AccountDeletePendingAuthLock {
  operationId: string;
  providerUid: string;
  stableId: string | null;
  source: 'local' | 'remote';
  phase: 'prepared' | 'local_cleared';
  createdAt: number;
  expiresAt: number;
}

interface AccountDeletePendingAuthAnchor {
  version: 1;
  operationId: string;
  providerUid: string;
  deletedStableId: string | null;
  source: 'local' | 'remote';
  createdAt: number;
}

export type AccountDeletePendingAuthInspection =
  | { status: 'empty' | 'malformed'; lock: null }
  | { status: 'expired'; lock: AccountDeletePendingAuthLock }
  | { status: 'active'; lock: AccountDeletePendingAuthLock };

type SecureStoreModule = typeof import('expo-secure-store');
type KnownGuardState = 'unknown' | 'none' | 'prepared' | 'local_cleared' | 'malformed';
let knownGuardState: KnownGuardState = 'unknown';
let knownDeletedProviderUid: string | null = null;

export function cleanAccountDeleteLockId(raw: string | null | undefined): string | null {
  const value = typeof raw === 'string' ? raw.trim() : '';
  return value.length > 0 ? value : null;
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
    const createdAt = Number(parsed.createdAt);
    const expiresAt = Number(parsed.expiresAt);
    const source: AccountDeletePendingAuthLock['source'] =
      parsed.source === 'remote' ? 'remote' : 'local';
    const hasPhase = Object.prototype.hasOwnProperty.call(parsed, 'phase');
    const phase: AccountDeletePendingAuthLock['phase'] | null = parsed.phase === 'local_cleared'
      ? 'local_cleared'
      : parsed.phase === 'prepared'
        ? 'prepared'
        : hasPhase
          ? null
          : 'local_cleared';
    if (
      !providerUid
      || !phase
      || !Number.isFinite(createdAt)
      || !Number.isFinite(expiresAt)
      || expiresAt <= createdAt
    ) {
      return { status: 'malformed', lock: null };
    }
    const operationId = cleanAccountDeleteLockId(parsed.operationId)
      ?? legacyOperationId(providerUid, stableId, createdAt);
    const lock: AccountDeletePendingAuthLock = {
      operationId,
      providerUid,
      stableId,
      source,
      phase,
      createdAt,
      expiresAt,
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
    const source = parsed.source === 'remote' ? 'remote' : parsed.source === 'local' ? 'local' : null;
    const createdAt = parsed.createdAt;
    if (
      parsed.version !== 1
      || !operationId
      || !providerUid
      || !deletedStableIdTypeValid
      || !source
      || typeof createdAt !== 'number'
      || !Number.isFinite(createdAt)
    ) return null;
    return { version: 1, operationId, providerUid, deletedStableId, source, createdAt };
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
    if (
      (parsed.phase !== 'prepared' && parsed.phase !== 'local_cleared')
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
    ) {
      return { status: 'malformed', lock: null };
    }
    const lock: AccountDeletePendingAuthLock = {
      operationId: parsed.operationId.trim(),
      providerUid: parsed.providerUid.trim(),
      stableId: cleanAccountDeleteLockId(parsed.stableId),
      source: parsed.source,
      phase: parsed.phase,
      createdAt: parsed.createdAt,
      expiresAt: parsed.expiresAt,
    };
    return lock.expiresAt <= now ? { status: 'expired', lock } : { status: 'active', lock };
  } catch {
    return { status: 'malformed', lock: null };
  }
}

function anchorForLock(lock: AccountDeletePendingAuthLock): AccountDeletePendingAuthAnchor {
  return {
    version: 1,
    operationId: lock.operationId,
    providerUid: lock.providerUid,
    deletedStableId: lock.stableId,
    source: lock.source,
    createdAt: lock.createdAt,
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
    && anchor.source === lock.source
    && anchor.createdAt === lock.createdAt
  );
}

function preparedLockFromAnchor(anchor: AccountDeletePendingAuthAnchor): AccountDeletePendingAuthLock {
  return {
    operationId: anchor.operationId,
    providerUid: anchor.providerUid,
    stableId: anchor.deletedStableId,
    source: anchor.source,
    phase: 'prepared',
    createdAt: anchor.createdAt,
    expiresAt: anchor.createdAt + ACCOUNT_DELETE_PENDING_AUTH_TTL_MS,
  };
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
  } else if (!await exactSecureWrite(secureStore, ACCOUNT_DELETE_PENDING_AUTH_ANCHOR_KEY, anchorRaw)) {
    return false;
  }

  if (!await exactSecureWrite(secureStore, ACCOUNT_DELETE_PENDING_AUTH_SECURE_KEY, lockRaw)) {
    return false;
  }
  rememberGuardState(lockRaw);
  await AsyncStorage.setItem(ACCOUNT_DELETE_PENDING_AUTH_KEY, lockRaw).catch(() => {});
  return true;
}

export async function restoreAccountDeletePendingAuthMirror(
  lock: AccountDeletePendingAuthLock,
): Promise<void> {
  await AsyncStorage.setItem(ACCOUNT_DELETE_PENDING_AUTH_KEY, JSON.stringify(lock));
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

export async function readAccountDeletePendingAuthRaw(): Promise<string | null> {
  const secureStore = getSecureStore();
  if (!secureStore) throw new Error('account_delete_guard_secure_store_unavailable');

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

  if (recordLock && !anchor) {
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
  if (anchor) {
    const reconstructed = preparedLockFromAnchor(anchor);
    const raw = JSON.stringify(reconstructed);
    rememberGuardState(raw);
    return raw;
  }
  if (!recordResult.readable || !anchorResult.readable) {
    knownGuardState = 'malformed';
    throw new Error('account_delete_guard_secure_read_failed');
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

export async function clearAccountDeletePendingAuthLock(): Promise<void> {
  const secureStore = getSecureStore();
  if (!secureStore) throw new Error('account_delete_guard_secure_store_unavailable');
  // Remove the non-authoritative migration mirror first. If the process dies
  // during a later SecureStore delete, at least one secure record still keeps
  // the operation quarantined; a stale v1 mirror can never resurrect it.
  await AsyncStorage.removeItem(ACCOUNT_DELETE_PENDING_AUTH_KEY);
  if (await AsyncStorage.getItem(ACCOUNT_DELETE_PENDING_AUTH_KEY) !== null) {
    throw new Error('account_delete_guard_mirror_clear_mismatch');
  }
  await secureStore.deleteItemAsync(ACCOUNT_DELETE_PENDING_AUTH_SECURE_KEY);
  await secureStore.deleteItemAsync(ACCOUNT_DELETE_PENDING_AUTH_ANCHOR_KEY);
  const [record, anchor] = await Promise.all([
    secureStore.getItemAsync(ACCOUNT_DELETE_PENDING_AUTH_SECURE_KEY),
    secureStore.getItemAsync(ACCOUNT_DELETE_PENDING_AUTH_ANCHOR_KEY),
  ]);
  if (record !== null || anchor !== null) throw new Error('account_delete_guard_secure_clear_mismatch');
  knownGuardState = 'none';
  knownDeletedProviderUid = null;
}

export function shouldQuarantineAccountDeleteIdentity(
  raw: string | null | undefined,
  authUser: { uid?: string | null; isAnonymous?: boolean | null } | null | undefined,
  now = Date.now(),
): boolean {
  const inspection = inspectAccountDeletePendingAuth(raw, now);
  if (inspection.status === 'empty') return false;
  if (inspection.status === 'malformed' || !inspection.lock) return true;
  if (inspection.lock.phase === 'prepared') return true;
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
  if (
    inspection.status === 'malformed'
    || inspection.status === 'expired' && inspection.lock.phase === 'prepared'
    || inspection.status === 'active' && inspection.lock.phase === 'prepared'
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
  if (knownGuardState === 'local_cleared') {
    const currentUid = cleanAccountDeleteLockId(authUser?.uid);
    return !!currentUid
      && authUser?.isAnonymous !== true
      && currentUid === knownDeletedProviderUid;
  }
  return true;
}
