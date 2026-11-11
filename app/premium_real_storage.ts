import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  acquireAccountTransitionCommitPermit,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
  type AccountTransitionLockLease,
} from './account_generation';

export const REAL_PREMIUM_SNAPSHOT_VERSION = 1 as const;
export const REAL_PREMIUM_SNAPSHOT_PREFIX = 'premium_real_snapshot_v1:';

export type RealPremiumPlan = 'monthly' | 'yearly' | 'lifetime';
export type RealPremiumEvidenceSource =
  | 'store_purchase'
  | 'store_restore_unverified_lineage'
  | 'store_plan_change'
  | 'server_projection';

export type RealPremiumSnapshotV1 = Readonly<{
  version: 1;
  ownerStableId: string;
  active: boolean;
  plan: RealPremiumPlan | null;
  premiumExpiryMs: number;
  rcExpiryMs: number;
  rcLastSeenAtMs: number;
  rcProductId: string | null;
  rcPeriodType: string | null;
  rcStore: string | null;
  rcPurchasedAtMs: number;
  rcUpdatedAtMs: number;
  evidenceSource: RealPremiumEvidenceSource;
  updatedAtMs: number;
}>;

type RealPremiumSnapshotInput = Omit<
  RealPremiumSnapshotV1,
  'version' | 'ownerStableId' | 'updatedAtMs'
>;

const REAL_PREMIUM_PLANS = new Set<RealPremiumPlan>(['monthly', 'yearly', 'lifetime']);
const REAL_PREMIUM_EVIDENCE = new Set<RealPremiumEvidenceSource>([
  'store_purchase',
  'store_restore_unverified_lineage',
  'store_plan_change',
  'server_projection',
]);
const REAL_PREMIUM_JOURNAL_VERSION = 1 as const;
const MAX_REAL_PREMIUM_RAW_LENGTH = 4_096;
let journalOperationSequence = 0;

type RealPremiumPreparedJournalV1 = Readonly<{
  journalVersion: 1;
  ownerStableId: string;
  operationId: string;
  startedGeneration: number;
  previousRaw: string | null;
  candidateRaw: string;
  preparedAtMs: number;
}>;

function normalizeStableId(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= 160 ? normalized : null;
}

function isBoundedNullableString(value: unknown, maxLength: number): value is string | null {
  return value === null || (typeof value === 'string' && value.length <= maxLength);
}

function isValidTime(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isRealPremiumPlan(value: unknown): value is RealPremiumPlan {
  return typeof value === 'string' && REAL_PREMIUM_PLANS.has(value as RealPremiumPlan);
}

function isEvidenceSource(value: unknown): value is RealPremiumEvidenceSource {
  return typeof value === 'string'
    && REAL_PREMIUM_EVIDENCE.has(value as RealPremiumEvidenceSource);
}

export function realPremiumSnapshotStorageKey(stableId: string): string {
  const ownerStableId = normalizeStableId(stableId);
  if (!ownerStableId) throw new Error('premium_real_snapshot_owner_invalid');
  return `${REAL_PREMIUM_SNAPSHOT_PREFIX}${encodeURIComponent(ownerStableId)}`;
}

export function realPremiumPendingStorageKey(stableId: string): string {
  return `${realPremiumSnapshotStorageKey(stableId)}:pending`;
}

export function isRealPremiumSnapshotStorageKey(key: string): boolean {
  return key.startsWith(REAL_PREMIUM_SNAPSHOT_PREFIX);
}

export function parseRealPremiumSnapshot(
  raw: string | null,
  expectedStableId: string,
): RealPremiumSnapshotV1 | null {
  const ownerStableId = normalizeStableId(expectedStableId);
  if (!raw || !ownerStableId) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (
      !parsed
      || typeof parsed !== 'object'
      || Array.isArray(parsed)
      || parsed.version !== REAL_PREMIUM_SNAPSHOT_VERSION
      || parsed.ownerStableId !== ownerStableId
      || typeof parsed.active !== 'boolean'
      || !(parsed.plan === null || isRealPremiumPlan(parsed.plan))
      || (parsed.active && parsed.plan === null)
      || !isValidTime(parsed.premiumExpiryMs)
      || !isValidTime(parsed.rcExpiryMs)
      || !isValidTime(parsed.rcLastSeenAtMs)
      || !isBoundedNullableString(parsed.rcProductId, 256)
      || !isBoundedNullableString(parsed.rcPeriodType, 64)
      || !isBoundedNullableString(parsed.rcStore, 64)
      || !isValidTime(parsed.rcPurchasedAtMs)
      || !isValidTime(parsed.rcUpdatedAtMs)
      || !isEvidenceSource(parsed.evidenceSource)
      || !isValidTime(parsed.updatedAtMs)
    ) return null;
    return Object.freeze({
      version: REAL_PREMIUM_SNAPSHOT_VERSION,
      ownerStableId,
      active: parsed.active,
      plan: parsed.plan,
      premiumExpiryMs: parsed.premiumExpiryMs,
      rcExpiryMs: parsed.rcExpiryMs,
      rcLastSeenAtMs: parsed.rcLastSeenAtMs,
      rcProductId: parsed.rcProductId,
      rcPeriodType: parsed.rcPeriodType,
      rcStore: parsed.rcStore,
      rcPurchasedAtMs: parsed.rcPurchasedAtMs,
      rcUpdatedAtMs: parsed.rcUpdatedAtMs,
      evidenceSource: parsed.evidenceSource,
      updatedAtMs: parsed.updatedAtMs,
    });
  } catch (error: unknown) {
    // зачем (правило владельца «никаких немых catch», сторож SILENT-CATCH 11.11): запись подписки не разобралась — причина в журнал
    // (без содержимого записи: там данные покупки).
    console.warn('[PREMIUM-REAL-STORAGE] record:parse_failed → null', error instanceof Error ? error.message : String(error));
    return null;
  }
}

function parsePreparedJournal(
  raw: string | null,
  expectedStableId: string,
): RealPremiumPreparedJournalV1 | null {
  if (!raw || raw.length > MAX_REAL_PREMIUM_RAW_LENGTH * 2) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (
      !parsed
      || typeof parsed !== 'object'
      || Array.isArray(parsed)
      || parsed.journalVersion !== REAL_PREMIUM_JOURNAL_VERSION
      || parsed.ownerStableId !== expectedStableId
      || typeof parsed.operationId !== 'string'
      || parsed.operationId.length === 0
      || parsed.operationId.length > 160
      || !isValidTime(parsed.startedGeneration)
      || !isValidTime(parsed.preparedAtMs)
      || typeof parsed.candidateRaw !== 'string'
      || parsed.candidateRaw.length > MAX_REAL_PREMIUM_RAW_LENGTH
      || !parseRealPremiumSnapshot(parsed.candidateRaw, expectedStableId)
      || !(parsed.previousRaw === null || typeof parsed.previousRaw === 'string')
      || (typeof parsed.previousRaw === 'string'
        && (parsed.previousRaw.length > MAX_REAL_PREMIUM_RAW_LENGTH
          || !parseRealPremiumSnapshot(parsed.previousRaw, expectedStableId)))
    ) return null;
    return Object.freeze({
      journalVersion: REAL_PREMIUM_JOURNAL_VERSION,
      ownerStableId: expectedStableId,
      operationId: parsed.operationId,
      startedGeneration: parsed.startedGeneration,
      previousRaw: parsed.previousRaw as string | null,
      candidateRaw: parsed.candidateRaw,
      preparedAtMs: parsed.preparedAtMs,
    });
  } catch (error: unknown) {
    // зачем (правило владельца «никаких немых catch», сторож SILENT-CATCH 11.11): журнал незавершённой записи подписки не разобрался —
    // причина в журнал (без содержимого).
    console.warn('[PREMIUM-REAL-STORAGE] journal:parse_failed → null', error instanceof Error ? error.message : String(error));
    return null;
  }
}

export async function readRealPremiumSnapshotForGeneration(
  token: AccountGenerationToken,
): Promise<RealPremiumSnapshotV1 | null> {
  const ownerStableId = normalizeStableId(token.stableId);
  if (!ownerStableId || !isCurrentAccountGeneration(token, ownerStableId)) return null;
  const storageKey = realPremiumSnapshotStorageKey(ownerStableId);
  const pendingKey = realPremiumPendingStorageKey(ownerStableId);
  const pendingBefore = await AsyncStorage.getItem(pendingKey);
  if (!isCurrentAccountGeneration(token, ownerStableId)) return null;
  const snapshotRaw = await AsyncStorage.getItem(storageKey);
  if (!isCurrentAccountGeneration(token, ownerStableId)) return null;
  const pendingAfter = await AsyncStorage.getItem(pendingKey);
  if (!isCurrentAccountGeneration(token, ownerStableId)) return null;
  if (pendingBefore !== pendingAfter) return null;
  if (pendingAfter !== null) {
    const journal = parsePreparedJournal(pendingAfter, ownerStableId);
    return journal
      ? parseRealPremiumSnapshot(journal.previousRaw, ownerStableId)
      : null;
  }
  return parseRealPremiumSnapshot(snapshotRaw, ownerStableId);
}

function makeSnapshot(
  ownerStableId: string,
  input: RealPremiumSnapshotInput,
): RealPremiumSnapshotV1 | null {
  const candidate = {
    version: REAL_PREMIUM_SNAPSHOT_VERSION,
    ownerStableId,
    ...input,
    updatedAtMs: Date.now(),
  };
  return parseRealPremiumSnapshot(JSON.stringify(candidate), ownerStableId);
}

async function restorePreviousSnapshotBestEffort(
  storageKey: string,
  previousRaw: string | null,
): Promise<void> {
  if (previousRaw === null) await AsyncStorage.removeItem(storageKey);
  else await AsyncStorage.setItem(storageKey, previousRaw);
}

async function commitSnapshotForGeneration(
  token: AccountGenerationToken,
  ownerStableId: string,
  storageKey: string,
  snapshot: RealPremiumSnapshotV1,
  previousRaw: string | null,
  lease: AccountTransitionLockLease,
): Promise<boolean> {
  if (!isCurrentAccountGeneration(token, ownerStableId)) return false;
  const candidateRaw = JSON.stringify(snapshot);
  const pendingKey = realPremiumPendingStorageKey(ownerStableId);
  const operationId = `${token.generation}:${Date.now()}:${journalOperationSequence += 1}`;
  const journalRaw = JSON.stringify({
    journalVersion: REAL_PREMIUM_JOURNAL_VERSION,
    ownerStableId,
    operationId,
    startedGeneration: token.generation,
    previousRaw,
    candidateRaw,
    preparedAtMs: Date.now(),
  } satisfies RealPremiumPreparedJournalV1);

  await AsyncStorage.setItem(pendingKey, journalRaw);
  const preparedReadback = await AsyncStorage.getItem(pendingKey);
  if (preparedReadback !== journalRaw) {
    throw new Error('premium_real_snapshot_prepare_readback_failed');
  }
  if (!isCurrentAccountGeneration(token, ownerStableId)) {
    // Even when the transition won before the candidate write, restore the
    // known prior bytes. This keeps an uncertain earlier native prepare from
    // being mistaken for authority and leaves the journal as a durable fence.
    await restorePreviousSnapshotBestEffort(storageKey, previousRaw);
    return false;
  }

  try {
    await AsyncStorage.setItem(storageKey, candidateRaw);
  } catch (error) {
    // The journal stays durable because a native rejection is not proof that
    // the candidate was not written. Readers expose only previousRaw/null.
    throw error;
  }
  const candidateReadback = await AsyncStorage.getItem(storageKey);
  if (candidateReadback !== candidateRaw) {
    throw new Error('premium_real_snapshot_candidate_readback_failed');
  }
  if (!isCurrentAccountGeneration(token, ownerStableId)) {
    await restorePreviousSnapshotBestEffort(storageKey, previousRaw);
    return false;
  }

  if (!acquireAccountTransitionCommitPermit(lease, token)) return false;

  // The permit is the linearization point. From here the transaction may only
  // remove and inspect this exact marker; identity changes remain synchronous.
  try {
    await AsyncStorage.removeItem(pendingKey);
  } catch (error: unknown) {
    // Classify by durable readback below, including commit-then-reject.
    // зачем (правило владельца «никаких немых catch», сторож SILENT-CATCH 11.11): ошибку намеренно не пробрасываем — исход решает
    // чтение с диска ниже; но сама причина сбоя удаления должна быть видна в журнале.
    console.warn('[PREMIUM-REAL-STORAGE] pending:remove_failed → исход по чтению с диска', error instanceof Error ? error.message : String(error));
  }
  let finalPendingRaw: string | null;
  try {
    finalPendingRaw = await AsyncStorage.getItem(pendingKey);
  } catch {
    throw new Error('premium_real_snapshot_commit_indeterminate');
  }
  if (finalPendingRaw === null) return true;
  if (finalPendingRaw === journalRaw) return false;
  throw new Error('premium_real_snapshot_commit_indeterminate');
}

async function readPreviousRawForWrite(
  token: AccountGenerationToken,
  ownerStableId: string,
  storageKey: string,
): Promise<{ valid: boolean; previousRaw: string | null }> {
  const pendingRaw = await AsyncStorage.getItem(realPremiumPendingStorageKey(ownerStableId));
  if (!isCurrentAccountGeneration(token, ownerStableId)) return { valid: false, previousRaw: null };
  if (pendingRaw !== null) {
    const journal = parsePreparedJournal(pendingRaw, ownerStableId);
    return journal
      ? { valid: true, previousRaw: journal.previousRaw }
      : { valid: false, previousRaw: null };
  }
  const snapshotRaw = await AsyncStorage.getItem(storageKey);
  if (!isCurrentAccountGeneration(token, ownerStableId)) return { valid: false, previousRaw: null };
  const snapshot = parseRealPremiumSnapshot(snapshotRaw, ownerStableId);
  return { valid: true, previousRaw: snapshot ? snapshotRaw : null };
}

export async function replaceRealPremiumSnapshotForGeneration(
  token: AccountGenerationToken,
  input: RealPremiumSnapshotInput,
  inheritedLease?: AccountTransitionLockLease,
): Promise<boolean> {
  const ownerStableId = normalizeStableId(token.stableId);
  if (!ownerStableId) return false;
  const snapshot = makeSnapshot(ownerStableId, input);
  if (!snapshot) return false;
  const storageKey = realPremiumSnapshotStorageKey(ownerStableId);
  return withAccountTransitionLock(async (lease) => {
    if (!isCurrentAccountGeneration(token, ownerStableId)) return false;
    const prior = await readPreviousRawForWrite(token, ownerStableId, storageKey);
    if (!prior.valid || !isCurrentAccountGeneration(token, ownerStableId)) return false;
    return commitSnapshotForGeneration(
      token,
      ownerStableId,
      storageKey,
      snapshot,
      prior.previousRaw,
      lease,
    );
  }, inheritedLease);
}

export async function updateRealPremiumSnapshotForGeneration(
  token: AccountGenerationToken,
  update: (current: RealPremiumSnapshotV1) => RealPremiumSnapshotV1 | null,
  inheritedLease?: AccountTransitionLockLease,
): Promise<boolean> {
  const ownerStableId = normalizeStableId(token.stableId);
  if (!ownerStableId) return false;
  const storageKey = realPremiumSnapshotStorageKey(ownerStableId);
  return withAccountTransitionLock(async (lease) => {
    if (!isCurrentAccountGeneration(token, ownerStableId)) return false;
    const prior = await readPreviousRawForWrite(token, ownerStableId, storageKey);
    if (!prior.valid || !isCurrentAccountGeneration(token, ownerStableId)) return false;
    const current = parseRealPremiumSnapshot(prior.previousRaw, ownerStableId);
    if (!current) return false;
    const proposed = update(current);
    if (!proposed || proposed.ownerStableId !== ownerStableId) return false;
    const snapshot = makeSnapshot(ownerStableId, {
      active: proposed.active,
      plan: proposed.plan,
      premiumExpiryMs: proposed.premiumExpiryMs,
      rcExpiryMs: proposed.rcExpiryMs,
      rcLastSeenAtMs: proposed.rcLastSeenAtMs,
      rcProductId: proposed.rcProductId,
      rcPeriodType: proposed.rcPeriodType,
      rcStore: proposed.rcStore,
      rcPurchasedAtMs: proposed.rcPurchasedAtMs,
      rcUpdatedAtMs: proposed.rcUpdatedAtMs,
      evidenceSource: proposed.evidenceSource,
    });
    if (!snapshot || !isCurrentAccountGeneration(token, ownerStableId)) return false;
    return commitSnapshotForGeneration(
      token,
      ownerStableId,
      storageKey,
      snapshot,
      prior.previousRaw,
      lease,
    );
  }, inheritedLease);
}

export default function __RouteShim() { return null; }

