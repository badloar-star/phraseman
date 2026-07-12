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
import { createHmac, timingSafeEqual } from 'crypto';
import { onRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { defineString } from 'firebase-functions/params';

const REGION = 'us-central1';

/**
 * Секрет для подписи ссылок отписки. Задай в functions/.env как
 * EMAIL_UNSUBSCRIBE_SECRET (длинная случайная строка). Дефолт — заглушка,
 * рассылку на реальных людей запускать только с заданным секретом.
 */
const unsubscribeSecret = defineString('EMAIL_UNSUBSCRIBE_SECRET', {
  default: 'UNCONFIGURED',
});

/**
 * Previous signing secret used only during credential rotation. New links are
 * never signed with it; keeping it temporarily prevents already delivered
 * unsubscribe links from breaking while the current secret is replaced.
 */
const previousUnsubscribeSecret = defineString('EMAIL_UNSUBSCRIBE_PREVIOUS_SECRET', {
  default: '',
});

/**
 * Базовый публичный URL функций, от которого строится ссылка отписки.
 * По умолчанию — стандартный хост Cloud Functions проекта.
 */
const unsubscribeBaseUrl = defineString('EMAIL_UNSUBSCRIBE_BASE_URL', {
  default: 'https://knowlyapps.com/unsubscribe',
});

export const EMAIL_UNSUBSCRIBE_PLACEHOLDER_SECRET = 'UNCONFIGURED';

export interface MarketingEmailConfiguration {
  unsubscribeSecret: string;
  unsubscribeBaseUrl: string;
  from: string;
}

export function validateMarketingEmailConfiguration(input: MarketingEmailConfiguration): { ok: true } | { ok: false; error: string } {
  const secret = String(input.unsubscribeSecret || '').trim();
  if (secret.length < 32 || secret === EMAIL_UNSUBSCRIBE_PLACEHOLDER_SECRET || /change[-_ ]?me/i.test(secret)) {
    return { ok: false, error: 'email_unsubscribe_secret_not_configured' };
  }
  try {
    const url = new URL(String(input.unsubscribeBaseUrl || '').trim());
    if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) {
      return { ok: false, error: 'email_unsubscribe_url_not_secure' };
    }
  } catch {
    return { ok: false, error: 'email_unsubscribe_url_not_secure' };
  }
  const from = String(input.from || '').trim();
  const match = from.match(/<([^<>]+)>\s*$/);
  const address = normalizeEmail(match ? match[1] : from);
  if (!address || address === 'onboarding@resend.dev' || address.endsWith('@resend.dev')) {
    return { ok: false, error: 'admin_email_sender_not_approved' };
  }
  return { ok: true };
}

export function assertMarketingEmailConfiguration(from: string): void {
  const result = validateMarketingEmailConfiguration({
    unsubscribeSecret: unsubscribeSecret.value(),
    unsubscribeBaseUrl: unsubscribeBaseUrl.value(),
    from,
  });
  if (!result.ok) throw new Error(result.error);
}

const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

const SUPPRESSIONS_COLLECTION = 'email_suppressions';

export function normalizeEmail(value: unknown): string | null {
  const email = String(value ?? '').trim().toLowerCase().slice(0, 320);
  return EMAIL_RE.test(email) ? email : null;
}

export function suppressionDocId(email: string): string {
  return createHmac('sha256', 'phraseman-suppress-id')
    .update(email.trim().toLowerCase())
    .digest('hex')
    .slice(0, 48);
}

/** Подпись email указанным секретом (первые 32 hex-символа HMAC-SHA256). */
export function unsubscribeTokenWithSecret(email: string, secret: string): string {
  return createHmac('sha256', secret)
    .update(email.trim().toLowerCase())
    .digest('hex')
    .slice(0, 32);
}

function tokenMatches(expected: string, token: string): boolean {
  const given = String(token || '').toLowerCase();
  if (given.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(given));
  } catch {
    return false;
  }
}

/** Проверка токена текущим секретом и, во время ротации, предыдущим. */
export function verifyUnsubscribeTokenWithSecrets(
  email: string,
  token: string,
  currentSecret: string,
  previousSecret = '',
): boolean {
  const currentMatches = tokenMatches(unsubscribeTokenWithSecret(email, currentSecret), token);
  const previousMatches = previousSecret
    ? tokenMatches(unsubscribeTokenWithSecret(email, previousSecret), token)
    : false;
  return currentMatches || previousMatches;
}

/** Подпись новых ссылок только текущим секретом. */
export function unsubscribeToken(email: string): string {
  return unsubscribeTokenWithSecret(email, unsubscribeSecret.value());
}

/** Timing-safe проверка токена с поддержкой безопасного переходного периода. */
export function verifyUnsubscribeToken(email: string, token: string): boolean {
  return verifyUnsubscribeTokenWithSecrets(
    email,
    token,
    unsubscribeSecret.value(),
    previousUnsubscribeSecret.value(),
  );
}

/** Готовая ссылка отписки для конкретного адреса. */
export function unsubscribeUrlFor(email: string): string {
  const base = unsubscribeBaseUrl.value();
  const query = `e=${encodeURIComponent(email)}&t=${unsubscribeToken(email)}`;
  return base.includes('?') ? `${base}&${query}` : `${base}?${query}`;
}

/** Записать адрес в suppression-список (идемпотентно). */
export async function suppressEmail(
  db: FirebaseFirestore.Firestore,
  email: string,
  reason: string,
): Promise<void> {
  const normalized = normalizeEmail(email);
  if (!normalized) return;
  const ref = db.collection(SUPPRESSIONS_COLLECTION).doc(suppressionDocId(normalized));
  await ref.set(
    {
      email: normalized,
      reason: String(reason || 'unsubscribe').slice(0, 64),
      unsubscribedAt: FieldValue.serverTimestamp(),
      unsubscribedAtIso: new Date().toISOString(),
    },
    { merge: true },
  );
}

/** Загрузить множество отписавшихся адресов (для фильтрации перед рассылкой). */
export async function loadSuppressedEmails(
  db: FirebaseFirestore.Firestore,
): Promise<Set<string>> {
  const set = new Set<string>();
  const snap = await db.collection(SUPPRESSIONS_COLLECTION).select('email').get();
  snap.forEach((doc) => {
    const email = normalizeEmail(doc.get('email'));
    if (email) set.add(email);
  });
  return set;
}

function confirmPageHtml(email: string, ok: boolean): string {
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

export async function resolveUnsubscribeRequest(input: {
  method: string;
  email: string;
  token: string;
  currentSecret: string;
  previousSecret?: string;
  persist: (email: string) => Promise<void>;
  onError?: (error: unknown) => void;
}): Promise<{ status: number; valid: boolean; persisted: boolean; email: string | null }> {
  const method = String(input.method || '').toUpperCase();
  if (method !== 'GET' && method !== 'POST') return { status: 405, valid: false, persisted: false, email: null };
  const email = normalizeEmail(input.email);
  const valid = !!email && verifyUnsubscribeTokenWithSecrets(email, input.token, input.currentSecret, input.previousSecret || '');
  if (!valid || !email) return { status: 400, valid: false, persisted: false, email };
  try {
    await input.persist(email);
    return { status: 200, valid: true, persisted: true, email };
  } catch (error) {
    input.onError?.(error);
    return { status: 503, valid: true, persisted: false, email };
  }
}

/**
 * Публичная функция отписки.
 * GET  ?e=<email>&t=<token> — клик по ссылке из письма → HTML-страница.
 * POST ?e=<email>&t=<token> — one-click (RFC 8058, List-Unsubscribe-Post) → 200.
 */
export const emailUnsubscribe = onRequest(
  { region: REGION, cors: true, memory: '256MiB' },
  async (req, res) => {
    const method = String(req.method || 'GET').toUpperCase();
    if (method !== 'GET' && method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }
    const rawEmail =
      (req.query.e as string) || (req.body && (req.body.e as string)) || '';
    const rawToken =
      (req.query.t as string) || (req.body && (req.body.t as string)) || '';
    const outcome = await resolveUnsubscribeRequest({
      method,
      email: rawEmail,
      token: rawToken,
      currentSecret: unsubscribeSecret.value(),
      previousSecret: previousUnsubscribeSecret.value(),
      persist: (normalized) => suppressEmail(getFirestore(), normalized, 'user_unsubscribe'),
      onError: (error) => logger.error('emailUnsubscribe suppress failed', error),
    });
    const success = outcome.valid && outcome.persisted;
    if (method === 'POST') {
      res.status(outcome.status).send(success ? 'OK' : outcome.status === 503 ? 'RETRY' : 'INVALID');
      return;
    }
    res
      .status(outcome.status)
      .set('Content-Type', 'text/html; charset=utf-8')
      .send(confirmPageHtml(outcome.email || rawEmail, success));
    return;
  },
);
