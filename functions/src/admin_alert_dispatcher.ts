import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import { defineSecret } from 'firebase-functions/params';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { adminAlertDefinition, isAdminAlertType, type AdminAlertType } from './admin_alert_catalog';
import { renderAdminAlertMessages, sanitizeAdminAlertPayload, type AdminAlertSafePayload } from './admin_alert_privacy';
import { enrichAdminAlertContext } from './admin_alert_context';
import { materializeDailyDigestPayload } from './admin_alert_daily_counts';
import { ADMIN_ALERT_EVENTS_COLLECTION } from './admin_alert_outbox';

const REGION = 'us-central1';
const LEASE_MS = 60_000;
const RECOVERY_LIMIT = 25;
// Bump when Telegram markup changes. Pending events that have not sent a part
// yet can be safely re-rendered; partially delivered events keep their frozen
// snapshot so a retry never mixes two formats in one alert.
// v4 (2026-09-13): у каждого типа свой шаблон — шапка-герой, тон и порядок
// блоков. Bump обязателен: иначе ретрай события, отрисованного v3, смешал бы
// две раскладки в одном письме.
const TELEGRAM_FORMAT_VERSION = 4;

export const ADMIN_ALERT_DISPATCH_BOT_TOKEN = defineSecret('ADMIN_ALERT_BOT_TOKEN');

export interface AdminAlertDeliveryConfig {
  readonly enabled: boolean;
  readonly chatId: string;
  readonly types: Readonly<Record<string, boolean>>;
}

export interface AdminAlertOutboxEvent {
  readonly eventId: string;
  readonly eventType: AdminAlertType;
  readonly occurredAtMs: number;
  readonly payload: AdminAlertSafePayload;
  readonly attempts: number;
  readonly source?: string;
  readonly sourceId?: string;
}

export interface AdminAlertMessageBatch {
  readonly messages: readonly string[];
  readonly nextPartIndex: number;
  readonly lastMessageId?: number;
}

export interface AdminAlertClaimState {
  readonly status?: unknown;
  readonly nextAttemptAtMs?: unknown;
  readonly leaseUntilMs?: unknown;
}

export interface AdminAlertDeliveryStore {
  claim(eventId: string, nowMs: number): Promise<AdminAlertOutboxEvent | null>;
  loadConfig(): Promise<AdminAlertDeliveryConfig>;
  prepareMessages?(event: AdminAlertOutboxEvent): Promise<AdminAlertMessageBatch>;
  renewLease?(eventId: string, attempt: number, nowMs: number): Promise<boolean>;
  markPartSent?(eventId: string, detail: { nextPartIndex: number; telegramMessageId: number }): Promise<void>;
  markSent(eventId: string, detail: { sentAtMs: number; telegramMessageId: number }): Promise<void>;
  markRetry(eventId: string, detail: { nextAttemptAtMs: number; reason: string }): Promise<void>;
  markDeadLetter(eventId: string, detail: { deadLetterAtMs: number; reason: string }): Promise<void>;
  markSuppressed(eventId: string, detail: { suppressedAtMs: number; reason: string }): Promise<void>;
}

export interface TelegramTransportResponse {
  readonly status: number;
  readonly body: unknown;
}

export type TelegramTransport = (input: {
  readonly botToken: string;
  readonly chatId: string;
  readonly text: string;
}) => Promise<TelegramTransportResponse>;

export type TelegramResponseClassification =
  | { readonly kind: 'sent'; readonly messageId: number }
  | { readonly kind: 'retry'; readonly reason: string; readonly retryAfterMs?: number }
  | { readonly kind: 'dead-letter'; readonly reason: string };

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function classifyTelegramResponse(status: number, body: unknown): TelegramResponseClassification {
  const root = record(body);
  const result = record(root?.result);
  const messageId = Number(result?.message_id);
  if (status >= 200 && status < 300 && root?.ok === true && Number.isSafeInteger(messageId) && messageId > 0) {
    return { kind: 'sent', messageId };
  }
  if (status === 429) {
    const parameters = record(root?.parameters);
    const retryAfterSeconds = Number(parameters?.retry_after);
    return {
      kind: 'retry',
      reason: 'telegram_rate_limited',
      ...(Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
        ? { retryAfterMs: Math.floor(retryAfterSeconds * 1_000) }
        : {}),
    };
  }
  if (status >= 500 && status <= 599) return { kind: 'retry', reason: 'telegram_5xx' };
  if (status === 401 || status === 403 || (status === 400 && record(root?.parameters)?.migrate_to_chat_id)) {
    return { kind: 'retry', reason: `telegram_configuration_${status}` };
  }
  if (status >= 400 && status <= 499) return { kind: 'dead-letter', reason: `telegram_4xx_${status}` };
  return { kind: 'retry', reason: 'telegram_invalid_response' };
}

export function nextRetryAtMs(nowMs: number, attempts: number, retryAfterMs = 0): number {
  const safeAttempt = Math.max(1, Math.min(20, Math.floor(attempts)));
  const exponentialMs = Math.min(3_600_000, 5_000 * (2 ** (safeAttempt - 1)));
  const serverDelayMs = Math.max(0, Math.min(86_400_000, Math.floor(retryAfterMs)));
  return Math.floor(nowMs) + Math.max(exponentialMs, serverDelayMs);
}

export function shouldDeliverAdminAlert(config: AdminAlertDeliveryConfig, eventType: AdminAlertType): boolean {
  if (!config.enabled || !String(config.chatId ?? '').trim()) return false;
  const definition = adminAlertDefinition(eventType);
  return definition.required || config.types[eventType] !== false;
}

export function canClaimAdminAlertEvent(state: AdminAlertClaimState, nowMs: number): boolean {
  const status = String(state.status ?? '');
  if (status === 'pending') return true;
  if (status === 'retrying') return Number(state.nextAttemptAtMs ?? 0) <= nowMs;
  if (status === 'delivering') return Number(state.leaseUntilMs ?? 0) < nowMs;
  return false;
}

export async function sendTelegramAdminAlert(input: {
  readonly botToken: string;
  readonly chatId: string;
  readonly text: string;
}): Promise<TelegramTransportResponse> {
  const response = await fetch(`https://api.telegram.org/bot${input.botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: input.chatId,
      text: input.text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return { status: response.status, body };
}

export async function dispatchAdminAlertEvent(input: {
  readonly eventId: string;
  readonly botToken: string;
  readonly nowMs?: number;
  readonly store: AdminAlertDeliveryStore;
  readonly transport?: TelegramTransport;
}): Promise<
  | { readonly status: 'not-due' }
  | { readonly status: 'suppressed'; readonly reason: string }
  | { readonly status: 'sent'; readonly messageId: number }
  | { readonly status: 'retrying'; readonly reason: string; readonly nextAttemptAtMs: number }
  | { readonly status: 'dead-letter'; readonly reason: string }
> {
  const nowMs = Math.floor(input.nowMs ?? Date.now());
  const claimed = await input.store.claim(input.eventId, nowMs);
  if (!claimed) return { status: 'not-due' };
  const config = await input.store.loadConfig();
  if (!shouldDeliverAdminAlert(config, claimed.eventType)) {
    const reason = config.enabled ? 'event_type_disabled' : 'alerts_disabled';
    await input.store.markSuppressed(claimed.eventId, { suppressedAtMs: nowMs, reason });
    return { status: 'suppressed', reason };
  }
  if (!input.botToken) {
    const reason = 'telegram_token_missing';
    const nextAttemptAtMs = nextRetryAtMs(nowMs, claimed.attempts);
    await input.store.markRetry(claimed.eventId, { nextAttemptAtMs, reason });
    return { status: 'retrying', reason, nextAttemptAtMs };
  }

  let batch: AdminAlertMessageBatch;
  try {
    batch = input.store.prepareMessages ? await input.store.prepareMessages(claimed)
      : { messages: renderAdminAlertMessages(claimed), nextPartIndex: 0 };
  } catch {
    const reason = 'alert_context_unavailable';
    const nextAttemptAtMs = nextRetryAtMs(nowMs, claimed.attempts);
    await input.store.markRetry(claimed.eventId, { nextAttemptAtMs, reason });
    return { status: 'retrying', reason, nextAttemptAtMs };
  }
  let lastMessageId = batch.lastMessageId ?? 0;
  for (let index = batch.nextPartIndex; index < batch.messages.length; index++) {
  if (input.store.renewLease && !await input.store.renewLease(claimed.eventId, claimed.attempts, Date.now())) return { status: 'not-due' };
  let classification: TelegramResponseClassification;
  try {
    const response = await (input.transport ?? sendTelegramAdminAlert)({
      botToken: input.botToken,
      chatId: config.chatId,
      text: batch.messages[index],
    });
    classification = classifyTelegramResponse(response.status, response.body);
  } catch {
    if (!input.transport) {
      // Fetch exceptions can contain the bot-token URL. Never log the exception.
      logger.warn('admin_alert_dispatch_network_error', { eventType: claimed.eventType });
    }
    classification = { kind: 'retry', reason: 'telegram_network_error' };
  }

  if (classification.kind === 'sent') {
    lastMessageId = classification.messageId;
    if (input.store.markPartSent) await input.store.markPartSent(claimed.eventId, { nextPartIndex: index + 1, telegramMessageId: lastMessageId });
    continue;
  }
  if (classification.kind === 'dead-letter') {
    await input.store.markDeadLetter(claimed.eventId, { deadLetterAtMs: nowMs, reason: classification.reason });
    return { status: 'dead-letter', reason: classification.reason };
  }
  const nextAttemptAtMs = nextRetryAtMs(nowMs, claimed.attempts, classification.retryAfterMs);
  await input.store.markRetry(claimed.eventId, { nextAttemptAtMs, reason: classification.reason });
  return { status: 'retrying', reason: classification.reason, nextAttemptAtMs };
  }
  await input.store.markSent(claimed.eventId, { sentAtMs: nowMs, telegramMessageId: lastMessageId });
  return { status: 'sent', messageId: lastMessageId };
}

export class FirestoreAdminAlertDeliveryStore implements AdminAlertDeliveryStore {
  private readonly claimedAttempts = new Map<string, number>();
  constructor(private readonly db: admin.firestore.Firestore) {}

  async claim(eventId: string, nowMs: number): Promise<AdminAlertOutboxEvent | null> {
    const ref = this.db.collection(ADMIN_ALERT_EVENTS_COLLECTION).doc(eventId);
    const claimed = await this.db.runTransaction(async (tx) => {
      const snapshot = await tx.get(ref);
      if (!snapshot.exists) return null;
      const data = snapshot.data() ?? {};
      if (!canClaimAdminAlertEvent(data, nowMs) || !isAdminAlertType(data.eventType)) return null;
      const attempts = Math.max(0, Math.floor(Number(data.attempts ?? 0))) + 1;
      const occurredAtMs = Number(data.occurredAtMs);
      if (!Number.isFinite(occurredAtMs) || occurredAtMs <= 0) {
        tx.set(ref, {
          status: 'dead-letter', deadLetterAtMs: nowMs, reason: 'invalid_event_timestamp',
          leaseUntilMs: null, nextAttemptAtMs: null, updatedAtMs: nowMs,
        }, { merge: true });
        return null;
      }
      tx.set(ref, {
        status: 'delivering',
        attempts,
        leaseUntilMs: nowMs + (data.eventType === 'ownerDailyDigest' ? 180_000 : LEASE_MS),
        nextAttemptAtMs: null,
        updatedAtMs: nowMs,
      }, { merge: true });
      return {
        eventId,
        eventType: data.eventType,
        occurredAtMs,
        payload: sanitizeAdminAlertPayload(data.eventType, data.payload),
        attempts,
        source: String(data.source ?? ''),
        sourceId: String(data.sourceId ?? ''),
      };
    });
    if (claimed) this.claimedAttempts.set(eventId, claimed.attempts);
    return claimed;
  }

  async prepareMessages(event: AdminAlertOutboxEvent): Promise<AdminAlertMessageBatch> {
    const ref = this.db.collection(ADMIN_ALERT_EVENTS_COLLECTION).doc(event.eventId);
    const snapshot = await ref.get();
    const data = snapshot.data() ?? {};
    if (Array.isArray(data.telegramMessages) && data.telegramMessages.length > 0) {
      const messages = data.telegramMessages;
      const nextPartIndex = Number(data.telegramNextPart ?? 0);
      if (!messages.every((message: unknown) => typeof message === 'string' && message.length > 0 && message.length <= 4096)
        || !Number.isSafeInteger(nextPartIndex) || nextPartIndex < 0 || nextPartIndex > messages.length) throw new Error('invalid_alert_delivery_snapshot');
      const formatVersion = Number(data.deliveryFormatVersion ?? 0);
      if (nextPartIndex > 0 || formatVersion >= TELEGRAM_FORMAT_VERSION) {
        return { messages, nextPartIndex, lastMessageId: Number(data.telegramMessageId ?? 0) };
      }
      // A legacy snapshot with no sent parts is safe to replace with the
      // current readable formatter below. Once any part was sent, the branch
      // above deliberately preserves the old snapshot for idempotent retry.
    }
    const payload = event.eventType === 'ownerDailyDigest'
      ? await materializeDailyDigestPayload(this.db, event.payload)
      : await enrichAdminAlertContext({
      eventType: event.eventType, source: event.source ?? '', sourceId: event.sourceId ?? '', payload: event.payload, attempts: event.attempts,
    }, async (path) => {
      const document = await this.db.doc(path).get();
      return document.exists ? document.data() ?? null : null;
    });
    const messages = renderAdminAlertMessages({ ...event, payload });
    // Freeze first-delivery text. A retry never rereads a renamed profile or an
    // edited report and cannot accidentally skip/mix parts from two versions.
    await this.update(event.eventId, { telegramMessages: messages, telegramNextPart: 0, deliveryFormatVersion: TELEGRAM_FORMAT_VERSION,
      ...(event.eventType === 'ownerDailyDigest' ? {payload} : {}),
    });
    return { messages, nextPartIndex: 0 };
  }

  async renewLease(eventId: string, attempt: number, nowMs: number): Promise<boolean> {
    const ref = this.db.collection(ADMIN_ALERT_EVENTS_COLLECTION).doc(eventId);
    return this.db.runTransaction(async (tx) => {
      const snapshot = await tx.get(ref);
      const data = snapshot.data() ?? {};
      if (data.status !== 'delivering' || data.attempts !== attempt) return false;
      tx.set(ref, { leaseUntilMs: nowMs + LEASE_MS, updatedAtMs: nowMs }, { merge: true });
      return true;
    });
  }

  async markPartSent(eventId: string, detail: { nextPartIndex: number; telegramMessageId: number }): Promise<void> {
    await this.update(eventId, { telegramNextPart: detail.nextPartIndex, telegramMessageId: detail.telegramMessageId,
      leaseUntilMs: Date.now() + LEASE_MS, updatedAtMs: Date.now() });
  }

  async loadConfig(): Promise<AdminAlertDeliveryConfig> {
    const snapshot = await this.db.collection('admin_config').doc('alerts').get();
    const data = snapshot.data() ?? {};
    const types = record(data.types) ?? {};
    return {
      enabled: data.enabled === true,
      chatId: String(data.chatId ?? '').trim().slice(0, 160),
      types: Object.fromEntries(Object.entries(types).map(([key, value]) => [key, value !== false])),
    };
  }

  async markSent(eventId: string, detail: { sentAtMs: number; telegramMessageId: number }): Promise<void> {
    await this.update(eventId, { status: 'sent', ...detail, telegramMessages: null, leaseUntilMs: null, nextAttemptAtMs: null, updatedAtMs: detail.sentAtMs });
  }

  async markRetry(eventId: string, detail: { nextAttemptAtMs: number; reason: string }): Promise<void> {
    await this.update(eventId, { status: 'retrying', ...detail, leaseUntilMs: null, updatedAtMs: Date.now() });
  }

  async markDeadLetter(eventId: string, detail: { deadLetterAtMs: number; reason: string }): Promise<void> {
    await this.update(eventId, { status: 'dead-letter', ...detail, telegramMessages: null, leaseUntilMs: null, nextAttemptAtMs: null, updatedAtMs: detail.deadLetterAtMs });
  }

  async markSuppressed(eventId: string, detail: { suppressedAtMs: number; reason: string }): Promise<void> {
    await this.update(eventId, { status: 'suppressed', ...detail, telegramMessages: null, leaseUntilMs: null, nextAttemptAtMs: null, updatedAtMs: detail.suppressedAtMs });
  }

  private async update(eventId: string, values: Record<string, unknown>): Promise<void> {
    const attempt = this.claimedAttempts.get(eventId);
    const ref = this.db.collection(ADMIN_ALERT_EVENTS_COLLECTION).doc(eventId);
    await this.db.runTransaction(async (tx) => {
      const snapshot = await tx.get(ref);
      const data = snapshot.data() ?? {};
      // An expired worker must not overwrite a newer worker's part checkpoint,
      // retry state or immutable delivery snapshot.
      if (attempt === undefined || data.attempts !== attempt || data.status !== 'delivering') return;
      tx.set(ref, values, { merge: true });
    });
  }
}

async function dispatchProductionEvent(eventId: string): Promise<void> {
  const store = new FirestoreAdminAlertDeliveryStore(admin.firestore());
  const result = await dispatchAdminAlertEvent({
    eventId,
    botToken: ADMIN_ALERT_DISPATCH_BOT_TOKEN.value(),
    store,
  });
  logger.info('admin_alert_dispatch_result', { eventId, status: result.status });
}

export const adminAlertDispatchOnCreate = onDocumentCreated(
  {
    document: `${ADMIN_ALERT_EVENTS_COLLECTION}/{eventId}`,
    region: REGION,
    secrets: [ADMIN_ALERT_DISPATCH_BOT_TOKEN],
    retry: true,
    timeoutSeconds: 180,
  },
  async (event) => {
    await dispatchProductionEvent(String(event.params.eventId));
  },
);

export const adminAlertRecoveryCron = onSchedule(
  {
    schedule: 'every 1 minutes',
    timeZone: 'UTC',
    region: REGION,
    secrets: [ADMIN_ALERT_DISPATCH_BOT_TOKEN],
    retryCount: 3,
    timeoutSeconds: 180,
  },
  async () => {
    const nowMs = Date.now();
    const collection = admin.firestore().collection(ADMIN_ALERT_EVENTS_COLLECTION);
    // Separate single-field queries prevent future retries or live leases from
    // occupying the entire recovery page and starving due work behind them.
    const snapshots = await Promise.all([
      collection.where('status', '==', 'pending').limit(RECOVERY_LIMIT).get(),
      collection.where('nextAttemptAtMs', '<=', nowMs).limit(RECOVERY_LIMIT).get(),
      collection.where('leaseUntilMs', '<', nowMs).limit(RECOVERY_LIMIT).get(),
    ]);
    const due = new Map(snapshots.flatMap((snapshot) => snapshot.docs).map((document) => [document.id, document]));
    for (const document of due.values()) {
      if (canClaimAdminAlertEvent(document.data(), nowMs)) await dispatchProductionEvent(document.id);
    }
  },
);

/** Aggregate-only admin diagnostics. Payload documents never leave the server. */
export const adminGetAlertDiagnostics = onCall(
  { region: REGION },
  async (request) => {
    if (request.auth?.token?.admin !== true) throw new HttpsError('permission-denied', 'Admin only');
    const collection = admin.firestore().collection(ADMIN_ALERT_EVENTS_COLLECTION);
    const statuses = ['pending', 'delivering', 'retrying', 'sent', 'suppressed', 'dead-letter'] as const;
    const snapshots = await Promise.all(statuses.map((status) => collection.where('status', '==', status).count().get()));
    return {
      ok: true,
      counts: Object.fromEntries(statuses.map((status, index) => [status, Number(snapshots[index].data().count ?? 0)])),
      observedAtMs: Date.now(),
    };
  },
);
