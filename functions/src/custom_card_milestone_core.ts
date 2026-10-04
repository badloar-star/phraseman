import { createHash } from 'node:crypto';
import {
  adminAlertEventId,
  buildAdminAlertOutboxDocument,
} from './admin_alert_outbox';

const CUSTOM_CARD_MILESTONE = 1_500;
const SOURCE = 'custom_cards.milestone';
const STUDY_LANGUAGES = new Set(['en', 'es', 'fr', 'de', 'it']);

export type CustomCardMilestoneErrorCode =
  | 'unauthenticated'
  | 'permission-denied'
  | 'invalid-argument';

export class CustomCardMilestoneRequestError extends Error {
  constructor(readonly code: CustomCardMilestoneErrorCode) {
    super(code);
    this.name = 'CustomCardMilestoneRequestError';
  }
}

export interface CustomCardMilestoneStore {
  /** Atomically creates the event, returning false when it already exists. */
  createIfAbsent(
    eventId: string,
    document: Readonly<Record<string, unknown>>,
  ): Promise<boolean>;
}

type ValidatedRequest = Readonly<{
  authUid: string;
  count: number;
  language: 'en' | 'es' | 'fr' | 'de' | 'it';
}>;

function boundedUid(value: unknown): string | null {
  if (typeof value !== 'string' || value.length < 1 || value.length > 128) return null;
  if (value.trim() !== value || /[\u0000-\u001f\u007f]/u.test(value)) return null;
  return value;
}

function validateRequest(authUidValue: string | null, data: unknown): ValidatedRequest {
  const authUid = boundedUid(authUidValue);
  if (!authUid) throw new CustomCardMilestoneRequestError('unauthenticated');
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new CustomCardMilestoneRequestError('invalid-argument');
  }
  const input = data as Record<string, unknown>;
  const expectedOwnerUid = boundedUid(input.expectedOwnerUid);
  if (!expectedOwnerUid) throw new CustomCardMilestoneRequestError('invalid-argument');
  // Attempt-only binding: if RNFirebase executes after an A→B auth switch,
  // reject before deriving an event id or touching Firestore.
  if (expectedOwnerUid !== authUid) {
    throw new CustomCardMilestoneRequestError('permission-denied');
  }

  const count = Number(input.count);
  const language = String(input.language ?? '');
  if (!Number.isSafeInteger(count) || count < CUSTOM_CARD_MILESTONE) {
    throw new CustomCardMilestoneRequestError('invalid-argument');
  }
  if (!STUDY_LANGUAGES.has(language)) {
    throw new CustomCardMilestoneRequestError('invalid-argument');
  }
  return { authUid, count, language: language as ValidatedRequest['language'] };
}

function milestoneSourceId(authUid: string, language: string): string {
  return createHash('sha256')
    .update(`${authUid}\n${language}\n${CUSTOM_CARD_MILESTONE}`, 'utf8')
    .digest('hex')
    .slice(0, 48);
}

/**
 * Authenticates and atomically deduplicates one owner-only milestone signal.
 * No UID, binder, card content, or contact data enters the persisted event.
 */
export async function recordCustomCardMilestone(
  input: Readonly<{
    authUid: string | null;
    data: unknown;
    nowMs: number;
  }>,
  store: CustomCardMilestoneStore,
): Promise<Readonly<{ accepted: true; duplicate: boolean }>> {
  const request = validateRequest(input.authUid, input.data);
  const sourceId = milestoneSourceId(request.authUid, request.language);
  const eventId = adminAlertEventId(SOURCE, sourceId);
  const document = buildAdminAlertOutboxDocument({
    eventType: 'customCardMilestone',
    source: SOURCE,
    sourceId,
    occurredAtMs: input.nowMs,
    payload: {
      count: request.count,
      language: request.language,
    },
  }, input.nowMs);
  const created = await store.createIfAbsent(eventId, document);
  return Object.freeze({ accepted: true, duplicate: !created });
}
