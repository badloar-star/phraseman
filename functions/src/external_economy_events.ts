import { createHash } from 'crypto';

export const EXTERNAL_ECONOMY_EVENT_SCHEMA = 'external-economy-event.v1' as const;

export type ExternalEconomyEventInput = Readonly<{
  source: string;
  eventId: string;
  ownerStableId: string;
  delta: number;
  reason: string;
  kind: string;
  subjectId: string;
  payload?: Record<string, unknown>;
  createdAtMs?: number;
}>;

function requireToken(value: string, field: string, maxLength: number): string {
  const clean = String(value ?? '').trim();
  if (!clean || clean.length > maxLength) throw new Error(`invalid_external_event_${field}`);
  return clean;
}

export function externalEconomyEventDocumentId(source: string, eventId: string): string {
  const identity = `${requireToken(source, 'source', 64)}:${requireToken(eventId, 'id', 512)}`;
  return createHash('sha256').update(identity).digest('hex');
}

/**
 * Append a confirmed outside-world fact. This document is not a wallet and
 * never contains a server-computed personal balance.
 */
export function appendExternalEconomyEvent(
  transaction: FirebaseFirestore.Transaction,
  userRef: FirebaseFirestore.DocumentReference,
  input: ExternalEconomyEventInput,
): FirebaseFirestore.DocumentReference {
  const source = requireToken(input.source, 'source', 64);
  const eventId = requireToken(input.eventId, 'id', 512);
  const ownerStableId = requireToken(input.ownerStableId, 'owner', 256);
  const reason = requireToken(input.reason, 'reason', 64);
  const kind = requireToken(input.kind, 'kind', 160);
  const subjectId = requireToken(input.subjectId, 'subject', 160);
  if (!Number.isSafeInteger(input.delta) || input.delta === 0) {
    throw new Error('invalid_external_event_delta');
  }
  if (typeof userRef.id === 'string' && userRef.id && userRef.id !== ownerStableId) {
    throw new Error('external_event_owner_mismatch');
  }
  const createdAtMs = Number.isSafeInteger(input.createdAtMs) && Number(input.createdAtMs) > 0
    ? Number(input.createdAtMs)
    : Date.now();
  const ref = userRef.collection('external_economy_events')
    .doc(externalEconomyEventDocumentId(source, eventId));
  transaction.create(ref, {
    schemaVersion: EXTERNAL_ECONOMY_EVENT_SCHEMA,
    source,
    eventId,
    ownerStableId,
    delta: input.delta,
    reason,
    kind,
    subjectId,
    payload: input.payload ?? {},
    createdAtMs,
  });
  return ref;
}
