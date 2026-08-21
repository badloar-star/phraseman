import * as admin from 'firebase-admin';
import { createHash } from 'crypto';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { HOT_CALLABLE_OPTIONS } from './callable_options';
import {
  normalizeProgressAuthUid,
  readProgressAccountBinding,
  type ProgressAccountBinding,
} from './learning_v2/progress_event_callable';
import { canonicalJsonV1 } from '../../modules/learning-v2/policies/decision_registry';

export const MISTAKE_PRACTICE_EVENT_PAGE_MAX = 50;
const EVENT_MAX_CHARS = 32_000;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const TYPES = new Set(['captured', 'hint_used', 'practice_answered', 'hidden', 'restored', 'content_unavailable', 'correction_rewarded']);

type StudyTarget = 'en' | 'fr';
type EventRecord = Readonly<{
  schemaVersion: 'mistake-practice-event-record.v1';
  recordKind: 'mistake_practice_event';
  ownerStableUid: string;
  studyTarget: StudyTarget;
  event: Record<string, unknown>;
  eventFingerprint: string;
}>;
type SyncRequest =
  | Readonly<{ action: 'append'; expectedStableUid: string; studyTarget: StudyTarget; events: readonly Record<string, unknown>[] }>
  | Readonly<{ action: 'list'; expectedStableUid: string; studyTarget: StudyTarget; cursor: string | null }>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const exact = (value: Record<string, unknown>, keys: readonly string[]) =>
  Reflect.ownKeys(value).length === keys.length && Reflect.ownKeys(value).every((key) =>
    typeof key === 'string' && keys.includes(key));
const fail = (): never => { throw new Error('mistake_practice_event_sync_invalid'); };
const fingerprint = (value: unknown): string =>
  createHash('sha256').update(canonicalJsonV1(value), 'utf8').digest('hex');

function parseEvent(input: unknown, target: StudyTarget): Record<string, unknown> {
  if (!isRecord(input) || !exact(input, [
    'eventId', 'mistakeId', 'cycleId', 'type', 'occurredAtMs', 'studyTarget', 'payload',
  ]) || typeof input.eventId !== 'string' || !ID.test(input.eventId) ||
    typeof input.mistakeId !== 'string' || !ID.test(input.mistakeId) ||
    typeof input.cycleId !== 'string' || !ID.test(input.cycleId) ||
    typeof input.type !== 'string' || !TYPES.has(input.type) ||
    !Number.isSafeInteger(input.occurredAtMs) || input.studyTarget !== target ||
    !isRecord(input.payload)) return fail();
  const detached = JSON.parse(canonicalJsonV1(input)) as Record<string, unknown>;
  if (canonicalJsonV1(detached).length > EVENT_MAX_CHARS) return fail();
  return Object.freeze(detached);
}

export function parseMistakePracticeEventSyncRequest(input: unknown): SyncRequest {
  if (!isRecord(input) || (input.studyTarget !== 'en' && input.studyTarget !== 'fr') ||
    typeof input.expectedStableUid !== 'string' || !ID.test(input.expectedStableUid)) return fail();
  if (input.action === 'append' && exact(input, ['action', 'expectedStableUid', 'studyTarget', 'events']) &&
    Array.isArray(input.events) && input.events.length > 0 &&
    input.events.length <= MISTAKE_PRACTICE_EVENT_PAGE_MAX) {
    return Object.freeze({
      action: 'append',
      expectedStableUid: input.expectedStableUid,
      studyTarget: input.studyTarget,
      events: Object.freeze(input.events.map((event) => parseEvent(event, input.studyTarget as StudyTarget))),
    });
  }
  if (input.action === 'list' && exact(input, ['action', 'expectedStableUid', 'studyTarget', 'cursor']) &&
    (input.cursor === null || (typeof input.cursor === 'string' && /^mp_[a-f0-9]{64}$/.test(input.cursor)))) {
    return Object.freeze({ action: 'list', expectedStableUid: input.expectedStableUid, studyTarget: input.studyTarget, cursor: input.cursor });
  }
  return fail();
}

export function materializeMistakePracticeEventRecord(input: Readonly<{
  stableUid: string;
  studyTarget: StudyTarget;
  event: unknown;
}>): EventRecord {
  if (!ID.test(input.stableUid)) return fail();
  const event = parseEvent(input.event, input.studyTarget);
  return Object.freeze({
    schemaVersion: 'mistake-practice-event-record.v1',
    recordKind: 'mistake_practice_event',
    ownerStableUid: input.stableUid,
    studyTarget: input.studyTarget,
    event,
    eventFingerprint: fingerprint(event),
  });
}

export function verifyMistakePracticeEventReplay(
  expected: EventRecord,
  stored: unknown,
): EventRecord {
  if (!isRecord(stored) || canonicalJsonV1(stored) !== canonicalJsonV1(expected)) {
    throw new Error('mistake_practice_event_conflict');
  }
  return expected;
}

export const mistakePracticeEventDocIdForRecord = (record: EventRecord): string => `mp_${fingerprint({
  ownerStableUid: record.ownerStableUid,
  studyTarget: record.studyTarget,
  eventId: record.event.eventId,
})}`;

export function assertMistakePracticeExpectedOwner(expectedStableUid: string, actualStableUid: string): void {
  if (expectedStableUid !== actualStableUid) {
    throw new HttpsError('permission-denied', 'mistake_practice_owner_mismatch');
  }
}

type FirestoreLike = Pick<admin.firestore.Firestore, 'collection' | 'runTransaction'>;

export function createMistakePracticeEventSyncHandler(dependencies: Readonly<{
  db?: FirestoreLike;
  resolveAccountBinding?: (authUid: string) => Promise<ProgressAccountBinding>;
}> = {}) {
  const db = dependencies.db ?? admin.firestore();
  const resolveBinding = dependencies.resolveAccountBinding
    ?? ((authUid: string) => readProgressAccountBinding(db as admin.firestore.Firestore, authUid));
  return async (request: { readonly data: unknown; readonly auth?: { readonly uid?: unknown } | null }) => {
  const authUid = normalizeProgressAuthUid(request.auth?.uid);
  let input: SyncRequest;
  try { input = parseMistakePracticeEventSyncRequest(request.data); }
  catch { throw new HttpsError('invalid-argument', 'mistake_practice_event_sync_invalid'); }
  const binding = await resolveBinding(authUid);
  assertMistakePracticeExpectedOwner(input.expectedStableUid, binding.stableUid);
  const collection = db.collection('users').doc(binding.stableUid).collection('progress_events');
  if (input.action === 'append') {
    const records = input.events.map((event) => materializeMistakePracticeEventRecord({
      stableUid: binding.stableUid,
      studyTarget: input.studyTarget,
      event,
    }));
    await db.runTransaction(async (tx) => {
      const refs = records.map((record) => collection.doc(mistakePracticeEventDocIdForRecord(record)));
      const ownerRef = db.collection('users').doc(binding.stableUid);
      const ownerMapRef = db.collection('account_identity_owner_map').doc(binding.stableUid);
      const [ownerSnapshot, ownerMapSnapshot, ...snapshots] = await Promise.all([
        tx.get(ownerRef),
        tx.get(ownerMapRef),
        ...refs.map((ref) => tx.get(ref)),
      ]);
      const canonicalOwner = String(ownerMapSnapshot.data()?.canonicalStableId ?? '').trim();
      if (!ownerSnapshot.exists || ownerSnapshot.data()?.identityHidden === true ||
        ownerSnapshot.data()?.mistakePracticeMergePending === true ||
        (ownerMapSnapshot.exists && canonicalOwner !== binding.stableUid)) {
        throw new HttpsError('failed-precondition', 'mistake_practice_owner_transitioned');
      }
      snapshots.forEach((snapshot, index) => {
        if (snapshot.exists) {
          try { verifyMistakePracticeEventReplay(records[index], snapshot.data()); }
          catch { throw new HttpsError('data-loss', 'mistake_practice_event_conflict'); }
        } else {
          tx.create(refs[index], records[index]);
        }
      });
    });
    return Object.freeze({ ok: true, appended: records.length });
  }
  const ownerSnapshot = await db.collection('users').doc(binding.stableUid).get();
  if (!ownerSnapshot.exists || ownerSnapshot.data()?.identityHidden === true ||
    ownerSnapshot.data()?.mistakePracticeMergePending === true) {
    throw new HttpsError('failed-precondition', 'mistake_practice_owner_transitioned');
  }
  let query = collection.orderBy(admin.firestore.FieldPath.documentId())
    .startAt('mp_').endBefore('mp_\uf8ff');
  if (input.cursor) query = query.startAfter(input.cursor);
  const snapshot = await query.limit(MISTAKE_PRACTICE_EVENT_PAGE_MAX).get();
  const events: Record<string, unknown>[] = [];
  for (const doc of snapshot.docs) {
    const value = doc.data();
    if (value?.recordKind !== 'mistake_practice_event' ||
      value?.ownerStableUid !== binding.stableUid || value?.studyTarget !== input.studyTarget) continue;
    const expected = materializeMistakePracticeEventRecord({
      stableUid: binding.stableUid,
      studyTarget: input.studyTarget,
      event: value.event,
    });
    verifyMistakePracticeEventReplay(expected, value);
    events.push(expected.event);
  }
  return Object.freeze({
    ok: true,
    events: Object.freeze(events),
    cursor: snapshot.docs.length === MISTAKE_PRACTICE_EVENT_PAGE_MAX
      ? snapshot.docs.at(-1)?.id ?? null
      : null,
  });
  };
}

export const mistakePracticeSyncEvents = onCall(
  HOT_CALLABLE_OPTIONS,
  async (request) => createMistakePracticeEventSyncHandler()(request),
);
