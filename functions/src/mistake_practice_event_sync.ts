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
const STUDY_TARGETS = ['en', 'es', 'fr', 'de', 'it'] as const;
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
  | Readonly<{ action: 'append'; expectedStableUid: string; studyTarget: StudyTarget; events: readonly Record<string, unknown>[]; received: number }>
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
    // зачем (№45, 21.10, решение владельца «останавливаем повторы старых версий»): клиенты 1.6.x кладут в журнал
    // одного языка события другого. Раньше вся пачка отклонялась (event_target_mismatch, 400), старый клиент
    // повторял синк по кругу и каждый раз перечитывал до 50 документов — ≈ треть всех чтений Firestore.
    // Теперь чужие события молча отбрасываются (они живут в журнале своего языка), остальное принимается.
    const target = input.studyTarget as StudyTarget;
    // зачем (Ревизор 22.10): событие без строкового studyTarget раньше проходило фильтр «чужих» и валило всю пачку
    // (event_target_mismatch, 124 из 400 строк [MP-SYNC] за сутки) — клиент повторял её по кругу. Язык такого события
    // не проверить, поэтому оно отбрасывается как чужое; ответ той же формы, что у №45, понимают и старые клиенты.
    const own = input.events.filter((event) => !isRecord(event) || event.studyTarget === target);
    const droppedForeign = input.events.filter((event) => isRecord(event) && typeof event.studyTarget === 'string' &&
      event.studyTarget !== target).length;
    const droppedUntargeted = input.events.length - own.length - droppedForeign;
    if (droppedForeign > 0 || droppedUntargeted > 0) {
      console.info('[MP-SYNC] foreign_dropped', JSON.stringify({ studyTarget: target, received: input.events.length, droppedForeign, droppedUntargeted }));
    }
    return Object.freeze({
      action: 'append',
      expectedStableUid: input.expectedStableUid,
      studyTarget: target,
      events: Object.freeze(own.map((event) => parseEvent(event, target))),
      received: input.events.length,
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

/** Коммит транзакции упал, потому что create наткнулся на существующий документ (gRPC 6 / ALREADY_EXISTS). */
export function isAlreadyExistsError(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  return code === 6 || code === 'already-exists' || code === 'ALREADY_EXISTS' ||
    /ALREADY_EXISTS|already exists/i.test(String((error as Error | null)?.message ?? ''));
}

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
    // зачем (№45): клиенты сверяют appended с размером отправленной пачки — отвечаем полученным числом,
    // иначе старый клиент снова сочтёт ответ ошибкой. Пачка только из чужих событий — без единого чтения.
    if (input.events.length === 0) {
      console.info('[MP-SYNC] append:all_foreign_skip', JSON.stringify({ studyTarget: input.studyTarget, received: input.received }));
      return Object.freeze({ ok: true, appended: input.received });
    }
    const records = input.events.map((event) => materializeMistakePracticeEventRecord({
      stableUid: binding.stableUid,
      studyTarget: input.studyTarget,
      event,
    }));
    const refs = records.map((record) => collection.doc(mistakePracticeEventDocIdForRecord(record)));
    const ownerRef = db.collection('users').doc(binding.stableUid);
    const ownerMapRef = db.collection('account_identity_owner_map').doc(binding.stableUid);
    const assertOwnerStable = (
      ownerSnapshot: admin.firestore.DocumentSnapshot,
      ownerMapSnapshot: admin.firestore.DocumentSnapshot,
    ): string | null => {
      const canonicalOwner = String(ownerMapSnapshot.data()?.canonicalStableId ?? '').trim();
      if (!ownerSnapshot.exists || ownerSnapshot.data()?.identityHidden === true ||
        ownerSnapshot.data()?.mistakePracticeMergePending === true ||
        (ownerMapSnapshot.exists && canonicalOwner !== binding.stableUid)) {
        throw new HttpsError('failed-precondition', 'mistake_practice_owner_transitioned');
      }
      const appVersion = ownerSnapshot.data()?.appVersion;
      return typeof appVersion === 'string' ? appVersion.slice(0, 20) : null;
    };
    // зачем (Ревизор 22.10, ≈23–25 % всех чтений): раньше транзакция читала КАЖДЫЙ документ события ради проверки
    // существования — ~50 тыс. NOT_FOUND в сутки. id события детерминированный, поэтому новые события создаются без
    // чтения; счётчиков и наград по признаку «новое» тут нет. Если хоть одно уже есть, create валит коммит с
    // ALREADY_EXISTS — тогда эта пачка идёт прежним путём со сверкой повтора (конфликт = data-loss).
    let path: 'fast' | 'replay' = 'fast';
    let appVersion: string | null = null;
    try {
      appVersion = await db.runTransaction(async (tx) => {
        const [ownerSnapshot, ownerMapSnapshot] = await Promise.all([tx.get(ownerRef), tx.get(ownerMapRef)]);
        const version = assertOwnerStable(ownerSnapshot, ownerMapSnapshot);
        refs.forEach((ref, index) => tx.create(ref, records[index]));
        return version;
      });
    } catch (error) {
      if (!isAlreadyExistsError(error)) throw error;
      path = 'replay';
      appVersion = await db.runTransaction(async (tx) => {
        const [ownerSnapshot, ownerMapSnapshot, ...snapshots] = await Promise.all([
          tx.get(ownerRef),
          tx.get(ownerMapRef),
          ...refs.map((ref) => tx.get(ref)),
        ]);
        const version = assertOwnerStable(ownerSnapshot, ownerMapSnapshot);
        snapshots.forEach((snapshot, index) => {
          if (snapshot.exists) {
            try { verifyMistakePracticeEventReplay(records[index], snapshot.data()); }
            catch { throw new HttpsError('data-loss', 'mistake_practice_event_conflict'); }
          } else {
            tx.create(refs[index], records[index]);
          }
        });
        return version;
      });
    }
    console.info('[MP-SYNC] append', JSON.stringify({ path, events: records.length, received: input.received, studyTarget: input.studyTarget, appVersion }));
    return Object.freeze({ ok: true, appended: input.received });
  }
  const ownerSnapshot = await db.collection('users').doc(binding.stableUid).get();
  if (!ownerSnapshot.exists || ownerSnapshot.data()?.identityHidden === true ||
    ownerSnapshot.data()?.mistakePracticeMergePending === true) {
    throw new HttpsError('failed-precondition', 'mistake_practice_owner_transitioned');
  }
  // \u0437\u0430\u0447\u0435\u043c (\u00a7CORE-0162, \u0430\u0443\u0434\u0438\u0442 \u0441\u0442\u043e\u0438\u043c\u043e\u0441\u0442\u0438 Firebase, \u043f\u0430\u043a\u0435\u0442 A): \u0440\u0430\u043d\u044c\u0448\u0435 \u0441\u0442\u0440\u0430\u043d\u0438\u0446\u0430 \u043b\u0438\u0441\u0442\u0430\u043b\u0430 \u0412\u0421\u0415 mp_* \u0430\u043a\u043a\u0430\u0443\u043d\u0442\u0430 \u0438 \u043e\u0442\u0441\u0435\u0438\u0432\u0430\u043b\u0430
  // \u044f\u0437\u044b\u043a \u043f\u043e\u0441\u043b\u0435 \u0447\u0442\u0435\u043d\u0438\u044f \u2014 \u043a\u043b\u0438\u0435\u043d\u0442 \u0432\u043e\u0441\u0441\u0442\u0430\u043d\u0430\u0432\u043b\u0438\u0432\u0430\u0435\u0442 5 \u044f\u0437\u044b\u043a\u043e\u0432, \u0438\u0442\u043e\u0433\u043e \u2248 5\u00d7E \u0447\u0442\u0435\u043d\u0438\u0439. \u0422\u0435\u043f\u0435\u0440\u044c \u044f\u0437\u044b\u043a \u0444\u0438\u043b\u044c\u0442\u0440\u0443\u0435\u0442 \u0441\u0430\u043c \u0437\u0430\u043f\u0440\u043e\u0441
  // (\u043e\u0434\u043d\u043e\u043f\u043e\u043b\u044c\u043d\u044b\u0439 \u0438\u043d\u0434\u0435\u043a\u0441 studyTarget + \u043f\u043e\u0440\u044f\u0434\u043e\u043a \u043f\u043e id). \u041a\u0443\u0440\u0441\u043e\u0440 \u2014 \u043f\u043e-\u043f\u0440\u0435\u0436\u043d\u0435\u043c\u0443 id \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430, \u043e\u0442\u0432\u0435\u0442 \u0442\u043e\u0439 \u0436\u0435 \u0444\u043e\u0440\u043c\u044b:
  // \u0441\u0442\u0430\u0440\u044b\u0435 \u0441\u0431\u043e\u0440\u043a\u0438 (1.6.24) \u043b\u0438\u0441\u0442\u0430\u044e\u0442 \u0442\u0430\u043a \u0436\u0435. \u041d\u0435\u0442 \u0438\u043d\u0434\u0435\u043a\u0441\u0430 (FAILED_PRECONDITION) \u2014 \u043f\u0440\u0435\u0436\u043d\u0438\u0439 \u0437\u0430\u043f\u0440\u043e\u0441, \u0431\u0435\u0437 \u043f\u043e\u043b\u043e\u043c\u043a\u0438.
  const buildQuery = (byTarget: boolean) => {
    let query = byTarget ? collection.where('studyTarget', '==', input.studyTarget) : collection;
    query = query.orderBy(admin.firestore.FieldPath.documentId()).startAt('mp_').endBefore('mp_\uf8ff');
    if (input.cursor) query = query.startAfter(input.cursor);
    return query.limit(MISTAKE_PRACTICE_EVENT_PAGE_MAX);
  };
  let snapshot: admin.firestore.QuerySnapshot;
  try {
    snapshot = await buildQuery(true).get();
  } catch (error) {
    const code = String((error as { code?: unknown })?.code ?? '');
    if (code !== '9' && code !== 'failed-precondition' && !/FAILED_PRECONDITION|index/i.test(String((error as Error)?.message ?? ''))) throw error;
    console.warn('[MP-SYNC] list:target_filter_unavailable', JSON.stringify({ studyTarget: input.studyTarget, code }));
    snapshot = await buildQuery(false).get();
  }
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
