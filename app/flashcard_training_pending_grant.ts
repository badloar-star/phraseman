import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  isCurrentAccountGeneration,
  resolvePhoneStateAccountContext,
  withAccountTransitionLock,
  type AccountGenerationToken,
} from './account_generation';
import {
  createEnergySessionIntent,
  readEnergySessionStartStatus,
} from './energy_session_operation_ledger';
import { readFlashcardTrainingQuotaReceipts } from './revenue_quota_store';
import { withStorageLock } from './storage_mutex';

export type FlashcardTrainingPendingGrantMode = 'swipe' | 'blitz' | 'recall' | 'speaking';

export type FlashcardTrainingPendingGrantAccount = Readonly<{
  stableUid: string;
  lineage: number;
  runtimeToken: AccountGenerationToken;
}>;

export async function resolveFlashcardTrainingPendingGrantAccount(
  runtimeToken: AccountGenerationToken,
): Promise<FlashcardTrainingPendingGrantAccount | null> {
  const stableUid = runtimeToken.stableId?.trim();
  if (!stableUid || runtimeToken.phase !== 'active' || !isCurrentAccountGeneration(runtimeToken, stableUid)) return null;
  try {
    const context = await resolvePhoneStateAccountContext(stableUid, runtimeToken);
    return Object.freeze({ stableUid: context.stableUid, lineage: context.lineage, runtimeToken });
  } catch (error: unknown) {
    // зачем (владелец, 2026-09-13): этот null глотался экранами сессий как
    // «pending_grant_account_unavailable» и превращался в ложное «не удалось
    // проверить лимит». Первое звено цепочки обязано называть причину.
    console.warn('[FC-TRAIN-ENTRY] pendingGrant:account → null', JSON.stringify({
      stableId: stableUid, phase: runtimeToken.phase, generation: runtimeToken.generation,
      error: (error instanceof Error ? `${error.name}: ${error.message}` : String(error)),
    }));
    return null;
  }
}

export type FlashcardTrainingPendingGrantScope = Readonly<{
  mode: FlashcardTrainingPendingGrantMode;
  studyTarget: string;
  contentLang: string;
  deckKeys: readonly string[];
  sessionSize: number;
  preset: string | null;
}>;

type JsonPrimitive = string | number | boolean | null;
export type FlashcardTrainingPendingGrantJson =
  | JsonPrimitive
  | readonly FlashcardTrainingPendingGrantJson[]
  | Readonly<{ [key: string]: FlashcardTrainingPendingGrantJson }>;

export type FlashcardTrainingPendingGrantManifest<Mode extends FlashcardTrainingPendingGrantMode = FlashcardTrainingPendingGrantMode> = Readonly<{
  schemaVersion: 'flashcard-training-manifest.v1';
  mode: Mode;
  payload: Readonly<{ [key: string]: FlashcardTrainingPendingGrantJson }>;
}>;

export type FlashcardTrainingPendingGrantPhase = 'prepared' | 'quota_committed' | 'playable';
export type FlashcardTrainingPendingGrantEnergyState = 'pending' | 'charged' | 'refund_in_progress' | 'refunded';

export type FlashcardTrainingPendingGrantRecord = Readonly<{
  schemaVersion: 'flashcard-training-pending-grant.v1';
  stableUid: string;
  lineage: number;
  fingerprint: string;
  scope: FlashcardTrainingPendingGrantScope;
  manifest: FlashcardTrainingPendingGrantManifest;
  manifestRef: string;
  manifestDigest: string;
  manifestChunkCount: number;
  manifestBytes: number;
  attemptId: string;
  receiptId: string;
  energyOperationId: string;
  energyEpoch: string;
  energyKind: string;
  energySubjectId: string;
  energyAttemptOrdinal: number;
  revision: number;
  startInProgress: Readonly<{
    claimId: string;
    runtimeOwnerId: string;
    claimedAtMs: number;
    leaseUntilMs: number;
  }> | null;
  energyState: FlashcardTrainingPendingGrantEnergyState;
  phase: FlashcardTrainingPendingGrantPhase;
  quotaResetAt: number | null;
  expiresAtMs: number;
  preparedAtMs: number;
  updatedAtMs: number;
}>;

type PendingGrantJournal = Readonly<{
  schemaVersion: 'flashcard-training-pending-grant-journal.v1';
  stableUid: string;
  lineage: number;
  records: readonly FlashcardTrainingPendingGrantRecord[];
}>;

type PrepareInput = Readonly<{
  account: FlashcardTrainingPendingGrantAccount;
  scope: FlashcardTrainingPendingGrantScope;
  manifest: FlashcardTrainingPendingGrantManifest;
  attemptId: string;
  receiptId: string;
  energyOperationId: string;
  energyEpoch: string;
  energyKind?: string;
  energySubjectId?: string;
  nowMs?: number;
}>;

export type FlashcardTrainingPendingGrantPrepareResult =
  | Readonly<{ status: 'prepared' | 'reused'; record: FlashcardTrainingPendingGrantRecord }>
  | Readonly<{ status: 'stale_account' }>
  | Readonly<{ status: 'unavailable'; reason: 'invalid_input' | 'corrupt' | 'capacity_committed' | 'storage_limit' | 'storage_error' }>;

export type FlashcardTrainingPendingGrantReadResult =
  | Readonly<{ status: 'found'; record: FlashcardTrainingPendingGrantRecord }>
  | Readonly<{ status: 'missing' | 'stale_account' }>
  | Readonly<{ status: 'unavailable'; reason: 'invalid_input' | 'corrupt' | 'storage_error' | 'energy_state_unavailable' | 'energy_state_conflict' }>;

type TransitionResult =
  | Readonly<{ status: 'quota_committed' | 'playable'; record: FlashcardTrainingPendingGrantRecord }>
  | Readonly<{ status: 'missing' | 'stale_account' | 'invalid_phase' | 'claim_required' }>
  | Readonly<{ status: 'unavailable'; reason: 'corrupt' | 'storage_limit' | 'storage_error' }>;

const STORAGE_PREFIX = 'flashcard_training_pending_grant_v1:';
const MANIFEST_PREFIX = 'flashcard_training_pending_grant_manifest_v1:';
const MAX_RECORDS = 8;
const MAX_JOURNAL_BYTES = 128 * 1024;
const MANIFEST_CHUNK_CHARS = 12 * 1024;
export const FLASHCARD_TRAINING_PENDING_GRANT_TTL_MS = 24 * 60 * 60 * 1_000;
const ID_RE = /^[A-Za-z0-9_.:@/-]{1,180}$/;
const TOKEN_RE = /^[^\u0000-\u001f\u007f]{1,180}$/;
const RUNTIME_OWNER_ID = `pending-runtime:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 12)}`;
const claimMonotonicDeadlines = new Map<string, number>();

export type FlashcardTrainingPendingGrantLifecycleLease = Readonly<{
  accountKey: string;
  leaseId: string;
}>;

const lifecycleTails = new Map<string, Promise<void>>();
const activeLifecycleLeases = new Set<string>();
let lifecycleLeaseOrdinal = 0;

function lifecycleAccountKey(account: FlashcardTrainingPendingGrantAccount): string {
  return `${account.stableUid}:${account.lineage}`;
}

export async function withFlashcardTrainingPendingGrantLifecycle<T>(
  account: FlashcardTrainingPendingGrantAccount,
  work: (lease: FlashcardTrainingPendingGrantLifecycleLease) => Promise<T>,
  existingLease?: FlashcardTrainingPendingGrantLifecycleLease,
): Promise<T> {
  const accountKey = lifecycleAccountKey(account);
  if (
    existingLease
    && existingLease.accountKey === accountKey
    && activeLifecycleLeases.has(existingLease.leaseId)
  ) return work(existingLease);

  const prior = lifecycleTails.get(accountKey) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const queuedTail = prior.then(() => gate);
  lifecycleTails.set(accountKey, queuedTail);
  await prior;
  const lease = Object.freeze({
    accountKey,
    leaseId: `${RUNTIME_OWNER_ID}:lease:${++lifecycleLeaseOrdinal}`,
  });
  activeLifecycleLeases.add(lease.leaseId);
  try {
    return await work(lease);
  } finally {
    activeLifecycleLeases.delete(lease.leaseId);
    release();
    if (lifecycleTails.get(accountKey) === queuedTail) lifecycleTails.delete(accountKey);
  }
}

function utf8ByteLength(value: string): number {
  let bytes = 0;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff && index + 1 < value.length) {
      const next = value.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        bytes += 4;
        index += 1;
      } else bytes += 3;
    } else bytes += 3;
  }
  return bytes;
}

function validAccount(account: FlashcardTrainingPendingGrantAccount): boolean {
  return TOKEN_RE.test(account.stableUid)
    && Number.isSafeInteger(account.lineage)
    && account.lineage >= 1
    && account.runtimeToken.phase === 'active'
    && account.runtimeToken.stableId === account.stableUid
    && isCurrentAccountGeneration(account.runtimeToken, account.stableUid);
}

function validFiniteTime(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function monotonicNowMs(): number {
  const value = globalThis.performance?.now?.();
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : Date.now();
}

function claimDeadlineKey(record: Pick<FlashcardTrainingPendingGrantRecord, 'stableUid' | 'lineage' | 'receiptId' | 'startInProgress'>): string | null {
  return record.startInProgress
    ? `${record.stableUid}:${record.lineage}:${record.receiptId}:${record.startInProgress.runtimeOwnerId}:${record.startInProgress.claimId}`
    : null;
}

function rememberClaimDeadline(record: FlashcardTrainingPendingGrantRecord, nowMs: number): void {
  const key = claimDeadlineKey(record);
  if (!key) return;
  claimMonotonicDeadlines.set(key, monotonicNowMs() + Math.max(0, record.startInProgress!.leaseUntilMs - nowMs));
}

function forgetClaimDeadline(record: FlashcardTrainingPendingGrantRecord): void {
  const key = claimDeadlineKey(record);
  if (key) claimMonotonicDeadlines.delete(key);
}

function isClaimExpired(record: FlashcardTrainingPendingGrantRecord, nowMs: number): boolean {
  const claim = record.startInProgress;
  if (!claim) return false;
  if (claim.runtimeOwnerId !== RUNTIME_OWNER_ID) return true;
  const monotonicDeadline = claimMonotonicDeadlines.get(claimDeadlineKey(record)!);
  return monotonicDeadline === undefined
    ? nowMs >= claim.leaseUntilMs
    : monotonicNowMs() >= monotonicDeadline;
}

function normalizeScope(scope: FlashcardTrainingPendingGrantScope): FlashcardTrainingPendingGrantScope | null {
  const deckKeys = [...new Set(scope.deckKeys.map((value) => value.trim()).filter(Boolean))].sort();
  if (
    !['swipe', 'blitz', 'recall', 'speaking'].includes(scope.mode)
    || !TOKEN_RE.test(scope.studyTarget)
    || !TOKEN_RE.test(scope.contentLang)
    || deckKeys.length === 0
    || deckKeys.length > 64
    || deckKeys.some((value) => !TOKEN_RE.test(value))
    || !Number.isSafeInteger(scope.sessionSize)
    || scope.sessionSize < 1
    || (scope.preset !== null && !TOKEN_RE.test(scope.preset))
  ) return null;
  return Object.freeze({
    mode: scope.mode,
    studyTarget: scope.studyTarget,
    contentLang: scope.contentLang,
    deckKeys: Object.freeze(deckKeys),
    sessionSize: scope.sessionSize,
    preset: scope.preset,
  });
}

function validManifest(
  manifest: FlashcardTrainingPendingGrantManifest,
  mode: FlashcardTrainingPendingGrantMode,
): boolean {
  return manifest.schemaVersion === 'flashcard-training-manifest.v1'
    && manifest.mode === mode
    && isCompactManifestPayload(manifest.payload, mode);
}

const MODE_MANIFEST_KEYS: Readonly<Record<FlashcardTrainingPendingGrantMode, ReadonlySet<string>>> = Object.freeze({
  swipe: new Set(['orderedCardIds', 'seed', 'promptRecipe', 'initialCardId']),
  blitz: new Set(['orderedCardIds', 'poolCardIds', 'roundCardIds', 'seed', 'initialCardId', 'options']),
  recall: new Set(['orderedCardIds', 'seed']),
  speaking: new Set(['orderedCardIds', 'seed', 'task']),
});
const SWIPE_DIRECTIONS = new Set(['front_to_back', 'back_to_front']);
const SPEAKING_TASKS = new Set(['recall', 'repeat']);

function isCompactId(value: unknown): value is string {
  return typeof value === 'string' && ID_RE.test(value);
}

function isCompactIdArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.length > 0 && value.every(isCompactId);
}

function keysAreExactlyBounded(payload: Readonly<Record<string, unknown>>, allowed: ReadonlySet<string>): boolean {
  const keys = Object.keys(payload);
  return keys.length > 0 && keys.every((key) => allowed.has(key));
}

function isKnownCardId(value: unknown, knownIds: ReadonlySet<string>): value is string {
  return isCompactId(value) && knownIds.has(value);
}

function isSwipePromptRecipe(value: unknown, knownIds: ReadonlySet<string>): boolean {
  return Array.isArray(value) && value.every((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
    const recipe = item as Record<string, unknown>;
    return Object.keys(recipe).length === 2
      && Object.prototype.hasOwnProperty.call(recipe, 'cardId')
      && Object.prototype.hasOwnProperty.call(recipe, 'direction')
      && isKnownCardId(recipe.cardId, knownIds)
      && typeof recipe.direction === 'string'
      && SWIPE_DIRECTIONS.has(recipe.direction);
  });
}

function isBlitzOptions(value: unknown, knownIds: ReadonlySet<string>): boolean {
  return Array.isArray(value) && value.every((item) => (
    (Number.isSafeInteger(item) && Number(item) >= 0)
    || isKnownCardId(item, knownIds)
  ));
}

function isCompactManifestPayload(
  payload: Readonly<{ [key: string]: FlashcardTrainingPendingGrantJson }>,
  mode: FlashcardTrainingPendingGrantMode,
): boolean {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return false;
  if (!keysAreExactlyBounded(payload, MODE_MANIFEST_KEYS[mode])) return false;
  if (!isCompactIdArray(payload.orderedCardIds) || !isCompactId(payload.seed)) return false;

  const optionalIdLists = [payload.poolCardIds, payload.roundCardIds].filter((value) => value !== undefined);
  if (optionalIdLists.some((value) => !isCompactIdArray(value))) return false;
  const knownIds = new Set<string>(payload.orderedCardIds);
  for (const list of optionalIdLists) {
    for (const id of list as readonly string[]) knownIds.add(id);
  }

  if (mode === 'swipe') {
    return (payload.initialCardId === undefined || isKnownCardId(payload.initialCardId, knownIds))
      && (payload.promptRecipe === undefined || isSwipePromptRecipe(payload.promptRecipe, knownIds));
  }
  if (mode === 'blitz') {
    return (payload.initialCardId === undefined || isKnownCardId(payload.initialCardId, knownIds))
      && (payload.options === undefined || isBlitzOptions(payload.options, knownIds));
  }
  if (mode === 'speaking') {
    return payload.task === undefined || (typeof payload.task === 'string' && SPEAKING_TASKS.has(payload.task));
  }
  return true;
}

function scopeFingerprint(scope: FlashcardTrainingPendingGrantScope): string {
  return JSON.stringify([
    scope.mode,
    scope.studyTarget,
    scope.contentLang,
    scope.deckKeys,
    scope.sessionSize,
    scope.preset,
  ]);
}

export function flashcardTrainingPendingGrantStorageKey(stableUid: string, lineage: number): string {
  return `${STORAGE_PREFIX}${encodeURIComponent(stableUid)}:${lineage}`;
}

function manifestAccountPrefix(account: FlashcardTrainingPendingGrantAccount): string {
  return `${MANIFEST_PREFIX}${encodeURIComponent(account.stableUid)}:${account.lineage}:`;
}

function manifestRootKey(account: FlashcardTrainingPendingGrantAccount, ref: string): string {
  return `${manifestAccountPrefix(account)}${ref}:root`;
}

function manifestChunkKey(account: FlashcardTrainingPendingGrantAccount, ref: string, index: number): string {
  return `${manifestAccountPrefix(account)}${ref}:chunk:${index}`;
}

async function garbageCollectOrphanManifests(
  account: FlashcardTrainingPendingGrantAccount,
  referenced: ReadonlySet<string>,
): Promise<void> {
  const prefix = manifestAccountPrefix(account);
  const keys = await AsyncStorage.getAllKeys();
  const orphanKeys = keys.filter((key) => {
    if (!key.startsWith(prefix)) return false;
    const suffix = key.slice(prefix.length);
    const match = /^(.*):(root|chunk:\d+)$/.exec(suffix);
    return match !== null && !referenced.has(match[1]);
  }).sort();
  for (const key of orphanKeys) await AsyncStorage.removeItem(key);
}

async function garbageCollectOrphanManifestsSerialized(
  account: FlashcardTrainingPendingGrantAccount,
): Promise<Readonly<{ status: 'collected' | 'stale_account' }> | Readonly<{ status: 'unavailable'; reason: string }>> {
  const result = await mutateJournal(account, async (journal) => {
    await garbageCollectOrphanManifests(
      account,
      new Set(journal.records.map((record) => record.manifestRef)),
    );
    return { result: { status: 'collected' } as const };
  });
  return result as Awaited<ReturnType<typeof garbageCollectOrphanManifestsSerialized>>;
}

function stableDigest(value: string): string {
  let left = 0x811c9dc5;
  let right = 0x9e3779b9;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    left = Math.imul(left ^ code, 0x01000193);
    right = Math.imul(right ^ code, 0x85ebca6b);
  }
  return `${(left >>> 0).toString(16).padStart(8, '0')}${(right >>> 0).toString(16).padStart(8, '0')}`;
}

type ManifestMeta = Readonly<{ ref: string; digest: string; chunkCount: number; bytes: number }>;

async function persistManifest(
  account: FlashcardTrainingPendingGrantAccount,
  receiptId: string,
  manifest: FlashcardTrainingPendingGrantManifest,
): Promise<ManifestMeta> {
  const encoded = JSON.stringify(manifest);
  const digest = stableDigest(encoded);
  const ref = `m:${stableDigest(`${receiptId}:${digest}`)}`;
  const chunks: string[] = [];
  for (let offset = 0; offset < encoded.length; offset += MANIFEST_CHUNK_CHARS) {
    chunks.push(encoded.slice(offset, offset + MANIFEST_CHUNK_CHARS));
  }
  for (let index = 0; index < chunks.length; index += 1) {
    await AsyncStorage.setItem(manifestChunkKey(account, ref, index), chunks[index]);
  }
  const root = JSON.stringify({
    schemaVersion: 'flashcard-training-manifest-root.v1',
    ref,
    digest,
    chunkCount: chunks.length,
    bytes: utf8ByteLength(encoded),
  });
  await AsyncStorage.setItem(manifestRootKey(account, ref), root);
  return { ref, digest, chunkCount: chunks.length, bytes: utf8ByteLength(encoded) };
}

async function removeManifest(account: FlashcardTrainingPendingGrantAccount, record: FlashcardTrainingPendingGrantRecord): Promise<void> {
  await AsyncStorage.removeItem(manifestRootKey(account, record.manifestRef));
  for (let index = 0; index < record.manifestChunkCount; index += 1) {
    await AsyncStorage.removeItem(manifestChunkKey(account, record.manifestRef, index));
  }
}

async function hydrateManifest(
  account: FlashcardTrainingPendingGrantAccount,
  record: FlashcardTrainingPendingGrantRecord,
): Promise<FlashcardTrainingPendingGrantManifest | null> {
  const rootRaw = await AsyncStorage.getItem(manifestRootKey(account, record.manifestRef));
  if (!rootRaw) return null;
  try {
    const root = JSON.parse(rootRaw) as Partial<{
      schemaVersion: string; ref: string; digest: string; chunkCount: number; bytes: number;
    }>;
    if (
      root.schemaVersion !== 'flashcard-training-manifest-root.v1'
      || root.ref !== record.manifestRef
      || root.digest !== record.manifestDigest
      || root.chunkCount !== record.manifestChunkCount
      || root.bytes !== record.manifestBytes
      || !Number.isSafeInteger(root.chunkCount)
      || Number(root.chunkCount) < 1
    ) return null;
    const chunks: string[] = [];
    for (let index = 0; index < Number(root.chunkCount); index += 1) {
      const chunk = await AsyncStorage.getItem(manifestChunkKey(account, record.manifestRef, index));
      if (chunk === null) return null;
      chunks.push(chunk);
    }
    const encoded = chunks.join('');
    if (utf8ByteLength(encoded) !== root.bytes || stableDigest(encoded) !== root.digest) return null;
    const manifest = JSON.parse(encoded) as FlashcardTrainingPendingGrantManifest;
    return validManifest(manifest, record.scope.mode) ? manifest : null;
  } catch {
    return null;
  }
}

function emptyJournal(account: FlashcardTrainingPendingGrantAccount): PendingGrantJournal {
  return Object.freeze({
    schemaVersion: 'flashcard-training-pending-grant-journal.v1',
    stableUid: account.stableUid,
    lineage: account.lineage,
    records: Object.freeze([]),
  });
}

function isStoredRecord(value: unknown, account: FlashcardTrainingPendingGrantAccount): value is FlashcardTrainingPendingGrantRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<FlashcardTrainingPendingGrantRecord>;
  const normalized = record.scope ? normalizeScope(record.scope) : null;
  return record.schemaVersion === 'flashcard-training-pending-grant.v1'
    && record.stableUid === account.stableUid
    && record.lineage === account.lineage
    && normalized !== null
    && record.fingerprint === scopeFingerprint(normalized)
    && typeof record.manifestRef === 'string' && ID_RE.test(record.manifestRef)
    && typeof record.manifestDigest === 'string' && /^[a-f0-9]{16}$/.test(record.manifestDigest)
    && Number.isSafeInteger(record.manifestChunkCount) && Number(record.manifestChunkCount) >= 1
    && validFiniteTime(record.manifestBytes) && Number(record.manifestBytes) > 0
    && typeof record.attemptId === 'string' && ID_RE.test(record.attemptId)
    && typeof record.receiptId === 'string' && ID_RE.test(record.receiptId)
    && typeof record.energyOperationId === 'string' && ID_RE.test(record.energyOperationId)
    && typeof record.energyEpoch === 'string' && TOKEN_RE.test(record.energyEpoch)
    && typeof record.energyKind === 'string' && TOKEN_RE.test(record.energyKind)
    && typeof record.energySubjectId === 'string' && TOKEN_RE.test(record.energySubjectId)
    && Number.isSafeInteger(record.energyAttemptOrdinal) && Number(record.energyAttemptOrdinal) >= 0
    && Number.isSafeInteger(record.revision) && Number(record.revision) >= 1
    && (
      record.startInProgress === null
      || (
        typeof record.startInProgress === 'object'
        && typeof record.startInProgress.claimId === 'string'
        && ID_RE.test(record.startInProgress.claimId)
        && typeof record.startInProgress.runtimeOwnerId === 'string'
        && ID_RE.test(record.startInProgress.runtimeOwnerId)
        && validFiniteTime(record.startInProgress.claimedAtMs)
        && validFiniteTime(record.startInProgress.leaseUntilMs)
        && record.startInProgress.leaseUntilMs >= record.startInProgress.claimedAtMs
      )
    )
    && ['pending', 'charged', 'refund_in_progress', 'refunded'].includes(record.energyState ?? '')
    && ['prepared', 'quota_committed', 'playable'].includes(record.phase ?? '')
    && (record.quotaResetAt === null || validFiniteTime(record.quotaResetAt))
    && validFiniteTime(record.expiresAtMs)
    && validFiniteTime(record.preparedAtMs)
    && validFiniteTime(record.updatedAtMs)
    && record.expiresAtMs >= record.preparedAtMs
    && record.updatedAtMs >= record.preparedAtMs;
}

function parseJournal(raw: string | null, account: FlashcardTrainingPendingGrantAccount): PendingGrantJournal | null {
  if (raw === null) return emptyJournal(account);
  if (utf8ByteLength(raw) > MAX_JOURNAL_BYTES) return null;
  try {
    const value = JSON.parse(raw) as Partial<PendingGrantJournal>;
    if (
      value.schemaVersion !== 'flashcard-training-pending-grant-journal.v1'
      || value.stableUid !== account.stableUid
      || value.lineage !== account.lineage
      || !Array.isArray(value.records)
      || value.records.length > MAX_RECORDS
      || !value.records.every((record) => isStoredRecord(record, account))
    ) return null;
    const fingerprints = new Set(value.records.map((record) => record.fingerprint));
    if (fingerprints.size !== value.records.length) return null;
    return Object.freeze({ ...value, records: Object.freeze([...value.records]) }) as PendingGrantJournal;
  } catch {
    return null;
  }
}

async function hydrateJournal(
  journal: PendingGrantJournal,
  account: FlashcardTrainingPendingGrantAccount,
): Promise<PendingGrantJournal | null> {
  const records: FlashcardTrainingPendingGrantRecord[] = [];
  for (const stored of journal.records) {
    const manifest = await hydrateManifest(account, stored);
    if (!manifest) return null;
    records.push(Object.freeze({ ...stored, manifest }));
  }
  return withRecords(journal, records);
}

function encodeJournal(journal: PendingGrantJournal): string | null {
  const encoded = JSON.stringify({
    ...journal,
    records: journal.records.map(({ manifest: _manifest, ...record }) => record),
  });
  return utf8ByteLength(encoded) <= MAX_JOURNAL_BYTES ? encoded : null;
}

async function mutateJournal<T>(
  account: FlashcardTrainingPendingGrantAccount,
  mutation: (journal: PendingGrantJournal) => Promise<Readonly<{ result: T; next?: PendingGrantJournal }>>,
): Promise<T | Readonly<{ status: 'stale_account' }> | Readonly<{ status: 'unavailable'; reason: 'corrupt' | 'storage_limit' | 'storage_error' }>> {
  if (!validAccount(account)) return { status: 'stale_account' };
  try {
    return await withAccountTransitionLock(async () => withStorageLock(async () => {
      if (!validAccount(account)) return { status: 'stale_account' } as const;
      const key = flashcardTrainingPendingGrantStorageKey(account.stableUid, account.lineage);
      const raw = await AsyncStorage.getItem(key);
      const parsed = parseJournal(raw, account);
      if (!parsed) return { status: 'unavailable', reason: 'corrupt' } as const;
      const journal = await hydrateJournal(parsed, account);
      if (!journal) return { status: 'unavailable', reason: 'corrupt' } as const;
      const mutationResult = await mutation(journal);
      if (mutationResult.next) {
        const encoded = encodeJournal(mutationResult.next);
        if (!encoded) return { status: 'unavailable', reason: 'storage_limit' } as const;
        await AsyncStorage.setItem(key, encoded);
        const retainedRefs = new Set(mutationResult.next.records.map((record) => record.manifestRef));
        for (const removed of journal.records.filter((record) => !retainedRefs.has(record.manifestRef))) {
          await removeManifest(account, removed);
        }
      }
      return mutationResult.result;
    }));
  } catch (error) {
    return { status: 'unavailable', reason: 'storage_error' };
  }
}

function withRecords(journal: PendingGrantJournal, records: readonly FlashcardTrainingPendingGrantRecord[]): PendingGrantJournal {
  return Object.freeze({ ...journal, records: Object.freeze([...records]) });
}

export async function prepareFlashcardTrainingPendingGrant(
  input: PrepareInput,
): Promise<FlashcardTrainingPendingGrantPrepareResult> {
  const normalizedScope = normalizeScope(input.scope);
  const nowMs = input.nowMs ?? Date.now();
  const operationParts = input.energyOperationId.split(':');
  const energyKind = input.energyKind?.trim() || operationParts[1]?.trim() || '';
  const energySubjectId = input.energySubjectId?.trim() || normalizedScope?.deckKeys.join(',') || '';
  if (
    !normalizedScope
    || !validManifest(input.manifest, normalizedScope.mode)
    || !ID_RE.test(input.attemptId)
    || !ID_RE.test(input.receiptId)
    || !ID_RE.test(input.energyOperationId)
    || !TOKEN_RE.test(input.energyEpoch)
    || !TOKEN_RE.test(energyKind)
    || !TOKEN_RE.test(energySubjectId)
    || !validFiniteTime(nowMs)
  ) return { status: 'unavailable', reason: 'invalid_input' };
  const fingerprint = scopeFingerprint(normalizedScope);
  const result = await mutateJournal(input.account, async (journal) => {
    const existing = journal.records.find((record) => record.fingerprint === fingerprint);
    if (existing) return { result: { status: 'reused', record: existing } as const };
    if (journal.records.length >= MAX_RECORDS) {
      return { result: { status: 'unavailable', reason: 'capacity_committed' } as const };
    }
    const manifestMeta = await persistManifest(input.account, input.receiptId, input.manifest);

    const record: FlashcardTrainingPendingGrantRecord = Object.freeze({
      schemaVersion: 'flashcard-training-pending-grant.v1',
      stableUid: input.account.stableUid,
      lineage: input.account.lineage,
      fingerprint,
      scope: normalizedScope,
      manifest: input.manifest,
      manifestRef: manifestMeta.ref,
      manifestDigest: manifestMeta.digest,
      manifestChunkCount: manifestMeta.chunkCount,
      manifestBytes: manifestMeta.bytes,
      attemptId: input.attemptId,
      receiptId: input.receiptId,
      energyOperationId: input.energyOperationId,
      energyEpoch: input.energyEpoch,
      energyKind,
      energySubjectId,
      energyAttemptOrdinal: 0,
      revision: 1,
      startInProgress: null,
      energyState: 'pending',
      phase: 'prepared',
      quotaResetAt: null,
      expiresAtMs: nowMs + FLASHCARD_TRAINING_PENDING_GRANT_TTL_MS,
      preparedAtMs: nowMs,
      updatedAtMs: nowMs,
    });
    const records = [...journal.records, record];
    if (encodeJournal(withRecords(journal, records)) === null) {
      await removeManifest(input.account, record);
      return { result: { status: 'unavailable', reason: 'storage_limit' } as const };
    }
    return {
      result: { status: 'prepared', record } as const,
      next: withRecords(journal, records),
    };
  });
  return result as FlashcardTrainingPendingGrantPrepareResult;
}

export async function readFlashcardTrainingPendingGrant(
  account: FlashcardTrainingPendingGrantAccount,
  scope: FlashcardTrainingPendingGrantScope,
): Promise<FlashcardTrainingPendingGrantReadResult> {
  const normalizedScope = normalizeScope(scope);
  if (!normalizedScope) return { status: 'unavailable', reason: 'invalid_input' };
  const fingerprint = scopeFingerprint(normalizedScope);
  const result = await mutateJournal(account, async (journal) => {
    const record = journal.records.find((item) => item.fingerprint === fingerprint);
    return { result: record ? { status: 'found', record } as const : { status: 'missing' } as const };
  });
  return result as FlashcardTrainingPendingGrantReadResult;
}

export async function claimFlashcardTrainingPendingGrantStart(
  account: FlashcardTrainingPendingGrantAccount,
  fingerprint: string,
  receiptId: string,
  claimId: string,
  nowMs = Date.now(),
): Promise<Readonly<{ status: 'claimed' | 'reused'; record: FlashcardTrainingPendingGrantRecord }> | Readonly<{ status: 'missing' | 'stale_account' | 'conflict' }> | Readonly<{ status: 'unavailable'; reason: string }>> {
  if (!ID_RE.test(receiptId) || !ID_RE.test(claimId) || !validFiniteTime(nowMs)) {
    return { status: 'unavailable', reason: 'invalid_input' };
  }
  const result = await mutateJournal(account, async (journal) => {
    const index = journal.records.findIndex((record) => record.fingerprint === fingerprint);
    if (index < 0) return { result: { status: 'missing' } as const };
    const current = journal.records[index];
    if (current.receiptId !== receiptId) return { result: { status: 'conflict' } as const };
    if (current.startInProgress) {
      return { result: { status: 'reused', record: current } as const };
    }
    const record = Object.freeze({
      ...current,
      revision: current.revision + 1,
      startInProgress: Object.freeze({
        claimId,
        runtimeOwnerId: RUNTIME_OWNER_ID,
        claimedAtMs: nowMs,
        leaseUntilMs: current.expiresAtMs,
      }),
      updatedAtMs: Math.max(nowMs, current.updatedAtMs),
    });
    const records = [...journal.records];
    records[index] = record;
    return {
      result: { status: 'claimed', record } as const,
      next: withRecords(journal, records),
    };
  });
  if ((result.status === 'claimed' || result.status === 'reused')
    && result.record.startInProgress?.runtimeOwnerId === RUNTIME_OWNER_ID) {
    rememberClaimDeadline(result.record, nowMs);
  }
  return result as Awaited<ReturnType<typeof claimFlashcardTrainingPendingGrantStart>>;
}

async function transition(
  account: FlashcardTrainingPendingGrantAccount,
  fingerprint: string,
  nextPhase: Extract<FlashcardTrainingPendingGrantPhase, 'quota_committed' | 'playable'>,
  nowMs: number,
  quotaResetAt: number | null = null,
): Promise<TransitionResult> {
  if (!validFiniteTime(nowMs)) return { status: 'unavailable', reason: 'storage_error' };
  const result = await mutateJournal(account, async (journal) => {
    const index = journal.records.findIndex((record) => record.fingerprint === fingerprint);
    if (index < 0) return { result: { status: 'missing' } as const };
    const current = journal.records[index];
    if (!current.startInProgress) return { result: { status: 'claim_required' } as const };
    const allowed = nextPhase === 'quota_committed'
      ? current.phase === 'prepared' || current.phase === 'quota_committed' || current.phase === 'playable'
      : current.phase === 'quota_committed' || current.phase === 'playable';
    if (!allowed) return { result: { status: 'invalid_phase' } as const };
    const effectivePhase = current.phase === 'playable' ? 'playable' : nextPhase;
    const nextResetAt = nextPhase === 'quota_committed' && quotaResetAt !== null && validFiniteTime(quotaResetAt)
      ? Math.max(quotaResetAt, current.quotaResetAt ?? 0)
      : current.quotaResetAt;
    const record = Object.freeze({
      ...current,
      revision: current.revision + 1,
      phase: effectivePhase,
      quotaResetAt: nextResetAt,
      expiresAtMs: Math.max(current.expiresAtMs, nextResetAt ?? 0),
      updatedAtMs: Math.max(nowMs, current.updatedAtMs),
    });
    const records = [...journal.records];
    records[index] = record;
    return {
      result: { status: effectivePhase, record } as const,
      next: withRecords(journal, records),
    };
  });
  return result as TransitionResult;
}

export function markFlashcardTrainingQuotaCommitted(
  account: FlashcardTrainingPendingGrantAccount,
  fingerprint: string,
  nowMs = Date.now(),
  quotaResetAt: number | null = null,
): Promise<TransitionResult> {
  return transition(account, fingerprint, 'quota_committed', nowMs, quotaResetAt);
}

export function markFlashcardTrainingPendingGrantPlayable(
  account: FlashcardTrainingPendingGrantAccount,
  fingerprint: string,
  nowMs = Date.now(),
): Promise<TransitionResult> {
  return transition(account, fingerprint, 'playable', nowMs);
}

async function setEnergyState(
  account: FlashcardTrainingPendingGrantAccount,
  fingerprint: string,
  energyState: FlashcardTrainingPendingGrantEnergyState,
  nowMs: number,
): Promise<Readonly<{ status: FlashcardTrainingPendingGrantEnergyState; record: FlashcardTrainingPendingGrantRecord }> | Readonly<{ status: 'missing' | 'stale_account' }> | Readonly<{ status: 'unavailable'; reason: string }>> {
  const result = await mutateJournal(account, async (journal) => {
    const index = journal.records.findIndex((record) => record.fingerprint === fingerprint);
    if (index < 0) return { result: { status: 'missing' } as const };
    const current = journal.records[index];
    const record = Object.freeze({
      ...current,
      revision: current.revision + 1,
      energyState,
      updatedAtMs: Math.max(nowMs, current.updatedAtMs),
    });
    const records = [...journal.records];
    records[index] = record;
    return {
      result: { status: energyState, record } as const,
      next: withRecords(journal, records),
    };
  });
  return result as Awaited<ReturnType<typeof setEnergyState>>;
}

type EnergyChargeMutationResult =
  | Readonly<{ status: 'charged'; record: FlashcardTrainingPendingGrantRecord }>
  | Readonly<{ status: 'missing' | 'claim_required' }>;

export type EnergyChargeResult =
  | EnergyChargeMutationResult
  | Readonly<{ status: 'stale_account' }>
  | Readonly<{ status: 'unavailable'; reason: 'corrupt' | 'storage_limit' | 'storage_error' }>;

/**
 * зачем (2026-09-14): без явного типа TS выводил результат как `unknown`, и
 * `if ('record' in marked) pendingRecord = marked.record` не проходил typecheck
 * сразу в четырёх экранах (swipe/blitz/recall/speaking) — ts-jest даже не
 * запускал их тесты (flashcards_speaking_quota_unavailable_behavior падал «suite
 * failed to run»). Явный generic у mutateJournal закрепляет форму результата.
 */
export function markFlashcardTrainingEnergyCharged(
  account: FlashcardTrainingPendingGrantAccount,
  fingerprint: string,
  nowMs = Date.now(),
): Promise<EnergyChargeResult> {
  return mutateJournal<EnergyChargeMutationResult>(account, async (journal) => {
    const index = journal.records.findIndex((record) => record.fingerprint === fingerprint);
    if (index < 0) return { result: { status: 'missing' } as const };
    const current = journal.records[index];
    if (!current.startInProgress) return { result: { status: 'claim_required' } as const };
    const record = Object.freeze({
      ...current,
      revision: current.revision + 1,
      energyState: 'charged' as const,
      updatedAtMs: Math.max(nowMs, current.updatedAtMs),
    });
    const records = [...journal.records];
    records[index] = record;
    return {
      result: { status: 'charged', record } as const,
      next: withRecords(journal, records),
    };
  });
}

async function removeRecord(
  account: FlashcardTrainingPendingGrantAccount,
  expected: FlashcardTrainingPendingGrantRecord,
): Promise<Readonly<{ status: 'removed' | 'missing' | 'stale_account' | 'changed' }> | Readonly<{ status: 'unavailable'; reason: string }>> {
  const result = await mutateJournal(account, async (journal) => {
    const current = journal.records.find((record) => record.fingerprint === expected.fingerprint);
    if (!current) return { result: { status: 'missing' } as const };
    if (
      current.fingerprint !== expected.fingerprint
      || current.receiptId !== expected.receiptId
      || current.energyOperationId !== expected.energyOperationId
      || current.phase !== expected.phase
      || current.energyState !== expected.energyState
      || current.revision !== expected.revision
      || current.startInProgress?.claimId !== expected.startInProgress?.claimId
      || current.startInProgress?.runtimeOwnerId !== expected.startInProgress?.runtimeOwnerId
    ) return { result: { status: 'changed' } as const };
    return {
      result: { status: 'removed' } as const,
      next: withRecords(journal, journal.records.filter((record) => record.fingerprint !== expected.fingerprint)),
    };
  });
  if (result.status === 'removed') forgetClaimDeadline(expected);
  return result as Awaited<ReturnType<typeof removeRecord>>;
}

export async function discardFlashcardTrainingPendingGrant(
  account: FlashcardTrainingPendingGrantAccount,
  fingerprint: string,
): Promise<Readonly<{ status: 'removed' | 'missing' | 'stale_account' | 'retained_committed' | 'retained_unsafe' }> | Readonly<{ status: 'unavailable'; reason: string }>> {
  const found = await readRecordByFingerprint(account, fingerprint);
  if (found.status !== 'found') return found;
  if (found.record.phase !== 'prepared') return { status: 'retained_committed' };
  if (found.record.energyState === 'refund_in_progress') return { status: 'retained_unsafe' };
  const [quotaRead, energyRead] = await Promise.all([
    readFlashcardTrainingQuotaReceipts(account.stableUid).catch(() => ({ status: 'unavailable' as const })),
    readEnergySessionStartStatus(found.record.energyOperationId, account.runtimeToken)
      .catch(() => ({ status: 'unavailable' as const, reason: 'read_failed' })),
  ]);
  if (quotaRead.status !== 'available' || quotaRead.lineage !== account.lineage) return { status: 'retained_unsafe' };
  const receipt = quotaRead.receipts.find((item) => item.receiptId === found.record.receiptId);
  if (receipt) {
    await markFlashcardTrainingQuotaCommitted(account, fingerprint, Date.now(), receipt.resetAt);
    return { status: 'retained_committed' };
  }
  if (energyRead.status !== 'missing' && energyRead.status !== 'refunded') return { status: 'retained_unsafe' };
  const current = await readRecordByFingerprint(account, fingerprint);
  if (current.status !== 'found') return current;
  if (
    current.record.phase !== 'prepared'
    || current.record.receiptId !== found.record.receiptId
    || current.record.energyOperationId !== found.record.energyOperationId
  ) return { status: current.record.phase === 'prepared' ? 'retained_unsafe' : 'retained_committed' };
  const removal = await removeRecord(account, found.record);
  return removal.status === 'changed' ? { status: 'retained_unsafe' } : removal;
}

async function readRecordByFingerprint(
  account: FlashcardTrainingPendingGrantAccount,
  fingerprint: string,
): Promise<FlashcardTrainingPendingGrantReadResult> {
  const result = await mutateJournal(account, async (journal) => {
    const record = journal.records.find((item) => item.fingerprint === fingerprint);
    return { result: record ? { status: 'found', record } as const : { status: 'missing' } as const };
  });
  return result as FlashcardTrainingPendingGrantReadResult;
}

async function rotateRefundedEnergy(
  account: FlashcardTrainingPendingGrantAccount,
  fingerprint: string,
  expectedOperationId: string,
  nowMs: number,
): Promise<FlashcardTrainingPendingGrantReadResult> {
  const result = await mutateJournal(account, async (journal) => {
    const index = journal.records.findIndex((record) => record.fingerprint === fingerprint);
    if (index < 0) return { result: { status: 'missing' } as const };
    const current = journal.records[index];
    if (current.energyOperationId !== expectedOperationId) {
      return { result: { status: 'found', record: current } as const };
    }
    if (current.energyState === 'refund_in_progress') {
      return { result: { status: 'unavailable', reason: 'energy_state_unavailable' } as const };
    }
    const energyAttemptOrdinal = current.energyAttemptOrdinal + 1;
    const nextIntent = createEnergySessionIntent(
      current.energyKind,
      current.energySubjectId,
      `${current.attemptId}:resume:${energyAttemptOrdinal}`,
    );
    const record = Object.freeze({
      ...current,
      revision: current.revision + 1,
      energyOperationId: nextIntent.operationId,
      energyEpoch: nextIntent.grant.attemptId,
      energyAttemptOrdinal,
      energyState: 'pending' as const,
      updatedAtMs: Math.max(nowMs, current.updatedAtMs),
    });
    const records = [...journal.records];
    records[index] = record;
    return {
      result: { status: 'found', record } as const,
      next: withRecords(journal, records),
    };
  });
  return result as FlashcardTrainingPendingGrantReadResult;
}

export async function reconcileFlashcardTrainingPendingGrant(
  account: FlashcardTrainingPendingGrantAccount,
  scope: FlashcardTrainingPendingGrantScope,
  nowMs = Date.now(),
): Promise<FlashcardTrainingPendingGrantReadResult> {
  const initial = await readFlashcardTrainingPendingGrant(account, scope);
  if (initial.status !== 'found') return initial;

  const [quotaRead, energyRead] = await Promise.all([
    readFlashcardTrainingQuotaReceipts(account.stableUid).catch(() => ({ status: 'unavailable' as const })),
    readEnergySessionStartStatus(initial.record.energyOperationId, account.runtimeToken)
      .catch(() => ({ status: 'unavailable' as const, reason: 'read_failed' })),
  ]);
  if (energyRead.status === 'unavailable') {
    return { status: 'unavailable', reason: 'energy_state_unavailable' };
  }
  if (energyRead.status === 'stale_account') return { status: 'stale_account' };
  if (energyRead.status === 'acknowledged') {
    if (initial.record.phase !== 'playable') {
      return { status: 'unavailable', reason: 'energy_state_conflict' };
    }
    const removal = await removeRecord(account, initial.record);
    return removal.status === 'removed' || removal.status === 'missing'
      ? { status: 'missing' }
      : { status: 'unavailable', reason: 'energy_state_conflict' };
  }
  if (energyRead.status === 'refunded') {
    const rotated = await rotateRefundedEnergy(
      account,
      initial.record.fingerprint,
      initial.record.energyOperationId,
      nowMs,
    );
    if (rotated.status !== 'found') return rotated;
  } else if (energyRead.status === 'charged' && initial.record.energyState !== 'charged') {
    await setEnergyState(account, initial.record.fingerprint, 'charged', nowMs);
  } else if (
    (energyRead.status === 'missing' || energyRead.status === 'prepared')
    && (initial.record.energyState === 'charged' || initial.record.energyState === 'refund_in_progress')
  ) {
    return { status: 'unavailable', reason: 'energy_state_conflict' };
  }
  if (quotaRead.status === 'available' && quotaRead.lineage === account.lineage) {
    const receipt = quotaRead.receipts.find((item) => item.receiptId === initial.record.receiptId);
    if (receipt) {
      await markFlashcardTrainingQuotaCommitted(account, initial.record.fingerprint, nowMs, receipt.resetAt);
    }
  }
  return readFlashcardTrainingPendingGrant(account, scope);
}

export async function abandonFlashcardTrainingPendingGrant(
  account: FlashcardTrainingPendingGrantAccount,
  fingerprint: string,
  refundEnergy: (operationId: string, reason: string) => Promise<void>,
  nowMs = Date.now(),
  reason = 'entry_cancelled',
): Promise<Readonly<{ status: 'refunded' | 'refund_in_progress' | 'nothing_to_refund' | 'missing' | 'stale_account' }> | Readonly<{ status: 'unavailable'; reason: string }>> {
  const claim = await mutateJournal(account, async (journal) => {
    const index = journal.records.findIndex((record) => record.fingerprint === fingerprint);
    if (index < 0) return { result: { status: 'missing' } as const };
    const current = journal.records[index];
    if (current.energyState === 'refund_in_progress') return { result: { status: 'refund_in_progress' } as const };
    if (current.energyState !== 'charged') return { result: { status: 'nothing_to_refund' } as const };
    const record = Object.freeze({
      ...current,
      revision: current.revision + 1,
      energyState: 'refund_in_progress' as const,
      updatedAtMs: Math.max(nowMs, current.updatedAtMs),
    });
    const records = [...journal.records];
    records[index] = record;
    return {
      result: { status: 'claimed', operationId: record.energyOperationId } as const,
      next: withRecords(journal, records),
    };
  });
  if (claim.status !== 'claimed') return claim as Exclude<Awaited<ReturnType<typeof abandonFlashcardTrainingPendingGrant>>, { status: 'refunded' }>;
  try {
    await refundEnergy(claim.operationId, reason);
    await setEnergyState(account, fingerprint, 'refunded', nowMs);
    return { status: 'refunded' };
  } catch {
    await setEnergyState(account, fingerprint, 'charged', nowMs);
    return { status: 'unavailable', reason: 'refund_failed' };
  }
}

type MaintenanceResult =
  | Readonly<{ status: 'maintained'; removed: number; retained: number }>
  | Readonly<{ status: 'stale_account' }>
  | Readonly<{ status: 'unavailable'; reason: string }>;

async function listPendingRecords(
  account: FlashcardTrainingPendingGrantAccount,
): Promise<Readonly<{ status: 'available'; records: readonly FlashcardTrainingPendingGrantRecord[] }> | Readonly<{ status: 'stale_account' }> | Readonly<{ status: 'unavailable'; reason: string }>> {
  const result = await mutateJournal(account, async (journal) => ({
    result: { status: 'available', records: journal.records } as const,
  }));
  return result as Awaited<ReturnType<typeof listPendingRecords>>;
}

async function maintainFlashcardTrainingPendingGrantsInner(
  account: FlashcardTrainingPendingGrantAccount,
  trigger: 'boot' | 'account' | 'focus',
  refundEnergy: (operationId: string, reason: string) => Promise<void>,
  nowMs: number,
): Promise<MaintenanceResult> {
  if (!validFiniteTime(nowMs)) return { status: 'unavailable', reason: 'invalid_time' };
  const listed = await listPendingRecords(account);
  if (listed.status !== 'available') return listed;
  let removed = 0;
  let retained = 0;

  for (const snapshot of listed.records) {
    const expiredClaim = snapshot.startInProgress !== null
      && trigger !== 'focus'
      && isClaimExpired(snapshot, nowMs);
    if (snapshot.startInProgress && !expiredClaim) {
      retained += 1;
      continue;
    }
    if (!expiredClaim && nowMs < Math.max(snapshot.expiresAtMs, snapshot.quotaResetAt ?? 0)) {
      const reconciled = await reconcileFlashcardTrainingPendingGrant(account, snapshot.scope, nowMs);
      if (reconciled.status === 'missing') removed += 1;
      else retained += 1;
      continue;
    }

    const quotaRead = await readFlashcardTrainingQuotaReceipts(account.stableUid)
      .catch(() => ({ status: 'unavailable' as const }));
    let energyRead = await readEnergySessionStartStatus(snapshot.energyOperationId, account.runtimeToken)
      .catch(() => ({ status: 'unavailable' as const, reason: 'read_failed' }));
    if (quotaRead.status !== 'available' || quotaRead.lineage !== account.lineage || energyRead.status === 'unavailable' || energyRead.status === 'stale_account') {
      retained += 1;
      continue;
    }
    const quotaReceipt = quotaRead.receipts.find((item) => item.receiptId === snapshot.receiptId);
    if (quotaReceipt) {
      const reconciled = await reconcileFlashcardTrainingPendingGrant(account, snapshot.scope, nowMs);
      if (reconciled.status === 'missing') removed += 1;
      else retained += 1;
      continue;
    }

    const currentBeforeSettlement = await readRecordByFingerprint(account, snapshot.fingerprint);
    if (currentBeforeSettlement.status !== 'found') {
      if (currentBeforeSettlement.status === 'missing') removed += 1;
      else retained += 1;
      continue;
    }
    const currentClaimExpired = currentBeforeSettlement.record.startInProgress !== null
      && trigger !== 'focus'
      && isClaimExpired(currentBeforeSettlement.record, nowMs);
    if (
      currentBeforeSettlement.record.receiptId !== snapshot.receiptId
      || currentBeforeSettlement.record.energyOperationId !== snapshot.energyOperationId
      || (currentBeforeSettlement.record.startInProgress !== null && !currentClaimExpired)
      || currentBeforeSettlement.record.phase !== 'prepared'
      || currentBeforeSettlement.record.energyState === 'refund_in_progress'
    ) {
      retained += 1;
      continue;
    }

    if (energyRead.status === 'charged') {
      if (currentBeforeSettlement.record.energyState !== 'charged') {
        const charged = await setEnergyState(account, snapshot.fingerprint, 'charged', nowMs);
        if (charged.status !== 'charged') {
          retained += 1;
          continue;
        }
      }
      const abandoned = await abandonFlashcardTrainingPendingGrant(
        account,
        snapshot.fingerprint,
        refundEnergy,
        nowMs,
        'entry_expired',
      );
      if (abandoned.status !== 'refunded') {
        retained += 1;
        continue;
      }
      energyRead = await readEnergySessionStartStatus(snapshot.energyOperationId, account.runtimeToken)
        .catch(() => ({ status: 'unavailable' as const, reason: 'read_failed' }));
    }
    if (
      energyRead.status === 'unavailable'
      || energyRead.status === 'stale_account'
      || energyRead.status === 'prepared'
      || energyRead.status === 'acknowledged'
      || (energyRead.status === 'missing' && currentBeforeSettlement.record.energyState !== 'pending')
    ) {
      retained += 1;
      continue;
    }
    if (energyRead.status === 'refunded' && currentBeforeSettlement.record.energyState !== 'refunded') {
      const marked = await setEnergyState(account, snapshot.fingerprint, 'refunded', nowMs);
      if (marked.status !== 'refunded') {
        retained += 1;
        continue;
      }
    }
    const current = await readRecordByFingerprint(account, snapshot.fingerprint);
    if (current.status !== 'found') {
      if (current.status === 'missing') removed += 1;
      else retained += 1;
      continue;
    }
    if (
      current.record.receiptId !== snapshot.receiptId
      || current.record.energyOperationId !== snapshot.energyOperationId
      || (current.record.startInProgress !== null && !(
        trigger !== 'focus' && isClaimExpired(current.record, nowMs)
      ))
      || current.record.energyState === 'refund_in_progress'
      || current.record.phase !== 'prepared'
    ) {
      retained += 1;
      continue;
    }
    const removal = await removeRecord(account, current.record);
    if (removal.status === 'removed' || removal.status === 'missing') removed += 1;
    else retained += 1;
  }
  if (trigger === 'boot' || trigger === 'focus') {
    const gc = await garbageCollectOrphanManifestsSerialized(account);
    if (gc.status !== 'collected') return gc;
  }
  return { status: 'maintained', removed, retained };
}

export function maintainFlashcardTrainingPendingGrants(
  account: FlashcardTrainingPendingGrantAccount,
  trigger: 'boot' | 'account' | 'focus',
  refundEnergy: (operationId: string, reason: string) => Promise<void>,
  nowMs = Date.now(),
): Promise<MaintenanceResult> {
  return withFlashcardTrainingPendingGrantLifecycle(
    account,
    () => maintainFlashcardTrainingPendingGrantsInner(account, trigger, refundEnergy, nowMs),
  );
}

/** @deprecated Use maintenance with an explicit durable refund adapter. */
export async function cleanupFlashcardTrainingPendingGrants(
  account: FlashcardTrainingPendingGrantAccount,
  trigger: 'boot' | 'account' | 'focus',
  nowMs = Date.now(),
): Promise<Readonly<{ status: 'cleaned'; removed: number }> | Readonly<{ status: 'stale_account' }> | Readonly<{ status: 'unavailable'; reason: string }>> {
  const result = await maintainFlashcardTrainingPendingGrants(
    account,
    trigger,
    async () => { throw new Error('refund_adapter_required'); },
    nowMs,
  );
  if (result.status !== 'maintained') return result;
  return { status: 'cleaned', removed: result.removed };
}

export async function acknowledgeAndClearFlashcardTrainingPendingGrant(
  account: FlashcardTrainingPendingGrantAccount,
  fingerprint: string,
  acknowledgeEnergy: (operationId: string) => Promise<boolean>,
): Promise<Readonly<{ status: 'cleared' | 'ack_failed' | 'missing' | 'stale_account' | 'invalid_phase' }> | Readonly<{ status: 'unavailable'; reason: string }>> {
  const found = await mutateJournal(account, async (journal) => {
    const record = journal.records.find((item) => item.fingerprint === fingerprint);
    if (!record) return { result: { status: 'missing' } as const };
    if (record.phase !== 'playable') return { result: { status: 'invalid_phase' } as const };
    if (!record.startInProgress) return { result: { status: 'invalid_phase' } as const };
    return { result: { status: 'found', record } as const };
  });
  if (found.status !== 'found') return found as Exclude<Awaited<ReturnType<typeof acknowledgeAndClearFlashcardTrainingPendingGrant>>, { status: 'cleared' | 'ack_failed' }>;
  let acknowledged = false;
  try {
    acknowledged = await acknowledgeEnergy(found.record.energyOperationId);
  } catch {
    acknowledged = false;
  }
  if (!acknowledged) return { status: 'ack_failed' };
  const authoritative = await readEnergySessionStartStatus(found.record.energyOperationId, account.runtimeToken)
    .catch(() => ({ status: 'unavailable' as const, reason: 'read_failed' }));
  if (authoritative.status !== 'acknowledged') {
    return authoritative.status === 'unavailable' || authoritative.status === 'stale_account'
      ? authoritative
      : { status: 'ack_failed' };
  }
  const removal = await removeRecord(account, found.record);
  if (removal.status === 'removed' || removal.status === 'missing') return { status: 'cleared' };
  if (removal.status === 'changed') return { status: 'invalid_phase' };
  return removal;
}
