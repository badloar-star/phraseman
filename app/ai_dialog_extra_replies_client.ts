/**
 * Durable local-first purchase of +10 Dialogue replies for 300 runes.
 * The exact debit and grant share one immutable operation. Cloud work only
 * persists that operation and materializes its already-owned quota grant.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import * as Crypto from 'expo-crypto';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import {
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
  type AccountTransitionLockLease,
} from './account_generation';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { DebugLogger } from './debug-logger';
import {
  parseAiDialogQuotaObservation,
  recordAiDialogDailyQuotaFromServer,
  type AiDialogQuotaObservation,
} from './ai_dialog_daily_quota';
import {
  prepareDialogExtraRepliesRunePurchase,
  recoverAndHydrateLevelSpinStarGrants,
  type PreparedDialogExtraRepliesRunePurchase,
} from './level_spin_star_grants';
import { withStorageLock } from './storage_mutex';
import {
  hasValidDialogExtraRepliesRuneOperationFingerprint,
  parseDialogExtraRepliesRuneOperation,
  type DialogueExtraRepliesRuneOperationV1,
} from '../modules/phone-state/domains/economy';

const REGION = 'us-central1';
const ID_RE = /^[A-Za-z0-9_-]{12,96}$/;
const MAX_PENDING_PURCHASES = 4_096;

export const DIALOG_EXTRA_REPLIES_PRICE_RUNES = 300 as const;
export const DIALOG_EXTRA_REPLIES_COUNT = 10 as const;

type PurchaseEnvelope = Readonly<{
  schemaVersion: 'client-dialog-extra-replies-envelope.v2';
  operation: DialogueExtraRepliesRuneOperationV1;
}>;

type QuotaObservation = AiDialogQuotaObservation;

type SyncMarker = Readonly<{
  schemaVersion: 'client-dialog-extra-replies-sync.v1';
  status: 'pending' | 'synced';
  operationId: string;
  quota?: QuotaObservation;
}>;

const envelopePrefix = (stableId: string): string => (
  `ai_dialog_extra_replies_envelope_v2:${encodeURIComponent(stableId)}:`
);

export function dialogExtraRepliesEnvelopeKey(stableId: string, requestId: string): string {
  return `${envelopePrefix(stableId)}${encodeURIComponent(requestId)}`;
}

export function dialogExtraRepliesSyncMarkerKey(stableId: string, requestId: string): string {
  return `ai_dialog_extra_replies_sync_v1:${encodeURIComponent(stableId)}:${encodeURIComponent(requestId)}`;
}

export function dialogExtraRepliesPreparedKey(stableId: string): string {
  return `ai_dialog_extra_replies_prepared_v2:${encodeURIComponent(stableId)}`;
}

export function dialogExtraRepliesPendingKey(stableId: string): string {
  return `ai_dialog_extra_replies_pending_v2:${encodeURIComponent(stableId)}`;
}

function parsePendingRequestIds(raw: string | null): string[] {
  if (raw === null) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value) || value.length > MAX_PENDING_PURCHASES
      || value.some((requestId) => typeof requestId !== 'string' || !ID_RE.test(requestId))) {
      throw new Error('dialog_extra_replies_pending_corrupt');
    }
    const unique = [...new Set(value)];
    if (unique.length !== value.length) throw new Error('dialog_extra_replies_pending_corrupt');
    return unique.sort();
  } catch (error) {
    if (error instanceof Error && error.message === 'dialog_extra_replies_pending_corrupt') throw error;
    throw new Error('dialog_extra_replies_pending_corrupt');
  }
}

function parseEnvelope(raw: string | null, stableId: string): PurchaseEnvelope | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<PurchaseEnvelope>;
    const operation = parseDialogExtraRepliesRuneOperation(value.operation);
    if (value.schemaVersion !== 'client-dialog-extra-replies-envelope.v2'
      || !operation || operation.ownerStableId !== stableId) return null;
    return Object.freeze({ schemaVersion: value.schemaVersion, operation });
  } catch {
    return null;
  }
}

function parseSyncMarker(raw: string | null, operationId: string): SyncMarker | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<SyncMarker>;
    if (value.schemaVersion !== 'client-dialog-extra-replies-sync.v1'
      || value.operationId !== operationId
      || (value.status !== 'pending' && value.status !== 'synced')) return null;
    if (value.status === 'pending') {
      return Object.freeze({ schemaVersion: value.schemaVersion, status: value.status, operationId });
    }
    const quota = value.quota;
    if (!quota
      || !Number.isSafeInteger(quota.remainingQuota) || quota.remainingQuota < 0
      || !Number.isSafeInteger(quota.resetAtMs) || quota.resetAtMs <= 0
      || !Number.isSafeInteger(quota.quotaVersion) || quota.quotaVersion < 1) return null;
    return Object.freeze({ schemaVersion: value.schemaVersion, status: value.status, operationId, quota });
  } catch {
    return null;
  }
}

async function materializeEnvelope(
  token: AccountGenerationToken,
  lease: AccountTransitionLockLease,
  envelope: PurchaseEnvelope,
  alreadyPrepared?: PreparedDialogExtraRepliesRunePurchase,
): Promise<DialogueExtraRepliesRuneOperationV1> {
  const ownerStableId = token.stableId?.trim();
  if (!ownerStableId || !isCurrentAccountGeneration(token, ownerStableId)
    || envelope.operation.ownerStableId !== ownerStableId
    || !await hasValidDialogExtraRepliesRuneOperationFingerprint(envelope.operation)) {
    throw new Error('dialog_extra_replies_envelope_invalid');
  }
  const prepared = alreadyPrepared ?? await prepareDialogExtraRepliesRunePurchase({
      token,
      requestId: envelope.operation.requestId,
      createdAtMs: envelope.operation.createdAtMs,
      recoveryOperation: envelope.operation,
    }, lease);
  if (prepared.operation.requestFingerprint !== envelope.operation.requestFingerprint) {
    throw new Error('dialog_extra_replies_request_conflict');
  }
  const markerKey = dialogExtraRepliesSyncMarkerKey(ownerStableId, envelope.operation.requestId);
  await withStorageLock(async () => {
    if (!isCurrentAccountGeneration(token, ownerStableId)) throw new Error('level_spin_star_identity_changed');
    const existingMarker = parseSyncMarker(await AsyncStorage.getItem(markerKey), envelope.operation.operationId);
    const pendingKey = dialogExtraRepliesPendingKey(ownerStableId);
    const pending = parsePendingRequestIds(await AsyncStorage.getItem(pendingKey));
    const nextPending = existingMarker?.status === 'synced' || pending.includes(envelope.operation.requestId)
      ? pending
      : [...pending, envelope.operation.requestId].sort();
    if (nextPending.length > MAX_PENDING_PURCHASES) throw new Error('dialog_extra_replies_pending_full');
    await AsyncStorage.multiSet([
      ...prepared.durableWrites.map(([key, value]) => [key, value] as [string, string]),
      [dialogExtraRepliesEnvelopeKey(ownerStableId, envelope.operation.requestId), JSON.stringify(envelope)],
      ...(!existingMarker ? [[markerKey, JSON.stringify({
        schemaVersion: 'client-dialog-extra-replies-sync.v1',
        status: 'pending',
        operationId: envelope.operation.operationId,
      })] as [string, string]] : []),
      [pendingKey, JSON.stringify(nextPending)],
    ]);
  });
  return prepared.operation;
}

async function recoverPreparedEnvelope(
  token: AccountGenerationToken,
  lease: AccountTransitionLockLease,
): Promise<DialogueExtraRepliesRuneOperationV1 | null> {
  const ownerStableId = token.stableId?.trim();
  if (!ownerStableId) return null;
  const key = dialogExtraRepliesPreparedKey(ownerStableId);
  const raw = await AsyncStorage.getItem(key);
  if (raw === null) return null;
  const envelope = parseEnvelope(raw, ownerStableId);
  if (!envelope) throw new Error('dialog_extra_replies_prepared_corrupt');
  const operation = await materializeEnvelope(token, lease, envelope);
  if (!isCurrentAccountGeneration(token, ownerStableId)) throw new Error('level_spin_star_identity_changed');
  await AsyncStorage.removeItem(key);
  return operation;
}

async function assertPendingCapacity(
  ownerStableId: string,
  requestId: string,
  operationId: string,
): Promise<void> {
  const pending = parsePendingRequestIds(
    await AsyncStorage.getItem(dialogExtraRepliesPendingKey(ownerStableId)),
  );
  if (pending.length < MAX_PENDING_PURCHASES || pending.includes(requestId)) return;
  const marker = parseSyncMarker(
    await AsyncStorage.getItem(dialogExtraRepliesSyncMarkerKey(ownerStableId, requestId)),
    operationId,
  );
  if (marker?.status === 'synced') return;
  throw new Error('dialog_extra_replies_pending_full');
}

export function makeDialogExtraRepliesRequestId(): string {
  const rand = Crypto.randomUUID().replace(/-/g, '').slice(0, 20);
  return `der${Date.now().toString(36)}${rand}`.slice(0, 96);
}

export type DialogExtraRepliesPurchaseResult =
  | { ok: true; balance: number; repliesGranted: number; requestId: string }
  | { ok: false; reason: 'insufficient_runes' | 'identity_changed' | 'cloud_disabled' };

export async function buyDialogExtraRepliesLocally(
  token: AccountGenerationToken,
  requestId: string,
): Promise<DialogExtraRepliesPurchaseResult> {
  if (IS_EXPO_GO) return { ok: false, reason: 'cloud_disabled' };
  const ownerStableId = token.stableId?.trim();
  if (!ownerStableId || !isCurrentAccountGeneration(token, ownerStableId) || !ID_RE.test(requestId)) {
    return { ok: false, reason: 'identity_changed' };
  }

  try {
    const operation = await withAccountTransitionLock(async (lease) => {
      const recovered = await recoverPreparedEnvelope(token, lease);
      if (recovered) return recovered;
      const prepared = await prepareDialogExtraRepliesRunePurchase({
        token, requestId, createdAtMs: Date.now(),
      }, lease);
      await assertPendingCapacity(
        ownerStableId,
        prepared.operation.requestId,
        prepared.operation.operationId,
      );
      const envelope: PurchaseEnvelope = Object.freeze({
        schemaVersion: 'client-dialog-extra-replies-envelope.v2',
        operation: prepared.operation,
      });
      if (!prepared.duplicate) {
        await AsyncStorage.setItem(dialogExtraRepliesPreparedKey(ownerStableId), JSON.stringify(envelope));
      }
      const materialized = await materializeEnvelope(token, lease, envelope, prepared);
      await AsyncStorage.removeItem(dialogExtraRepliesPreparedKey(ownerStableId));
      return materialized;
    });
    await recoverAndHydrateLevelSpinStarGrants(token, { syncNow: false });
    return {
      ok: true,
      balance: operation.balanceAfter,
      repliesGranted: operation.repliesGranted,
      requestId: operation.requestId,
    };
  } catch (error) {
    if (error instanceof Error && error.message === 'dialog_extra_replies_runes_insufficient') {
      return { ok: false, reason: 'insufficient_runes' };
    }
    throw error;
  }
}

function callable() {
  return httpsCallable<
    { stableId: string; operation: DialogueExtraRepliesRuneOperationV1 },
    {
      ok?: boolean;
      operationId?: unknown;
      requestFingerprint?: unknown;
      repliesGranted?: unknown;
      priceRunes?: unknown;
      quota?: unknown;
    }
  >(getFunctions(getApp(), REGION), 'aiDialogBuyExtraReplies');
}

export async function syncDialogExtraRepliesPurchase(
  token: AccountGenerationToken,
  studyTarget?: unknown,
): Promise<Readonly<{ synced: number; pending: number; latestQuota: QuotaObservation | null }>> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return { synced: 0, pending: 0, latestQuota: null };
  const ownerStableId = token.stableId?.trim();
  if (!ownerStableId || !isCurrentAccountGeneration(token, ownerStableId)) {
    return { synced: 0, pending: 0, latestQuota: null };
  }

  try {
    await withAccountTransitionLock(async (lease) => recoverPreparedEnvelope(token, lease));
    const pendingKey = dialogExtraRepliesPendingKey(ownerStableId);
    const requestIds = parsePendingRequestIds(await AsyncStorage.getItem(pendingKey));
    let synced = 0;
    let pending = 0;
    let latestQuota: QuotaObservation | null = null;
    await initFirebaseAppCheckIfAvailable().catch(() => {});
    for (const requestId of requestIds) {
      if (!isCurrentAccountGeneration(token, ownerStableId)) break;
      const envelope = parseEnvelope(
        await AsyncStorage.getItem(dialogExtraRepliesEnvelopeKey(ownerStableId, requestId)),
        ownerStableId,
      );
      if (!envelope || !await hasValidDialogExtraRepliesRuneOperationFingerprint(envelope.operation)) {
        throw new Error('dialog_extra_replies_envelope_corrupt');
      }
      const markerKey = dialogExtraRepliesSyncMarkerKey(ownerStableId, envelope.operation.requestId);
      const marker = parseSyncMarker(await AsyncStorage.getItem(markerKey), envelope.operation.operationId);
      if (marker?.status === 'synced') {
        latestQuota = !latestQuota || marker.quota!.quotaVersion > latestQuota.quotaVersion
          ? marker.quota! : latestQuota;
        await AsyncStorage.setItem(
          pendingKey,
          JSON.stringify(parsePendingRequestIds(await AsyncStorage.getItem(pendingKey))
            .filter((candidate) => candidate !== requestId)),
        );
        continue;
      }
      pending += 1;
      const response = await callable()({ stableId: ownerStableId, operation: envelope.operation });
      if (!isCurrentAccountGeneration(token, ownerStableId)) break;
      const quota = parseAiDialogQuotaObservation(response.data.quota);
      if (response.data.ok !== true
        || response.data.operationId !== envelope.operation.operationId
        || response.data.requestFingerprint !== envelope.operation.requestFingerprint
        || response.data.repliesGranted !== DIALOG_EXTRA_REPLIES_COUNT
        || response.data.priceRunes !== DIALOG_EXTRA_REPLIES_PRICE_RUNES
        || !quota) throw new Error('dialog_extra_replies_ack_invalid');
      await withStorageLock(async () => {
        const currentPending = parsePendingRequestIds(await AsyncStorage.getItem(pendingKey));
        await AsyncStorage.multiSet([
          [markerKey, JSON.stringify({
            schemaVersion: 'client-dialog-extra-replies-sync.v1',
            status: 'synced',
            operationId: envelope.operation.operationId,
            quota,
          } satisfies SyncMarker)],
          [pendingKey, JSON.stringify(currentPending.filter((candidate) => candidate !== requestId))],
        ]);
      });
      latestQuota = !latestQuota || quota.quotaVersion > latestQuota.quotaVersion ? quota : latestQuota;
      synced += 1;
      pending -= 1;
    }
    if (latestQuota && studyTarget !== undefined) {
      await recordAiDialogDailyQuotaFromServer(studyTarget, ownerStableId, latestQuota);
    }
    return { synced, pending, latestQuota };
  } catch (error) {
    DebugLogger.error(
      'ai_dialog_extra_replies_client:sync_failed',
      error instanceof Error ? error : new Error(String(error)),
      'warning',
    );
    const pending = await AsyncStorage.getItem(dialogExtraRepliesPendingKey(ownerStableId))
      .then(parsePendingRequestIds)
      .catch(() => [] as string[]);
    return {
      synced: 0,
      pending: Math.max(1, pending.length),
      latestQuota: null,
    };
  }
}

export async function requireDialogExtraRepliesProviderReady(
  token: AccountGenerationToken,
  studyTarget?: unknown,
): Promise<Readonly<{ synced: number; pending: number; latestQuota: QuotaObservation | null }>> {
  const result = await syncDialogExtraRepliesPurchase(token, studyTarget);
  if (result.pending > 0) throw new Error('dialog_extra_replies_sync_pending');
  return result;
}

export default function __RouteShim() { return null; }
