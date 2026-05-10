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
exports.submitWebsiteContact = void 0;
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const firestore_1 = require("firebase-admin/firestore");
const params_1 = require("firebase-functions/params");
/** Опционально: ключ Resend для письма на почту при новом обращении (Firebase params / secrets env). */
const resendApiKey = (0, params_1.defineString)('RESEND_API_KEY', { default: '' });
const notifyEmail = (0, params_1.defineString)('WEB_CONTACT_NOTIFY_EMAIL', { default: 'support.phraseman@gmail.com' });
const EMAIL_RE = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
function pickAllowOrigin(origin) {
    const allow = new Set([
        'https://knowlyapps.com',
        'https://www.knowlyapps.com',
        'https://knowlyapps.web.app',
        'https://phraseman-ea0b3.web.app',
        'https://phraseman-ea0b3.firebaseapp.com',
        'http://localhost:5000',
        'http://127.0.0.1:5000',
        'http://localhost:5500',
        'http://127.0.0.1:5500',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
    ]);
    if (!origin)
        return '*';
    if (allow.has(origin))
        return origin;
    if (/\.web\.app$/.test(origin))
        return origin;
    if (/\.firebaseapp\.com$/.test(origin))
        return origin;
    return '*';
}
async function notifyViaResend(subject, text) {
    const key = resendApiKey.value();
    if (!key)
        return false;
    const to = notifyEmail.value();
    try {
        const r = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                from: 'PhraseMan Website <onboarding@resend.dev>',
                to: [to],
                subject,
                text,
            }),
        });
        if (!r.ok) {
            logger.warn('website_contact_resend_failed', await r.text());
            return false;
        }
        return true;
    }
    catch (e) {
        logger.warn('website_contact_resend_error', e);
        return false;
    }
}
exports.submitWebsiteContact = (0, https_1.onRequest)({
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 30,
    invoker: 'public',
}, async (req, res) => {
    const ao = pickAllowOrigin(typeof req.headers.origin === 'string' ? req.headers.origin : undefined);
    res.set('Access-Control-Allow-Origin', ao);
    res.set('Vary', 'Origin');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ ok: false, error: 'method_not_allowed' });
        return;
    }
    let body = {};
    if (typeof req.body === 'object' && req.body !== null && !Array.isArray(req.body)) {
        body = req.body;
    }
    else if (typeof req.body === 'string') {
        try {
            body = JSON.parse(req.body || '{}');
        }
        catch {
            res.status(400).json({ ok: false, error: 'invalid_json' });
            return;
        }
    }
    const trap = typeof body.company === 'string'
        ? body.company
        : typeof body.hp === 'string'
            ? body.hp
            : typeof body.website === 'string'
                ? body.website
                : '';
    if (trap && trap.trim()) {
        res.status(200).json({ ok: true, notified: false });
        return;
    }
    const email = String(body.email ?? '')
        .trim()
        .slice(0, 320);
    const message = String(body.message ?? '')
        .trim()
        .slice(0, 5000);
    const name = String(body.name ?? '')
        .trim()
        .slice(0, 120);
    const topicRaw = String(body.topic ?? 'support')
        .trim()
        .toLowerCase();
    const topic = ['support', 'feedback', 'legal', 'other'].includes(topicRaw) ? topicRaw : 'support';
    const pageUrl = String(body.pageUrl ?? '').slice(0, 2000);
    if (!EMAIL_RE.test(email)) {
        res.status(400).json({ ok: false, error: 'invalid_email' });
        return;
    }
    if (message.length < 10) {
        res.status(400).json({ ok: false, error: 'message_too_short' });
        return;
    }
    const db = (0, firestore_1.getFirestore)();
    const ua = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'].slice(0, 420) : '';
    const forwarded = typeof req.headers['x-forwarded-for'] === 'string' ? req.headers['x-forwarded-for'].slice(0, 200) : '';
    const docRef = await db.collection('website_contact_inbox').add({
        email,
        message,
        name: name || null,
        topic,
        pageUrl: pageUrl || null,
        status: 'new',
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        meta: { ua, forwarded },
    });
    const subject = `[PhraseMan web · ${topic}] ${email}`;
    const text = `From: ${name || '—'} <${email}>\nTopic: ${topic}\nPage: ${pageUrl || '—'}\n\n${message}\n\n— id: ${docRef.id}`;
    const emailed = await notifyViaResend(subject, text);
    if (emailed) {
        await docRef.update({ emailNotifiedAt: firestore_1.FieldValue.serverTimestamp() }).catch(() => { });
    }
    res.status(200).json({ ok: true, id: docRef.id, notified: emailed });
});
//# sourceMappingURL=website_contact.js.map