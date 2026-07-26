// ============================================================================
// web_checkout.ts — оплата Premium с сайта (квиз-воронка knowlyapps.com/start/).
//
// ⛔ ПОЛИТИКА (зеркало telegram_premium_bot.ts): выдача премиума по веб-оплате —
// ТОЛЬКО ВРУЧНУЮ. Здесь НЕ автоматизируется активация: оплата записывает заявку
// в web_premium_orders (status='paid_pending_manual_activation') и уведомляет
// админов в Telegram. Реальную выдачу делает человек через админку.
//
// Провайдеры (без npm-зависимостей, чистый REST через global fetch, Node 22):
//   - Stripe Checkout (карты): webCheckoutCreate → redirect, stripeWebhook → заявка.
//   - PayPal Orders v2: paypalOrderCreate → кнопки на сайте, paypalOrderCapture → заявка.
//
// Секреты (firebase functions:secrets:set):
//   STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET
//   (+ переиспользуется PHRASEMAN_PREMIUM_BOT_TOKEN для уведомления админов).
//
// Цены: Firestore web_checkout/config { priceCents: {monthly,yearly,lifetime},
//   currency, paypalLive } — с дефолтами ниже. Клиентские цены (site-config.js
//   webPrices) — только отображение; списывается ВСЕГДА серверная цена.
// ============================================================================
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { defineSecret, defineString } from 'firebase-functions/params';
import { onRequest } from 'firebase-functions/v2/https';

import { upsertEmailContact } from './email_contacts';
import { RESEND_API_KEY } from './resend_secret';
import { buildPromoVipPatch } from './promo_codes';

const REGION = 'us-central1';
const ORDERS_COLLECTION = 'web_premium_orders';
const DEAD_LETTER_COLLECTION = 'web_checkout_dead_letter';
const CONFIG_DOC = 'web_checkout/config';
const TELEGRAM_ADMIN_CONFIG_DOC = 'telegram_premium_bot/config';
const SITE_ORIGIN = 'https://knowlyapps.com';

const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY');
const STRIPE_WEBHOOK_SECRET = defineSecret('STRIPE_WEBHOOK_SECRET');
const PAYPAL_CLIENT_ID = defineSecret('PAYPAL_CLIENT_ID');
const PAYPAL_CLIENT_SECRET = defineSecret('PAYPAL_CLIENT_SECRET');
const PHRASEMAN_PREMIUM_BOT_TOKEN = defineSecret('PHRASEMAN_PREMIUM_BOT_TOKEN');
const webCheckoutEmailFrom = defineString('WEB_CHECKOUT_EMAIL_FROM', { default: '' });
const webCheckoutSupportEmail = defineString('WEB_CHECKOUT_SUPPORT_EMAIL', { default: 'support.phraseman@gmail.com' });

type WebPlan = 'monthly' | 'yearly' | 'lifetime';

const PLAN_LABELS: Record<WebPlan, string> = {
  monthly: 'месяц',
  yearly: 'год',
  lifetime: 'навсегда',
};

// зачем: владелец 2026-07-26 — на витрине и в письмах продукты называются
// «Phraseman Plus» (подписочные периоды) и «Phraseman Pro» (разовая, навсегда).
// Внутренние ключи планов (monthly/yearly/lifetime) НЕ меняются — на них
// завязаны цены, вебхуки и админка.
export function productNameForPlan(plan: WebPlan, gift: boolean): string {
  const base = plan === 'lifetime' ? 'Phraseman Pro — навсегда' : `Phraseman Plus — ${PLAN_LABELS[plan]}`;
  return gift ? `${base} (подарок)` : base;
}

/** Название подарка на сертификате: «Год Phraseman Plus», «Phraseman Pro — навсегда». */
export function giftPlanTitle(plan: WebPlan): string {
  if (plan === 'lifetime') return 'Phraseman Pro — навсегда';
  return plan === 'monthly' ? 'Месяц Phraseman Plus' : 'Год Phraseman Plus';
}

// зачем: владелец 2026-07-26 — подарочный код действует 12 месяцев (стандарт
// сертификатов); обычные коды покупки «себе» остаются бессрочными, как раньше.
export const GIFT_CODE_TTL_DAYS = 365;

export function giftCodeExpiryMs(nowMs: number, gift: boolean): number {
  return gift ? nowMs + GIFT_CODE_TTL_DAYS * 24 * 60 * 60 * 1000 : 0;
}

const DEFAULT_PRICE_CENTS: Record<WebPlan, number> = {
  monthly: 999,
  yearly: 4999,
  lifetime: 9999,
};

/**
 * Награда кода активации по тарифу. Код создаётся автоматически при оплате и
 * активируется юзером в приложении (Настройки → Промокоды → promoCodeRedeem):
 * тот же VIP-механизм, что у рефералов/админ-выдачи. Ручная активация из
 * админки остаётся запасным путём (заявка в web_premium_orders никуда не девается).
 */
export function activationRewardForPlan(plan: WebPlan): { rewardDays: number; rewardKind: 'days' | 'lifetime' } {
  if (plan === 'lifetime') return { rewardDays: 0, rewardKind: 'lifetime' };
  return { rewardDays: plan === 'monthly' ? 31 : 366, rewardKind: 'days' };
}

// Без похожих символов (0/O, 1/I) — код вводят руками с экрана «спасибо».
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateActivationCode(): string {
  const bytes = randomBytes(10);
  let body = '';
  for (let i = 0; i < bytes.length; i += 1) {
    body += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return `WEB-${body}`;
}

interface CheckoutConfig {
  priceCents: Record<WebPlan, number>;
  currency: string;
  paypalLive: boolean;
}

function isWebPlan(value: unknown): value is WebPlan {
  return value === 'monthly' || value === 'yearly' || value === 'lifetime';
}

async function readConfig(db: FirebaseFirestore.Firestore): Promise<CheckoutConfig> {
  const fallback: CheckoutConfig = {
    priceCents: { ...DEFAULT_PRICE_CENTS },
    currency: 'usd',
    paypalLive: true,
  };
  try {
    const snap = await db.doc(CONFIG_DOC).get();
    if (!snap.exists) return fallback;
    const data = snap.data() ?? {};
    const priceCents = { ...fallback.priceCents };
    const rawPrices = (data.priceCents ?? {}) as Record<string, unknown>;
    (Object.keys(priceCents) as WebPlan[]).forEach((plan) => {
      const n = Number(rawPrices[plan]);
      if (Number.isFinite(n) && n >= 100 && n <= 1_000_000) priceCents[plan] = Math.floor(n);
    });
    return {
      priceCents,
      currency: String(data.currency ?? fallback.currency).toLowerCase().slice(0, 3) || 'usd',
      paypalLive: data.paypalLive !== false,
    };
  } catch (e) {
    logger.warn('web_checkout config read failed, using defaults', e);
    return fallback;
  }
}

/* ───────────────────────── HTTP helpers ───────────────────────── */

function pickAllowOrigin(origin: string | undefined): string {
  const allow = new Set([
    'https://knowlyapps.com',
    'https://www.knowlyapps.com',
    'http://localhost:5000',
    'http://127.0.0.1:5000',
    'http://localhost:8841',
    'http://127.0.0.1:8841',
  ]);
  if (!origin) return '*';
  if (allow.has(origin)) return origin;
  if (/\.web\.app$/.test(origin) || /\.firebaseapp\.com$/.test(origin)) return origin;
  return '*';
}

type AnyRequest = {
  method: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  rawBody?: Buffer;
};
type AnyResponse = {
  set: (key: string, value: string) => void;
  status: (code: number) => { send: (body: string) => void; json: (body: unknown) => void };
};

function applyCors(req: AnyRequest, res: AnyResponse): boolean {
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin : undefined;
  res.set('Access-Control-Allow-Origin', pickAllowOrigin(origin));
  res.set('Vary', 'Origin');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return true;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method_not_allowed' });
    return true;
  }
  return false;
}

/** Сайт шлёт fetch без Content-Type (text/plain, без preflight) — тело приходит строкой. */
function parseJsonBody(req: AnyRequest): Record<string, unknown> | null {
  if (typeof req.body === 'object' && req.body !== null && !Array.isArray(req.body)) {
    return req.body as Record<string, unknown>;
  }
  if (typeof req.body === 'string' || Buffer.isBuffer(req.body)) {
    try {
      return JSON.parse(String(req.body) || '{}') as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  return {};
}

function cleanEmail(value: unknown): string | null {
  const email = String(value ?? '').trim().toLowerCase().slice(0, 200);
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? email : null;
}

function cleanShortText(value: unknown, max: number): string {
  return String(value ?? '').trim().slice(0, max);
}

function htmlEscape(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** utm/answers от клиента: маленький безопасный JSON-слепок для атрибуции. */
function cleanAttribution(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null) return null;
  try {
    const raw = JSON.stringify(value);
    if (raw.length > 4000) return { truncated: true };
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/* ───────────────────────── Заявки и уведомления ───────────────────────── */

interface NewOrderInput {
  provider: 'stripe' | 'paypal';
  plan: WebPlan;
  email: string;
  nickname: string;
  amountCents: number;
  currency: string;
  utm: Record<string, unknown> | null;
  answers: Record<string, unknown> | null;
  /** Подарочная покупка (/gift/): код перешлёт покупатель, автопродления нет. */
  gift?: boolean;
  /** Имя получателя/дарителя для именного сертификата (необязательные). */
  giftTo?: string;
  giftFrom?: string;
}

async function createOrderDoc(db: FirebaseFirestore.Firestore, input: NewOrderInput): Promise<string> {
  const ref = db.collection(ORDERS_COLLECTION).doc();
  await ref.set({
    status: 'created',
    provider: input.provider,
    plan: input.plan,
    planDuration: PLAN_LABELS[input.plan],
    email: input.email,
    gift: input.gift === true,
    giftTo: input.giftTo || null,
    giftFrom: input.giftFrom || null,
    appNickname: input.nickname || null,
    amountCents: input.amountCents,
    currency: input.currency,
    utm: input.utm,
    quizAnswers: input.answers,
    createdAt: FieldValue.serverTimestamp(),
    createdAtIso: new Date().toISOString(),
  });
  await upsertEmailContact(db, {
    email: input.email,
    source: 'site',
    provider: input.provider,
    orderId: ref.id,
    plan: input.plan,
    amountCents: input.amountCents,
    currency: input.currency,
  }).catch((e) => {
    logger.warn('web_checkout email contact upsert failed', e);
  });
  return ref.id;
}

async function notifyAdminsTelegram(order: FirebaseFirestore.DocumentData): Promise<void> {
  const token = PHRASEMAN_PREMIUM_BOT_TOKEN.value();
  if (!token) return;
  const db = getFirestore();
  const snap = await db.doc(TELEGRAM_ADMIN_CONFIG_DOC).get();
  const ids: string[] = snap.exists && Array.isArray(snap.data()?.adminUserIds)
    ? (snap.data()?.adminUserIds as unknown[]).map(String)
    : [];
  if (ids.length === 0) return;
  const amount = ((Number(order.amountCents) || 0) / 100).toFixed(2);
  const text = [
    '💳 Новая ВЕБ-оплата Phraseman Premium',
    ...(order.gift === true ? ['🎁 ПОДАРОК: код перешлёт покупатель, автопродления нет'] : []),
    `Провайдер: ${order.provider}`,
    `Тариф: ${order.planDuration || order.plan}`,
    `Сумма: ${amount} ${String(order.currency || 'usd').toUpperCase()}`,
    `Email: ${order.email || '-'}`,
    `Ник в приложении: ${order.appNickname || '-'}`,
    `Код активации: ${order.activationCode || 'НЕ СОЗДАН — активировать вручную!'}`,
    `Заявка: ${ORDERS_COLLECTION}/${order.orderId || '-'}`,
    '',
    order.activationCode
      ? 'Юзер активирует код сам (Настройки → Промокоды). Вмешательство не нужно.'
      : 'Статус: ожидает ручной активации',
  ].join('\n');
  await Promise.all(ids.map((chatId) =>
    fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    }).catch(() => undefined),
  ));
}

async function markActivationEmailStatus(
  orderId: unknown,
  patch: Record<string, unknown>,
): Promise<void> {
  const id = cleanShortText(orderId, 120);
  if (!id) return;
  try {
    await getFirestore().collection(ORDERS_COLLECTION).doc(id).set({
      ...patch,
      customerEmailUpdatedAt: FieldValue.serverTimestamp(),
      customerEmailUpdatedAtIso: new Date().toISOString(),
    }, { merge: true });
  } catch (e) {
    logger.warn('web_checkout activation email status update failed', e);
  }
}

/** ДД.ММ.ГГГГ по UTC — детерминированно для тестов и одинаково для всех получателей. */
function formatRuDate(ms: number): string {
  return new Date(ms).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
}

/**
 * Письмо с кодом активации. Для подарка — именной «золотой сертификат»
 * (владелец 2026-07-26): Для/От, название подарка (Plus/Pro), код крупно,
 * срок действия, шаги активации. Чистая функция — покрыта тестами.
 * Вёрстка инлайновая, без рамок-обводок (запрет владельца), совместима
 * с почтовыми клиентами (только div + inline-стили, без внешних ресурсов).
 */
export function buildActivationEmail(
  order: FirebaseFirestore.DocumentData,
  support: string,
): { subject: string; text: string; html: string } {
  const activationCode = cleanShortText(order.activationCode, 48);
  const isGift = order.gift === true;
  const plan: WebPlan = isWebPlan(order.plan) ? order.plan : 'monthly';
  const productTitle = isGift ? giftPlanTitle(plan) : productNameForPlan(plan, false);
  const giftTo = cleanShortText(order.giftTo, 60);
  const giftFrom = cleanShortText(order.giftFrom, 60);
  const expiresAtMs = Math.max(0, Math.trunc(Number(order.codeExpiresAtMs ?? 0)) || 0);
  const expiresLine = expiresAtMs > 0 ? `Сертификат действует до ${formatRuDate(expiresAtMs)}.` : '';

  const subject = isGift
    ? `🎁 Подарочный сертификат Phraseman — код ${activationCode}`
    : `Ваш код активации Phraseman: ${activationCode}`;

  const steps = [
    '1. Скачайте Phraseman: knowlyapps.com/download/',
    '2. Откройте Настройки -> Промокоды.',
    '3. Введите код и нажмите «Активировать».',
  ];
  const text = [
    isGift ? 'Подарочный сертификат Phraseman' : 'Спасибо за покупку Phraseman!',
    '',
    ...(isGift && giftTo ? [`Для: ${giftTo}`] : []),
    ...(isGift && giftFrom ? [`От: ${giftFrom}`] : []),
    `Подарок: ${productTitle}`,
    '',
    `Код активации: ${activationCode}`,
    ...(expiresLine ? [expiresLine] : []),
    '',
    isGift
      ? 'Перешлите этот сертификат тому, кому дарите. Как получателю включить доступ:'
      : 'Как включить доступ:',
    ...steps,
    '',
    isGift ? 'Разовый платёж: ничего не спишется повторно.' : '',
    `Если что-то не получилось, напишите: ${support}`,
  ].filter((line, i, arr) => line !== '' || arr[i - 1] !== '').join('\n');

  const codeBlock = `<div style="background:#201c12;border-radius:16px;padding:20px 16px;margin:20px 0;text-align:center;font-size:26px;font-weight:800;letter-spacing:4px;color:#f7de8b;font-family:Consolas,Menlo,monospace">${htmlEscape(activationCode)}</div>`;
  const stepsHtml = `<ol style="margin:12px 0 0;padding-left:20px;color:#4c4636;line-height:1.7"><li>Скачайте Phraseman: <a href="https://knowlyapps.com/download/" style="color:#b8860f;font-weight:bold">knowlyapps.com/download/</a></li><li>Откройте Настройки → Промокоды.</li><li>Введите код и нажмите «Активировать».</li></ol>`;
  const supportHtml = `<p style="margin:22px 0 0;color:#6f6852;font-size:13px">Если что-то не получилось, напишите: ${htmlEscape(support)}</p>`;

  const html = isGift
    ? [
      '<div style="background:#f6f3ea;padding:28px 12px;font-family:Arial,Helvetica,sans-serif">',
      '<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden">',
      '<div style="background:#f2c14e;padding:26px 28px;text-align:center">',
      '<div style="font-size:12px;letter-spacing:3px;color:#3a2905;font-weight:bold">ПОДАРОЧНЫЙ СЕРТИФИКАТ</div>',
      '<div style="font-size:26px;font-weight:800;color:#201c12;margin-top:6px">Phraseman</div>',
      '</div>',
      '<div style="padding:28px 28px 26px;color:#201c12">',
      /* зачем: владелец 2026-07-26 — без имени заголовок называет КОНКРЕТНЫЙ
         подарок («Год Phraseman Plus»), а не абстрактное «вам подарили английский» */
      giftTo ? `<div style="font-size:22px;font-weight:800;margin:0 0 2px">Для: ${htmlEscape(giftTo)}</div>` : `<div style="font-size:22px;font-weight:800;margin:0 0 2px">${htmlEscape(productTitle)}</div>`,
      giftFrom ? `<div style="color:#6f6852;font-size:15px;margin:0 0 16px">от ${htmlEscape(giftFrom)}</div>` : '<div style="margin:0 0 16px"></div>',
      giftTo ? `<div style="font-size:17px;font-weight:800;color:#b8860f">${htmlEscape(productTitle)}</div>` : '',
      codeBlock,
      expiresLine ? `<div style="color:#6f6852;font-size:13.5px;margin:-8px 0 16px">${htmlEscape(expiresLine)}</div>` : '',
      '<div style="font-weight:bold;margin-top:6px">Как включить доступ:</div>',
      stepsHtml,
      '<p style="margin:18px 0 0;color:#4c4636;font-size:14px">Разовый платёж: ничего не спишется повторно. Перешлите это письмо тому, кому дарите, или вручите код лично.</p>',
      supportHtml,
      '</div></div></div>',
    ].filter(Boolean).join('')
    : [
      '<div style="background:#f6f3ea;padding:28px 12px;font-family:Arial,Helvetica,sans-serif">',
      '<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:24px;padding:28px;color:#201c12">',
      '<h1 style="font-size:22px;margin:0 0 8px">Ваш код активации Phraseman</h1>',
      `<p style="margin:0;color:#4c4636">Спасибо за покупку! Ваш тариф: <b>${htmlEscape(productTitle)}</b>.</p>`,
      codeBlock,
      '<div style="font-weight:bold">Как включить доступ:</div>',
      stepsHtml,
      supportHtml,
      '</div></div>',
    ].join('');

  return { subject, text, html };
}

async function sendActivationEmail(order: FirebaseFirestore.DocumentData): Promise<boolean> {
  const orderId = cleanShortText(order.orderId, 120);
  const activationCode = cleanShortText(order.activationCode, 48);
  const to = cleanEmail(order.email) ?? cleanEmail(order.customerEmail) ?? cleanEmail(order.payerEmail);
  if (!activationCode || !to) return false;

  const key = RESEND_API_KEY.value();
  if (!key) {
    await markActivationEmailStatus(orderId, {
      customerEmailStatus: 'skipped_no_resend_key',
      customerEmailSentTo: to,
    });
    return false;
  }
  const from = webCheckoutEmailFrom.value().trim();
  if (!from) {
    await markActivationEmailStatus(orderId, {
      customerEmailStatus: 'skipped_no_resend_from',
      customerEmailSentTo: to,
    });
    return false;
  }

  const support = webCheckoutSupportEmail.value() || 'support.phraseman@gmail.com';
  const { subject, text, html } = buildActivationEmail(order, support);

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        text,
        html,
      }),
    });
    const bodyText = await response.text();
    if (!response.ok) {
      logger.warn('web_checkout activation email failed', bodyText.slice(0, 500));
      await markActivationEmailStatus(orderId, {
        customerEmailStatus: 'failed',
        customerEmailSentTo: to,
        customerEmailError: bodyText.slice(0, 500),
      });
      return false;
    }
    let providerId = '';
    try {
      const parsed = JSON.parse(bodyText) as { id?: string };
      providerId = cleanShortText(parsed.id, 120);
    } catch {
      providerId = '';
    }
    await markActivationEmailStatus(orderId, {
      customerEmailStatus: 'sent',
      customerEmailSentAt: FieldValue.serverTimestamp(),
      customerEmailSentAtIso: new Date().toISOString(),
      customerEmailSentTo: to,
      customerEmailProviderId: providerId || null,
      customerEmailError: FieldValue.delete(),
    });
    return true;
  } catch (e) {
    await markActivationEmailStatus(orderId, {
      customerEmailStatus: 'failed',
      customerEmailSentTo: to,
      customerEmailError: String(e).slice(0, 500),
    });
    logger.warn('web_checkout activation email error', e);
    return false;
  }
}

async function handlePaidOrderSideEffects(
  db: FirebaseFirestore.Firestore,
  order: FirebaseFirestore.DocumentData,
): Promise<void> {
  await upsertEmailContact(db, {
    email: order.email || order.customerEmail || order.payerEmail,
    source: 'site',
    provider: order.provider,
    orderId: order.orderId,
    plan: order.plan,
    amountCents: order.amountCents,
    currency: order.currency,
  }).catch((e) => {
    logger.warn('web_checkout paid email contact upsert failed', e);
  });
  await Promise.all([
    notifyAdminsTelegram(order).catch((e) => logger.error('web order admin notify failed', e)),
    sendActivationEmail(order).catch((e) => logger.error('web order activation email failed', e)),
  ]);
}

const PAID_STATUSES = new Set(['paid_pending_activation', 'paid_pending_manual_activation', 'activated']);

/**
 * Помечает заявку оплаченной и АТОМАРНО создаёт одноразовый код активации
 * (promo_codes/{CODE}, maxRedemptions=1): юзер вводит его в приложении и премиум
 * включается сам, без ручной выдачи. Идемпотентно: повторный вебхук не создаёт
 * второй код и не шлёт второе уведомление (возвращает null).
 */
async function markOrderPaid(
  db: FirebaseFirestore.Firestore,
  orderId: string,
  plan: WebPlan | null,
  paymentDetails: Record<string, unknown>,
): Promise<FirebaseFirestore.DocumentData | null> {
  const ref = db.collection(ORDERS_COLLECTION).doc(orderId);
  const candidateCode = generateActivationCode();
  const codeRef = db.collection('promo_codes').doc(candidateCode);

  return db.runTransaction(async (tx) => {
    const [snap, codeSnap] = await Promise.all([tx.get(ref), tx.get(codeRef)]);
    const data = snap.exists ? (snap.data() ?? {}) : {};
    if (snap.exists && PAID_STATUSES.has(String(data.status))) {
      return null; // повторный вебхук — код и уведомление уже были
    }

    const effectivePlan: WebPlan = isWebPlan(plan) ? plan : isWebPlan(data.plan) ? data.plan : 'monthly';
    // Коллизия 32^10 практически невозможна; если код занят — заявка остаётся
    // оплаченной БЕЗ кода (ручной путь), деньги не теряются.
    const activationCode = codeSnap.exists ? null : candidateCode;
    // зачем: владелец 2026-07-26 — подарочный код живёт 12 месяцев (печатается
    // на сертификате), обычный код покупки «себе» — бессрочный, как раньше.
    const codeExpiresAtMs = giftCodeExpiryMs(Date.now(), data.gift === true);
    if (activationCode) {
      const reward = activationRewardForPlan(effectivePlan);
      tx.set(codeRef, {
        rewardDays: reward.rewardDays,
        rewardKind: reward.rewardKind,
        enabled: true,
        maxRedemptions: 1,
        usedCount: 0,
        expiresAtMs: codeExpiresAtMs,
        note: `web_checkout ${ORDERS_COLLECTION}/${orderId}`,
        createdAtMs: Date.now(),
        createdBy: 'web_checkout',
      });
    }

    const patch = {
      status: 'paid_pending_activation',
      activationCode,
      codeExpiresAtMs: activationCode ? codeExpiresAtMs : null,
      paidAt: FieldValue.serverTimestamp(),
      paidAtIso: new Date().toISOString(),
      ...(snap.exists ? {} : { recoveredFromWebhook: true, plan: effectivePlan, planDuration: PLAN_LABELS[effectivePlan] }),
      ...paymentDetails,
    };
    tx.set(ref, patch, { merge: true });
    return { ...data, orderId, ...patch };
  });
}

async function writeDeadLetter(kind: string, payload: unknown, error: unknown): Promise<void> {
  try {
    await getFirestore().collection(DEAD_LETTER_COLLECTION).doc().set({
      kind,
      payload: typeof payload === 'string' ? payload.slice(0, 20000) : payload,
      error: String(error).slice(0, 2000),
      ts: FieldValue.serverTimestamp(),
    });
  } catch (e) {
    logger.error('web_checkout dead letter write failed', e);
  }
}

/* ───────────────────────── Stripe ───────────────────────── */

async function stripeCreateSession(params: {
  plan: WebPlan;
  email: string;
  orderId: string;
  amountCents: number;
  currency: string;
  gift?: boolean;
}): Promise<{ id: string; url: string }> {
  const form = new URLSearchParams();
  // Подарок — всегда разовый платёж: дарителю нельзя вешать автопродление.
  const oneTime = params.plan === 'lifetime' || params.gift === true;
  const productName = productNameForPlan(params.plan, params.gift === true);
  form.set('mode', oneTime ? 'payment' : 'subscription');
  form.set('line_items[0][quantity]', '1');
  form.set('line_items[0][price_data][currency]', params.currency);
  form.set('line_items[0][price_data][unit_amount]', String(params.amountCents));
  form.set('line_items[0][price_data][product_data][name]', productName);
  if (!oneTime) {
    form.set('line_items[0][price_data][recurring][interval]', params.plan === 'monthly' ? 'month' : 'year');
  }
  form.set('customer_email', params.email);
  form.set('client_reference_id', params.orderId);
  form.set('metadata[orderId]', params.orderId);
  if (!oneTime) form.set('subscription_data[metadata][orderId]', params.orderId);
  form.set('allow_promotion_codes', 'true');
  // plan в URL — чтобы страница «спасибо» отправила Purchase с суммой в пиксель.
  form.set('success_url', `${SITE_ORIGIN}/start/thanks/?provider=stripe&session_id={CHECKOUT_SESSION_ID}&plan=${params.plan}${params.gift ? '&gift=1' : ''}`);
  form.set('cancel_url', `${SITE_ORIGIN}${params.gift ? '/gift/' : '/start/'}?canceled=1`);

  const resp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY.value()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  });
  const data = (await resp.json()) as { id?: string; url?: string; error?: { message?: string } };
  if (!resp.ok || !data.id || !data.url) {
    throw new Error(`stripe_session_failed: ${data.error?.message ?? resp.status}`);
  }
  return { id: data.id, url: data.url };
}

export const webCheckoutCreate = onRequest(
  {
    region: REGION,
    memory: '256MiB',
    timeoutSeconds: 30,
    maxInstances: 5,
    invoker: 'public',
    secrets: [STRIPE_SECRET_KEY],
  },
  async (req, res) => {
    if (applyCors(req as unknown as AnyRequest, res as unknown as AnyResponse)) return;
    const body = parseJsonBody(req as unknown as AnyRequest);
    if (!body) {
      res.status(400).json({ ok: false, error: 'invalid_json' });
      return;
    }

    const plan = body.plan;
    if (!isWebPlan(plan)) {
      res.status(400).json({ ok: false, error: 'invalid_plan' });
      return;
    }
    const email = cleanEmail(body.email);
    if (!email) {
      res.status(400).json({ ok: false, error: 'invalid_email' });
      return;
    }

    const db = getFirestore();
    const config = await readConfig(db);
    const amountCents = config.priceCents[plan];

    const gift = body.gift === true;
    try {
      const orderId = await createOrderDoc(db, {
        provider: 'stripe',
        plan,
        email,
        nickname: cleanShortText(body.nickname, 60),
        amountCents,
        currency: config.currency,
        utm: cleanAttribution(body.utm),
        answers: cleanAttribution(body.answers),
        gift,
        giftTo: cleanShortText(body.giftTo, 60),
        giftFrom: cleanShortText(body.giftFrom, 60),
      });
      const session = await stripeCreateSession({ plan, email, orderId, amountCents, currency: config.currency, gift });
      await db.collection(ORDERS_COLLECTION).doc(orderId).update({
        stripeSessionId: session.id,
        updatedAt: FieldValue.serverTimestamp(),
      });
      res.status(200).json({ ok: true, url: session.url });
    } catch (e) {
      logger.error('webCheckoutCreate failed', e);
      res.status(502).json({ ok: false, error: 'checkout_create_failed' });
    }
  },
);

/**
 * Продление Stripe-подписки (invoice.paid, месяц/год 2+):
 * 1) первый счёт (billing_reason=subscription_create) пропускаем — его период
 *    покрывает код активации;
 * 2) находим заявку по stripeSubscriptionId, идемпотентно (processedInvoices);
 * 3) если код уже активирован — продлеваем vip_until аккаунта (lastRedeemedBy);
 *    если ещё нет — добавляем дни на сам код (юзер получит оба периода при вводе).
 */
async function handleSubscriptionRenewal(invoice: Record<string, unknown>): Promise<string> {
  const billingReason = String(invoice.billing_reason ?? '');
  if (billingReason === 'subscription_create') return 'initial_invoice_skipped';
  if (Number(invoice.amount_paid) <= 0) return 'zero_amount_skipped';

  const parent = invoice.parent as { subscription_details?: { subscription?: unknown } } | undefined;
  const subscriptionId = String(invoice.subscription ?? parent?.subscription_details?.subscription ?? '').trim();
  const invoiceId = String(invoice.id ?? '').trim();
  if (!subscriptionId || !invoiceId) return 'no_subscription_ref';

  const db = getFirestore();
  const orderSnap = await db.collection(ORDERS_COLLECTION)
    .where('stripeSubscriptionId', '==', subscriptionId).limit(1).get();
  if (orderSnap.empty) {
    await writeDeadLetter('stripe_renewal_order_not_found', { subscriptionId, invoiceId }, 'no order');
    return 'order_not_found';
  }
  const orderRef = orderSnap.docs[0].ref;
  const order = orderSnap.docs[0].data();
  const plan: WebPlan = isWebPlan(order.plan) ? order.plan : 'monthly';
  const addDays = activationRewardForPlan(plan).rewardDays || 31;
  const code = String(order.activationCode ?? '').trim();

  const outcome = await db.runTransaction(async (tx) => {
    const [orderNow, codeSnap] = await Promise.all([
      tx.get(orderRef),
      code ? tx.get(db.collection('promo_codes').doc(code)) : Promise.resolve(null),
    ]);
    const processed = (orderNow.data()?.processedInvoices ?? []) as unknown[];
    if (processed.includes(invoiceId)) return 'duplicate_invoice';

    const codeData = codeSnap?.exists ? (codeSnap.data() ?? {}) : null;
    const redeemedBy = String(codeData?.lastRedeemedBy ?? '').trim();
    const nowMs = Date.now();
    let result: string;

    if (redeemedBy) {
      // Код активирован → продлеваем VIP-окно аккаунта (стек от текущего vip_until).
      const userRef = db.collection('users').doc(redeemedBy);
      const userSnap = await tx.get(userRef);
      const progress = (userSnap.data()?.progress ?? {}) as Record<string, unknown>;
      const vipPatch = buildPromoVipPatch(progress, nowMs, addDays, 'days', code);
      tx.set(userRef, { progress: vipPatch, updatedAt: nowMs }, { merge: true });
      result = `extended_user_${addDays}d`;
    } else if (codeSnap?.exists) {
      // Код ещё не введён → наращиваем награду самого кода.
      tx.update(codeSnap.ref, { rewardDays: FieldValue.increment(addDays) });
      result = `extended_code_${addDays}d`;
    } else {
      result = 'code_missing_manual_needed';
    }

    tx.update(orderRef, {
      processedInvoices: FieldValue.arrayUnion(invoiceId),
      lastRenewalAtIso: new Date().toISOString(),
      renewalCount: FieldValue.increment(1),
      lastRenewalOutcome: result,
    });
    return result;
  });

  if (outcome === 'code_missing_manual_needed') {
    await notifyAdminsTelegram({
      ...order,
      orderId: orderRef.id,
      activationCode: null,
      planDuration: `${order.planDuration} (ПРОДЛЕНИЕ — код не найден, продлить вручную!)`,
    }).catch(() => undefined);
  }
  logger.info('stripe renewal processed', { subscriptionId, invoiceId, outcome });
  return outcome;
}

function verifyStripeSignature(rawBody: Buffer, header: string, secret: string): boolean {
  const parts = header.split(',').map((p) => p.trim());
  const timestamp = parts.find((p) => p.startsWith('t='))?.slice(2);
  const signatures = parts.filter((p) => p.startsWith('v1=')).map((p) => p.slice(3));
  if (!timestamp || signatures.length === 0) return false;
  const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(ageSeconds) || ageSeconds > 600) return false;
  const expected = createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody.toString('utf8')}`)
    .digest('hex');
  const expectedBuf = Buffer.from(expected, 'utf8');
  return signatures.some((sig) => {
    const sigBuf = Buffer.from(sig, 'utf8');
    return sigBuf.length === expectedBuf.length && timingSafeEqual(sigBuf, expectedBuf);
  });
}

export const stripeWebhook = onRequest(
  {
    region: REGION,
    memory: '256MiB',
    timeoutSeconds: 30,
    maxInstances: 3,
    invoker: 'public',
    secrets: [STRIPE_WEBHOOK_SECRET, PHRASEMAN_PREMIUM_BOT_TOKEN, RESEND_API_KEY],
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('method_not_allowed');
      return;
    }
    const signature = typeof req.headers['stripe-signature'] === 'string' ? req.headers['stripe-signature'] : '';
    const rawBody = req.rawBody ?? Buffer.from('');
    if (!signature || !verifyStripeSignature(rawBody, signature, STRIPE_WEBHOOK_SECRET.value())) {
      res.status(400).send('invalid_signature');
      return;
    }

    let event: { type?: string; data?: { object?: Record<string, unknown> } };
    try {
      event = JSON.parse(rawBody.toString('utf8')) as typeof event;
    } catch {
      res.status(400).send('invalid_json');
      return;
    }

    const type = String(event.type ?? '');

    // Автопродление подписки (месяц 2+): Stripe списал деньги — продлеваем доступ
    // сами, без нового кода и без участия юзера/владельца.
    if (type === 'invoice.paid') {
      try {
        const result = await handleSubscriptionRenewal((event.data?.object ?? {}) as Record<string, unknown>);
        res.status(200).send(result);
      } catch (e) {
        logger.error('stripeWebhook renewal failed', e);
        await writeDeadLetter('stripe_renewal_failed', rawBody.toString('utf8'), e);
        res.status(500).send('renewal_failed'); // 500 → Stripe повторит доставку
      }
      return;
    }

    const relevant = type === 'checkout.session.completed' || type === 'checkout.session.async_payment_succeeded';
    if (!relevant) {
      res.status(200).send('ignored');
      return;
    }

    const session = (event.data?.object ?? {}) as Record<string, unknown>;
    const paymentStatus = String(session.payment_status ?? '');
    if (type === 'checkout.session.completed' && paymentStatus === 'unpaid') {
      // async-платёж (например, банковский перевод) — ждём async_payment_succeeded
      res.status(200).send('awaiting_async_payment');
      return;
    }

    const metadata = (session.metadata ?? {}) as Record<string, unknown>;
    const orderId = String(metadata.orderId ?? session.client_reference_id ?? '').trim();
    if (!orderId) {
      await writeDeadLetter('stripe_webhook_no_order', rawBody.toString('utf8'), 'missing orderId');
      res.status(200).send('no_order_id');
      return;
    }

    try {
      const db = getFirestore();
      const details = session.customer_details as Record<string, unknown> | undefined;
      const paid = await markOrderPaid(db, orderId, null, {
        provider: 'stripe',
        stripeSessionId: String(session.id ?? ''),
        stripePaymentIntent: String(session.payment_intent ?? '') || null,
        stripeSubscriptionId: String(session.subscription ?? '') || null,
        amountCents: Number(session.amount_total) || 0,
        currency: String(session.currency ?? 'usd'),
        email: cleanEmail(details?.email) ?? cleanEmail(session.customer_email) ?? undefined,
      });
      if (paid) {
        await handlePaidOrderSideEffects(db, paid);
      }
      res.status(200).send('ok');
    } catch (e) {
      // КРИТИЧНО: заявка — единственный след оплаты. 500 → Stripe повторит доставку.
      logger.error('stripeWebhook order write failed', e);
      await writeDeadLetter('stripe_webhook_write_failed', rawBody.toString('utf8'), e);
      res.status(500).send('write_failed');
    }
  },
);

/* ───────────────────────── PayPal ───────────────────────── */

function paypalBase(live: boolean): string {
  return live ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
}

async function paypalAccessToken(live: boolean): Promise<string> {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID.value()}:${PAYPAL_CLIENT_SECRET.value()}`).toString('base64');
  const resp = await fetch(`${paypalBase(live)}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const data = (await resp.json()) as { access_token?: string };
  if (!resp.ok || !data.access_token) throw new Error(`paypal_token_failed: ${resp.status}`);
  return data.access_token;
}

export const paypalOrderCreate = onRequest(
  {
    region: REGION,
    memory: '256MiB',
    timeoutSeconds: 30,
    maxInstances: 5,
    invoker: 'public',
    secrets: [PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET],
  },
  async (req, res) => {
    if (applyCors(req as unknown as AnyRequest, res as unknown as AnyResponse)) return;
    const body = parseJsonBody(req as unknown as AnyRequest);
    if (!body) {
      res.status(400).json({ ok: false, error: 'invalid_json' });
      return;
    }
    const plan = body.plan;
    if (!isWebPlan(plan)) {
      res.status(400).json({ ok: false, error: 'invalid_plan' });
      return;
    }
    const email = cleanEmail(body.email);
    if (!email) {
      res.status(400).json({ ok: false, error: 'invalid_email' });
      return;
    }

    const db = getFirestore();
    const config = await readConfig(db);
    const amountCents = config.priceCents[plan];

    try {
      const orderId = await createOrderDoc(db, {
        provider: 'paypal',
        plan,
        email,
        nickname: cleanShortText(body.nickname, 60),
        amountCents,
        currency: config.currency,
        utm: cleanAttribution(body.utm),
        answers: cleanAttribution(body.answers),
        gift: body.gift === true,
        giftTo: cleanShortText(body.giftTo, 60),
        giftFrom: cleanShortText(body.giftFrom, 60),
      });
      const token = await paypalAccessToken(config.paypalLive);
      const resp = await fetch(`${paypalBase(config.paypalLive)}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [{
            custom_id: orderId,
            description: productNameForPlan(plan, body.gift === true),
            amount: {
              currency_code: config.currency.toUpperCase(),
              value: (amountCents / 100).toFixed(2),
            },
          }],
        }),
      });
      const data = (await resp.json()) as { id?: string };
      if (!resp.ok || !data.id) throw new Error(`paypal_order_failed: ${resp.status}`);
      await db.collection(ORDERS_COLLECTION).doc(orderId).update({
        paypalOrderId: data.id,
        updatedAt: FieldValue.serverTimestamp(),
      });
      res.status(200).json({ ok: true, orderId: data.id });
    } catch (e) {
      logger.error('paypalOrderCreate failed', e);
      res.status(502).json({ ok: false, error: 'paypal_create_failed' });
    }
  },
);

export const paypalOrderCapture = onRequest(
  {
    region: REGION,
    memory: '256MiB',
    timeoutSeconds: 30,
    maxInstances: 5,
    invoker: 'public',
    secrets: [PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PHRASEMAN_PREMIUM_BOT_TOKEN, RESEND_API_KEY],
  },
  async (req, res) => {
    if (applyCors(req as unknown as AnyRequest, res as unknown as AnyResponse)) return;
    const body = parseJsonBody(req as unknown as AnyRequest);
    const paypalOrderId = cleanShortText(body?.orderId, 64);
    if (!paypalOrderId) {
      res.status(400).json({ ok: false, error: 'invalid_order' });
      return;
    }

    const db = getFirestore();
    const config = await readConfig(db);

    try {
      const token = await paypalAccessToken(config.paypalLive);
      const resp = await fetch(`${paypalBase(config.paypalLive)}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = (await resp.json()) as {
        status?: string;
        purchase_units?: Array<{
          payments?: { captures?: Array<{ id?: string; custom_id?: string; amount?: { value?: string; currency_code?: string } }> };
        }>;
        payer?: { email_address?: string };
      };
      if (!resp.ok || data.status !== 'COMPLETED') {
        throw new Error(`paypal_capture_failed: ${resp.status} ${data.status ?? ''}`);
      }

      const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
      const orderQuery = await db.collection(ORDERS_COLLECTION)
        .where('paypalOrderId', '==', paypalOrderId).limit(1).get();
      const orderId = orderQuery.docs[0]?.id ?? capture?.custom_id ?? paypalOrderId;

      const paid = await markOrderPaid(db, orderId, null, {
        provider: 'paypal',
        paypalOrderId,
        paypalCaptureId: capture?.id ?? null,
        amountCents: Math.round(Number(capture?.amount?.value ?? 0) * 100),
        currency: String(capture?.amount?.currency_code ?? 'USD').toLowerCase(),
        payerEmail: cleanEmail(data.payer?.email_address) ?? undefined,
      });
      if (paid) {
        await handlePaidOrderSideEffects(db, paid);
      }
      // Код возвращаем сразу — страница «спасибо» покажет его без ожидания вебхуков.
      let activationCode: string | null = (paid?.activationCode as string | undefined) ?? null;
      if (!activationCode) {
        const snap = await db.collection(ORDERS_COLLECTION)
          .where('paypalOrderId', '==', paypalOrderId).limit(1).get();
        activationCode = (snap.docs[0]?.data()?.activationCode as string | undefined) ?? null;
      }
      res.status(200).json({ ok: true, code: activationCode });
    } catch (e) {
      logger.error('paypalOrderCapture failed', e);
      await writeDeadLetter('paypal_capture_failed', { paypalOrderId }, e);
      res.status(502).json({ ok: false, error: 'paypal_capture_failed' });
    }
  },
);

/* ───────────────────────── Публичные цены для пейвола ───────────────────────── */

/**
 * webPrices — витрина пейвола /start/ читает цены ОТСЮДА (web_checkout/config),
 * т.е. из того же места, по которому реально списываются деньги. Один источник
 * правды: поменял цену в админке («🌐 Сайт») — витрина и списание меняются вместе.
 * site-config.js webPrices остаётся только офлайн-фоллбеком.
 */
export const webPrices = onRequest(
  {
    region: REGION,
    memory: '256MiB',
    timeoutSeconds: 15,
    maxInstances: 5,
    invoker: 'public',
  },
  async (req, res) => {
    const origin = typeof req.headers.origin === 'string' ? req.headers.origin : undefined;
    res.set('Access-Control-Allow-Origin', pickAllowOrigin(origin));
    res.set('Vary', 'Origin');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    try {
      const config = await readConfig(getFirestore());
      // 5 минут браузерного кэша: смена цены доезжает до витрины максимум за 5 мин.
      res.set('Cache-Control', 'public, max-age=300');
      res.status(200).json({
        ok: true,
        currency: config.currency,
        priceCents: config.priceCents,
      });
    } catch (e) {
      logger.error('webPrices failed', e);
      res.status(502).json({ ok: false, error: 'prices_failed' });
    }
  },
);

/* ───────────────────────── Статус заказа для страницы «спасибо» ───────────────────────── */

/**
 * webOrderStatus — страница /start/thanks/ опрашивает его, чтобы показать код
 * активации. Поиск ТОЛЬКО по неугадываемым id (Stripe session `cs_...` /
 * PayPal order id) — по email или номеру заявки нарочно нельзя, чтобы чужой
 * код было не выудить перебором.
 */
export const webOrderStatus = onRequest(
  {
    region: REGION,
    memory: '256MiB',
    timeoutSeconds: 15,
    maxInstances: 5,
    invoker: 'public',
  },
  async (req, res) => {
    if (applyCors(req as unknown as AnyRequest, res as unknown as AnyResponse)) return;
    const body = parseJsonBody(req as unknown as AnyRequest);
    const sessionId = cleanShortText(body?.sessionId, 120);
    const paypalOrderId = cleanShortText(body?.paypalOrderId, 64);
    if (!sessionId && !paypalOrderId) {
      res.status(400).json({ ok: false, error: 'missing_reference' });
      return;
    }
    // Минимальная планка неугадываемости (Stripe session id — длинный `cs_...`).
    if (sessionId && (sessionId.length < 20 || !sessionId.startsWith('cs_'))) {
      res.status(400).json({ ok: false, error: 'bad_reference' });
      return;
    }

    try {
      const db = getFirestore();
      const field = sessionId ? 'stripeSessionId' : 'paypalOrderId';
      const value = sessionId || paypalOrderId;
      const snap = await db.collection(ORDERS_COLLECTION).where(field, '==', value).limit(1).get();
      if (snap.empty) {
        res.status(200).json({ ok: true, status: 'unknown' });
        return;
      }
      const order = snap.docs[0].data();
      const isPaid = PAID_STATUSES.has(String(order.status));
      res.status(200).json({
        ok: true,
        status: isPaid ? 'paid' : 'pending',
        plan: order.plan ?? null,
        planDuration: order.planDuration ?? null,
        code: isPaid ? (order.activationCode ?? null) : null,
      });
    } catch (e) {
      logger.error('webOrderStatus failed', e);
      res.status(502).json({ ok: false, error: 'status_failed' });
    }
  },
);
