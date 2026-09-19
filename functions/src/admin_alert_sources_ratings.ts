import * as admin from 'firebase-admin';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { enqueueAdminAlert, type EnqueueAdminAlertInput } from './admin_alert_outbox';

const REGION = 'us-central1';

type Row = Readonly<Record<string, unknown>>;

const KIND_META = Object.freeze({
  lesson: { eventType: 'lessonRating', category: 'Урок' },
  learning_v2: { eventType: 'lessonRating', category: 'Learning V2' },
  vocab: { eventType: 'vocabDialogueRating', category: 'Словарь' },
  dialogue: { eventType: 'vocabDialogueRating', category: 'Диалог' },
  arena_blitz: { eventType: 'arenaRating', category: 'Arena Blitz' },
  arena_rating: { eventType: 'arenaRating', category: 'Arena Rating' },
} as const);

function last4(value: unknown): string {
  return String(value ?? '').replace(/[^A-Za-z0-9]/g, '').slice(-4);
}

function timestampMs(value: unknown, fallback: number): number {
  const numberValue = Number(value);
  if (Number.isFinite(numberValue) && numberValue > 0) return Math.floor(numberValue);
  if (value && typeof value === 'object' && 'toMillis' in value) {
    const toMillis = (value as { toMillis?: unknown }).toMillis;
    if (typeof toMillis === 'function') {
      const result = Number(toMillis.call(value));
      if (Number.isFinite(result) && result > 0) return Math.floor(result);
    }
  }
  return Math.floor(fallback);
}

export function feedbackRatingAlertFromCreate(input: {
  readonly feedbackId: string;
  readonly data: Row;
  readonly nowMs: number;
}): EnqueueAdminAlertInput | null {
  const meta = KIND_META[String(input.data.kind ?? '') as keyof typeof KIND_META];
  const rating = Math.round(Number(input.data.rating));
  const hasRating = Number.isFinite(rating) && rating >= 1 && rating <= 5;
  const hasText = typeof input.data.message === 'string' && input.data.message.trim().length >= 2;
  if (!input.feedbackId || !meta || (!hasRating && !hasText)) return null;
  return {
    eventType: meta.eventType,
    source: 'feedback.rating',
    sourceId: input.feedbackId,
    occurredAtMs: timestampMs(input.data.createdAtMs ?? input.data.serverCreatedAt, input.nowMs),
    payload: {
      ...(hasRating ? { rating } : {}),
      category: meta.category,
      uidLast4: last4(input.data.uid),
      route: '#max-feedback',
    },
  };
}

export const adminAlertOnFeedbackCreated = onDocumentCreated(
  { document: 'feedback_entries/{feedbackId}', region: REGION, retry: true },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;
    const alert = feedbackRatingAlertFromCreate({
      feedbackId: String(event.params.feedbackId ?? ''),
      data: (snapshot.data() ?? {}) as Row,
      nowMs: Date.now(),
    });
    if (alert) await enqueueAdminAlert(admin.firestore(), alert);
  },
);
