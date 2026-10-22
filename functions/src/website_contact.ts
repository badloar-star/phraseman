import { onRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { defineString } from 'firebase-functions/params';
import { createHash } from 'crypto';
import { RESEND_API_KEY } from './resend_secret';
import { swallowed } from './swallowed_error';

/** Опционально: ключ Resend для письма на почту при новом обращении (Firebase params / secrets env). */
const notifyEmail = defineString('WEB_CONTACT_NOTIFY_EMAIL', { default: 'support.phraseman@gmail.com' });
const contactEmailFrom = defineString('WEB_CONTACT_EMAIL_FROM', { default: '' });

const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

const RATE_COLLECTION = 'website_contact_rate_limits';
const IP_RATE_WINDOW_MS = 10 * 60 * 1000;
const IP_RATE_MAX = 3;
const IP_RATE_BLOCK_MS = 30 * 60 * 1000;
const EMAIL_RATE_WINDOW_MS = 24 * 60 * 60 * 1000;
const EMAIL_RATE_MAX = 6;
const EMAIL_RATE_BLOCK_MS = 24 * 60 * 60 * 1000;

function pickAllowOrigin(origin: string | undefined): string {
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
  if (!origin) return '*';
  if (allow.has(origin)) return origin;
  if (/\.web\.app$/.test(origin)) return origin;
  if (/\.firebaseapp\.com$/.test(origin)) return origin;
  return '*';
}

function hashForDocId(scope: string, raw: string): string {
  return `${scope}_${createHash('sha256').update(raw).digest('hex').slice(0, 48)}`;
}

function firstHeader(value: string | string[] | undefined): string {
  return Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '');
}

function clientIp(req: { headers: Record<string, string | string[] | undefined>; ip?: string; socket?: { remoteAddress?: string } }): string {
  const forwarded = firstHeader(req.headers['x-forwarded-for']).split(',')[0]?.trim();
  const fastly = firstHeader(req.headers['fastly-client-ip']).trim();
  const cloudflare = firstHeader(req.headers['cf-connecting-ip']).trim();
  return forwarded || fastly || cloudflare || req.ip || req.socket?.remoteAddress || 'unknown';
}

function readNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

type ContactRateCheck = {
  docId: string;
  windowMs: number;
  max: number;
  blockMs: number;
};

async function reserveContactRateLimit(
  db: FirebaseFirestore.Firestore,
  checks: ContactRateCheck[],
  now: number,
): Promise<number | null> {
  return db.runTransaction(async (tx) => {
    const refs = checks.map((check) => db.collection(RATE_COLLECTION).doc(check.docId));
    const snaps = await Promise.all(refs.map((ref) => tx.get(ref)));
    let retryAfterMs = 0;
    const blockIndexes: number[] = [];

    snaps.forEach((snap, index) => {
      const check = checks[index];
      const data = snap.data() || {};
      const blockedUntilMs = readNumber(data.blockedUntilMs);
      if (blockedUntilMs > now) {
        retryAfterMs = Math.max(retryAfterMs, blockedUntilMs - now);
        blockIndexes.push(index);
        return;
      }

      const windowStartMs = readNumber(data.windowStartMs);
      const count = now - windowStartMs < check.windowMs ? readNumber(data.count) : 0;
      if (count >= check.max) {
        retryAfterMs = Math.max(retryAfterMs, check.blockMs);
        blockIndexes.push(index);
      }
    });

    if (retryAfterMs > 0) {
      blockIndexes.forEach((index) => {
        tx.set(refs[index], {
          blockedUntilMs: now + retryAfterMs,
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      });
      return Math.max(1, Math.ceil(retryAfterMs / 1000));
    }

    snaps.forEach((snap, index) => {
      const check = checks[index];
      const data = snap.data() || {};
      const windowStartMs = readNumber(data.windowStartMs);
      const sameWindow = now - windowStartMs < check.windowMs;
      tx.set(refs[index], {
        windowStartMs: sameWindow ? windowStartMs : now,
        count: sameWindow ? readNumber(data.count) + 1 : 1,
        blockedUntilMs: 0,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    });

    return null;
  });
}

async function notifyViaResend(subject: string, text: string): Promise<boolean> {
  const key = RESEND_API_KEY.value();
  if (!key) return false;
  const from = contactEmailFrom.value().trim();
  if (!from) return false;
  const to = notifyEmail.value();
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
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
  } catch (e) {
    logger.warn('website_contact_resend_error', e);
    return false;
  }
}

/**
 * Акция «Два года Plus за видео» (владелец 22.10): заявка идёт в тот же website_contact_inbox, тема video_promo.
 * зачем: участник не ищет, куда писать, — кнопка на /contact/?topic=video-promo. Сервер сам определяет соцсеть по ссылке
 * и пускает только открытые публикации пяти сетей из условий акции. Почта для ответа — по желанию.
 */
export type VideoPromoNetwork = 'instagram' | 'tiktok' | 'facebook' | 'youtube' | 'threads';
const VIDEO_PROMO_HOSTS: ReadonlyArray<readonly [VideoPromoNetwork, readonly string[]]> = [
  ['instagram', ['instagram.com']],
  ['tiktok', ['tiktok.com']],
  ['facebook', ['facebook.com', 'fb.watch']],
  ['youtube', ['youtube.com', 'youtu.be']],
  ['threads', ['threads.net', 'threads.com']],
];
const VIDEO_PROMO_USERNAME_RE = /^[\p{L}\p{N}_.\- ]{2,40}$/u;

/** Соцсеть по ссылке на публикацию; null — не https или не одна из пяти сетей акции. */
export function videoPromoNetwork(rawUrl: string): VideoPromoNetwork | null {
  let url: URL;
  try { url = new URL(rawUrl); } catch { return null; }
  if (url.protocol !== 'https:' || url.username || url.password) return null;
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  for (const [network, roots] of VIDEO_PROMO_HOSTS) {
    if (roots.some((root) => host === root || host.endsWith(`.${root}`))) {
      // Ссылка именно на публикацию, а не на главную страницу сети.
      return url.pathname.replace(/\/+$/, '').length > 1 ? network : null;
    }
  }
  return null;
}

export type VideoPromoEntry = Readonly<{ postUrl: string; network: VideoPromoNetwork; username: string; disclosed: true }>;
export type VideoPromoParse = Readonly<{ ok: true; entry: VideoPromoEntry } | { ok: false; error: string }>;

export function parseVideoPromo(body: Record<string, unknown>): VideoPromoParse {
  const postUrl = String(body.postUrl ?? '').trim().slice(0, 600);
  const network = videoPromoNetwork(postUrl);
  if (!network) return { ok: false, error: 'invalid_post_url' };
  const username = String(body.username ?? '').trim().replace(/^@+/, '').replace(/\s+/g, ' ').slice(0, 41);
  if (!VIDEO_PROMO_USERNAME_RE.test(username)) return { ok: false, error: 'invalid_username' };
  if (body.disclosed !== true) return { ok: false, error: 'disclosure_required' };
  return { ok: true, entry: { postUrl, network, username, disclosed: true } };
}

export function videoPromoMessage(entry: VideoPromoEntry): string {
  return `Акция с видео\nПубликация: ${entry.postUrl}\nСоцсеть: ${entry.network}\nUsername в Phraseman: ${entry.username}\nОбозначил(а) участие: да`;
}

export const submitWebsiteContact = onRequest(
  {
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 30,
    maxInstances: 10,
    invoker: 'public',
    secrets: [RESEND_API_KEY],
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

    let body: Record<string, unknown> = {};
    if (typeof req.body === 'object' && req.body !== null && !Array.isArray(req.body)) {
      body = req.body as Record<string, unknown>;
    } else if (typeof req.body === 'string') {
      try {
        body = JSON.parse(req.body || '{}');
      } catch {
        res.status(400).json({ ok: false, error: 'invalid_json' });
        return;
      }
    }

    const trap =
      typeof body.company === 'string'
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
    let message = String(body.message ?? '')
      .trim()
      .slice(0, 5000);
    const name = String(body.name ?? '')
      .trim()
      .slice(0, 120);
    const topicRaw = String(body.topic ?? 'support')
      .trim()
      .toLowerCase();
    const topic = ['support', 'feedback', 'legal', 'other', 'video_promo'].includes(topicRaw) ? topicRaw : 'support';
    const pageUrl = String(body.pageUrl ?? '').slice(0, 2000);

    let promo: VideoPromoEntry | null = null;
    if (topic === 'video_promo') {
      const parsed = parseVideoPromo(body);
      if (!parsed.ok) {
        logger.warn('[VIDEO-PROMO] rejected', { reason: parsed.error });
        res.status(400).json({ ok: false, error: parsed.error });
        return;
      }
      promo = parsed.entry;
      message = videoPromoMessage(promo);
      // Почта в акции — по желанию; если указана, должна быть настоящей.
      if (email && !EMAIL_RE.test(email)) {
        res.status(400).json({ ok: false, error: 'invalid_email' });
        return;
      }
    } else {
      if (!EMAIL_RE.test(email)) {
        res.status(400).json({ ok: false, error: 'invalid_email' });
        return;
      }
      if (message.length < 10) {
        res.status(400).json({ ok: false, error: 'message_too_short' });
        return;
      }
    }

    const db = getFirestore();
    const ua = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'].slice(0, 420) : '';
    const forwarded = typeof req.headers['x-forwarded-for'] === 'string' ? req.headers['x-forwarded-for'].slice(0, 200) : '';
    const ipKey = hashForDocId('ip', clientIp(req).toLowerCase());
    // Без почты (акция с видео) второй ключ — username: тот же потолок заявок в сутки.
    const emailKey = email ? hashForDocId('email', email.toLowerCase()) : hashForDocId('promo_user', String(promo?.username ?? '').toLowerCase());
    const retryAfter = await reserveContactRateLimit(db, [
      { docId: ipKey, windowMs: IP_RATE_WINDOW_MS, max: IP_RATE_MAX, blockMs: IP_RATE_BLOCK_MS },
      { docId: emailKey, windowMs: EMAIL_RATE_WINDOW_MS, max: EMAIL_RATE_MAX, blockMs: EMAIL_RATE_BLOCK_MS },
    ], Date.now());

    if (retryAfter != null) {
      res.set('Retry-After', String(retryAfter));
      res.status(429).json({ ok: false, error: 'rate_limited' });
      return;
    }

    const docRef = await db.collection('website_contact_inbox').add({
      email: email || null,
      message,
      name: name || null,
      topic,
      pageUrl: pageUrl || null,
      status: 'new',
      createdAt: FieldValue.serverTimestamp(),
      meta: { ua, forwarded },
      ...(promo ? { promo } : {}),
    });

    const subject = `[PhraseMan web · ${topic}] ${email || promo?.username || '—'}`;
    const text = `From: ${name || '—'} <${email || '—'}>\nTopic: ${topic}\nPage: ${pageUrl || '—'}\n\n${message}\n\n— id: ${docRef.id}`;
    const emailed = await notifyViaResend(subject, text);
    if (emailed) {
      await docRef.update({ emailNotifiedAt: FieldValue.serverTimestamp() }).catch(swallowed('website_contact:( emailNotifiedAt FieldValue.serverTimestamp() )', undefined));
    }

    res.status(200).json({ ok: true, id: docRef.id, notified: emailed });
  },
);
