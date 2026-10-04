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

/**
 * зачем (22.09): здесь стояло `'en' | 'fr'` — НЕЗАВИСИМАЯ копия клиентского
 * ограничения, не связанная с ним типами. Пока она узкая, синхронизация ошибок
 * для испанского и немецкого отвечает `mistake_practice_event_sync_invalid`
 * даже после починки клиента. Список обязан совпадать с MISTAKE_STUDY_TARGETS
 * в modules/mistake-practice/contracts.ts — сервер не импортирует клиентский
 * код, поэтому связь держится сторожем, а не типом.
 */
/** Предел длины ответа ученика (зеркало клиентского MISTAKE_GIVEN_MAX_CHARS). */
export const MISTAKE_GIVEN_MAX_CHARS = 200;
const STUDY_TARGETS = ['en', 'es', 'fr', 'de'] as const;
type StudyTarget = (typeof STUDY_TARGETS)[number];
const isStudyTarget = (value: unknown): value is StudyTarget =>
  typeof value === 'string' && (STUDY_TARGETS as readonly string[]).includes(value);
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
// зачем (§126 п.9, 04.10): ~половина вызовов отвечала 400, а немой catch не говорил, ЧТО не прошло разбор.
// Ошибка та же (клиент видит прежний invalid-argument), но несёт причину для журнала.
const fail = (reason: string): never => {
  const error = new Error('mistake_practice_event_sync_invalid') as Error & { reason?: string };
  error.reason = reason;
  throw error;
};
const fingerprint = (value: unknown): string =>
  createHash('sha256').update(canonicalJsonV1(value), 'utf8').digest('hex');

function parseEvent(input: unknown, target: StudyTarget): Record<string, unknown> {
  if (!isRecord(input)) return fail('event_shape:not_object');
  if (!exact(input, [
    'eventId', 'mistakeId', 'cycleId', 'type', 'occurredAtMs', 'studyTarget', 'payload',
  ])) return fail(`event_shape:keys:${Object.keys(input).sort().join(',').slice(0, 120)}`);
  if (typeof input.eventId !== 'string' || !ID.test(input.eventId)) return fail('event_shape:eventId');
  if (typeof input.mistakeId !== 'string' || !ID.test(input.mistakeId)) return fail('event_shape:mistakeId');
  if (typeof input.cycleId !== 'string' || !ID.test(input.cycleId)) return fail('event_shape:cycleId');
  if (typeof input.type !== 'string' || !TYPES.has(input.type)) return fail(`event_shape:type:${String(input.type).slice(0, 40)}`);
  if (!Number.isSafeInteger(input.occurredAtMs)) return fail('event_shape:occurredAtMs');
  if (input.studyTarget !== target) return fail('event_target_mismatch');
  if (!isRecord(input.payload)) return fail('event_shape:payload');
  const detached = JSON.parse(canonicalJsonV1(input)) as Record<string, unknown>;
  // зачем (04.10, решение координатора — вариант А): ответ ученика (payload.given) хранится в облаке;
  // старые клиенты не режут его — ограничиваем 200 знаками при приёме.
  const detachedPayload = detached.payload as Record<string, unknown>;
  if (typeof detachedPayload.given === 'string' && detachedPayload.given.length > MISTAKE_GIVEN_MAX_CHARS) {
    console.info('[MISTAKE-SYNC] given_truncated', JSON.stringify({ chars: detachedPayload.given.length }));
    detachedPayload.given = detachedPayload.given.slice(0, MISTAKE_GIVEN_MAX_CHARS);
  }
  if (canonicalJsonV1(detached).length > EVENT_MAX_CHARS) return fail('event_too_large');
  return Object.freeze(detached);
}

export function parseMistakePracticeEventSyncRequest(input: unknown): SyncRequest {
  if (!isRecord(input) || !isStudyTarget(input.studyTarget) ||
    typeof input.expectedStableUid !== 'string' || !ID.test(input.expectedStableUid)) {
    return fail(isRecord(input) && !isStudyTarget(input.studyTarget)
      ? `request_shape:studyTarget:${String(input.studyTarget).slice(0, 12)}`
      : 'request_shape');
  }
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
  if (input.action === 'append') {
    return fail(Array.isArray(input.events)
      ? `append_shape:events=${input.events.length}`
      : 'append_shape:keys');
  }
  return fail(input.action === 'list' ? 'list_shape' : `action_shape:${String(input.action).slice(0, 20)}`);
}

export function materializeMistakePracticeEventRecord(input: Readonly<{
  stableUid: string;
  studyTarget: StudyTarget;
  event: unknown;
}>): EventRecord {
  if (!ID.test(input.stableUid)) return fail('record_uid');
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
  catch (error) {
    const raw = isRecord(request.data) ? request.data : {};
    console.warn('[MP-SYNC] invalid', JSON.stringify({
      reason: (error as { reason?: string })?.reason ?? String((error as Error)?.message ?? error).slice(0, 80),
      studyTarget: typeof raw.studyTarget === 'string' ? raw.studyTarget.slice(0, 12) : null,
      action: typeof raw.action === 'string' ? raw.action.slice(0, 12) : null,
      events: Array.isArray(raw.events) ? raw.events.length : null,
      requestChars: (() => { try { return JSON.stringify(request.data).length; } catch { return -1; } })(),
    }));
    throw new HttpsError('invalid-argument', 'mistake_practice_event_sync_invalid');
  }
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
