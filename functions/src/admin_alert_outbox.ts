import { type AdminAlertType, isAdminAlertType } from './admin_alert_catalog';
import { sanitizeAdminAlertPayload, type AdminAlertSafePayload } from './admin_alert_privacy';

export const ADMIN_ALERT_EVENTS_COLLECTION = 'admin_alert_events';

export interface AdminAlertOutboxDocumentReference {
  create(data: Record<string, unknown>): Promise<unknown>;
}

export interface AdminAlertOutboxCollectionReference {
  doc(id: string): AdminAlertOutboxDocumentReference;
}

export interface AdminAlertOutboxDb {
  collection(name: string): AdminAlertOutboxCollectionReference;
}

export interface EnqueueAdminAlertInput {
  readonly eventType: AdminAlertType;
  readonly source: string;
  readonly sourceId: string;
  readonly occurredAtMs: number;
  readonly payload: AdminAlertSafePayload;
}

export interface EnqueueAdminAlertResult {
  readonly created: boolean;
  readonly eventId: string;
}

const SOURCE_RE = /^[a-z][a-z0-9._-]{0,79}$/;
const SOURCE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,299}$/;

export function adminAlertEventId(source: string, sourceId: string): string {
  if (!SOURCE_RE.test(source)) throw new Error('invalid_admin_alert_source');
  if (!SOURCE_ID_RE.test(sourceId)) throw new Error('invalid_admin_alert_source_id');
  const eventId = `${source}:${sourceId}`;
  if (eventId.length > 480) throw new Error('admin_alert_event_id_too_long');
  return eventId;
}

function isAlreadyExistsError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const candidate = error as { code?: unknown; message?: unknown };
  return candidate.code === 6
    || candidate.code === 'already-exists'
    || /already exists/i.test(String(candidate.message ?? ''));
}

export function buildAdminAlertOutboxDocument(
  input: EnqueueAdminAlertInput,
  nowMs = Date.now(),
): Readonly<Record<string, unknown>> {
  if (!isAdminAlertType(input.eventType)) throw new Error('invalid_admin_alert_type');
  if (!Number.isFinite(input.occurredAtMs) || input.occurredAtMs <= 0) {
    throw new Error('invalid_admin_alert_occurred_at');
  }
  if (!Number.isFinite(nowMs) || nowMs <= 0) throw new Error('invalid_admin_alert_created_at');

  adminAlertEventId(input.source, input.sourceId);
  const payload = sanitizeAdminAlertPayload(input.eventType, input.payload);
  return Object.freeze({
    schemaVersion: 1,
    eventType: input.eventType,
    source: input.source,
    sourceId: input.sourceId,
    occurredAtMs: Math.floor(input.occurredAtMs),
    payload,
    status: 'pending',
    attempts: 0,
    createdAtMs: Math.floor(nowMs),
    updatedAtMs: Math.floor(nowMs),
  });
}

export async function enqueueAdminAlert(
  db: AdminAlertOutboxDb,
  input: EnqueueAdminAlertInput,
  nowMs = Date.now(),
): Promise<EnqueueAdminAlertResult> {
  const document = buildAdminAlertOutboxDocument(input, nowMs);
  const eventId = adminAlertEventId(input.source, input.sourceId);
  try {
    await db.collection(ADMIN_ALERT_EVENTS_COLLECTION).doc(eventId).create(document);
    return Object.freeze({ created: true, eventId });
  } catch (error) {
    if (isAlreadyExistsError(error)) return Object.freeze({ created: false, eventId });
    throw error;
  }
}
