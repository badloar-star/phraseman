import { createHash } from 'node:crypto';
import type { DocumentReference, DocumentSnapshot, Transaction } from 'firebase-admin/firestore';

export type PersonalExternalEvent = Readonly<{
  schemaVersion: 'personal-external-event.v1';
  stableUid: string;
  eventId: string;
  serverSequence: number;
  domain: string;
  kind: string;
  payload: unknown;
  createdAtMs: number;
  fingerprint: string;
}>;

export type PersonalExternalEventInput = Omit<
  PersonalExternalEvent,
  'serverSequence' | 'fingerprint'
>;

const EVENT_ID_PATTERN = /^[A-Za-z0-9_:-]{1,160}$/;
const MAX_CANONICAL_EVENT_BYTES = 64 * 1024;

function canonicalJson(value: unknown): string {
  const active = new WeakSet<object>();
  const visit = (current: unknown): unknown => {
    if (
      current === null
      || typeof current === 'string'
      || typeof current === 'boolean'
    ) {
      return current;
    }
    if (typeof current === 'number') {
      if (!Number.isFinite(current)) {
        throw new Error('personal_external_event_invalid');
      }
      return current;
    }
    if (typeof current !== 'object' || active.has(current)) {
      throw new Error('personal_external_event_invalid');
    }
    active.add(current);
    try {
      if (Array.isArray(current)) {
        return current.map(visit);
      }
      if (Object.getPrototypeOf(current) !== Object.prototype) {
        throw new Error('personal_external_event_invalid');
      }
      return Object.fromEntries(
        Object.keys(current)
          .sort((left, right) => left.localeCompare(right))
          .map((key) => [key, visit((current as Record<string, unknown>)[key])]),
      );
    } finally {
      active.delete(current);
    }
  };
  const canonical = JSON.stringify(visit(value));
  if (Buffer.byteLength(canonical, 'utf8') > MAX_CANONICAL_EVENT_BYTES) {
    throw new Error('personal_external_event_invalid');
  }
  return canonical;
}

function eventFingerprint(
  event: Omit<PersonalExternalEvent, 'fingerprint'>,
): string {
  return createHash('sha256').update(canonicalJson(event), 'utf8').digest('hex');
}

function validateInput(
  userRef: DocumentReference,
  input: PersonalExternalEventInput,
): void {
  if (input.stableUid !== userRef.id) {
    throw new Error('personal_external_event_scope_invalid');
  }
  if (
    input.schemaVersion !== 'personal-external-event.v1'
    || !EVENT_ID_PATTERN.test(input.eventId)
    || typeof input.domain !== 'string'
    || input.domain.length === 0
    || input.domain.length > 100
    || typeof input.kind !== 'string'
    || input.kind.length === 0
    || input.kind.length > 100
    || !Number.isSafeInteger(input.createdAtMs)
    || input.createdAtMs < 0
  ) {
    throw new Error('personal_external_event_invalid');
  }
  canonicalJson(input.payload);
}

function storedEvent(
  snapshot: DocumentSnapshot,
): PersonalExternalEvent | null {
  if (!snapshot.exists) {
    return null;
  }
  const value = snapshot.data();
  if (
    value?.schemaVersion !== 'personal-external-event.v1'
    || typeof value.stableUid !== 'string'
    || typeof value.eventId !== 'string'
    || !Number.isSafeInteger(value.serverSequence)
    || value.serverSequence < 1
    || typeof value.domain !== 'string'
    || typeof value.kind !== 'string'
    || !Number.isSafeInteger(value.createdAtMs)
    || typeof value.fingerprint !== 'string'
  ) {
    throw new Error('personal_external_event_corrupt');
  }
  return value as PersonalExternalEvent;
}

export async function appendPersonalExternalEvent(
  tx: Transaction,
  userRef: DocumentReference,
  input: PersonalExternalEventInput,
): Promise<Readonly<{ event: PersonalExternalEvent; duplicate: boolean }>> {
  validateInput(userRef, input);
  const eventRef = userRef.collection('personal_external_events').doc(input.eventId);
  const existing = storedEvent(await tx.get(eventRef));
  if (existing) {
    const candidateBody: Omit<PersonalExternalEvent, 'fingerprint'> = {
      ...input,
      serverSequence: existing.serverSequence,
    };
    if (
      existing.stableUid !== input.stableUid
      || existing.eventId !== input.eventId
      || existing.fingerprint !== eventFingerprint(candidateBody)
    ) {
      throw new Error('personal_external_event_id_conflict');
    }
    return Object.freeze({ event: existing, duplicate: true });
  }

  const headRef = userRef.collection('personal_sync_server_state').doc('external_head');
  const headSnapshot = await tx.get(headRef);
  const latestSequence = headSnapshot.exists
    ? headSnapshot.data()?.latestSequence
    : 0;
  if (
    !Number.isSafeInteger(latestSequence)
    || latestSequence < 0
    || !Number.isSafeInteger(latestSequence + 1)
  ) {
    throw new Error('personal_external_event_head_corrupt');
  }

  const body: Omit<PersonalExternalEvent, 'fingerprint'> = {
    ...input,
    serverSequence: latestSequence + 1,
  };
  const event: PersonalExternalEvent = Object.freeze({
    ...body,
    fingerprint: eventFingerprint(body),
  });
  tx.set(headRef, {
    latestSequence: event.serverSequence,
    updatedAtMs: input.createdAtMs,
  });
  tx.create(eventRef, event);
  return Object.freeze({ event, duplicate: false });
}
