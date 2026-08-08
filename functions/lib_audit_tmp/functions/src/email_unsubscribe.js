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
exports.emailUnsubscribe = void 0;
exports.normalizeEmail = normalizeEmail;
exports.suppressionDocId = suppressionDocId;
exports.unsubscribeToken = unsubscribeToken;
exports.verifyUnsubscribeToken = verifyUnsubscribeToken;
exports.unsubscribeUrlFor = unsubscribeUrlFor;
exports.suppressEmail = suppressEmail;
exports.loadSuppressedEmails = loadSuppressedEmails;
// ============================================================================
// Email unsubscribe / suppression list.
//
// Маркетинговые письма (adminEmailBroadcast) ОБЯЗАНЫ давать получателю ссылку
// «Отписаться» (GDPR / CAN-SPAM) и не слать тем, кто уже отписался. Этот модуль:
//   - подписывает email HMAC-токеном (ссылку нельзя подделать/перебрать),
//   - публичная функция emailUnsubscribe принимает клик по ссылке и пишет адрес
//     в коллекцию email_suppressions,
//   - helpers isEmailSuppressed / loadSuppressedEmails для рассылки.
//
// Транзакционных писем (сброс пароля, чеки) это НЕ касается — они сервисные и
// отпиской не управляются.
// ============================================================================
const crypto_1 = require("crypto");
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const firestore_1 = require("firebase-admin/firestore");
const params_1 = require("firebase-functions/params");
const REGION = 'us-central1';
/**
 * Секрет для подписи ссылок отписки. Задай в functions/.env как
 * EMAIL_UNSUBSCRIBE_SECRET (длинная случайная строка). Дефолт — заглушка,
 * рассылку на реальных людей запускать только с заданным секретом.
 */
const unsubscribeSecret = (0, params_1.defineString)('EMAIL_UNSUBSCRIBE_SECRET', {
    default: 'phraseman-unsubscribe-dev-secret-change-me',
});
/**
 * Базовый публичный URL функций, от которого строится ссылка отписки.
 * По умолчанию — стандартный хост Cloud Functions проекта.
 */
const unsubscribeBaseUrl = (0, params_1.defineString)('EMAIL_UNSUBSCRIBE_BASE_URL', {
    default: 'https://knowlyapps.com/unsubscribe',
});
const EMAIL_RE = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const SUPPRESSIONS_COLLECTION = 'email_suppressions';
function normalizeEmail(value) {
    const email = String(value ?? '').trim().toLowerCase().slice(0, 320);
    return EMAIL_RE.test(email) ? email : null;
}
function suppressionDocId(email) {
    return (0, crypto_1.createHmac)('sha256', 'phraseman-suppress-id')
        .update(email.trim().toLowerCase())
        .digest('hex')
        .slice(0, 48);
}
/** Подпись email для ссылки отписки (первые 32 hex-символа HMAC-SHA256). */
function unsubscribeToken(email) {
    return (0, crypto_1.createHmac)('sha256', unsubscribeSecret.value())
        .update(email.trim().toLowerCase())
        .digest('hex')
        .slice(0, 32);
}
/** Timing-safe проверка токена. */
function verifyUnsubscribeToken(email, token) {
    const expected = unsubscribeToken(email);
    const given = String(token || '').toLowerCase();
    if (given.length !== expected.length)
        return false;
    try {
        return (0, crypto_1.timingSafeEqual)(Buffer.from(expected), Buffer.from(given));
    }
    catch {
        return false;
    }
}
/** Готовая ссылка отписки для конкретного адреса. */
function unsubscribeUrlFor(email) {
    const base = unsubscribeBaseUrl.value();
    const query = `e=${encodeURIComponent(email)}&t=${unsubscribeToken(email)}`;
    return base.includes('?') ? `${base}&${query}` : `${base}?${query}`;
}
/** Записать адрес в suppression-список (идемпотентно). */
async function suppressEmail(db, email, reason) {
    const normalized = normalizeEmail(email);
    if (!normalized)
        return;
    const ref = db.collection(SUPPRESSIONS_COLLECTION).doc(suppressionDocId(normalized));
    await ref.set({
        email: normalized,
        reason: String(reason || 'unsubscribe').slice(0, 64),
        unsubscribedAt: firestore_1.FieldValue.serverTimestamp(),
        unsubscribedAtIso: new Date().toISOString(),
    }, { merge: true });
}
/** Загрузить множество отписавшихся адресов (для фильтрации перед рассылкой). */
async function loadSuppressedEmails(db) {
    const set = new Set();
    const snap = await db.collection(SUPPRESSIONS_COLLECTION).select('email').get();
    snap.forEach((doc) => {
        const email = normalizeEmail(doc.get('email'));
        if (email)
            set.add(email);
    });
    return set;
}
function confirmPageHtml(email, ok) {
    const safeEmail = email.replace(/[<>&"]/g, '');
    const title = ok ? 'Вы отписались' : 'Ссылка недействительна';
    const body = ok
        ? `Адрес <b>${safeEmail}</b> больше не будет получать новостные письма Phraseman.<br/>Сервисные письма (вход, оплата) это не затрагивает.`
        : 'Ссылка отписки неверна или устарела. Напишите на support.phraseman@gmail.com — мы отпишем вручную.';
    return `<!doctype html><html lang="ru"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title} · Phraseman</title>
<style>
  body{margin:0;background:#0b1020;color:#e5e7eb;font-family:-apple-system,Segoe UI,Roboto,sans-serif;
       display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px}
  .card{max-width:440px;background:#131a2e;border:1px solid #24304d;border-radius:18px;padding:32px;text-align:center}
  h1{font-size:22px;margin:0 0 14px}p{font-size:15px;line-height:1.6;color:#c7cfe0;margin:0}
  .ok{color:#4ade80}.err{color:#f87171}
</style></head><body>
  <div class="card"><h1 class="${ok ? 'ok' : 'err'}">${title}</h1><p>${body}</p></div>
</body></html>`;
}
/**
 * Публичная функция отписки.
 * GET  ?e=<email>&t=<token> — клик по ссылке из письма → HTML-страница.
 * POST ?e=<email>&t=<token> — one-click (RFC 8058, List-Unsubscribe-Post) → 200.
 */
exports.emailUnsubscribe = (0, https_1.onRequest)({ region: REGION, cors: true, memory: '256MiB' }, async (req, res) => {
    const method = String(req.method || 'GET').toUpperCase();
    if (method !== 'GET' && method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }
    const rawEmail = req.query.e || (req.body && req.body.e) || '';
    const rawToken = req.query.t || (req.body && req.body.t) || '';
    const email = normalizeEmail(rawEmail);
    const valid = !!email && verifyUnsubscribeToken(email, rawToken);
    if (valid && email) {
        try {
            await suppressEmail((0, firestore_1.getFirestore)(), email, 'user_unsubscribe');
        }
        catch (error) {
            logger.error('emailUnsubscribe suppress failed', error);
            // Всё равно показываем «отписаны», чтобы пользователь не жал повторно.
        }
    }
    if (method === 'POST') {
        // one-click: тело не нужно, только статус.
        res.status(valid ? 200 : 400).send(valid ? 'OK' : 'INVALID');
        return;
    }
    res
        .status(valid ? 200 : 400)
        .set('Content-Type', 'text/html; charset=utf-8')
        .send(confirmPageHtml(email || rawEmail, valid));
});
//# sourceMappingURL=email_unsubscribe.js.map