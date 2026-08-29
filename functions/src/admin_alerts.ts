import * as admin from 'firebase-admin';
import { withCronHeartbeat } from './cron_heartbeat';
import { defineSecret } from 'firebase-functions/params';
import { onDocumentCreated, onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { buildSerialRefunderAlert, isSerialRefunder } from './serial_refunder';

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
type AlertType = 'userReport' | 'criticalError' | 'contentReportDigest' | 'cancelRefundSpike' | 'safetyFlag' | 'authFailureSpike' | 'serialRefunder' | 'explanationRetired';

interface AlertsConfig {
  enabled?: boolean;
  chatId?: string | number;
  types?: Partial<Record<AlertType, boolean>>;
  spikePerHour?: number;
  // bookkeeping fields written by these functions:
  pendingContentReports?: number;
  lastSentByType?: Record<string, number>;
  cancelRefundWindow?: { since?: number; count?: number };
  contentReportWindow?: { since?: number; count?: number };
  authFailureWindow?: { since?: number; count?: number; stages?: Record<string, number> };
  authFailureAlertedAt?: number;
  testPing?: number;
  testPingHandled?: number;
}

function db(): FirebaseFirestore.Firestore {
  return admin.firestore();
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
  // A type is on unless explicitly disabled (default-on once master switch is on).
  return cfg.types?.[type] !== false;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Trim + cut to `max` chars with an ellipsis; `max <= 0` drops the field entirely. */
function clip(value: unknown, max: number): string {
  if (max <= 0) return '';
  const out = String(value ?? '').trim();
  return out.length > max ? `${out.slice(0, max - 1)}…` : out;
}

// зачем: владелец запретил уходить именам/uid во внешние каналы (Telegram) —
// только количества/хвосты для поиска в админке. escapeHtml защищает от HTML,
// но не маскирует PII, поэтому имя всегда отбрасываем и оставляем хвост uid,
// как уже сделано в payment_webhook_alert.ts и в formatContentReportAlert.
function maskUserRef(uid: unknown): string {
  const s = String(uid ?? '').trim();
  return s ? `#${s.slice(-4)}` : '—';
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
      const detail = await res.text().catch(() => '');
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
  { document: 'user_reports/{id}', region: REGION, secrets: [ADMIN_ALERT_BOT_TOKEN] },
  async (event) => {
    const cfg = await readAlertsConfig();
    if (!alertTypeEnabled(cfg, 'userReport')) return;
    const data = event.data?.data() || {};
    const reason = escapeHtml(data.reason || data.category || 'не указана');
    const offender = escapeHtml(maskUserRef(data.reportedUid));
    const reporter = escapeHtml(maskUserRef(data.reporterUid));
    const text =
      `🚩 <b>Новая жалоба на пользователя</b>\n\n` +
      `Нарушитель: <b>${offender}</b>\n` +
      `Причина: ${reason}\n` +
      `От: ${reporter}\n\n` +
      `<i>Открой админку → User reports.</i>`;
    const ok = await sendTelegramAlert(ADMIN_ALERT_BOT_TOKEN.value(), text, cfg);
    if (ok) await markSent('userReport');
  },
);

// ── 2. Critical app error (app_errors, severity=critical) ────────────────────
export const adminAlertOnCriticalError = onDocumentCreated(
  { document: 'app_errors/{id}', region: REGION, secrets: [ADMIN_ALERT_BOT_TOKEN] },
  async (event) => {
    const data = event.data?.data() || {};
    const severity = String(data.severity || '').toLowerCase();
    if (severity !== 'critical') return;
    const cfg = await readAlertsConfig();
    if (!alertTypeEnabled(cfg, 'criticalError')) return;
    const message = escapeHtml(clip(data.message || data.context, 600) || 'нет описания');
    const errorName = clip(data.errorName, 120);
    const feature = escapeHtml(clip(data.feature || data.context, 120) || '—');
    const screen = clip(data.screen, 120);
    const uid = escapeHtml(maskUserRef(data.uid));
    const appVersion = clip(data.appVersion, 40);
    const stack = clip(data.stack, 700);
    const text =
      `🔴 <b>Critical error</b>\n\n` +
      `Feature: ${feature}${screen ? ` · ${escapeHtml(screen)}` : ''}\n` +
      `UID: ${uid}\n` +
      `App: v${escapeHtml(appVersion || '?')} (${escapeHtml(clip(data.platform, 20) || '?')})\n` +
      `${errorName ? `<b>${escapeHtml(errorName)}</b>: ` : ''}${message}\n` +
      `${stack ? `<pre>${escapeHtml(stack)}</pre>\n` : ''}` +
      `\n<i>Открой админку → App Health.</i>`;
    const ok = await sendTelegramAlert(ADMIN_ALERT_BOT_TOKEN.value(), text, cfg);
    if (ok) await markSent('criticalError');
  },
);

// ── 3. Content reports — full report sent immediately (error_reports) ────────
// Each new report goes to Telegram in full (comment, content, user answer,
// reporter, device). A rolling 1h window caps immediate messages so a broken
// lesson can't flood the chat; overflow is summarised by the hourly digest.
const CONTENT_REPORT_IMMEDIATE_PER_HOUR = 6;
const CONTENT_REPORT_WINDOW_MS = 60 * 60 * 1000;
const TELEGRAM_TEXT_LIMIT = 4096;

interface ContentReportLimits {
  comment: number;
  content: number;
  answer: number;
}

/** Build the full-report Telegram message for one error_reports doc. Exported for tests. */
export function formatContentReportAlert(
  data: Record<string, unknown>,
  limits: ContentReportLimits = { comment: 1000, content: 1000, answer: 300 },
): string {
  const category = clip(data.category, 80);
  const screen = clip(data.screen, 120) || '—';
  const dataId = clip(data.dataId, 180);
  const comment = clip(data.comment, limits.comment) || '—';
  const content = clip(data.dataText, limits.content);
  const answer = clip(data.userAnswer, limits.answer);
  const userLine = [
    maskUserRef(data.uid),
    `Lv${Number(data.userLevel) || 0}`,
    `${Number(data.userXP) || 0} XP`,
    `стрик ${Number(data.userStreak) || 0}`,
    data.userPremium ? 'Premium' : 'Free',
    `${Number(data.userDaysInApp) || 0} дн. в апке`,
  ].join(' · ');
  const deviceLine = [
    [clip(data.deviceOS, 40), clip(data.deviceOSVersion, 20)].filter(Boolean).join(' '),
    clip(data.deviceModel, 60),
    `app v${clip(data.appVersion, 40) || '?'} (${clip(data.platform, 20) || '?'})`,
  ].filter(Boolean).join(' · ');

  const title = category && category !== 'free_text'
    ? `📝 <b>Content-репорт</b> · ${escapeHtml(category)}`
    : `📝 <b>Content-репорт</b>`;
  const lines = [title, '', `💬 ${escapeHtml(comment)}`, ''];
  lines.push(`Экран: <b>${escapeHtml(screen)}</b>${dataId ? ` · <code>${escapeHtml(dataId)}</code>` : ''}`);
  if (content) lines.push(`<pre>${escapeHtml(content)}</pre>`);
  if (answer) lines.push(`Ответ юзера: ${escapeHtml(answer)}`);
  lines.push('', `👤 ${escapeHtml(userLine)}`, `📱 ${escapeHtml(deviceLine)}`, '', '<i>Открой админку → Reports.</i>');
  return lines.join('\n');
}

/**
 * Same as formatContentReportAlert, but guarantees the Telegram 4096-char limit
 * by re-clipping progressively harder (never slices mid-tag). Exported for tests.
 */
export function formatContentReportAlertSafe(data: Record<string, unknown>): string {
  const attempts: ContentReportLimits[] = [
    { comment: 1000, content: 1000, answer: 300 },
    { comment: 350, content: 350, answer: 100 },
    { comment: 120, content: 0, answer: 0 },
  ];
  let text = '';
  for (const limits of attempts) {
    text = formatContentReportAlert(data, limits);
    if (text.length <= TELEGRAM_TEXT_LIMIT) return text;
  }
  return text;
}

export const adminAlertOnContentReport = onDocumentCreated(
  { document: 'error_reports/{id}', region: REGION, secrets: [ADMIN_ALERT_BOT_TOKEN] },
  async (event) => {
    const cfg = await readAlertsConfig();
    if (!alertTypeEnabled(cfg, 'contentReportDigest')) return;
    const now = Date.now();
    // Rolling 1h window: first N reports go out immediately, the rest are
    // counted into pendingContentReports for the hourly digest.
    let immediate = true;
    try {
      await db().runTransaction(async (tx) => {
        const ref = db().doc(ALERTS_DOC);
        const snap = await tx.get(ref);
        const data = (snap.data() || {}) as AlertsConfig;
        const win = data.contentReportWindow || {};
        const since = Number(win.since || 0);
        const count = Number(win.count || 0);
        if (!since || now - since > CONTENT_REPORT_WINDOW_MS) {
          tx.set(ref, { contentReportWindow: { since: now, count: 1 } }, { merge: true });
          return;
        }
        if (count < CONTENT_REPORT_IMMEDIATE_PER_HOUR) {
          tx.set(ref, { contentReportWindow: { since, count: count + 1 } }, { merge: true });
          return;
        }
        immediate = false;
        tx.set(ref, { pendingContentReports: admin.firestore.FieldValue.increment(1) }, { merge: true });
      });
    } catch (error) {
      // Window bookkeeping must not lose the report — fall through and send.
      console.error('[adminAlerts] content report window tx failed', error);
    }
    if (!immediate) return;
    const text = formatContentReportAlertSafe(event.data?.data() || {});
    const ok = await sendTelegramAlert(ADMIN_ALERT_BOT_TOKEN.value(), text, cfg);
    if (ok) await markSent('contentReportDigest');
  },
);

// Hourly digest now only covers the overflow beyond the immediate-send cap.
export const adminAlertContentReportDigest = onSchedule(
  { schedule: '0 * * * *', timeZone: 'UTC', region: REGION, secrets: [ADMIN_ALERT_BOT_TOKEN] },
  withCronHeartbeat('adminAlertContentReportDigest', async () => {
    const cfg = await readAlertsConfig();
    if (!cfg || cfg.enabled === false) return;
    const pending = Number(cfg.pendingContentReports || 0);
    if (pending <= 0) return;
    // Reset the counter first so we never double-count across digests.
    try {
      await db().doc(ALERTS_DOC).set({ pendingContentReports: 0 }, { merge: true });
    } catch (error) {
      console.error('[adminAlerts] digest reset failed', error);
      return;
    }
    if (cfg.types?.contentReportDigest === false) return;
    const text =
      `📝 <b>Content-репорты за час</b>\n\n` +
      `Ещё <b>${pending}</b> сверх мгновенных алертов — полные тексты в админке.\n\n` +
      `<i>Открой админку → Reports.</i>`;
    const ok = await sendTelegramAlert(ADMIN_ALERT_BOT_TOKEN.value(), text, cfg);
    if (ok) await markSent('contentReportDigest');
  }));

// ── 4. Spike in cancellations / refunds ──────────────────────────────────────
// Counts events in a rolling 1h window; alerts once when the window crosses the
// threshold, then enters a cooldown until the window resets.
const SPIKE_WINDOW_MS = 60 * 60 * 1000;
const SPIKE_COOLDOWN_MS = 60 * 60 * 1000;

async function recordSpikeEvent(kindLabel: string): Promise<void> {
  const cfg = await readAlertsConfig();
  if (!alertTypeEnabled(cfg, 'cancelRefundSpike')) return;
  const threshold = Math.max(1, Number(cfg?.spikePerHour || 5));
  const now = Date.now();
  const ref = db().doc(ALERTS_DOC);
  let shouldAlert = false;
  let windowCount = 0;
  try {
    await db().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = (snap.data() || {}) as AlertsConfig & { spikeAlertedAt?: number };
      const win = data.cancelRefundWindow || {};
      const since = Number(win.since || 0);
      let count = Number(win.count || 0);
      if (!since || now - since > SPIKE_WINDOW_MS) {
        // window expired → start a fresh window
        windowCount = 1;
        tx.set(ref, { cancelRefundWindow: { since: now, count: 1 } }, { merge: true });
        return;
      }
      count += 1;
      windowCount = count;
      const lastAlerted = Number((data as { spikeAlertedAt?: number }).spikeAlertedAt || 0);
      const inCooldown = lastAlerted && now - lastAlerted < SPIKE_COOLDOWN_MS;
      if (count >= threshold && !inCooldown) {
        shouldAlert = true;
        tx.set(ref, { cancelRefundWindow: { since, count }, spikeAlertedAt: now }, { merge: true });
      } else {
        tx.set(ref, { cancelRefundWindow: { since, count } }, { merge: true });
      }
    });
  } catch (error) {
    console.error('[adminAlerts] spike tx failed', error);
    return;
  }
  if (!shouldAlert) return;
  const text =
    `📉 <b>Всплеск отмен/рефандов</b>\n\n` +
    `${escapeHtml(kindLabel)}: <b>${windowCount}</b> за последний час (порог ${threshold}).\n\n` +
    `<i>Проверь монетизацию — Cancel surveys / UGC purchases.</i>`;
  const ok = await sendTelegramAlert(ADMIN_ALERT_BOT_TOKEN.value(), text);
  if (ok) await markSent('cancelRefundSpike');
}

export const adminAlertOnCancelSurvey = onDocumentCreated(
  { document: 'subscription_cancel_surveys/{id}', region: REGION, secrets: [ADMIN_ALERT_BOT_TOKEN] },
  async () => {
    await recordSpikeEvent('Отмены подписки');
  },
);

// UGC purchase refunds are a soft-update (status -> 'refunded'); watch writes.
export const adminAlertOnUgcRefund = onDocumentWritten(
  { document: 'community_pack_purchases/{id}', region: REGION, secrets: [ADMIN_ALERT_BOT_TOKEN] },
  async (event) => {
    const before = event.data?.before?.data() || {};
    const after = event.data?.after?.data() || {};
    const becameRefunded = before.status !== 'refunded' && after.status === 'refunded';
    if (!becameRefunded) return;
    await recordSpikeEvent('Рефанды UGC');
    await alertIfSerialRefunder(after);
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
async function alertIfSerialRefunder(purchase: Record<string, unknown>): Promise<void> {
  const buyerId = String(purchase.buyerStableId ?? purchase.buyerUid ?? '').trim();
  if (!buyerId) return;

  try {
    const cfg = await readAlertsConfig();
    if (!alertTypeEnabled(cfg, 'serialRefunder')) return;

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

    const ok = await sendTelegramAlert(
      ADMIN_ALERT_BOT_TOKEN.value(),
      buildSerialRefunderAlert({ refundCount }),
      cfg,
    );
    if (ok) await markSent('serialRefunder');
  } catch (error) {
    // зачем глушить: это сигнальный путь поверх уже обработанного возврата.
    // Упасть здесь значило бы уронить обработку самого возврата.
    console.warn('admin_alerts: serial refunder check failed', error);
  }
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

async function recordAuthFailureSpikeEvent(stage: string | undefined): Promise<void> {
  const cfg = await readAlertsConfig();
  if (!alertTypeEnabled(cfg, 'authFailureSpike')) return;
  const threshold = Math.max(1, Number(cfg?.spikePerHour || 5));
  const now = Date.now();
  const ref = db().doc(ALERTS_DOC);
  let shouldAlert = false;
  let windowCount = 0;
  let windowStages: Record<string, number> = {};
  try {
    await db().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = (snap.data() || {}) as AlertsConfig;
      const next = nextAuthFailureSpikeState({
        window: data.authFailureWindow,
        lastAlertedAt: Number(data.authFailureAlertedAt || 0),
        now,
        threshold,
        stage,
      });
      shouldAlert = next.shouldAlert;
      windowCount = next.count;
      windowStages = next.window.stages;
      tx.set(
        ref,
        {
          authFailureWindow: next.window,
          ...(next.alertedAt ? { authFailureAlertedAt: next.alertedAt } : {}),
        },
        { merge: true },
      );
    });
  } catch (error) {
    console.error('[adminAlerts] auth failure spike tx failed', error);
    return;
  }
  if (!shouldAlert) return;
  // Топ-3 stage из tags за окно (если окно хранит только счётчики — просто N).
  const topStages = Object.entries(windowStages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, count]) => `${escapeHtml(clip(name, 40))} ×${count}`);
  const text =
    `⚠️ <b>Всплеск ошибок входа</b>\n\n` +
    `<b>${windowCount}</b> за последний час (порог ${threshold}).` +
    (topStages.length ? `\nТоп stage: ${topStages.join(', ')}.` : '') +
    `\n\n<i>Открой админку → App Health → auth.</i>`;
  const ok = await sendTelegramAlert(ADMIN_ALERT_BOT_TOKEN.value(), text, cfg);
  if (ok) await markSent('authFailureSpike');
}

export const adminAlertOnAuthFailureSpike = onDocumentCreated(
  { document: 'app_errors/{id}', region: REGION, secrets: [ADMIN_ALERT_BOT_TOKEN] },
  async (event) => {
    const data = event.data?.data() || {};
    if (!isAuthFailureErrorDoc(data)) return;
    const tags = data.tags && typeof data.tags === 'object' ? data.tags as Record<string, unknown> : {};
    const stage = clip(tags.stage ?? data.stage, 60) || undefined;
    await recordAuthFailureSpikeEvent(stage);
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
