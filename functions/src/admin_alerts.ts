import * as admin from 'firebase-admin';
import { createHash } from 'node:crypto';
import { defineSecret } from 'firebase-functions/params';
import { onDocumentCreated, onDocumentWritten } from 'firebase-functions/v2/firestore';
import { isSerialRefunder } from './serial_refunder';
import { canonicalAdminAlertType, type AdminAlertType } from './admin_alert_catalog';
import { legacyAdminAlertEvent, type LegacyAdminAlertType } from './admin_alert_legacy';
import { adminAlertEventId, buildAdminAlertOutboxDocument, enqueueAdminAlert } from './admin_alert_outbox';

import { swallowed } from './swallowed_error'; // зачем: PM-229 — немой catch пишет причину [PM-229]
/**
 * Admin Telegram alerts.
 *
 * The admin panel (admin/index.html) runs in the browser and cannot call the
 * Telegram API directly (the bot token must never ship to the client). So all
 * alerts flow: Firestore trigger -> this Cloud Function -> Telegram Bot API.
 *
 * Configuration lives in Firestore `admin_config/alerts` (chatId, enabled,
 * per-type toggles, spike threshold) so it can be changed from the UI without a
 * redeploy. Only the bot token is a secret.
 */

const REGION = 'us-central1';
const TELEGRAM_API = 'https://api.telegram.org';
const ALERTS_DOC = 'admin_config/alerts';

export const ADMIN_ALERT_BOT_TOKEN = defineSecret('ADMIN_ALERT_BOT_TOKEN');

// зачем serialRefunder отдельным типом от cancelRefundSpike: тот про всплеск
// за час у разных людей, этот — про одного человека с повторяющимися
// возвратами. Один выключатель на оба означал бы, что глуша шум всплесков,
// владелец молча теряет и сигнал о закономерности.
type AlertType = AdminAlertType | 'ideaReport' | 'contentReportDigest' | 'cancelRefundSpike' | 'serialRefunder' | 'explanationRetired';

interface AlertsConfig {
  enabled?: boolean;
  chatId?: string | number;
  types?: Partial<Record<string, boolean>>;
  spikePerHour?: number;
  // bookkeeping fields written by these functions:
  lastSentByType?: Record<string, number>;
  cancelRefundWindow?: { since?: number; count?: number };
  authFailureWindow?: { since?: number; count?: number; stages?: Record<string, number> };
  authFailureAlertedAt?: number;
  testPing?: number;
  testPingHandled?: number;
}

function db(): FirebaseFirestore.Firestore {
  return admin.firestore();
}

function persistedEventTimeMs(data: Record<string, unknown>, cloudEventTime?: string): number {
  const raw = data.createdAtMs ?? data.created_at ?? data.createdAt;
  const numeric = Number(raw);
  if (Number.isFinite(numeric) && numeric > 0) return Math.floor(numeric);
  if (raw && typeof raw === 'object' && 'toMillis' in raw && typeof (raw as { toMillis?: unknown }).toMillis === 'function') {
    const timestampMs = Number((raw as { toMillis: () => number }).toMillis());
    if (Number.isFinite(timestampMs) && timestampMs > 0) return Math.floor(timestampMs);
  }
  const parsedRaw = typeof raw === 'string' ? Date.parse(raw) : NaN;
  if (Number.isFinite(parsedRaw) && parsedRaw > 0) return parsedRaw;
  const parsedEvent = Date.parse(String(cloudEventTime ?? ''));
  return Number.isFinite(parsedEvent) && parsedEvent > 0 ? parsedEvent : Date.now();
}

export async function readAlertsConfig(): Promise<AlertsConfig | null> {
  try {
    const snap = await db().doc(ALERTS_DOC).get();
    if (!snap.exists) return null;
    return (snap.data() || {}) as AlertsConfig;
  } catch (error) {
    console.error('[adminAlerts] readAlertsConfig failed', error);
    return null;
  }
}

export function alertTypeEnabled(cfg: AlertsConfig | null, type: AlertType): boolean {
  if (!cfg || cfg.enabled === false) return false;
  const canonicalType = canonicalAdminAlertType(type);
  if (!canonicalType) return false;
  // A type is on unless explicitly disabled (default-on once master switch is on).
  return cfg.types?.[type] !== false && cfg.types?.[canonicalType] !== false;
}

async function enqueueLegacyAlert(
  legacyType: LegacyAdminAlertType,
  sourceId: string,
  data: Record<string, unknown>,
  occurredAtMs = Date.now(),
): Promise<void> {
  await enqueueAdminAlert(db(), legacyAdminAlertEvent({
    legacyType,
    sourceId,
    occurredAtMs,
    data,
  }));
}

/** Trim + cut to `max` chars with an ellipsis; `max <= 0` drops the field entirely. */
function clip(value: unknown, max: number): string {
  if (max <= 0) return '';
  const out = String(value ?? '').trim();
  return out.length > max ? `${out.slice(0, max - 1)}…` : out;
}

/**
 * Send a message to the configured Telegram chat. No-op (returns false) when
 * alerts are disabled or no chatId is set. Never throws — an alert failure must
 * not break the triggering write.
 */
export async function sendTelegramAlert(token: string, text: string, cfg?: AlertsConfig | null): Promise<boolean> {
  const config = cfg ?? (await readAlertsConfig());
  if (!config || config.enabled === false) return false;
  const chatId = config.chatId;
  if (chatId === undefined || chatId === null || String(chatId).trim() === '') return false;
  if (!token) {
    console.error('[adminAlerts] no bot token available');
    return false;
  }
  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(swallowed('admin_alerts:text', ''));
      console.error('[adminAlerts] sendMessage non-200', res.status, detail.slice(0, 300));
      return false;
    }
    return true;
  } catch (error) {
    console.error('[adminAlerts] sendMessage failed', error);
    return false;
  }
}

/** Record the time an alert of a given type was last sent (for throttling/UI). */
export async function markSent(type: string): Promise<void> {
  try {
    await db().doc(ALERTS_DOC).set(
      { lastSentByType: { [type]: Date.now() }, lastSentAt: Date.now() },
      { merge: true },
    );
  } catch (error) {
    console.error('[adminAlerts] markSent failed', error);
  }
}

// ── 1. New complaint about a user (user_reports) ─────────────────────────────
export const adminAlertOnUserReport = onDocumentCreated(
  { document: 'user_reports/{id}', region: REGION, retry: true, secrets: [ADMIN_ALERT_BOT_TOKEN] },
  async (event) => {
    const data = event.data?.data() || {};
    await enqueueLegacyAlert('userReport', String(event.params.id), data, persistedEventTimeMs(data, event.time));
  },
);

// ── 2. Critical app error (app_errors, severity=critical) ────────────────────
export const adminAlertOnCriticalError = onDocumentCreated(
  { document: 'app_errors/{id}', region: REGION, retry: true, secrets: [ADMIN_ALERT_BOT_TOKEN] },
  async (event) => {
    const data = event.data?.data() || {};
    const severity = String(data.severity || '').toLowerCase();
    const nowMs = Date.now();
    const eventOccurredAtMs = persistedEventTimeMs(data, event.time);
    if (severity !== 'critical') {
      await enqueueAdminAlert(db(), {
        eventType: 'appErrorDigest',
        source: 'app.error',
        sourceId: String(event.params.id),
        occurredAtMs: eventOccurredAtMs,
        payload: {
          category: String(data.context ?? data.errorName ?? 'app_error'),
          severity: severity || 'error',
          platform: String(data.platform ?? ''),
          appVersion: String(data.appVersion ?? ''),
          // зачем (§CORE-0159): дайджест сбоев в Telegram — без ника и без хвоста uid.
          route: '#app-health',
        },
      });
      return;
    }
    const isPaymentWebhookFailure = data.feature === 'payments'
      && data.errorName === 'PaymentWebhookFailure';
    // зачем дедуп (инцидент владельца 2026-08-31): один залипший локальный
    // замок слал 13 одинаковых critical за 40 секунд — канал утонул, и
    // владелец решил, что приложение мертво. Повторы одной и той же пары
    // «контекст + пользователь» держим 30 минут: первое письмо приходит
    // сразу, остальные молчат. Стоимость — один точечный get/set на алерт.
    const dedupeKey = `${String(data.context ?? 'unknown')}|${String(data.uid ?? 'anon')}`
      .replace(/[^A-Za-z0-9_.:|-]/g, '_').slice(0, 200);
    const dedupeRef = admin.firestore().collection('admin_alert_dedupe').doc(dedupeKey);
    const receipt = db().collection('admin_alert_dedupe').doc(`critical-${createHash('sha256').update(String(event.params.id)).digest('hex')}`);
    const alert = isPaymentWebhookFailure ? {
        eventType: 'paymentWebhookFailure',
        source: 'payment.webhook_failure',
        sourceId: String(event.params.id),
        occurredAtMs: eventOccurredAtMs,
        payload: {
          category: String(data.context ?? 'payment_webhook').split('_').join(' '),
          severity: 'critical',
          environment: 'server',
          status: 'failed',
          route: '#app-health',
        },
      } as const : legacyAdminAlertEvent({legacyType: 'criticalError', sourceId: String(event.params.id), data, occurredAtMs: eventOccurredAtMs});
    await db().runTransaction(async (tx) => {
      if ((await tx.get(receipt)).exists) return;
      const dedupe = (await tx.get(dedupeRef)).data() || {};
      const lastSentAtMs = Number(dedupe.lastSentAtMs ?? 0);
      if (Number.isFinite(lastSentAtMs) && nowMs - lastSentAtMs < CRITICAL_ALERT_DEDUPE_MS) {
        tx.set(dedupeRef, {suppressed: Number(dedupe.suppressed || 0) + 1, lastSuppressedAtMs: nowMs}, {merge: true});
      } else {
        const outboxRef = db().collection('admin_alert_events').doc(adminAlertEventId(alert.source, alert.sourceId));
        const repeats = Math.max(0, Math.floor(Number(dedupe.suppressed) || 0));
        const enrichedAlert = {...alert, payload: {...alert.payload, ...(repeats > 0 ? {details: [{label: 'Повторов', value: String(repeats)}]} : {})}};
        if (!(await tx.get(outboxRef)).exists) tx.create(outboxRef, buildAdminAlertOutboxDocument(enrichedAlert, nowMs));
        tx.set(dedupeRef, {lastSentAtMs: nowMs, suppressed: 0, updatedAt: admin.firestore.FieldValue.serverTimestamp()}, {merge: true});
      }
      tx.create(receipt, {processedAtMs: nowMs});
    });
  },
);

/** Окно тишины для повторов одного и того же critical (контекст+uid). */
const CRITICAL_ALERT_DEDUPE_MS = 30 * 60 * 1000;

// ── 3. Content reports — every report is sent immediately ───────────────────
// зачем (§CORE-0160): прямые форматтеры formatCriticalErrorAlert / formatContentReportAlert(Safe) удалены —
// вызовов не было, а они печатали userName мимо белого списка. Все оповещения идут через admin_alert_privacy.
/**
 * Падение/оживание крона → Telegram (владелец 2026-08-29: «панель видна,
 * только когда я в неё смотрю — упавший крон должен будить сам»).
 *
 * Шлём ТОЛЬКО на переходах ok→fail и fail→ok: повторные падения подряд не
 * спамят (lastError и так виден в панели «Диагностика»), тишина канала
 * остаётся значимой. Стоимость: срабатывает на записи пульса, выходит без
 * чтений, шлёт telegram лишь на смене состояния.
 */
export const adminAlertOnCronHeartbeat = onDocumentWritten(
  { document: 'cron_heartbeats/{cronName}', region: REGION, retry: true, secrets: [ADMIN_ALERT_BOT_TOKEN] },
  async (event) => {
    const after = event.data?.after?.exists ? event.data.after.data() : null;
    if (!after) return;
    const before = event.data?.before?.exists ? event.data.before.data() : null;
    const wasOk = before ? before.ok === true : true;
    const isOk = after.ok === true;
    if (wasOk === isOk) return;
    const name = String(event.params.cronName);
    const transitionAtMs = persistedEventTimeMs({createdAtMs: after.lastFinishedAtMs ?? after.lastErrorAtMs ?? after.finishedAtMs ?? after.updatedAtMs}, event.time);
    const safeName = name.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 80) || 'cron';
    await enqueueAdminAlert(db(), {
      eventType: 'cronHealth',
      source: 'cron.health',
      sourceId: `${safeName}-${isOk ? 'recovered' : 'failed'}-${Math.floor(transitionAtMs)}`,
      occurredAtMs: transitionAtMs,
      payload: {
        category: name,
        status: isOk ? 'recovered' : 'failed',
        route: '#diagnostics',
      },
    });
  },
);

export const adminAlertOnContentReport = onDocumentCreated(
  { document: 'error_reports/{id}', region: REGION, retry: true, secrets: [ADMIN_ALERT_BOT_TOKEN] },
  async (event) => {
    await enqueueLegacyAlert(
      'contentReportDigest',
      String(event.params.id),
      event.data?.data() || {},
      persistedEventTimeMs(event.data?.data() || {}, event.time),
    );
  },
);

// ── 4. Spike in cancellations / refunds ──────────────────────────────────────
// Counts events in a rolling 1h window; alerts once when the window crosses the
// threshold, then enters a cooldown until the window resets.
const SPIKE_WINDOW_MS = 60 * 60 * 1000;
const SPIKE_COOLDOWN_MS = 60 * 60 * 1000;

/** Receipt, window and outbox commit together; retries cannot lose or double-count a fact. */
async function recordDurableSpikeEvent(kind: 'auth' | 'refund', sourceId: string, category: string): Promise<void> {
  const now = Date.now();
  const ref = db().doc(ALERTS_DOC);
  const receiptId = createHash('sha256').update(`${kind}:${sourceId}`).digest('hex');
  const receipt = db().collection('admin_alert_dedupe').doc(`spike-${receiptId}`);
  await db().runTransaction(async (tx) => {
    if ((await tx.get(receipt)).exists) return;
    const data = ((await tx.get(ref)).data() || {}) as AlertsConfig & { spikeAlertedAt?: number };
    const windowField = kind === 'auth' ? 'authFailureWindow' : 'cancelRefundWindow';
    const alertedField = kind === 'auth' ? 'authFailureAlertedAt' : 'spikeAlertedAt';
    const configuredThreshold = Number(data.spikePerHour);
    const threshold = Number.isFinite(configuredThreshold) ? Math.max(1, configuredThreshold) : 5;
    const next = nextAuthFailureSpikeState({window: data[windowField], lastAlertedAt: Number(data[alertedField] || 0), now, threshold, stage: kind === 'auth' ? category : undefined});
    if (next.shouldAlert) {
      const topStage = Object.entries(next.window.stages).sort((a, b) => b[1] - a[1])[0]?.[0];
      const alert = legacyAdminAlertEvent({legacyType: kind === 'auth' ? 'authFailureSpike' : 'cancelRefundSpike',
        sourceId: `window-${next.window.since}`, occurredAtMs: now,
        data: {category: kind === 'auth' ? topStage || 'auth' : category, count: next.count}});
      const outboxRef = db().collection('admin_alert_events').doc(adminAlertEventId(alert.source, alert.sourceId));
      if (!(await tx.get(outboxRef)).exists) tx.create(outboxRef, buildAdminAlertOutboxDocument(alert, now));
    }
    tx.set(ref, {[windowField]: next.window, ...(next.alertedAt ? {[alertedField]: next.alertedAt} : {})}, {merge: true});
    tx.create(receipt, {processedAtMs: now});
  });
}

export const adminAlertOnCancelSurvey = onDocumentCreated(
  { document: 'subscription_cancel_surveys/{id}', region: REGION, retry: true, secrets: [ADMIN_ALERT_BOT_TOKEN] },
  async (event) => {
    await recordDurableSpikeEvent('refund', `cancel:${event.params.id}`, 'Отмены подписки');
  },
);

// UGC purchase refunds are a soft-update (status -> 'refunded'); watch writes.
export const adminAlertOnUgcRefund = onDocumentWritten(
  { document: 'community_pack_purchases/{id}', region: REGION, retry: true, secrets: [ADMIN_ALERT_BOT_TOKEN] },
  async (event) => {
    const before = event.data?.before?.data() || {};
    const after = event.data?.after?.data() || {};
    const becameRefunded = before.status !== 'refunded' && after.status === 'refunded';
    if (!becameRefunded) return;
    await recordDurableSpikeEvent('refund', `ugc:${event.params.id}`, 'Рефанды UGC');
    await alertIfSerialRefunder(after, String(event.params.id), persistedEventTimeMs({createdAtMs: after.refundedAtMs}, event.time));
  },
);

/**
 * Сигнал о серийном возвращателе.
 *
 * зачем отдельно от recordSpikeEvent выше: тот ловит ВСПЛЕСК за час — много
 * возвратов от разных людей сразу. Один человек с двумя возвратами за месяцы
 * всплеска не создаёт, и существующий алерт его не видит. Админка таких уже
 * помечает (фильтр «только серийные»), но молча — владелец узнаёт, только
 * если сам зайдёт и посмотрит.
 *
 * зачем .count(), а не выборка документов: нужно ОДНО число, и агрегация
 * тарифицируется как одно чтение независимо от размера коллекции.
 */
async function alertIfSerialRefunder(purchase: Record<string, unknown>, receiptId: string, occurredAtMs: number): Promise<void> {
  const buyerId = String(purchase.buyerStableId ?? purchase.buyerUid ?? '').trim();
  if (!buyerId) return;

    // guard-ok (limit): .count() возвращает одно число и тарифицируется как
    // одно чтение — limit() к агрегации неприменим и не нужен.
    const snapshot = await db()
      .collection('community_pack_purchases')
      .where('buyerStableId', '==', buyerId)
      .where('status', '==', 'refunded')
      .count()
      .get();

    const refundCount = Number(snapshot.data().count ?? 0);
    if (!isSerialRefunder(refundCount)) return;

    await enqueueAdminAlert(db(), {eventType: 'refundSpike', source: 'legacy.serial_refunder_receipt',
      sourceId: receiptId, occurredAtMs, payload: {count: refundCount, category: 'Серийный возврат', route: '#refunds'}});
}

// ── 4б. Spike in auth sign-in failures (app_errors, feature=auth) ────────────
// Продакшн-инцидент 2026-07: после переустановки юзеры не могли войти в свой
// аккаунт (auth_link_failed / «не тот аккаунт»). Клиент пишет такие ошибки в
// app_errors с feature:'auth' (или context 'auth:signin_failure'). Считаем их в
// скользящем часовом окне и при всплеске шлём алерт — чтобы вспышку было видно
// сразу, а не по жалобам. recordSpikeEvent переиспользовать нельзя: он жёстко
// завязан на тип cancelRefundSpike и окно cancelRefundWindow — поэтому здесь
// минимальный локальный аналог со СВОИМ окном (authFailureWindow) и СВОИМ
// cooldown-полем (authFailureAlertedAt); существующий спайк отмен/рефандов не
// затронут.
const AUTH_FAILURE_MAX_STAGES = 8; // кап на карту stage→count, чтобы теги не раздували док

/** Чистый предикат фильтра auth-фейлов в app_errors. Экспортирован для тестов. */
export function isAuthFailureErrorDoc(data: Record<string, unknown>): boolean {
  const feature = String(data?.feature ?? '').trim().toLowerCase();
  const context = String(data?.context ?? '').trim().toLowerCase();
  return feature === 'auth' || context === 'auth:signin_failure';
}

export type AuthFailureSpikeWindow = { since?: number; count?: number; stages?: Record<string, number> };

/**
 * Чистая логика скользящего окна всплеска auth-фейлов (зеркалит recordSpikeEvent,
 * но без I/O — для тестов и транзакции): новое окно, инкремент, порог, cooldown.
 */
export function nextAuthFailureSpikeState(params: {
  window: AuthFailureSpikeWindow | undefined;
  lastAlertedAt: number;
  now: number;
  threshold: number;
  stage?: string;
}): { window: { since: number; count: number; stages: Record<string, number> }; shouldAlert: boolean; count: number; alertedAt: number | null } {
  const win = params.window || {};
  const since = Number(win.since || 0);
  const stages: Record<string, number> = { ...(win.stages || {}) };
  const bumpStage = (target: Record<string, number>) => {
    if (!params.stage) return;
    if (!(params.stage in target) && Object.keys(target).length >= AUTH_FAILURE_MAX_STAGES) return;
    target[params.stage] = (target[params.stage] || 0) + 1;
  };
  if (!since || params.now - since > SPIKE_WINDOW_MS) {
    // Окно истекло → начинаем новое. Порог при первом событии не проверяем —
    // то же поведение, что у recordSpikeEvent (алерт со второго события окна).
    const fresh: Record<string, number> = {};
    bumpStage(fresh);
    return { window: { since: params.now, count: 1, stages: fresh }, shouldAlert: false, count: 1, alertedAt: null };
  }
  const count = Number(win.count || 0) + 1;
  bumpStage(stages);
  const inCooldown = Boolean(params.lastAlertedAt) && params.now - params.lastAlertedAt < SPIKE_COOLDOWN_MS;
  const shouldAlert = count >= params.threshold && !inCooldown;
  return {
    window: { since, count, stages },
    shouldAlert,
    count,
    alertedAt: shouldAlert ? params.now : null,
  };
}

export const adminAlertOnAuthFailureSpike = onDocumentCreated(
  { document: 'app_errors/{id}', region: REGION, retry: true, secrets: [ADMIN_ALERT_BOT_TOKEN] },
  async (event) => {
    const data = event.data?.data() || {};
    if (!isAuthFailureErrorDoc(data)) return;
    const tags = data.tags && typeof data.tags === 'object' ? data.tags as Record<string, unknown> : {};
    const stage = clip(tags.stage ?? data.stage, 60) || undefined;
    await recordDurableSpikeEvent('auth', String(event.params.id), stage || 'auth');
  },
);

// ── 5. Test ping from the admin UI ───────────────────────────────────────────
// The "Test" button in the admin Alerts tab writes admin_config/alerts.testPing.
// This trigger reacts to that change and sends a confirmation message.
export const adminAlertOnConfigWritten = onDocumentWritten(
  { document: 'admin_config/alerts', region: REGION, secrets: [ADMIN_ALERT_BOT_TOKEN] },
  async (event) => {
    const before = (event.data?.before?.data() || {}) as AlertsConfig;
    const after = (event.data?.after?.data() || {}) as AlertsConfig;
    const ping = Number(after.testPing || 0);
    if (!ping || ping === Number(before.testPing || 0)) return;
    if (Number(after.testPingHandled || 0) === ping) return;
    const text =
      `✅ <b>Тест алертов Phraseman</b>\n\n` +
      `Бот подключён. Алерты будут приходить сюда.\n` +
      `<i>${new Date(ping).toISOString()}</i>`;
    const ok = await sendTelegramAlert(ADMIN_ALERT_BOT_TOKEN.value(), text, after);
    try {
      await event.data?.after?.ref.set(
        { testPingHandled: ping, testPingResult: ok ? 'sent' : 'failed', testPingResultAt: Date.now() },
        { merge: true },
      );
    } catch (error) {
      console.error('[adminAlerts] testPing ack failed', error);
    }
  },
);
