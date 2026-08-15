import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import * as Crypto from 'expo-crypto';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from '../config';
import { commitConfirmedExternalShardEvent, wasConfirmedExternalShardEventApplied } from '../shards_system';
import { getStableId } from '../stable_id';
import { captureAccountGeneration, isCurrentAccountGeneration } from '../account_generation';

export const EXTERNAL_ECONOMY_EVENT_APPLIED_PREFIX = 'external_economy_event_applied_v1:';
const MAX_EVENTS_PER_SYNC = 100;

export type ExternalEconomyEvent = Readonly<{
  schemaVersion: 'external-economy-event.v1';
  source: string;
  eventId: string;
  ownerStableId: string;
  delta: number;
  reason: string;
  kind: string;
  subjectId: string;
  payload: Record<string, unknown>;
  createdAtMs: number;
}>; 

function parseEvent(value: unknown, ownerStableId: string): ExternalEconomyEvent | null {
  if (!value || typeof value !== 'object') return null;
  const event = value as Partial<ExternalEconomyEvent>;
  if (
    event.schemaVersion !== 'external-economy-event.v1'
    || event.ownerStableId !== ownerStableId
    || typeof event.source !== 'string' || event.source.length === 0 || event.source.length > 64
    || typeof event.eventId !== 'string' || event.eventId.length === 0 || event.eventId.length > 512
    || !Number.isSafeInteger(event.delta) || event.delta === 0
    || typeof event.reason !== 'string' || event.reason.length === 0 || event.reason.length > 64
    || typeof event.kind !== 'string' || event.kind.length === 0 || event.kind.length > 160
    || typeof event.subjectId !== 'string' || event.subjectId.length === 0 || event.subjectId.length > 160
    || !event.payload || typeof event.payload !== 'object' || Array.isArray(event.payload)
    || !Number.isSafeInteger(event.createdAtMs) || Number(event.createdAtMs) <= 0
  ) return null;
  return event as ExternalEconomyEvent;
}

async function appliedKey(ownerStableId: string, source: string, eventId: string): Promise<string> {
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${source}:${eventId}`,
  );
  return `${EXTERNAL_ECONOMY_EVENT_APPLIED_PREFIX}${encodeURIComponent(ownerStableId)}:${hash}`;
}

/**
 * Pull immutable outside-world facts into the local wallet. The server sends
 * facts only; it never sends a balance and cannot reject or reverse a local
 * purchase result. Refunds may create ledger debt: UI remains clamped to zero,
 * future credits repay it, and no already-delivered result is revoked.
 */
export async function syncConfirmedExternalShardEventsFromCloud(): Promise<{
  applied: number;
  skipped: number;
  invalid: number;
}> {
  if (!CLOUD_SYNC_ENABLED || IS_EXPO_GO) return { applied: 0, skipped: 0, invalid: 0 };
  const ownerStableId = String(await getStableId()).trim();
  if (!ownerStableId) return { applied: 0, skipped: 0, invalid: 0 };
  const accountToken = captureAccountGeneration();
  const isCurrent = () => isCurrentAccountGeneration(accountToken, ownerStableId);
  if (!isCurrent()) return { applied: 0, skipped: 0, invalid: 0 };

  const cloudSync = await import('../cloud_sync');
  const authStableId = await cloudSync.ensureAnonUser().catch(() => null);
  if (authStableId !== ownerStableId) return { applied: 0, skipped: 0, invalid: 0 };
  const linked = await cloudSync.ensureStableAuthLinkForStableId(ownerStableId).catch(() => false);
  if (!linked) return { applied: 0, skipped: 0, invalid: 0 };

  let applied = 0;
  let skipped = 0;
  let invalid = 0;
  let cursor: any = null;
  while (isCurrent()) {
    let query: any = firestore()
      .collection('users')
      .doc(ownerStableId)
      .collection('external_economy_events')
      .orderBy('createdAtMs', 'asc')
      .orderBy(firestore.FieldPath.documentId(), 'asc')
      .limit(MAX_EVENTS_PER_SYNC);
    if (cursor) query = query.startAfter(cursor);
    const snapshot = await query.get();
    if (!isCurrent()) break;
    if (snapshot.docs.length === 0) break;
    for (const document of snapshot.docs) {
      if (!isCurrent()) break;
      const event = parseEvent(document.data(), ownerStableId);
      if (!event) {
        invalid += 1;
        continue;
      }
      const markerKey = await appliedKey(ownerStableId, event.source, event.eventId);
      const markerExists = await AsyncStorage.getItem(markerKey) !== null;
      const operationExists = await wasConfirmedExternalShardEventApplied(
        ownerStableId,
        event.source,
        event.eventId,
      );
      if (markerExists && operationExists) {
        skipped += 1;
        continue;
      }
      if (markerExists && !operationExists) await AsyncStorage.removeItem(markerKey);

      const result = await commitConfirmedExternalShardEvent({
        expectedOwnerStableId: ownerStableId,
        source: event.source,
        eventId: event.eventId,
        delta: event.delta,
        reason: event.reason,
        grant: {
          kind: event.kind,
          subjectId: event.subjectId,
          payload: event.payload,
        },
      });
      if (result.status !== 'applied' && result.status !== 'already-applied') continue;
      if (!isCurrent()) break;
      await AsyncStorage.setItem(markerKey, JSON.stringify({
        status: result.status,
        requestedDelta: event.delta,
        effectiveDelta: event.delta,
        operationId: result.operation.operationId,
        appliedAtMs: Date.now(),
      }));
      applied += 1;
    }
    cursor = snapshot.docs[snapshot.docs.length - 1];
    if (snapshot.docs.length < MAX_EVENTS_PER_SYNC) break;
  }
  return { applied, skipped, invalid };
}

export async function listConfirmedRevenueCatPurchaseEventsFromCloud(
  ownerStableId: string,
): Promise<readonly ExternalEconomyEvent[]> {
  const owner = String(ownerStableId ?? '').trim();
  if (!CLOUD_SYNC_ENABLED || IS_EXPO_GO || !owner || String(await getStableId()).trim() !== owner) return [];
  const accountToken = captureAccountGeneration();
  if (!isCurrentAccountGeneration(accountToken, owner)) return [];
  const snapshot = await firestore()
    .collection('users')
    .doc(owner)
    .collection('external_economy_events')
    .where('source', '==', 'revenuecat_purchase')
    .limit(200)
    .get();
  if (!isCurrentAccountGeneration(accountToken, owner)) return [];
  return snapshot.docs
    .map((document) => parseEvent(document.data(), owner))
    .filter((event): event is ExternalEconomyEvent => event !== null);
}
