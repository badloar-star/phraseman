"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminAlertOnConfigWritten = exports.adminAlertOnUgcRefund = exports.adminAlertOnCancelSurvey = exports.adminAlertContentReportDigest = exports.adminAlertOnContentReport = exports.adminAlertOnCriticalError = exports.adminAlertOnUserReport = void 0;
const admin = __importStar(require("firebase-admin"));
const params_1 = require("firebase-functions/params");
const firestore_1 = require("firebase-functions/v2/firestore");
const scheduler_1 = require("firebase-functions/v2/scheduler");
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
const ADMIN_ALERT_BOT_TOKEN = (0, params_1.defineSecret)('ADMIN_ALERT_BOT_TOKEN');
function db() {
    return admin.firestore();
}
async function readAlertsConfig() {
    try {
        const snap = await db().doc(ALERTS_DOC).get();
        if (!snap.exists)
            return null;
        return (snap.data() || {});
    }
    catch (error) {
        console.error('[adminAlerts] readAlertsConfig failed', error);
        return null;
    }
}
function alertTypeEnabled(cfg, type) {
    if (!cfg || cfg.enabled === false)
        return false;
    // A type is on unless explicitly disabled (default-on once master switch is on).
    return cfg.types?.[type] !== false;
}
function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
/**
 * Send a message to the configured Telegram chat. No-op (returns false) when
 * alerts are disabled or no chatId is set. Never throws — an alert failure must
 * not break the triggering write.
 */
async function sendTelegramAlert(token, text, cfg) {
    const config = cfg ?? (await readAlertsConfig());
    if (!config || config.enabled === false)
        return false;
    const chatId = config.chatId;
    if (chatId === undefined || chatId === null || String(chatId).trim() === '')
        return false;
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
    }
    catch (error) {
        console.error('[adminAlerts] sendMessage failed', error);
        return false;
    }
}
/** Record the time an alert of a given type was last sent (for throttling/UI). */
async function markSent(type) {
    try {
        await db().doc(ALERTS_DOC).set({ lastSentByType: { [type]: Date.now() }, lastSentAt: Date.now() }, { merge: true });
    }
    catch (error) {
        console.error('[adminAlerts] markSent failed', error);
    }
}
// ── 1. New complaint about a user (user_reports) ─────────────────────────────
exports.adminAlertOnUserReport = (0, firestore_1.onDocumentCreated)({ document: 'user_reports/{id}', region: REGION, secrets: [ADMIN_ALERT_BOT_TOKEN] }, async (event) => {
    const cfg = await readAlertsConfig();
    if (!alertTypeEnabled(cfg, 'userReport'))
        return;
    const data = event.data?.data() || {};
    const reason = escapeHtml(data.reason || data.category || 'не указана');
    const offender = escapeHtml(data.reportedName || data.reportedUid || '—');
    const reporter = escapeHtml(data.reporterName || data.reporterUid || '—');
    const text = `🚩 <b>Новая жалоба на пользователя</b>\n\n` +
        `Нарушитель: <b>${offender}</b>\n` +
        `Причина: ${reason}\n` +
        `От: ${reporter}\n\n` +
        `<i>Открой админку → User reports.</i>`;
    const ok = await sendTelegramAlert(ADMIN_ALERT_BOT_TOKEN.value(), text, cfg);
    if (ok)
        await markSent('userReport');
});
// ── 2. Critical app error (app_errors, severity=critical) ────────────────────
exports.adminAlertOnCriticalError = (0, firestore_1.onDocumentCreated)({ document: 'app_errors/{id}', region: REGION, secrets: [ADMIN_ALERT_BOT_TOKEN] }, async (event) => {
    const data = event.data?.data() || {};
    const severity = String(data.severity || '').toLowerCase();
    if (severity !== 'critical')
        return;
    const cfg = await readAlertsConfig();
    if (!alertTypeEnabled(cfg, 'criticalError'))
        return;
    const message = escapeHtml(String(data.message || data.context || 'нет описания').slice(0, 400));
    const feature = escapeHtml(data.feature || data.context || '—');
    const uid = escapeHtml(data.uid || '—');
    const text = `🔴 <b>Critical error</b>\n\n` +
        `Feature: ${feature}\n` +
        `UID: ${uid}\n` +
        `${message}\n\n` +
        `<i>Открой админку → App Health.</i>`;
    const ok = await sendTelegramAlert(ADMIN_ALERT_BOT_TOKEN.value(), text, cfg);
    if (ok)
        await markSent('criticalError');
});
// ── 3. Content reports — batched into an hourly digest (error_reports) ───────
// onCreate only bumps a counter; the scheduled digest sends the summary.
exports.adminAlertOnContentReport = (0, firestore_1.onDocumentCreated)({ document: 'error_reports/{id}', region: REGION }, async () => {
    const cfg = await readAlertsConfig();
    if (!alertTypeEnabled(cfg, 'contentReportDigest'))
        return;
    try {
        await db().doc(ALERTS_DOC).set({ pendingContentReports: admin.firestore.FieldValue.increment(1) }, { merge: true });
    }
    catch (error) {
        console.error('[adminAlerts] content report counter failed', error);
    }
});
exports.adminAlertContentReportDigest = (0, scheduler_1.onSchedule)({ schedule: '0 * * * *', timeZone: 'UTC', region: REGION, secrets: [ADMIN_ALERT_BOT_TOKEN] }, async () => {
    const cfg = await readAlertsConfig();
    if (!cfg || cfg.enabled === false)
        return;
    const pending = Number(cfg.pendingContentReports || 0);
    if (pending <= 0)
        return;
    // Reset the counter first so we never double-count across digests.
    try {
        await db().doc(ALERTS_DOC).set({ pendingContentReports: 0 }, { merge: true });
    }
    catch (error) {
        console.error('[adminAlerts] digest reset failed', error);
        return;
    }
    if (cfg.types?.contentReportDigest === false)
        return;
    const text = `📝 <b>Content-репорты за час</b>\n\n` +
        `Новых сообщений об ошибках в контенте: <b>${pending}</b>\n\n` +
        `<i>Открой админку → Reports.</i>`;
    const ok = await sendTelegramAlert(ADMIN_ALERT_BOT_TOKEN.value(), text, cfg);
    if (ok)
        await markSent('contentReportDigest');
});
// ── 4. Spike in cancellations / refunds ──────────────────────────────────────
// Counts events in a rolling 1h window; alerts once when the window crosses the
// threshold, then enters a cooldown until the window resets.
const SPIKE_WINDOW_MS = 60 * 60 * 1000;
const SPIKE_COOLDOWN_MS = 60 * 60 * 1000;
async function recordSpikeEvent(kindLabel) {
    const cfg = await readAlertsConfig();
    if (!alertTypeEnabled(cfg, 'cancelRefundSpike'))
        return;
    const threshold = Math.max(1, Number(cfg?.spikePerHour || 5));
    const now = Date.now();
    const ref = db().doc(ALERTS_DOC);
    let shouldAlert = false;
    let windowCount = 0;
    try {
        await db().runTransaction(async (tx) => {
            const snap = await tx.get(ref);
            const data = (snap.data() || {});
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
            const lastAlerted = Number(data.spikeAlertedAt || 0);
            const inCooldown = lastAlerted && now - lastAlerted < SPIKE_COOLDOWN_MS;
            if (count >= threshold && !inCooldown) {
                shouldAlert = true;
                tx.set(ref, { cancelRefundWindow: { since, count }, spikeAlertedAt: now }, { merge: true });
            }
            else {
                tx.set(ref, { cancelRefundWindow: { since, count } }, { merge: true });
            }
        });
    }
    catch (error) {
        console.error('[adminAlerts] spike tx failed', error);
        return;
    }
    if (!shouldAlert)
        return;
    const text = `📉 <b>Всплеск отмен/рефандов</b>\n\n` +
        `${escapeHtml(kindLabel)}: <b>${windowCount}</b> за последний час (порог ${threshold}).\n\n` +
        `<i>Проверь монетизацию — Cancel surveys / UGC purchases.</i>`;
    const ok = await sendTelegramAlert(ADMIN_ALERT_BOT_TOKEN.value(), text);
    if (ok)
        await markSent('cancelRefundSpike');
}
exports.adminAlertOnCancelSurvey = (0, firestore_1.onDocumentCreated)({ document: 'subscription_cancel_surveys/{id}', region: REGION, secrets: [ADMIN_ALERT_BOT_TOKEN] }, async () => {
    await recordSpikeEvent('Отмены подписки');
});
// UGC purchase refunds are a soft-update (status -> 'refunded'); watch writes.
exports.adminAlertOnUgcRefund = (0, firestore_1.onDocumentWritten)({ document: 'community_pack_purchases/{id}', region: REGION, secrets: [ADMIN_ALERT_BOT_TOKEN] }, async (event) => {
    const before = event.data?.before?.data() || {};
    const after = event.data?.after?.data() || {};
    const becameRefunded = before.status !== 'refunded' && after.status === 'refunded';
    if (!becameRefunded)
        return;
    await recordSpikeEvent('Рефанды UGC');
});
// ── 5. Test ping from the admin UI ───────────────────────────────────────────
// The "Test" button in the admin Alerts tab writes admin_config/alerts.testPing.
// This trigger reacts to that change and sends a confirmation message.
exports.adminAlertOnConfigWritten = (0, firestore_1.onDocumentWritten)({ document: 'admin_config/alerts', region: REGION, secrets: [ADMIN_ALERT_BOT_TOKEN] }, async (event) => {
    const before = (event.data?.before?.data() || {});
    const after = (event.data?.after?.data() || {});
    const ping = Number(after.testPing || 0);
    if (!ping || ping === Number(before.testPing || 0))
        return;
    if (Number(after.testPingHandled || 0) === ping)
        return;
    const text = `✅ <b>Тест алертов Phraseman</b>\n\n` +
        `Бот подключён. Алерты будут приходить сюда.\n` +
        `<i>${new Date(ping).toISOString()}</i>`;
    const ok = await sendTelegramAlert(ADMIN_ALERT_BOT_TOKEN.value(), text, after);
    try {
        await event.data?.after?.ref.set({ testPingHandled: ping, testPingResult: ok ? 'sent' : 'failed', testPingResultAt: Date.now() }, { merge: true });
    }
    catch (error) {
        console.error('[adminAlerts] testPing ack failed', error);
    }
});
//# sourceMappingURL=admin_alerts.js.map