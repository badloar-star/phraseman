import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from '../config';
import { getStableId } from '../stable_id';
import { captureAccountGeneration, isCurrentAccountGeneration } from '../account_generation';
import {
  CLIENT_SHARD_OPERATION_PREFIX,
  clientShardCloudSyncedStorageKey,
  clientShardOperationForCloud,
  commitClientShardOperation,
  readClientShardLedgerOpeningBalance,
  reconcileClientShardLedgerOpeningBalance,
  readStoredClientShardOperation,
} from './client_shard_operation_ledger';
import {
  isValidPortableClientShardGrant,
  markPortableClientShardGrantPaid,
} from './client_shard_semantic_reducer';

const MAX_OPERATIONS_PER_FLUSH = 100;
export const CLIENT_SHARD_CONFLICT_PREFIX = 'client_shard_conflict_v1:';

type CloudClientOperation = Readonly<{
  operationId: string;
  ownerStableId: string;
  authority: 'client';
  direction: 'debit' | 'credit';
  amount: number;
  reason: string;
  grant: Readonly<{ kind: string; subjectId: string; payload?: unknown }>;
  createdAtMs: number;
  requestFingerprint: string;
}>;

function parseCloudOperation(value: unknown, ownerStableId: string): CloudClientOperation | null {
  if (!value || typeof value !== 'object') return null;
  const operation = value as Partial<CloudClientOperation>;
  if (
    operation.ownerStableId !== ownerStableId
    || operation.authority !== 'client'
    || typeof operation.operationId !== 'string'
    || !/^[A-Za-z0-9_:-]{8,80}$/.test(operation.operationId)
    || (operation.direction !== 'debit' && operation.direction !== 'credit')
    || !Number.isSafeInteger(operation.amount) || Number(operation.amount) <= 0
    || typeof operation.reason !== 'string'
    || !operation.grant || typeof operation.grant !== 'object'
    || typeof operation.grant.kind !== 'string'
    || typeof operation.grant.subjectId !== 'string'
    || !Number.isSafeInteger(operation.createdAtMs) || Number(operation.createdAtMs) <= 0
    || typeof operation.requestFingerprint !== 'string'
    || !/^[a-f0-9]{64}$/.test(operation.requestFingerprint)
  ) return null;
  return operation as CloudClientOperation;
}

function operationIdFromStorageKey(key: string, ownerStableId: string): string | null {
  const prefix = `${CLIENT_SHARD_OPERATION_PREFIX}${encodeURIComponent(ownerStableId)}:`;
  if (!key.startsWith(prefix)) return null;
  const operationId = key.slice(prefix.length);
  return /^[A-Za-z0-9_:-]{8,80}$/.test(operationId) ? operationId : null;
}

/**
 * Best-effort append-only persistence. Firestore never participates in the
 * local commit and this function never writes a balance projection back.
 */
export async function syncClientShardOperationJournalToCloud(): Promise<{
  stored: number;
  pending: number;
  merged?: number;
}> {
  if (!CLOUD_SYNC_ENABLED || IS_EXPO_GO) return { stored: 0, pending: 0 };
  const ownerStableId = String(await getStableId()).trim();
  if (!ownerStableId) return { stored: 0, pending: 0 };
  const accountToken = captureAccountGeneration();
  const isCurrent = () => isCurrentAccountGeneration(accountToken, ownerStableId);
  if (!isCurrent()) return { stored: 0, pending: 0 };

  const cloudSync = await import('../cloud_sync');
  const authStableId = await cloudSync.ensureAnonUser().catch(() => null);
  if (authStableId !== ownerStableId) return { stored: 0, pending: 0 };
  const linked = await cloudSync.ensureStableAuthLinkForStableId(ownerStableId).catch(() => false);
  if (!linked) return { stored: 0, pending: 0 };

  const openingBalance = await readClientShardLedgerOpeningBalance(ownerStableId);
  if (openingBalance !== null && isCurrent()) {
    const openingRef = firestore()
      .collection('users')
      .doc(ownerStableId)
      .collection('client_economy_opening')
      .doc('v1');
    let openingSnap = await openingRef.get().catch(() => null);
    if (openingSnap && !openingSnap.exists) {
      await openingRef.set({
          schemaVersion: 'client-economy-opening.v1',
          ownerStableId,
          openingBalance,
          createdAtMs: Date.now(),
        }, { merge: false }).catch(() => {});
      openingSnap = await openingRef.get().catch(() => null);
    }
    const canonicalOpening = Number(openingSnap?.data()?.openingBalance);
    if (Number.isSafeInteger(canonicalOpening) && canonicalOpening >= 0 && isCurrent()) {
      await reconcileClientShardLedgerOpeningBalance(ownerStableId, canonicalOpening);
    }
  }

  const allKeys = await AsyncStorage.getAllKeys();
  const operationIds = allKeys
    .map((key) => operationIdFromStorageKey(key, ownerStableId))
    .filter((value): value is string => value !== null)
    .sort();
  let stored = 0;
  let attempted = 0;
  let pending = 0;
  for (const operationId of operationIds) {
    if (!isCurrent()) return { stored, pending };
    const syncedKey = clientShardCloudSyncedStorageKey(ownerStableId, operationId);
    const operation = await readStoredClientShardOperation(ownerStableId, operationId);
    if (!operation || operation.authority !== 'client') continue;
    if (operation.direction === 'debit') {
      await markPortableClientShardGrantPaid(ownerStableId, operation.grant);
    }
    if (await AsyncStorage.getItem(syncedKey) === operation.requestFingerprint) continue;
    pending += 1;
    if (attempted >= MAX_OPERATIONS_PER_FLUSH) continue;
    attempted += 1;
    try {
      await firestore()
        .collection('users')
        .doc(ownerStableId)
        .collection('client_economy_operations')
        .doc(operationId)
        .set(clientShardOperationForCloud(operation), { merge: false });
      await AsyncStorage.setItem(syncedKey, operation.requestFingerprint);
      stored += 1;
      pending -= 1;
    } catch {
      // Persistence is retryable and is never allowed to affect the local
      // balance/result that was already committed.
    }
  }

  // Download the immutable union as well. Replaying the exact result writes
  // restores entitlements on a second device; a concurrent overspend becomes
  // debt instead of revoking a result already shown on either device.
  let merged = 0;
  let cursor: any = null;
  while (isCurrent()) {
    let query: any = firestore()
      .collection('users')
      .doc(ownerStableId)
      .collection('client_economy_operations')
      .orderBy('createdAtMs', 'asc')
      .orderBy(firestore.FieldPath.documentId(), 'asc')
      .limit(MAX_OPERATIONS_PER_FLUSH);
    if (cursor) query = query.startAfter(cursor);
    const snapshot = await query.get();
    if (!isCurrent() || snapshot.docs.length === 0) break;
    for (const document of snapshot.docs) {
      if (!isCurrent()) break;
      const operation = parseCloudOperation(document.data(), ownerStableId);
      if (!operation || operation.operationId !== document.id) continue;
      const localOperation = await readStoredClientShardOperation(ownerStableId, operation.operationId);
      if (localOperation) {
        if (localOperation.requestFingerprint !== operation.requestFingerprint) {
          await AsyncStorage.setItem(
            `${CLIENT_SHARD_CONFLICT_PREFIX}${encodeURIComponent(ownerStableId)}:${operation.operationId}`,
            JSON.stringify({
              local: localOperation.requestFingerprint,
              cloud: operation.requestFingerprint,
              detectedAtMs: Date.now(),
            }),
          );
          continue;
        }
        if (localOperation.direction === 'debit') {
          await markPortableClientShardGrantPaid(ownerStableId, localOperation.grant);
        }
        await AsyncStorage.setItem(
          clientShardCloudSyncedStorageKey(ownerStableId, operation.operationId),
          operation.requestFingerprint,
        );
        continue;
      }
      // A remote debit is merged only when its observable result can be
      // materialized safely on this device. Device-scoped consumables (energy,
      // revive, wager, freeze) remain audit facts and can never reduce a remote
      // projection without delivering their result.
      if (
        operation.direction === 'debit'
        && !isValidPortableClientShardGrant(operation.grant)
      ) {
        await AsyncStorage.setItem(
          clientShardCloudSyncedStorageKey(ownerStableId, operation.operationId),
          operation.requestFingerprint,
        );
        continue;
      }
      const result = await commitClientShardOperation({
        expectedOwnerStableId: ownerStableId,
        mergeReplay: true,
        mergeSemanticResult: true,
        mergeSourceFingerprint: operation.requestFingerprint,
        authority: 'client',
        operationId: operation.operationId,
        direction: operation.direction,
        amount: operation.amount,
        reason: operation.reason,
        grant: operation.grant,
        localWrites: [],
        createdAtMs: operation.createdAtMs,
      });
      if (
        result.status !== 'applied'
        && result.status !== 'already-applied'
        && result.status !== 'already-satisfied'
      ) continue;
      if (!isCurrent()) break;
      await AsyncStorage.setItem(
        clientShardCloudSyncedStorageKey(ownerStableId, operation.operationId),
        operation.requestFingerprint,
      );
      merged += result.status === 'applied' ? 1 : 0;
    }
    cursor = snapshot.docs[snapshot.docs.length - 1];
    if (snapshot.docs.length < MAX_OPERATIONS_PER_FLUSH) break;
  }
  return { stored, pending, merged };
}
