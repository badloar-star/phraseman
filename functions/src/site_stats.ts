import { onRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { createHash } from 'crypto';

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

const BOT_UA_RE =
  /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|pingdom|uptime|monitor|preview|facebookexternalhit|telegrambot|whatsapp|curl\/|wget\//i;

const EVENT_FIELDS: Record<string, string> = {
  visit: 'visits',
  view: 'views',
  click_ios: 'clicks_ios',
  click_android: 'clicks_android',
};

function pickAllowOrigin(origin: string | undefined): string {
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
  if (!origin) return '*';
  if (allow.has(origin)) return origin;
  if (/\.web\.app$/.test(origin)) return origin;
  if (/\.firebaseapp\.com$/.test(origin)) return origin;
  return '*';
}

function firstHeader(value: string | string[] | undefined): string {
  return Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '');
}

function clientIp(req: { headers: Record<string, string | string[] | undefined>; ip?: string; socket?: { remoteAddress?: string } }): string {
  const forwarded = firstHeader(req.headers['x-forwarded-for']).split(',')[0]?.trim();
  return forwarded || req.ip || req.socket?.remoteAddress || 'unknown';
}

function readNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** /, /download/, /contact/, /legal/* → корзина для разбивки просмотров по страницам. */
function pageBucket(rawPage: unknown): string {
  const page = String(rawPage ?? '').slice(0, 200);
  if (page === '/' || page === '/index.html') return 'home';
  if (page.startsWith('/download')) return 'download';
  if (page.startsWith('/contact')) return 'contact';
  if (page.startsWith('/legal')) return 'legal';
  return 'other';
}

function utcDayKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/** true = лимит не превышен, событие можно засчитать. */
async function reserveRate(db: FirebaseFirestore.Firestore, ipHash: string, now: number): Promise<boolean> {
  const ref = db.collection(RATE_COLLECTION).doc(ipHash);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data() || {};
    const blockedUntilMs = readNumber(data.blockedUntilMs);
    if (blockedUntilMs > now) return false;

    const windowStartMs = readNumber(data.windowStartMs);
    const sameWindow = now - windowStartMs < IP_RATE_WINDOW_MS;
    const count = sameWindow ? readNumber(data.count) : 0;
    if (count >= IP_RATE_MAX) {
      tx.set(ref, { blockedUntilMs: now + IP_RATE_BLOCK_MS, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      return false;
    }
    tx.set(ref, {
      windowStartMs: sameWindow ? windowStartMs : now,
      count: count + 1,
      blockedUntilMs: 0,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return true;
  });
}

export const siteStatsTrack = onRequest(
  {
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 15,
    maxInstances: 10,
    invoker: 'public',
  },
  async (req, res) => {
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
    let body: Record<string, unknown> = {};
    if (typeof req.body === 'object' && req.body !== null && !Array.isArray(req.body)) {
      body = req.body as Record<string, unknown>;
    } else if (typeof req.body === 'string' || Buffer.isBuffer(req.body)) {
      try {
        body = JSON.parse(String(req.body) || '{}');
      } catch {
        res.status(400).json({ ok: false, error: 'invalid_json' });
        return;
      }
    }

    const db = getFirestore();

    // debug=true: ничего не пишет, возвращает текущие totals — для проверки проводки.
    if (body.debug === true) {
      const totalsSnap = await db.collection(STATS_COLLECTION).doc('totals').get();
      res.status(200).json({ ok: true, debug: true, totals: totalsSnap.data() || {} });
      return;
    }

    const type = String(body.type ?? '');
    const field = EVENT_FIELDS[type];
    if (!field) {
      res.status(400).json({ ok: false, error: 'invalid_type' });
      return;
    }

    const ua = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : '';
    if (!ua || BOT_UA_RE.test(ua)) {
      res.status(200).json({ ok: true, skipped: 'bot' });
      return;
    }

    const ipHash = `ip_${createHash('sha256').update(clientIp(req).toLowerCase()).digest('hex').slice(0, 48)}`;
    let allowed = true;
    try {
      allowed = await reserveRate(db, ipHash, Date.now());
    } catch (e) {
      logger.warn('site_stats_rate_error', e);
    }
    if (!allowed) {
      res.status(200).json({ ok: true, skipped: 'rate_limited' });
      return;
    }

    const now = new Date();
    const dayKey = utcDayKey(now);
    const bucket = pageBucket(body.page);

    const inc: Record<string, unknown> = {
      [field]: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (type === 'view') {
      inc[`views_${bucket}`] = FieldValue.increment(1);
    }

    try {
      const batch = db.batch();
      batch.set(db.collection(STATS_COLLECTION).doc(`daily_${dayKey}`), { ...inc, date: dayKey }, { merge: true });
      batch.set(db.collection(STATS_COLLECTION).doc('totals'), inc, { merge: true });
      await batch.commit();
    } catch (e) {
      logger.error('site_stats_write_failed', e);
      res.status(500).json({ ok: false, error: 'write_failed' });
      return;
    }

    res.status(200).json({ ok: true });
  },
);
