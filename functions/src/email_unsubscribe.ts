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
import { defineSecret, defineString } from 'firebase-functions/params';

const REGION = 'us-central1';

/**
 * Секрет для подписи ссылок отписки — Google Secret Manager, не .env.
 *
 * зачем: раньше здесь был defineString с дефолтной строкой прямо в коде
 * (см. коммит этой правки). Дефолт срабатывал МОЛЧА:
 * деплой из окружения без functions/.env (CI, чужая машина, новый проект)
 * не падал, а начинал подписывать ссылки строкой из открытого исходника —
 * любой мог подделать HMAC и массово отписать чужие адреса. defineSecret
 * без дефолта делает такой деплой невозможным: Firebase требует значение.
 * Эталон рядом — RESEND_API_KEY и AUTH_RECOVERY_CHALLENGE_HMAC_KEY_*.
 *
 * Любая функция, которая строит или проверяет ссылку отписки, ОБЯЗАНА
 * перечислить оба секрета в своих `secrets: [...]` — иначе рантайм их не
 * увидит и .value() вернёт пустую строку.
 */
export const EMAIL_UNSUBSCRIBE_SECRET = defineSecret('EMAIL_UNSUBSCRIBE_SECRET');

/**
 * Предыдущий секрет — принимается ТОЛЬКО при проверке, никогда не подписывает.
 *
 * зачем: без него ротация секрета разом ломает все уже разосланные письма —
 * человек жмёт «Отписаться» в старом письме и видит «Ссылка недействительна».
 * Для писем с заголовком List-Unsubscribe-Post: One-Click это прямой путь к
 * жалобам на спам: Gmail и Yahoo требуют, чтобы one-click реально работал.
 * Переменная EMAIL_UNSUBSCRIBE_PREVIOUS_SECRET лежала в functions/.env с
 * 26.07.2026, но кодом не читалась — ротацию заготовили и не дописали.
 * Пустое значение допустимо и означает «ротации не было».
 */
export const EMAIL_UNSUBSCRIBE_PREVIOUS_SECRET = defineSecret(
  'EMAIL_UNSUBSCRIBE_PREVIOUS_SECRET',
);

/** Все секреты отписки — подключать в `secrets:` каждой функции-потребителя. */
export const EMAIL_UNSUBSCRIBE_SECRETS = [
  EMAIL_UNSUBSCRIBE_SECRET,
  EMAIL_UNSUBSCRIBE_PREVIOUS_SECRET,
] as const;

/**
 * Значение секрета с явным отказом вместо тихой заглушки.
 * Пустой секрет — это неверная конфигурация, а не «подпишем чем-нибудь».
 */
function requireCurrentSecret(): string {
  const value = String(EMAIL_UNSUBSCRIBE_SECRET.value() || '').trim();
  if (!value) {
    throw new Error(
      'EMAIL_UNSUBSCRIBE_SECRET is not configured — ' +
        'set it in Secret Manager and list it in the function secrets[]',
    );
  }
  return value;
}

/** Прошлый секрет; пустая строка — ротации не было, это нормально. */
function previousSecretOrEmpty(): string {
  return String(EMAIL_UNSUBSCRIBE_PREVIOUS_SECRET.value() || '').trim();
}

function signWith(secret: string, email: string): string {
  return createHmac('sha256', secret)
    .update(email.trim().toLowerCase())
    .digest('hex')
    .slice(0, 32);
}

/**
 * Базовый публичный URL функций, от которого строится ссылка отписки.
 * По умолчанию — стандартный хост Cloud Functions проекта.
 */
const unsubscribeBaseUrl = defineString('EMAIL_UNSUBSCRIBE_BASE_URL', {
  default: 'https://knowlyapps.com/unsubscribe',
});

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

/**
 * Подпись email для ссылки отписки (первые 32 hex-символа HMAC-SHA256).
 * Подписываем ВСЕГДА текущим секретом — прошлый только принимается.
 */
export function unsubscribeToken(email: string): string {
  return signWith(requireCurrentSecret(), email);
}

/**
 * Timing-safe проверка токена: сначала текущий секрет, затем — прошлый.
 *
 * зачем: обе ветки считаются одинаково длинным сравнением, чтобы по времени
 * ответа нельзя было понять, каким секретом подписана ссылка.
 */
export function verifyUnsubscribeToken(email: string, token: string): boolean {
  const given = String(token || '').toLowerCase();
  // зачем: НЕ requireCurrentSecret() — это публичный HTTP-обработчик, и при
  // неверной конфигурации он обязан ответить «ссылка недействительна»,
  // а не упасть в 500. Падать на пустом секрете должна только подпись.
  const current = String(EMAIL_UNSUBSCRIBE_SECRET.value() || '').trim();
  const candidates = [current, previousSecretOrEmpty()].filter(Boolean);
  let matched = false;
  for (const secret of candidates) {
    const expected = signWith(secret, email);
    if (given.length !== expected.length) continue;
    try {
      if (timingSafeEqual(Buffer.from(expected), Buffer.from(given))) matched = true;
    } catch {
      // повреждённый ввод — просто не совпал
    }
  }
  return matched;
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

/**
 * Публичная функция отписки.
 * GET  ?e=<email>&t=<token> — клик по ссылке из письма → HTML-страница.
 * POST ?e=<email>&t=<token> — one-click (RFC 8058, List-Unsubscribe-Post) → 200.
 */
export const emailUnsubscribe = onRequest(
  {
    region: REGION,
    cors: true,
    memory: '256MiB',
    // зачем: без secrets[] рантайм не увидит значения и .value() вернёт пусто
    secrets: [...EMAIL_UNSUBSCRIBE_SECRETS],
  },
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
    const email = normalizeEmail(rawEmail);
    const valid = !!email && verifyUnsubscribeToken(email, rawToken);

    if (valid && email) {
      try {
        await suppressEmail(getFirestore(), email, 'user_unsubscribe');
      } catch (error) {
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
  },
);
