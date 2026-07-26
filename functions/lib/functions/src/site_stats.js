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
exports.siteStatsTrack = void 0;
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const firestore_1 = require("firebase-admin/firestore");
const crypto_1 = require("crypto");
/**
 * Счётчик посещений сайта knowlyapps.com и кликов по кнопкам сторов.
 * Сайт шлёт beacon-события (см. knowly-www/assets/stats.js), функция агрегирует
 * их в Firestore: site_stats/daily_YYYY-MM-DD (UTC) + site_stats/totals.
 * Никаких персональных данных не сохраняется — только инкременты счётчиков.
 */
const STATS_COLLECTION = 'site_stats';
const RATE_COLLECTION = 'site_stats_rate_limits';
const IP_RATE_WINDOW_MS = 10 * 60 * 1000;
const IP_RATE_MAX = 200;
const IP_RATE_BLOCK_MS = 30 * 60 * 1000;
const BOT_UA_RE = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|pingdom|uptime|monitor|preview|facebookexternalhit|telegrambot|whatsapp|curl\/|wget\//i;
const EVENT_FIELDS = {
    visit: 'visits',
    view: 'views',
    click_ios: 'clicks_ios',
    click_android: 'clicks_android',
    // Воронка /start/ (квиз → пейвол → оплата), см. knowly-www/assets/start.js
    quiz_start: 'quiz_starts',
    quiz_complete: 'quiz_completes',
    paywall_view: 'paywall_views',
    checkout_click: 'checkout_clicks',
    purchase_thanks: 'purchase_thanks',
};
function pickAllowOrigin(origin) {
    const allow = new Set([
        'https://knowlyapps.com',
        'https://www.knowlyapps.com',
        'https://knowlyapps.web.app',
        'https://phraseman-ea0b3.web.app',
        'https://phraseman-ea0b3.firebaseapp.com',
        'http://localhost:5000',
        'http://127.0.0.1:5000',
        'http://localhost:8841',
        'http://127.0.0.1:8841',
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
function firstHeader(value) {
    return Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '');
}
function clientIp(req) {
    const forwarded = firstHeader(req.headers['x-forwarded-for']).split(',')[0]?.trim();
    return forwarded || req.ip || req.socket?.remoteAddress || 'unknown';
}
function readNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}
/** /, /download/, /contact/, /legal/* → корзина для разбивки просмотров по страницам. */
function pageBucket(rawPage) {
    const page = String(rawPage ?? '').slice(0, 200);
    if (page === '/' || page === '/index.html')
        return 'home';
    if (page.startsWith('/start'))
        return 'start';
    if (page.startsWith('/download'))
        return 'download';
    if (page.startsWith('/contact'))
        return 'contact';
    if (page.startsWith('/legal'))
        return 'legal';
    return 'other';
}
function utcDayKey(now) {
    return now.toISOString().slice(0, 10);
}
/** true = лимит не превышен, событие можно засчитать. */
async function reserveRate(db, ipHash, now) {
    const ref = db.collection(RATE_COLLECTION).doc(ipHash);
    return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const data = snap.data() || {};
        const blockedUntilMs = readNumber(data.blockedUntilMs);
        if (blockedUntilMs > now)
            return false;
        const windowStartMs = readNumber(data.windowStartMs);
        const sameWindow = now - windowStartMs < IP_RATE_WINDOW_MS;
        const count = sameWindow ? readNumber(data.count) : 0;
        if (count >= IP_RATE_MAX) {
            tx.set(ref, { blockedUntilMs: now + IP_RATE_BLOCK_MS, updatedAt: firestore_1.FieldValue.serverTimestamp() }, { merge: true });
            return false;
        }
        tx.set(ref, {
            windowStartMs: sameWindow ? windowStartMs : now,
            count: count + 1,
            blockedUntilMs: 0,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        }, { merge: true });
        return true;
    });
}
exports.siteStatsTrack = (0, https_1.onRequest)({
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 15,
    maxInstances: 10,
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
    // sendBeacon шлёт text/plain — тело приходит строкой; fetch шлёт application/json.
    let body = {};
    if (typeof req.body === 'object' && req.body !== null && !Array.isArray(req.body)) {
        body = req.body;
    }
    else if (typeof req.body === 'string' || Buffer.isBuffer(req.body)) {
        try {
            body = JSON.parse(String(req.body) || '{}');
        }
        catch {
            res.status(400).json({ ok: false, error: 'invalid_json' });
            return;
        }
    }
    const db = (0, firestore_1.getFirestore)();
    // debug=true: nothing is written. Do not expose internal totals from this public endpoint.
    if (body.debug === true) {
        res.status(200).json({ ok: true, debug: true });
        return;
    }
    const rawEvents = Array.isArray(body.events) ? body.events.slice(0, 8) : [body];
    const counts = {};
    for (const event of rawEvents) {
        if (!event || typeof event !== 'object' || Array.isArray(event)) {
            res.status(400).json({ ok: false, error: 'invalid_event' });
            return;
        }
        const row = event;
        const type = String(row.type ?? '');
        const field = EVENT_FIELDS[type];
        if (!field) {
            res.status(400).json({ ok: false, error: 'invalid_type' });
            return;
        }
        counts[field] = (counts[field] || 0) + 1;
        if (type === 'view') {
            const bucket = pageBucket(row.page);
            counts[`views_${bucket}`] = (counts[`views_${bucket}`] || 0) + 1;
        }
    }
    if (Object.keys(counts).length === 0) {
        res.status(400).json({ ok: false, error: 'invalid_type' });
        return;
    }
    const ua = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : '';
    if (!ua || BOT_UA_RE.test(ua)) {
        res.status(200).json({ ok: true, skipped: 'bot' });
        return;
    }
    const ipHash = `ip_${(0, crypto_1.createHash)('sha256').update(clientIp(req).toLowerCase()).digest('hex').slice(0, 48)}`;
    let allowed = true;
    try {
        allowed = await reserveRate(db, ipHash, Date.now());
    }
    catch (e) {
        logger.warn('site_stats_rate_error', e);
    }
    if (!allowed) {
        res.status(200).json({ ok: true, skipped: 'rate_limited' });
        return;
    }
    const now = new Date();
    const dayKey = utcDayKey(now);
    const inc = {
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    };
    for (const [field, count] of Object.entries(counts)) {
        inc[field] = firestore_1.FieldValue.increment(count);
    }
    try {
        const batch = db.batch();
        batch.set(db.collection(STATS_COLLECTION).doc(`daily_${dayKey}`), { ...inc, date: dayKey }, { merge: true });
        batch.set(db.collection(STATS_COLLECTION).doc('totals'), inc, { merge: true });
        await batch.commit();
    }
    catch (e) {
        logger.error('site_stats_write_failed', e);
        res.status(500).json({ ok: false, error: 'write_failed' });
        return;
    }
    res.status(200).json({ ok: true });
});
//# sourceMappingURL=site_stats.js.map