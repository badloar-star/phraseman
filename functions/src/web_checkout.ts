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
import { defineSecret } from 'firebase-functions/params';
import { onRequest } from 'firebase-functions/v2/https';

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

type WebPlan = 'monthly' | 'yearly' | 'lifetime';

const PLAN_LABELS: Record<WebPlan, string> = {
  monthly: 'месяц',
  yearly: 'год',
  lifetime: 'навсегда',
};

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
}

async function createOrderDoc(db: FirebaseFirestore.Firestore, input: NewOrderInput): Promise<string> {
  const ref = db.collection(ORDERS_COLLECTION).doc();
  await ref.set({
    status: 'created',
    provider: input.provider,
    plan: input.plan,
    planDuration: PLAN_LABELS[input.plan],
    email: input.email,
    appNickname: input.nickname || null,
    amountCents: input.amountCents,
    currency: input.currency,
    utm: input.utm,
    quizAnswers: input.answers,
    createdAt: FieldValue.serverTimestamp(),
    createdAtIso: new Date().toISOString(),
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
    if (activationCode) {
      const reward = activationRewardForPlan(effectivePlan);
      tx.set(codeRef, {
        rewardDays: reward.rewardDays,
        rewardKind: reward.rewardKind,
        enabled: true,
        maxRedemptions: 1,
        usedCount: 0,
        expiresAtMs: 0,
        note: `web_checkout ${ORDERS_COLLECTION}/${orderId}`,
        createdAtMs: Date.now(),
        createdBy: 'web_checkout',
      });
    }

    const patch = {
      status: 'paid_pending_activation',
      activationCode,
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
}): Promise<{ id: string; url: string }> {
  const form = new URLSearchParams();
  const productName = `Phraseman Premium — ${PLAN_LABELS[params.plan]}`;
  form.set('mode', params.plan === 'lifetime' ? 'payment' : 'subscription');
  form.set('line_items[0][quantity]', '1');
  form.set('line_items[0][price_data][currency]', params.currency);
  form.set('line_items[0][price_data][unit_amount]', String(params.amountCents));
  form.set('line_items[0][price_data][product_data][name]', productName);
  if (params.plan !== 'lifetime') {
    form.set('line_items[0][price_data][recurring][interval]', params.plan === 'monthly' ? 'month' : 'year');
  }
  form.set('customer_email', params.email);
  form.set('client_reference_id', params.orderId);
  form.set('metadata[orderId]', params.orderId);
  if (params.plan !== 'lifetime') form.set('subscription_data[metadata][orderId]', params.orderId);
  form.set('allow_promotion_codes', 'true');
  form.set('success_url', `${SITE_ORIGIN}/start/thanks/?provider=stripe&session_id={CHECKOUT_SESSION_ID}`);
  form.set('cancel_url', `${SITE_ORIGIN}/start/?canceled=1`);

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
      });
      const session = await stripeCreateSession({ plan, email, orderId, amountCents, currency: config.currency });
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
    secrets: [STRIPE_WEBHOOK_SECRET, PHRASEMAN_PREMIUM_BOT_TOKEN],
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
        await notifyAdminsTelegram(paid).catch((e) => logger.error('web order admin notify failed', e));
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
            description: `Phraseman Premium — ${PLAN_LABELS[plan]}`,
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
    secrets: [PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PHRASEMAN_PREMIUM_BOT_TOKEN],
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
        await notifyAdminsTelegram(paid).catch((e) => logger.error('web order admin notify failed', e));
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
