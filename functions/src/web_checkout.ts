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
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { getFirestore, FieldPath, FieldValue } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { defineSecret, defineString } from 'firebase-functions/params';
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https';

import { hasClaimedPermission } from './admin/permissions';
import { upsertEmailContact } from './email_contacts';
import { RESEND_API_KEY } from './resend_secret';
import { buildPromoVipPatch } from './promo_codes';
import { GIFT_CERTIFICATE_PHRASES, resolveGiftPhrase } from './gift_certificate_phrases';

const REGION = 'us-central1';
const ORDERS_COLLECTION = 'web_premium_orders';
const DEAD_LETTER_COLLECTION = 'web_checkout_dead_letter';
const GIFT_CERTIFICATE_DELIVERIES_COLLECTION = 'gift_certificate_deliveries';
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

const GIFT_CERTIFICATE_ART: Record<WebPlan, string> = {
  monthly: `${SITE_ORIGIN}/assets/gift-certificates/gift-certificate-monthly.webp`,
  yearly: `${SITE_ORIGIN}/assets/gift-certificates/gift-certificate-yearly.webp`,
  lifetime: `${SITE_ORIGIN}/assets/gift-certificates/gift-certificate-lifetime.webp`,
};

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
export const GIFT_CERTIFICATE_REPLACEMENT_AUTHORIZATION = 'REPLACE_VERIFIED_SYNTHETIC_NO_PAYMENT_GIFT_CERTIFICATE';
export const GIFT_CERTIFICATE_SEND_AUTHORIZATION = 'SEND_PREPARED_GIFT_CERTIFICATE';
export const GIFT_CERTIFICATE_BATCH_AUTHORIZATION = 'CREATE_GIFT_CERTIFICATES';
export const GIFT_CERTIFICATE_RECIPIENT_UPDATE_AUTHORIZATION = 'UPDATE_GIFT_CERTIFICATE_RECIPIENT';
export const GIFT_CERTIFICATE_PERSONALIZATION_UPDATE_AUTHORIZATION = 'UPDATE_GIFT_CERTIFICATE_PERSONALIZATION';
export const GIFT_CERTIFICATE_REPAIR_OLD_CODE = 'GIFT-TEST-FRNRYV23VS';
export const GIFT_CERTIFICATE_REPAIR_OLD_NOTE = 'Simulated gift purchase; no payment; requested 2026-07-29; recipient badloar@gmail.com';
export const GIFT_CERTIFICATE_MUTATION_OPTIONS = { region: REGION, enforceAppCheck: true } as const;
export const GIFT_CERTIFICATE_READ_OPTIONS = { region: REGION, enforceAppCheck: true } as const;
const GIFT_CERTIFICATE_BATCH_OPERATIONS_COLLECTION = 'admin_gift_certificate_batch_operations';
const GIFT_CERTIFICATE_SEND_CLAIM_STALE_MS = 60 * 1000;
const GIFT_CERTIFICATE_ASSET_MAX_BYTES = 512 * 1024;
const GIFT_CERTIFICATE_ASSET_CACHE_TTL_MS = 60 * 60 * 1000;
const giftCertificateAssetCache = new Map<WebPlan, { base64: string; fetchedAtMs: number }>();
// Resend retains idempotency keys for 24h. Keep a one-hour safety margin.
const GIFT_CERTIFICATE_IDEMPOTENT_RETRY_WINDOW_MS = 23 * 60 * 60 * 1000;

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

export function generateGiftCertificateCode(): string {
  return generateActivationCode().replace(/^WEB-/, 'GIFT-');
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

type GiftCertificateAdminAuth = {
  uid?: string;
  token?: Record<string, unknown>;
} | undefined;

export function assertGiftCertificateAdminAccess(auth: GiftCertificateAdminAuth): void {
  if (!String(auth?.uid ?? '').trim() || auth?.token?.admin !== true) {
    throw new HttpsError('permission-denied', 'Admin only');
  }
  if (!hasClaimedPermission(auth.token, 'money.manual_access.write')) {
    throw new HttpsError('permission-denied', 'Role cannot replace gift certificates');
  }
}

export function assertGiftCertificateAdminReadAccess(auth: GiftCertificateAdminAuth): void {
  if (!String(auth?.uid ?? '').trim() || auth?.token?.admin !== true) {
    throw new HttpsError('permission-denied', 'Admin only');
  }
  if (!hasClaimedPermission(auth.token, 'money.read')) {
    throw new HttpsError('permission-denied', 'Role cannot read gift certificates');
  }
}

export function assertGiftCertificateSendAuthorization(value: unknown): void {
  if (value !== GIFT_CERTIFICATE_SEND_AUTHORIZATION) {
    throw new HttpsError('failed-precondition', 'delivery_not_authorized');
  }
}

type GiftCertificateBatchInput = {
  product?: unknown;
  count?: unknown;
  recipientNames?: unknown;
  senderNames?: unknown;
  recipientEmails?: unknown;
  showRecipientName?: unknown;
  showSenderName?: unknown;
  source?: unknown;
  authorization?: unknown;
};

type GiftCertificateBatchItem = {
  certificateId: string;
  activationCode: string;
  product: WebPlan;
  recipientName: string;
  senderName: string;
  recipientEmail: string;
  showRecipientName: boolean;
  showSenderName: boolean;
  createdAtMs: number;
  expiresAtMs: number;
  status: 'generated';
  assetUrl: string;
  promoDoc: Record<string, unknown>;
  certificateDoc: Record<string, unknown>;
};

export type GiftCertificateBatchResponse = {
  ok: true;
  operationId: string;
  batchId: string;
  certificates: Record<string, unknown>[];
};

export function normalizeGiftCertificateBatchOperationId(value: unknown): string {
  if (typeof value !== 'string'
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value)) {
    throw new HttpsError('invalid-argument', 'invalid_gift_certificate_operation_id');
  }
  return value;
}

export function buildGiftCertificateBatchRequestKey(
  items: readonly Pick<GiftCertificateBatchItem,
    'product' | 'recipientName' | 'senderName' | 'recipientEmail' | 'showRecipientName' | 'showSenderName'>[],
): string {
  if (items.length < 1 || items.length > 200) {
    throw new HttpsError('internal', 'gift_certificate_batch_request_key_invalid');
  }
  const canonicalRequest = JSON.stringify({
    product: items[0].product,
    recipients: items.map((item) => ({
      recipientName: item.recipientName,
      senderName: item.senderName,
      email: item.recipientEmail,
      showRecipientName: item.showRecipientName,
      showSenderName: item.showSenderName,
    })),
  });
  return createHash('sha256').update(canonicalRequest, 'utf8').digest('hex');
}

export function readGiftCertificateBatchReplay(
  persisted: FirebaseFirestore.DocumentData | undefined,
  expected: { operationId: string; actorUid: string; requestKey: string },
): GiftCertificateBatchResponse | null {
  if (!persisted) return null;
  if (persisted.schemaVersion !== 'gift-certificate-batch-operation.v1'
    || persisted.operationId !== expected.operationId
    || persisted.actorUid !== expected.actorUid
    || persisted.requestKey !== expected.requestKey) {
    throw new HttpsError('already-exists', 'gift_certificate_operation_conflict');
  }
  const response = persisted.response as Partial<GiftCertificateBatchResponse> | null | undefined;
  if (response?.ok !== true
    || response.operationId !== expected.operationId
    || typeof response.batchId !== 'string'
    || !response.batchId
    || !Array.isArray(response.certificates)
    || response.certificates.length < 1
    || response.certificates.length > 200) {
    throw new HttpsError('internal', 'gift_certificate_operation_corrupt');
  }
  return response as GiftCertificateBatchResponse;
}

/** Pure validation/planning boundary shared by the callable and focused tests. */
export function createGiftCertificateBatchPlan(params: {
  input: GiftCertificateBatchInput;
  codes: readonly string[];
  batchId: string;
  nowMs: number;
  actorUid: string;
  actorEmail: string;
}): { batchId: string; items: GiftCertificateBatchItem[]; auditDoc: Record<string, unknown> } {
  const { input } = params;
  if (input.authorization !== GIFT_CERTIFICATE_BATCH_AUTHORIZATION) {
    throw new HttpsError('failed-precondition', 'gift_certificate_batch_not_authorized');
  }
  if (input.source !== 'admin_gift_certificates') {
    throw new HttpsError('invalid-argument', 'invalid_gift_certificate_source');
  }
  if (!isWebPlan(input.product)) throw new HttpsError('invalid-argument', 'invalid_gift_certificate_product');
  const count = Number(input.count);
  if (!Number.isInteger(count) || count < 1 || count > 200) {
    throw new HttpsError('invalid-argument', 'invalid_gift_certificate_count');
  }
  if (!Array.isArray(input.recipientNames) || input.recipientNames.length !== count) {
    throw new HttpsError('invalid-argument', 'recipient_names_count_mismatch');
  }
  const recipientNames = input.recipientNames.map((value) => strictGiftCertificateName(value, 'recipient'));
  const hasExplicitVisibility = typeof input.showRecipientName === 'boolean'
    || typeof input.showSenderName === 'boolean';
  const showRecipientName = typeof input.showRecipientName === 'boolean'
    ? input.showRecipientName
    : !hasExplicitVisibility;
  const showSenderName = typeof input.showSenderName === 'boolean'
    ? input.showSenderName
    : !hasExplicitVisibility;
  if (showRecipientName && recipientNames.some((value) => !value)) {
    throw new HttpsError('invalid-argument', 'recipient_name_missing');
  }
  const normalizedNames = recipientNames.filter(Boolean).map((value) => value.toLocaleLowerCase('ru-RU'));
  if (new Set(normalizedNames).size !== normalizedNames.length) {
    throw new HttpsError('invalid-argument', 'duplicate_recipient_name');
  }
  const rawSenderNames = input.senderNames == null
    ? Array.from({ length: count }, () => 'Phraseman')
    : input.senderNames;
  if (!Array.isArray(rawSenderNames) || rawSenderNames.length !== count) {
    throw new HttpsError('invalid-argument', 'sender_names_count_mismatch');
  }
  const senderNames = rawSenderNames.map((value) => strictGiftCertificateName(value, 'sender'));
  if (showSenderName && senderNames.some((value) => !value)) {
    throw new HttpsError('invalid-argument', 'sender_name_missing');
  }
  const rawEmails = input.recipientEmails == null ? [] : input.recipientEmails;
  if (!Array.isArray(rawEmails) || rawEmails.length > count) {
    throw new HttpsError('invalid-argument', 'recipient_emails_count_mismatch');
  }
  const recipientEmails = Array.from({ length: count }, (_unused, index) => {
    const raw = cleanShortText(rawEmails[index], 200);
    if (!raw) return '';
    const email = cleanEmail(raw);
    if (!email) throw new HttpsError('invalid-argument', 'invalid_recipient_email');
    return email;
  });
  if (!Array.isArray(params.codes) || params.codes.length !== count) {
    throw new HttpsError('internal', 'gift_certificate_codes_count_mismatch');
  }
  const codes = params.codes.map((value) => cleanShortText(value, 32).toUpperCase());
  if (codes.some((value) => !/^GIFT-[A-HJ-NP-Z2-9]{10}$/.test(value))) {
    throw new HttpsError('internal', 'invalid_generated_gift_certificate_code');
  }
  if (new Set(codes).size !== codes.length) {
    throw new HttpsError('already-exists', 'gift_certificate_code_collision');
  }
  const batchId = cleanShortText(params.batchId, 120);
  if (!batchId) throw new HttpsError('internal', 'gift_certificate_batch_id_missing');
  if (!Number.isSafeInteger(params.nowMs) || params.nowMs <= 0) {
    throw new HttpsError('internal', 'gift_certificate_issue_time_invalid');
  }
  const reward = activationRewardForPlan(input.product);
  const expiresAtMs = giftCodeExpiryMs(params.nowMs, true);
  const items = codes.map((activationCode, index): GiftCertificateBatchItem => {
    const common = {
      certificateId: activationCode,
      batchId,
      activationCode,
      product: input.product as WebPlan,
      recipientName: recipientNames[index],
      senderName: senderNames[index],
      recipientEmail: recipientEmails[index],
      showRecipientName,
      showSenderName,
      createdAtMs: params.nowMs,
      expiresAtMs,
      assetUrl: GIFT_CERTIFICATE_ART[input.product as WebPlan],
      source: 'admin_gift_certificates',
      createdBy: cleanShortText(params.actorEmail, 200),
      createdByUid: cleanShortText(params.actorUid, 128),
    };
    const promoDoc = {
      rewardDays: reward.rewardDays,
      rewardKind: reward.rewardKind,
      enabled: true,
      maxRedemptions: 1,
      usedCount: 0,
      expiresAtMs,
      certificateId: activationCode,
      certificateBatchId: batchId,
      certificateProduct: input.product,
      note: cleanShortText(recipientNames[index]
        ? `Gift certificate for ${recipientNames[index]}`
        : 'Gift certificate', 200),
      createdAtMs: params.nowMs,
      updatedAtMs: params.nowMs,
      createdBy: common.createdBy,
      createdByUid: common.createdByUid,
      updatedBy: common.createdBy,
      updatedByUid: common.createdByUid,
    };
    const certificateDoc = {
      ...common,
      plan: input.product,
      status: 'generated',
      rewardDays: reward.rewardDays,
      rewardKind: reward.rewardKind,
      gift: true,
      personalizationMode: showRecipientName || showSenderName ? 'named' : 'anonymous',
      showRecipientName,
      showSenderName,
      displayRecipientName: recipientNames[index],
      displaySenderName: senderNames[index],
      giftTo: recipientNames[index],
      giftFrom: senderNames[index],
      giftPhraseId: `${input.product}-01`,
      codeExpiresAtMs: expiresAtMs,
      testIssue: false,
    };
    return { ...common, status: 'generated', promoDoc, certificateDoc };
  });
  return {
    batchId,
    items,
    auditDoc: {
      action: 'gift_certificate_batch_create',
      targetUid: batchId,
      details: { batchId, product: input.product, count, certificateIds: codes },
      adminEmail: cleanShortText(params.actorEmail, 200),
      adminUid: cleanShortText(params.actorUid, 128),
      ts: new Date(params.nowMs).toISOString(),
    },
  };
}

export function assertGiftCertificateRefsAvailable(exists: readonly boolean[]): void {
  if (exists.some(Boolean)) throw new HttpsError('already-exists', 'gift_certificate_code_collision');
}

/** Fail-closed deletion plan for the certificate and its linked one-time promo. */
export function buildGiftCertificateDeletePlan(params: {
  certificateId: string;
  expectedUpdatedAtMs: unknown;
  certificate: FirebaseFirestore.DocumentData;
  promo: FirebaseFirestore.DocumentData;
  nowMs: number;
  actorUid: string;
  actorEmail: string;
  reason: unknown;
}): { certificateId: string; auditDoc: Record<string, unknown> } {
  const certificateId = cleanShortText(params.certificateId, 32).toUpperCase();
  const product = isWebPlan(params.certificate.product) ? params.certificate.product : null;
  if (!/^GIFT-[A-HJ-NP-Z2-9]{10}$/.test(certificateId)
    || params.certificate.gift !== true
    || !product
    || String(params.certificate.certificateId ?? '') !== certificateId
    || String(params.certificate.activationCode ?? '') !== certificateId) {
    throw new HttpsError('failed-precondition', 'gift_certificate_identity_mismatch');
  }
  const currentUpdatedAtMs = Number(params.certificate.updatedAtMs ?? params.certificate.createdAtMs ?? 0);
  if (!Number.isSafeInteger(currentUpdatedAtMs)
    || Number(params.expectedUpdatedAtMs) !== currentUpdatedAtMs) {
    throw new HttpsError('aborted', 'gift_certificate_delete_conflict');
  }
  const deliveryStatus = cleanShortText(params.certificate.status, 40);
  const usedCount = Number(params.promo.usedCount);
  const hasRedemptionEvidence = usedCount > 0
    || Number(params.promo.lastRedeemedAtMs ?? 0) > 0
    || Boolean(cleanShortText(params.promo.lastRedeemedBy, 128))
    || deliveryStatus === 'activated'
    || deliveryStatus === 'redeemed';
  if (hasRedemptionEvidence) {
    throw new HttpsError('failed-precondition', 'gift_certificate_already_redeemed');
  }
  if (String(params.promo.certificateId ?? '') !== certificateId
    || String(params.promo.certificateProduct ?? '') !== product
    || Number(params.promo.maxRedemptions) !== 1
    || usedCount !== 0) {
    throw new HttpsError('failed-precondition', 'gift_certificate_promo_invalid');
  }
  return {
    certificateId,
    auditDoc: {
      action: 'gift_certificate_delete',
      targetUid: certificateId,
      reason: cleanShortText(params.reason, 500),
      details: {
        certificateId,
        batchId: cleanShortText(params.certificate.batchId, 120),
        product,
        deliveryStatus: deliveryStatus || 'generated',
      },
      adminEmail: cleanShortText(params.actorEmail, 200),
      adminUid: cleanShortText(params.actorUid, 128),
      ts: new Date(params.nowMs).toISOString(),
    },
  };
}

export function assertGiftCertificateAssetResponse(input: {
  ok: boolean;
  contentType: string;
  byteLength: number;
}): void {
  if (!input.ok) throw new HttpsError('unavailable', 'gift_certificate_asset_fetch_failed');
  if (input.contentType.split(';', 1)[0].trim().toLowerCase() !== 'image/webp') {
    throw new HttpsError('failed-precondition', 'gift_certificate_asset_type_invalid');
  }
  if (!Number.isSafeInteger(input.byteLength) || input.byteLength < 1 || input.byteLength > GIFT_CERTIFICATE_ASSET_MAX_BYTES) {
    throw new HttpsError('failed-precondition', 'gift_certificate_asset_size_invalid');
  }
}

export async function readBoundedGiftCertificateAssetBody(
  body: ReadableStream<Uint8Array> | null,
): Promise<Buffer> {
  if (!body) throw new HttpsError('unavailable', 'gift_certificate_asset_fetch_failed');
  const reader = body.getReader();
  const chunks: Buffer[] = [];
  let byteLength = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      byteLength += chunk.value.byteLength;
      if (byteLength > GIFT_CERTIFICATE_ASSET_MAX_BYTES) {
        await reader.cancel('gift_certificate_asset_size_invalid').catch(() => undefined);
        throw new HttpsError('failed-precondition', 'gift_certificate_asset_size_invalid');
      }
      chunks.push(Buffer.from(chunk.value));
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, byteLength);
}

async function readGiftCertificateAssetBase64(product: WebPlan, nowMs: number): Promise<string> {
  for (const [key, cached] of giftCertificateAssetCache.entries()) {
    if (nowMs - cached.fetchedAtMs > GIFT_CERTIFICATE_ASSET_CACHE_TTL_MS) giftCertificateAssetCache.delete(key);
  }
  const cached = giftCertificateAssetCache.get(product);
  if (cached) return cached.base64;
  const response = await fetch(GIFT_CERTIFICATE_ART[product], {
    method: 'GET',
    redirect: 'error',
    signal: AbortSignal.timeout(15_000),
  });
  const contentType = response.headers.get('content-type') ?? '';
  const declaredLength = Number(response.headers.get('content-length') ?? 0);
  assertGiftCertificateAssetResponse({
    ok: response.ok,
    contentType,
    byteLength: declaredLength > 0 ? declaredLength : 1,
  });
  const bytes = await readBoundedGiftCertificateAssetBody(response.body);
  assertGiftCertificateAssetResponse({ ok: response.ok, contentType, byteLength: bytes.byteLength });
  if (giftCertificateAssetCache.size >= 3) {
    const oldest = [...giftCertificateAssetCache.entries()].sort((a, b) => a[1].fetchedAtMs - b[1].fetchedAtMs)[0]?.[0];
    if (oldest) giftCertificateAssetCache.delete(oldest);
  }
  const base64 = bytes.toString('base64');
  giftCertificateAssetCache.set(product, { base64, fetchedAtMs: nowMs });
  return base64;
}

type GiftCertificateRecipientUpdateInput = {
  authorization?: unknown;
  certificateId?: unknown;
  recipientName?: unknown;
  recipientEmail?: unknown;
  expectedUpdatedAtMs?: unknown;
};

export function buildGiftCertificateRecipientUpdate(params: {
  input: GiftCertificateRecipientUpdateInput;
  current: FirebaseFirestore.DocumentData;
  promo: FirebaseFirestore.DocumentData;
  nowMs: number;
  actorUid: string;
  actorEmail: string;
}): { patch: Record<string, unknown>; record: Record<string, unknown> } {
  const { input, current, promo } = params;
  if (input.authorization !== GIFT_CERTIFICATE_RECIPIENT_UPDATE_AUTHORIZATION) {
    throw new HttpsError('failed-precondition', 'gift_certificate_recipient_update_not_authorized');
  }
  const certificateId = cleanShortText(input.certificateId, 32).toUpperCase();
  if (!/^GIFT-[A-HJ-NP-Z2-9]{10}$/.test(certificateId)
    || certificateId !== String(current.certificateId ?? '')
    || certificateId !== String(current.activationCode ?? '')) {
    throw new HttpsError('failed-precondition', 'gift_certificate_identity_mismatch');
  }
  if (current.gift !== true || current.testIssue === true || !isWebPlan(current.product)) {
    throw new HttpsError('failed-precondition', 'gift_certificate_record_invalid');
  }
  if (current.assetUrl !== GIFT_CERTIFICATE_ART[current.product]) {
    throw new HttpsError('failed-precondition', 'gift_certificate_asset_mismatch');
  }
  if (current.status === 'sent'
    || current.status === 'sending'
    || current.status === 'delivery_unknown'
    || current.status === 'reconciliation_required') {
    throw new HttpsError('failed-precondition', 'gift_certificate_recipient_locked');
  }
  const currentUpdatedAtMs = Number(current.updatedAtMs ?? current.createdAtMs ?? 0);
  if (!Number.isSafeInteger(currentUpdatedAtMs)
    || Number(input.expectedUpdatedAtMs) !== currentUpdatedAtMs) {
    throw new HttpsError('aborted', 'gift_certificate_edit_conflict');
  }
  const expiresAtMs = Number(current.expiresAtMs);
  const codeIsEditable = promo.enabled === true
    && Number(promo.maxRedemptions) === 1
    && Number(promo.usedCount ?? 0) === 0
    && Number(promo.expiresAtMs) === expiresAtMs
    && expiresAtMs > params.nowMs;
  if (!codeIsEditable) {
    const reason = Number(promo.usedCount ?? 0) > 0
      ? 'gift_certificate_already_redeemed'
      : 'gift_certificate_not_editable';
    throw new HttpsError('failed-precondition', reason);
  }
  const recipientName = cleanShortText(input.recipientName, 60);
  if (!recipientName) throw new HttpsError('invalid-argument', 'recipient_name_missing');
  const rawEmail = cleanShortText(input.recipientEmail, 200);
  const recipientEmail = rawEmail ? cleanEmail(rawEmail) : '';
  if (rawEmail && !recipientEmail) throw new HttpsError('invalid-argument', 'invalid_recipient_email');
  const patch = {
    recipientName,
    recipientEmail,
    giftTo: recipientName,
    updatedAtMs: params.nowMs,
    updatedBy: cleanShortText(params.actorEmail, 200),
    updatedByUid: cleanShortText(params.actorUid, 128),
  };
  return { patch, record: { ...current, ...patch } };
}

type GiftCertificatePersonalizationMode = 'named' | 'anonymous';

type GiftCertificatePersonalizationUpdateInput = {
  authorization?: unknown;
  certificateId?: unknown;
  personalizationMode?: unknown;
  showRecipientName?: unknown;
  showSenderName?: unknown;
  displayRecipientName?: unknown;
  displaySenderName?: unknown;
  recipientEmail?: unknown;
  expectedUpdatedAtMs?: unknown;
};

function strictGiftCertificateName(value: unknown, field: 'recipient' | 'sender'): string {
  const name = typeof value === 'string' ? value.trim() : '';
  if (Array.from(name).length > 60) {
    throw new HttpsError('invalid-argument', `gift_certificate_${field}_name_too_long`);
  }
  return name;
}

function giftCertificatePersonalizationMode(value: unknown): GiftCertificatePersonalizationMode {
  if (value === undefined || value === null || value === '') return 'named';
  if (value === 'named' || value === 'anonymous') return value;
  throw new HttpsError('failed-precondition', 'gift_certificate_personalization_mode_invalid');
}

function resolveGiftCertificateVisibility(input: FirebaseFirestore.DocumentData, saved: {
  recipientName: string;
  senderName: string;
}): { showRecipientName: boolean; showSenderName: boolean; personalizationMode: GiftCertificatePersonalizationMode } {
  const hasExplicitVisibility = typeof input.showRecipientName === 'boolean'
    || typeof input.showSenderName === 'boolean';
  const legacyMode = hasExplicitVisibility ? 'named' : giftCertificatePersonalizationMode(input.personalizationMode);
  const legacyRecipient = legacyMode === 'named' && Boolean(saved.recipientName);
  const legacySender = legacyMode === 'named' && Boolean(saved.senderName);
  const showRecipientName = typeof input.showRecipientName === 'boolean'
    ? input.showRecipientName
    : legacyRecipient;
  const showSenderName = typeof input.showSenderName === 'boolean'
    ? input.showSenderName
    : legacySender;
  return {
    showRecipientName,
    showSenderName,
    personalizationMode: showRecipientName || showSenderName ? 'named' : 'anonymous',
  };
}

/** Existing valid ids are preserved; legacy drift is repaired without randomness. */
export function resolveCanonicalGiftCertificatePhrase(
  product: WebPlan,
  savedPhraseId: unknown,
): { id: string; text: string } {
  const phraseId = cleanShortText(savedPhraseId, 40);
  return GIFT_CERTIFICATE_PHRASES[product].find(({ id }) => id === phraseId)
    ?? GIFT_CERTIFICATE_PHRASES[product][0];
}

/**
 * The single persisted presentation resolver used by history, PNG and email.
 * Anonymous mode intentionally returns empty visible names while retaining the
 * saved identity and delivery address for later administrative use.
 */
export function resolveGiftCertificatePresentation(
  record: FirebaseFirestore.DocumentData,
  promo: FirebaseFirestore.DocumentData = {},
  nowMs: number = Date.now(),
  _options: { strictPhraseId?: boolean } = {},
): Record<string, unknown> {
  const product = isWebPlan(record.product) ? record.product : (isWebPlan(record.plan) ? record.plan : null);
  if (!product) throw new HttpsError('failed-precondition', 'gift_certificate_plan_invalid');
  const savedRecipientName = strictGiftCertificateName(
    record.displayRecipientName ?? record.recipientName ?? record.giftTo,
    'recipient',
  );
  const savedSenderName = strictGiftCertificateName(
    record.displaySenderName ?? record.giftFrom ?? 'Phraseman',
    'sender',
  ) || 'Phraseman';
  const visibility = resolveGiftCertificateVisibility(record, {
    recipientName: savedRecipientName,
    senderName: savedSenderName,
  });
  const phrase = resolveCanonicalGiftCertificatePhrase(product, record.giftPhraseId);
  const usedCount = Math.max(0, Math.trunc(Number(promo.usedCount ?? 0)) || 0);
  const lastRedeemedAtMs = Math.max(0, Math.trunc(Number(promo.lastRedeemedAtMs ?? 0)) || 0);
  const expiresAtMs = Math.max(0, Math.trunc(Number(promo.expiresAtMs ?? record.expiresAtMs ?? record.codeExpiresAtMs ?? 0)) || 0);
  const activationStatus = usedCount > 0
    ? 'redeemed'
    : promo.enabled !== true
      ? 'disabled'
      : expiresAtMs > 0 && expiresAtMs <= nowMs
        ? 'expired'
        : 'available';
  const activationStatusLabel = activationStatus === 'redeemed'
    ? 'Активирован'
    : activationStatus === 'disabled'
      ? 'Отключён'
      : activationStatus === 'expired'
        ? 'Истёк'
        : 'Не активирован';
  const showPersonalization = visibility.showRecipientName || visibility.showSenderName;
  return {
    product,
    personalizationMode: visibility.personalizationMode,
    showRecipientName: visibility.showRecipientName,
    showSenderName: visibility.showSenderName,
    savedRecipientName,
    savedSenderName,
    recipientEmail: cleanEmail(record.recipientEmail) ?? '',
    displayRecipientName: visibility.showRecipientName ? savedRecipientName : '',
    displaySenderName: visibility.showSenderName ? savedSenderName : '',
    showPersonalization,
    productTitle: giftPlanTitle(product),
    giftPhraseId: phrase.id,
    giftPhrase: phrase.text,
    activationStatus,
    activationStatusLabel,
    lastRedeemedAtMs,
  };
}

/** Strict canonical personalization write plan shared by callable and tests. */
export function buildGiftCertificatePersonalizationUpdate(params: {
  input: GiftCertificatePersonalizationUpdateInput;
  current: FirebaseFirestore.DocumentData;
  promo: FirebaseFirestore.DocumentData;
  nowMs: number;
  actorUid: string;
  actorEmail: string;
}): { patch: Record<string, unknown>; record: Record<string, unknown>; auditDetails: Record<string, unknown> } {
  const { input, current, promo } = params;
  if (input.authorization !== GIFT_CERTIFICATE_PERSONALIZATION_UPDATE_AUTHORIZATION) {
    throw new HttpsError('failed-precondition', 'gift_certificate_personalization_update_not_authorized');
  }
  const certificateId = cleanShortText(input.certificateId, 32).toUpperCase();
  if (!/^GIFT-[A-HJ-NP-Z2-9]{10}$/.test(certificateId)
    || certificateId !== String(current.certificateId ?? '')
    || certificateId !== String(current.activationCode ?? '')) {
    throw new HttpsError('failed-precondition', 'gift_certificate_identity_mismatch');
  }
  if (current.gift !== true || current.testIssue === true || !isWebPlan(current.product)) {
    throw new HttpsError('failed-precondition', 'gift_certificate_record_invalid');
  }
  if ((current.plan !== undefined && current.plan !== current.product)
    || current.assetUrl !== GIFT_CERTIFICATE_ART[current.product]) {
    throw new HttpsError('failed-precondition', current.plan !== undefined && current.plan !== current.product
      ? 'gift_certificate_plan_mismatch'
      : 'gift_certificate_asset_mismatch');
  }
  if (['sent', 'sending', 'delivery_unknown', 'reconciliation_required'].includes(String(current.status ?? ''))) {
    throw new HttpsError('failed-precondition', 'gift_certificate_personalization_locked');
  }
  const currentUpdatedAtMs = Number(current.updatedAtMs ?? current.createdAtMs ?? 0);
  if (!Number.isSafeInteger(currentUpdatedAtMs) || Number(input.expectedUpdatedAtMs) !== currentUpdatedAtMs) {
    throw new HttpsError('aborted', 'gift_certificate_edit_conflict');
  }
  const expiresAtMs = Number(current.expiresAtMs ?? current.codeExpiresAtMs ?? 0);
  const expectedReward = activationRewardForPlan(current.product);
  const usedCount = Number(promo.usedCount ?? 0);
  if (usedCount > 0) throw new HttpsError('failed-precondition', 'gift_certificate_already_redeemed');
  const promoIsCoherent = promo.enabled === true
    && Number(promo.maxRedemptions) === 1
    && usedCount === 0
    && Number(promo.expiresAtMs) === expiresAtMs
    && String(promo.certificateId ?? '') === certificateId
    && String(promo.certificateProduct ?? '') === current.product
    && Number(promo.rewardDays) === expectedReward.rewardDays
    && String(promo.rewardKind) === expectedReward.rewardKind;
  if (!promoIsCoherent) throw new HttpsError('failed-precondition', 'gift_certificate_promo_invalid');
  if (!(Number.isSafeInteger(expiresAtMs) && expiresAtMs > params.nowMs)) {
    throw new HttpsError('failed-precondition', 'gift_certificate_expired');
  }

  const currentPresentation = resolveGiftCertificatePresentation(current, promo, params.nowMs);
  const hasExplicitVisibility = typeof input.showRecipientName === 'boolean'
    || typeof input.showSenderName === 'boolean';
  const legacyMode = hasExplicitVisibility ? 'named' : giftCertificatePersonalizationMode(input.personalizationMode);
  const showRecipientName = typeof input.showRecipientName === 'boolean'
    ? input.showRecipientName
    : (hasExplicitVisibility ? Boolean(currentPresentation.showRecipientName) : legacyMode === 'named');
  const showSenderName = typeof input.showSenderName === 'boolean'
    ? input.showSenderName
    : (hasExplicitVisibility ? Boolean(currentPresentation.showSenderName) : legacyMode === 'named');
  const personalizationMode: GiftCertificatePersonalizationMode = showRecipientName || showSenderName
    ? 'named'
    : 'anonymous';
  let displayRecipientName = strictGiftCertificateName(input.displayRecipientName, 'recipient');
  let displaySenderName = strictGiftCertificateName(input.displaySenderName, 'sender');
  if (showRecipientName && !displayRecipientName) {
    throw new HttpsError('invalid-argument', 'gift_certificate_recipient_name_missing');
  }
  if (showSenderName && !displaySenderName) {
    throw new HttpsError('invalid-argument', 'gift_certificate_sender_name_missing');
  }
  displayRecipientName ||= String(currentPresentation.savedRecipientName ?? '');
  displaySenderName ||= String(currentPresentation.savedSenderName ?? '') || 'Phraseman';
  const rawEmail = typeof input.recipientEmail === 'string' ? input.recipientEmail.trim() : '';
  const recipientEmail = rawEmail ? cleanEmail(rawEmail) : (cleanEmail(current.recipientEmail) ?? '');
  if (rawEmail && !recipientEmail) throw new HttpsError('invalid-argument', 'invalid_recipient_email');
  const patch = {
    personalizationMode,
    showRecipientName,
    showSenderName,
    displayRecipientName,
    displaySenderName,
    recipientName: displayRecipientName,
    recipientEmail,
    giftTo: displayRecipientName,
    giftFrom: displaySenderName,
    giftPhraseId: currentPresentation.giftPhraseId,
    updatedAtMs: params.nowMs,
    updatedBy: cleanShortText(params.actorEmail, 200),
    updatedByUid: cleanShortText(params.actorUid, 128),
  };
  const auditDetails = {
    certificateId,
    personalizationMode,
    showRecipientName,
    showSenderName,
    recipientEmailSet: Boolean(recipientEmail),
    recipientNameSet: Boolean(displayRecipientName),
    senderNameSet: Boolean(displaySenderName),
  };
  return { patch, record: { ...current, ...patch }, auditDetails };
}

export function giftCertificateDisplayRecord(
  certificateId: string,
  record: FirebaseFirestore.DocumentData,
  promo: FirebaseFirestore.DocumentData = {},
  nowMs: number = Date.now(),
): Record<string, unknown> {
  const product = isWebPlan(record.product) ? record.product : null;
  const usedCount = Math.max(0, Math.trunc(Number(promo.usedCount ?? 0)) || 0);
  let presentation: Record<string, unknown>;
  try {
    presentation = resolveGiftCertificatePresentation(record, promo, nowMs);
  } catch {
    presentation = {
      personalizationMode: 'anonymous', showRecipientName: false, showSenderName: false,
      savedRecipientName: '', savedSenderName: '', recipientEmail: '',
      displayRecipientName: '', displaySenderName: '', showPersonalization: false,
      productTitle: '', giftPhraseId: '', giftPhrase: '', activationStatus: 'invalid',
      activationStatusLabel: 'Недоступен', lastRedeemedAtMs: 0,
    };
  }
  return {
    certificateId,
    batchId: cleanShortText(record.batchId, 120),
    activationCode: cleanShortText(record.activationCode, 32),
    product: product ?? '',
    recipientName: cleanShortText(record.recipientName ?? record.giftTo, 60),
    recipientEmail: cleanEmail(record.recipientEmail) ?? '',
    createdAtMs: Math.max(0, Math.trunc(Number(record.createdAtMs ?? record.preparedAtMs ?? 0)) || 0),
    updatedAtMs: Math.max(0, Math.trunc(Number(record.updatedAtMs ?? record.createdAtMs ?? record.preparedAtMs ?? 0)) || 0),
    expiresAtMs: Math.max(0, Math.trunc(Number(record.expiresAtMs ?? record.codeExpiresAtMs ?? 0)) || 0),
    status: cleanShortText(record.status, 40) || 'generated',
    assetUrl: product && record.assetUrl === GIFT_CERTIFICATE_ART[product] ? record.assetUrl : '',
    rewardDays: Math.max(0, Math.trunc(Number(record.rewardDays ?? promo.rewardDays ?? 0)) || 0),
    rewardKind: record.rewardKind === 'lifetime' || promo.rewardKind === 'lifetime' ? 'lifetime' : 'days',
    enabled: promo.enabled === true,
    usedCount,
    maxRedemptions: Math.max(0, Math.trunc(Number(promo.maxRedemptions ?? 0)) || 0),
    lastRedeemedAtMs: Math.max(0, Math.trunc(Number(promo.lastRedeemedAtMs ?? 0)) || 0),
    redemptionStatus: usedCount > 0 ? 'redeemed' : (promo.enabled === true ? 'available' : 'disabled'),
    replacementOf: cleanShortText(record.replacementOf, 32),
    statusEvaluatedAtMs: nowMs,
    ...presentation,
  };
}

/**
 * Builds the complete display contract for a downloadable certificate from
 * persisted server data. The browser receives copy derived from the validated
 * plan and phrase catalog; it never supplies its own title, sender or phrase.
 */
export function buildGiftCertificateDownloadDisplayRecord(
  certificateId: string,
  record: FirebaseFirestore.DocumentData,
  promo: FirebaseFirestore.DocumentData = {},
  nowMs: number = Date.now(),
): Record<string, unknown> {
  const product = isWebPlan(record.product) ? record.product : null;
  const validRecord = product !== null
    && record.gift === true
    && record.testIssue !== true
    && String(record.certificateId ?? '') === certificateId
    && String(record.activationCode ?? '') === certificateId
    && record.assetUrl === GIFT_CERTIFICATE_ART[product];
  if (!validRecord || !product) {
    throw new HttpsError('failed-precondition', 'gift_certificate_record_invalid');
  }

  const expiresAtMs = Number(record.expiresAtMs ?? record.codeExpiresAtMs ?? 0);
  const expectedReward = activationRewardForPlan(product);
  const optionalMatches = (
    source: FirebaseFirestore.DocumentData,
    key: string,
    expected: string | number,
  ): boolean => source[key] === undefined || source[key] === null || String(source[key]) === String(expected);
  const promoIsCoherent = promo.enabled === true
    && Number(promo.maxRedemptions) === 1
    && Number(promo.usedCount) === 0
    && Number.isSafeInteger(expiresAtMs)
    && expiresAtMs > nowMs
    && Number(promo.expiresAtMs) === expiresAtMs
    && optionalMatches(record, 'codeExpiresAtMs', expiresAtMs)
    && optionalMatches(record, 'plan', product)
    && optionalMatches(record, 'rewardDays', expectedReward.rewardDays)
    && optionalMatches(record, 'rewardKind', expectedReward.rewardKind)
    && String(promo.certificateId) === certificateId
    && String(promo.certificateProduct) === product
    && Number(promo.rewardDays) === expectedReward.rewardDays
    && String(promo.rewardKind) === expectedReward.rewardKind;
  if (!promoIsCoherent) {
    throw new HttpsError('failed-precondition', 'gift_certificate_promo_invalid');
  }
  const presentation = resolveGiftCertificatePresentation(record, promo, nowMs, { strictPhraseId: true });
  if ((presentation.showRecipientName && !presentation.displayRecipientName)
    || (presentation.showSenderName && !presentation.displaySenderName)) {
    throw new HttpsError('failed-precondition', 'gift_certificate_recipient_name_missing');
  }

  return {
    ...giftCertificateDisplayRecord(certificateId, record, promo, nowMs),
    ...presentation,
    recipientName: presentation.displayRecipientName,
    senderName: presentation.displaySenderName,
  };
}

export interface SyntheticGiftCertificateReplacementInput {
  authorization: unknown;
  recipientEmail: unknown;
  giftTo: unknown;
  giftFrom: unknown;
  giftPhraseId: unknown;
  reason: unknown;
}

export function buildSyntheticGiftCertificateReplacement(params: {
  oldCode: string;
  newCode: string;
  nowMs: number;
  actorUid: string;
  actorEmail: string;
  input: SyntheticGiftCertificateReplacementInput;
  oldDoc: FirebaseFirestore.DocumentData;
}): {
  oldCodePatch: Record<string, unknown>;
  newCodeDoc: Record<string, unknown>;
  deliveryDoc: Record<string, unknown>;
  auditDoc: Record<string, unknown>;
} {
  const { input, oldDoc } = params;
  if (input.authorization !== GIFT_CERTIFICATE_REPLACEMENT_AUTHORIZATION) {
    throw new HttpsError('failed-precondition', 'replacement_not_authorized');
  }
  const oldCode = cleanShortText(params.oldCode, 32).toUpperCase();
  const newCode = cleanShortText(params.newCode, 32).toUpperCase();
  if (!/^[A-Z0-9_-]{3,32}$/.test(oldCode) || !/^[A-Z0-9_-]{3,32}$/.test(newCode) || oldCode === newCode) {
    throw new HttpsError('invalid-argument', 'invalid_replacement_code');
  }
  if (oldCode !== GIFT_CERTIFICATE_REPAIR_OLD_CODE) {
    throw new HttpsError('failed-precondition', 'old_certificate_target_mismatch');
  }

  const storedNote = typeof oldDoc.note === 'string' ? oldDoc.note : '';
  if (storedNote !== GIFT_CERTIFICATE_REPAIR_OLD_NOTE) {
    throw new HttpsError('failed-precondition', 'old_certificate_note_mismatch');
  }
  const oldUnused = oldDoc.enabled === true
    && Number(oldDoc.maxRedemptions) === 1
    && Number(oldDoc.usedCount ?? 0) === 0
    && Number(oldDoc.rewardDays) === 365
    && String(oldDoc.rewardKind ?? 'days') === 'days'
    && !String(oldDoc.lastRedeemedBy ?? '').trim()
    && !(Number(oldDoc.lastRedeemedAtMs) > 0)
    && !String(oldDoc.supersededBy ?? '').trim();
  if (!oldUnused) throw new HttpsError('failed-precondition', 'old_certificate_not_replaceable');

  const recipientEmail = cleanEmail(input.recipientEmail);
  if (!recipientEmail) throw new HttpsError('invalid-argument', 'invalid_recipient_email');
  const giftTo = cleanShortText(input.giftTo, 60);
  const giftFrom = cleanShortText(input.giftFrom, 60);
  if (!giftTo) throw new HttpsError('invalid-argument', 'delivery_recipient_name_missing');
  if (!giftFrom) throw new HttpsError('invalid-argument', 'delivery_sender_name_missing');
  const giftPhraseId = cleanShortText(input.giftPhraseId, 40);
  if (!/^yearly-\d{2}$/.test(giftPhraseId)) throw new HttpsError('invalid-argument', 'invalid_gift_phrase');
  const reason = cleanShortText(input.reason, 500);
  if (reason.length < 10) throw new HttpsError('invalid-argument', 'replacement_reason_required');

  const expiresAtMs = giftCodeExpiryMs(params.nowMs, true);
  const commonActor = {
    updatedAtMs: params.nowMs,
    updatedBy: params.actorEmail,
    updatedByUid: params.actorUid,
  };
  return {
    oldCodePatch: {
      enabled: false,
      supersededBy: newCode,
      supersededAtMs: params.nowMs,
      supersededReason: reason,
      ...commonActor,
    },
    newCodeDoc: {
      rewardDays: 366,
      rewardKind: 'days',
      enabled: true,
      maxRedemptions: 1,
      usedCount: 0,
      expiresAtMs,
      certificateId: newCode,
      certificateBatchId: `repair-${oldCode}`,
      certificateProduct: 'yearly',
      note: cleanShortText(`Personalized gift certificate for ${giftTo}; authorized replacement of ${oldCode}`, 200),
      replacementOf: oldCode,
      createdAtMs: params.nowMs,
      createdBy: params.actorEmail,
      createdByUid: params.actorUid,
      ...commonActor,
    },
    deliveryDoc: {
      status: 'prepared',
      certificateId: newCode,
      batchId: `repair-${oldCode}`,
      activationCode: newCode,
      replacementOf: oldCode,
      recipientEmail,
      plan: 'yearly',
      product: 'yearly',
      recipientName: giftTo,
      assetUrl: GIFT_CERTIFICATE_ART.yearly,
      rewardDays: 366,
      rewardKind: 'days',
      gift: true,
      personalizationMode: 'named',
      displayRecipientName: giftTo,
      displaySenderName: giftFrom,
      giftTo,
      giftFrom,
      giftPhraseId,
      codeExpiresAtMs: expiresAtMs,
      expiresAtMs,
      testIssue: false,
      createdAtMs: params.nowMs,
      updatedAtMs: params.nowMs,
      preparedAtMs: params.nowMs,
      preparedBy: params.actorEmail,
      preparedByUid: params.actorUid,
    },
    auditDoc: {
      action: 'gift_certificate_replace_synthetic',
      targetUid: oldCode,
      reason,
      details: { oldCode, newCode, recipientEmail, giftTo, giftFrom, expiresAtMs },
      adminEmail: params.actorEmail,
      adminUid: params.actorUid,
      ts: new Date(params.nowMs).toISOString(),
    },
  };
}

export type GiftCertificateDeliveryDecision =
  | { action: 'send'; email: string }
  | { action: 'already_sent' }
  | { action: 'reconciliation_required' };

/** Full delivery/code invariant checked inside the send transaction before claiming. */
export function assertGiftCertificateSendCoherence(
  delivery: FirebaseFirestore.DocumentData,
  code: FirebaseFirestore.DocumentData,
  context: { deliveryId: string; nowMs: number },
): { plan: WebPlan; presentation: Record<string, unknown> } {
  const plan = isWebPlan(delivery.plan) ? delivery.plan : null;
  const product = isWebPlan(delivery.product) ? delivery.product : null;
  const expectedReward = plan ? activationRewardForPlan(plan) : null;
  const presentation = plan
    ? resolveGiftCertificatePresentation(delivery, {}, context.nowMs)
    : null;
  const coherent = plan !== null
    && product === plan
    && expectedReward !== null
    && presentation !== null
    && cleanShortText(delivery.giftPhraseId, 40) === presentation.giftPhraseId
    && delivery.gift === true
    && delivery.testIssue !== true
    && code.enabled === true
    && Number(code.maxRedemptions) === 1
    && Number(code.usedCount ?? 0) === 0
    && String(delivery.certificateId ?? '') === context.deliveryId
    && String(delivery.activationCode ?? '') === context.deliveryId
    && String(code.certificateId ?? '') === context.deliveryId
    && String(code.certificateProduct ?? '') === plan
    && Number(delivery.rewardDays) === expectedReward.rewardDays
    && String(delivery.rewardKind) === expectedReward.rewardKind
    && Number(code.rewardDays) === expectedReward.rewardDays
    && String(code.rewardKind) === expectedReward.rewardKind
    && String(code.replacementOf ?? '') === String(delivery.replacementOf ?? '')
    && Number(code.expiresAtMs) === Number(delivery.codeExpiresAtMs)
    && Number(delivery.expiresAtMs) === Number(delivery.codeExpiresAtMs)
    && delivery.assetUrl === GIFT_CERTIFICATE_ART[plan]
    && Number(code.expiresAtMs) > context.nowMs;
  if (!coherent || !plan || !presentation) {
    throw new HttpsError('failed-precondition', 'gift_certificate_not_sendable');
  }
  return { plan, presentation };
}

export function decideGiftCertificateDeliveryClaim(
  delivery: FirebaseFirestore.DocumentData,
  context: { deliveryId: string; expectedRecipientEmail: unknown; nowMs: number },
): GiftCertificateDeliveryDecision {
  if (delivery.gift !== true || delivery.testIssue === true) {
    throw new HttpsError('failed-precondition', 'test_delivery_forbidden');
  }
  if (!isWebPlan(delivery.plan)) throw new HttpsError('failed-precondition', 'delivery_plan_invalid');
  const presentation = resolveGiftCertificatePresentation(delivery, {}, context.nowMs, { strictPhraseId: true });
  if (presentation.personalizationMode === 'named' && !presentation.displayRecipientName) {
    throw new HttpsError('failed-precondition', 'delivery_recipient_name_missing');
  }
  if (presentation.personalizationMode === 'named' && !presentation.displaySenderName) {
    throw new HttpsError('failed-precondition', 'delivery_sender_name_missing');
  }
  const activationCode = typeof delivery.activationCode === 'string' ? delivery.activationCode : '';
  if (!activationCode) throw new HttpsError('failed-precondition', 'delivery_code_missing');
  if (activationCode !== context.deliveryId) throw new HttpsError('failed-precondition', 'delivery_code_mismatch');
  if (!(Number(delivery.codeExpiresAtMs) > 0)) throw new HttpsError('failed-precondition', 'delivery_expiry_missing');
  const email = cleanEmail(delivery.recipientEmail);
  if (!email) throw new HttpsError('failed-precondition', 'delivery_email_invalid');
  const expectedRecipientEmail = cleanEmail(context.expectedRecipientEmail);
  if (!expectedRecipientEmail) throw new HttpsError('invalid-argument', 'expected_recipient_email_required');
  if (expectedRecipientEmail !== email) throw new HttpsError('failed-precondition', 'expected_recipient_email_mismatch');

  if (delivery.status === 'sent') return { action: 'already_sent' };
  if (delivery.status === 'generated' || delivery.status === 'prepared' || delivery.status === 'failed') {
    return { action: 'send', email };
  }
  if (delivery.status === 'reconciliation_required') return { action: 'reconciliation_required' };
  if (delivery.status !== 'sending' && delivery.status !== 'delivery_unknown') {
    throw new HttpsError('failed-precondition', 'delivery_not_prepared');
  }

  const firstProviderAttemptAtMs = Number(delivery.firstProviderAttemptAtMs);
  const withinIdempotencyWindow = Number.isFinite(firstProviderAttemptAtMs)
    && firstProviderAttemptAtMs > 0
    && context.nowMs >= firstProviderAttemptAtMs
    && context.nowMs - firstProviderAttemptAtMs <= GIFT_CERTIFICATE_IDEMPOTENT_RETRY_WINDOW_MS;
  if (!withinIdempotencyWindow) return { action: 'reconciliation_required' };
  if (delivery.status === 'sending') {
    const sendClaimedAtMs = Number(delivery.sendClaimedAtMs);
    if (Number.isFinite(sendClaimedAtMs) && context.nowMs - sendClaimedAtMs < GIFT_CERTIFICATE_SEND_CLAIM_STALE_MS) {
      throw new HttpsError('aborted', 'delivery_in_progress');
    }
  }
  return { action: 'send', email };
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
  giftPhraseId?: string;
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
    giftPhraseId: input.giftPhraseId || null,
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
  await markActivationEmailStatusAt(getFirestore().collection(ORDERS_COLLECTION).doc(id), patch);
}

async function markActivationEmailStatusAt(
  ref: FirebaseFirestore.DocumentReference,
  patch: Record<string, unknown>,
  propagateFailure: boolean = false,
): Promise<void> {
  try {
    await ref.set({
      ...patch,
      customerEmailUpdatedAt: FieldValue.serverTimestamp(),
      customerEmailUpdatedAtIso: new Date().toISOString(),
    }, { merge: true });
  } catch (e) {
    logger.warn('web_checkout activation email status update failed', e);
    if (propagateFailure) throw e;
  }
}

export function deliveryStatusForEmailOutcome(customerEmailStatus: unknown): 'sent' | 'failed' | 'delivery_unknown' {
  if (customerEmailStatus === 'sent') return 'sent';
  if (customerEmailStatus === 'skipped_no_resend_key'
    || customerEmailStatus === 'skipped_no_resend_from'
    || customerEmailStatus === 'provider_rejected') return 'failed';
  return 'delivery_unknown';
}

export function resendFailureOutcomeForHttpStatus(status: number): 'provider_rejected' | 'transport_unknown' {
  return status >= 400 && status < 500 && status !== 408 && status !== 409
    ? 'provider_rejected'
    : 'transport_unknown';
}

export function buildResendRequestHeaders(apiKey: string, idempotencyKey?: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
  };
}

async function markActivationEmailOutcome(
  orderId: unknown,
  statusRef: FirebaseFirestore.DocumentReference | undefined,
  patch: Record<string, unknown>,
): Promise<void> {
  if (statusRef) {
    const deliveryStatus = deliveryStatusForEmailOutcome(patch.customerEmailStatus);
    await markActivationEmailStatusAt(statusRef, { ...patch, status: deliveryStatus }, true);
    return;
  }
  await markActivationEmailStatus(orderId, patch);
}

/** ДД.ММ.ГГГГ по UTC — детерминированно для тестов и одинаково для всех получателей. */
function formatRuDate(ms: number): string {
  return new Date(ms).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
}

/**
 * Письмо с кодом активации. Для подарка — именной «золотой сертификат»
 * (владелец 2026-07-26): Для/От, название подарка (Plus/Pro), код крупно,
 * срок действия, шаги активации. Чистая функция — покрыта тестами.
 * Вёрстка инлайновая, без рамок-обводок (запрет владельца). Подарочная версия
 * использует тот же размещённый на knowlyapps.com фон, что и /gift/; при
 * заблокированных картинках остаются читаемые цветовой фон и текст.
 */
export function buildActivationEmail(
  order: FirebaseFirestore.DocumentData,
  support: string,
): { subject: string; text: string; html: string } {
  const activationCode = cleanShortText(order.activationCode, 48);
  const isGift = order.gift === true;
  const plan: WebPlan = isWebPlan(order.plan) ? order.plan : 'monthly';
  const giftPresentation = isGift ? resolveGiftCertificatePresentation(
    { ...order, product: plan },
    { enabled: true, usedCount: 0, expiresAtMs: order.codeExpiresAtMs },
  ) : null;
  const productTitle = isGift ? String(giftPresentation?.productTitle ?? '') : productNameForPlan(plan, false);
  const giftTo = isGift ? String(giftPresentation?.displayRecipientName ?? '') : '';
  const giftFrom = isGift ? String(giftPresentation?.displaySenderName ?? '') : '';
  const giftPhrase = isGift ? { text: String(giftPresentation?.giftPhrase ?? '') } : null;
  const isTestIssue = isGift && order.testIssue === true;
  const expiresAtMs = Math.max(0, Math.trunc(Number(order.codeExpiresAtMs ?? 0)) || 0);
  const expiresLine = expiresAtMs > 0 ? `Сертификат действует до ${formatRuDate(expiresAtMs)}.` : '';
  const giftArtUrl = GIFT_CERTIFICATE_ART[plan];
  const giftTheme = plan === 'lifetime'
    ? { canvas: '#101817', ink: '#fff8e8', soft: '#d8ccb0', accent: '#efca70', panel: '#111918' }
    : { canvas: '#f5efe3', ink: '#201c12', soft: '#6f6852', accent: '#8b6508', panel: '#fffaf0' };

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
    ...(giftPhrase ? ['', giftPhrase.text] : []),
    '',
    `Код активации: ${activationCode}`,
    ...(expiresLine ? [expiresLine] : []),
    '',
    ...(isTestIssue ? ['ТЕСТОВАЯ ВЫДАЧА — ОПЛАТА НЕ ПРОВОДИЛАСЬ', ''] : []),
    isGift
      ? 'Перешлите этот сертификат тому, кому дарите. Как получателю включить доступ:'
      : 'Как включить доступ:',
    ...steps,
    '',
    `Если что-то не получилось, напишите: ${support}`,
  ].filter((line, i, arr) => line !== '' || arr[i - 1] !== '').join('\n');

  const codeBlock = `<div style="background:#201c12;border-radius:16px;padding:20px 16px;margin:20px 0;text-align:center;font-size:26px;font-weight:800;letter-spacing:4px;color:#f7de8b;font-family:Consolas,Menlo,monospace">${htmlEscape(activationCode)}</div>`;
  const giftCodeLine = `<div data-gift-code="true" style="margin:28px 0 4px;text-align:center;font-size:22px;font-weight:800;letter-spacing:4px;color:${giftTheme.accent};font-family:Consolas,Menlo,monospace">${htmlEscape(activationCode)}</div>`;
  const stepsHtml = `<ol style="margin:12px 0 0;padding-left:20px;color:#4c4636;line-height:1.7"><li>Скачайте Phraseman: <a href="https://knowlyapps.com/download/" style="color:#b8860f;font-weight:bold">knowlyapps.com/download/</a></li><li>Откройте Настройки → Промокоды.</li><li>Введите код и нажмите «Активировать».</li></ol>`;
  const supportHtml = `<p style="margin:22px 0 0;color:#6f6852;font-size:13px">Если что-то не получилось, напишите: ${htmlEscape(support)}</p>`;

  const html = isGift
    ? [
      '<div style="background:#f6f3ea;padding:28px 12px;font-family:Arial,Helvetica,sans-serif">',
      '<div style="max-width:560px;margin:0 auto;border-radius:24px;overflow:hidden">',
      `<table data-gift-certificate-art="true" role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background-color:${giftTheme.canvas};background-image:url('${giftArtUrl}');background-repeat:no-repeat;background-position:center;background-size:cover;border-collapse:separate">`,
      `<tr><td background="${giftArtUrl}" valign="top" style="padding:28px;background-color:${giftTheme.canvas};background-image:url('${giftArtUrl}');background-repeat:no-repeat;background-position:center;background-size:cover">`,
      `<div style="text-align:center;color:${giftTheme.ink}">`,
      `<div style="font-size:12px;letter-spacing:3px;color:${giftTheme.accent};font-weight:bold">ПОДАРОЧНЫЙ СЕРТИФИКАТ</div>`,
      '<div style="font-size:26px;font-weight:800;margin-top:6px">Phraseman</div>',
      '</div>',
      `<div style="margin-top:20px;padding:24px;color:${giftTheme.ink};background:${giftTheme.panel};border-radius:18px">`,
      /* зачем: владелец 2026-07-26 — без имени заголовок называет КОНКРЕТНЫЙ
         подарок («Год Phraseman Plus»), а не абстрактное «вам подарили английский» */
      giftTo ? `<div style="font-size:22px;font-weight:800;margin:0 0 2px">Для: ${htmlEscape(giftTo)}</div>` : `<div style="font-size:22px;font-weight:800;margin:0 0 2px">${htmlEscape(productTitle)}</div>`,
      giftFrom ? `<div style="color:${giftTheme.soft};font-size:15px;margin:0 0 16px">от ${htmlEscape(giftFrom)}</div>` : '<div style="margin:0 0 16px"></div>',
      giftTo ? `<div style="font-size:17px;font-weight:800;color:${giftTheme.accent}">${htmlEscape(productTitle)}</div>` : '',
      giftPhrase ? `<div data-gift-catchphrase="true" style="margin:20px 0 0;color:${giftTheme.ink};font-size:15px;font-weight:600;line-height:1.5">${htmlEscape(giftPhrase.text)}</div>` : '',
      giftCodeLine,
      expiresLine ? `<div style="color:${giftTheme.soft};font-size:13.5px;text-align:center;margin:4px 0 0">${htmlEscape(expiresLine)}</div>` : '',
      '</div></td></tr></table>',
      '<div data-gift-instructions="true" style="margin-top:16px;padding:24px;background:#ffffff;border-radius:18px;color:#201c12">',
      isTestIssue ? '<p style="margin:0 0 18px;padding:12px 14px;background:#fff2c7;border-radius:12px;text-align:center;color:#6a4b00;font-size:13px;font-weight:800">ТЕСТОВАЯ ВЫДАЧА — ОПЛАТА НЕ ПРОВОДИЛАСЬ</p>' : '',
      '<p style="margin:0;font-weight:bold">Как включить доступ:</p>',
      stepsHtml,
      '<p style="margin:18px 0 0;color:#4c4636;font-size:14px">Перешлите это письмо тому, кому дарите, или вручите код лично.</p>',
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

async function sendActivationEmail(
  order: FirebaseFirestore.DocumentData,
  statusRef?: FirebaseFirestore.DocumentReference,
  idempotencyKey?: string,
): Promise<boolean> {
  const orderId = cleanShortText(order.orderId, 120);
  const activationCode = cleanShortText(order.activationCode, 48);
  const to = cleanEmail(order.email) ?? cleanEmail(order.customerEmail) ?? cleanEmail(order.payerEmail);
  if (!activationCode || !to) return false;

  const key = RESEND_API_KEY.value();
  if (!key) {
    const patch = {
      customerEmailStatus: 'skipped_no_resend_key',
      customerEmailSentTo: to,
    };
    await markActivationEmailOutcome(orderId, statusRef, patch);
    return false;
  }
  const from = webCheckoutEmailFrom.value().trim();
  if (!from) {
    const patch = {
      customerEmailStatus: 'skipped_no_resend_from',
      customerEmailSentTo: to,
    };
    await markActivationEmailOutcome(orderId, statusRef, patch);
    return false;
  }

  const support = webCheckoutSupportEmail.value() || 'support.phraseman@gmail.com';
  const { subject, text, html } = buildActivationEmail(order, support);

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: buildResendRequestHeaders(key, idempotencyKey),
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
      const patch = {
        customerEmailStatus: resendFailureOutcomeForHttpStatus(response.status),
        customerEmailProviderStatus: response.status,
        customerEmailSentTo: to,
        customerEmailError: bodyText.slice(0, 500),
      };
      await markActivationEmailOutcome(orderId, statusRef, patch);
      return false;
    }
    let providerId = '';
    try {
      const parsed = JSON.parse(bodyText) as { id?: string };
      providerId = cleanShortText(parsed.id, 120);
    } catch {
      providerId = '';
    }
    const patch = {
      customerEmailStatus: 'sent',
      customerEmailSentAt: FieldValue.serverTimestamp(),
      customerEmailSentAtIso: new Date().toISOString(),
      customerEmailSentTo: to,
      customerEmailProviderId: providerId || null,
      customerEmailError: FieldValue.delete(),
    };
    await markActivationEmailOutcome(orderId, statusRef, patch);
    return true;
  } catch (e) {
    const patch = {
      customerEmailStatus: 'transport_unknown',
      customerEmailSentTo: to,
      customerEmailError: String(e).slice(0, 500),
    };
    await markActivationEmailOutcome(orderId, statusRef, patch);
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

/** Creates only server-generated, persisted, single-use certificates. */
export const adminCreateGiftCertificateBatch = onCall(
  GIFT_CERTIFICATE_MUTATION_OPTIONS,
  async (request) => {
    assertGiftCertificateAdminAccess(request.auth as GiftCertificateAdminAuth);
    const operationId = normalizeGiftCertificateBatchOperationId(request.data?.operationId);
    const count = Number(request.data?.count);
    if (!Number.isInteger(count) || count < 1 || count > 200) {
      throw new HttpsError('invalid-argument', 'invalid_gift_certificate_count');
    }
    const nowMs = Date.now();
    const actorUid = String(request.auth?.uid ?? '');
    const actorEmail = cleanShortText(request.auth?.token?.email, 200);
    const batchId = `gift-batch-${operationId}`;
    const plan = createGiftCertificateBatchPlan({
      input: request.data ?? {},
      codes: Array.from({ length: count }, () => generateGiftCertificateCode()),
      batchId,
      nowMs,
      actorUid,
      actorEmail,
    });
    const requestKey = buildGiftCertificateBatchRequestKey(plan.items);
    const db = getFirestore();
    const promoRefs = plan.items.map((item) => db.collection('promo_codes').doc(item.activationCode));
    const certificateRefs = plan.items.map((item) => db.collection(GIFT_CERTIFICATE_DELIVERIES_COLLECTION).doc(item.certificateId));
    const operationRef = db.collection(GIFT_CERTIFICATE_BATCH_OPERATIONS_COLLECTION).doc(operationId);
    const auditRef = db.collection('admin_log').doc();
    return db.runTransaction(async (tx) => {
      const [operationSnapshot, ...snapshots] = await Promise.all([
        tx.get(operationRef),
        ...promoRefs.map((ref) => tx.get(ref)),
        ...certificateRefs.map((ref) => tx.get(ref)),
      ]);
      const replay = readGiftCertificateBatchReplay(operationSnapshot.data(), { operationId, actorUid, requestKey });
      if (replay) return replay;
      assertGiftCertificateRefsAvailable(snapshots.map((snapshot) => snapshot.exists));
      const response: GiftCertificateBatchResponse = {
        ok: true,
        operationId,
        batchId: plan.batchId,
        certificates: plan.items.map((item) => giftCertificateDisplayRecord(
          item.certificateId,
          item.certificateDoc,
          item.promoDoc,
          nowMs,
        )),
      };
      plan.items.forEach((item, index) => {
        tx.create(promoRefs[index], item.promoDoc);
        tx.create(certificateRefs[index], item.certificateDoc);
      });
      tx.create(auditRef, plan.auditDoc);
      tx.create(operationRef, {
        schemaVersion: 'gift-certificate-batch-operation.v1',
        operationId,
        actorUid,
        actorEmail,
        requestKey,
        response,
        createdAtMs: nowMs,
      });
      return response;
    });
  },
);

/** Read-only paginated history; the browser follows every cursor to show all records. */
export const adminListGiftCertificates = onCall(
  GIFT_CERTIFICATE_READ_OPTIONS,
  async (request) => {
    assertGiftCertificateAdminReadAccess(request.auth as GiftCertificateAdminAuth);
    const db = getFirestore();
    const pageSize = 100;
    const cursorCreatedAtMs = Number(request.data?.cursor?.createdAtMs ?? 0);
    const cursorCertificateId = cleanShortText(request.data?.cursor?.certificateId, 32);
    let queryRef = db.collection(GIFT_CERTIFICATE_DELIVERIES_COLLECTION)
      .orderBy('createdAtMs', 'desc')
      .orderBy(FieldPath.documentId(), 'desc')
      .limit(pageSize);
    if (cursorCreatedAtMs > 0 && cursorCertificateId) {
      queryRef = queryRef.startAfter(cursorCreatedAtMs, cursorCertificateId);
    }
    const snapshot = await queryRef.get();
    const validCertificates = snapshot.docs.filter((certificate) => /^GIFT-[A-HJ-NP-Z2-9]{10}$/.test(certificate.id));
    const promoRefs = validCertificates.map((certificate) => db.collection('promo_codes').doc(certificate.id));
    const promoSnapshots = promoRefs.length ? await db.getAll(...promoRefs) : [];
    const statusEvaluatedAtMs = Date.now();
    const certificates = validCertificates.map((certificate, index) => giftCertificateDisplayRecord(
      certificate.id,
      certificate.data() ?? {},
      promoSnapshots[index]?.data() ?? {},
      statusEvaluatedAtMs,
    ));
    const last = snapshot.docs[snapshot.docs.length - 1];
    return {
      ok: true,
      certificates,
      nextCursor: snapshot.size === pageSize && last
        ? { createdAtMs: Number(last.data()?.createdAtMs ?? 0), certificateId: last.id }
        : null,
    };
  },
);

/** Deletes an unused certificate and its activation code in one transaction. */
export const adminDeleteGiftCertificate = onCall(
  GIFT_CERTIFICATE_MUTATION_OPTIONS,
  async (request) => {
    assertGiftCertificateAdminAccess(request.auth as GiftCertificateAdminAuth);
    const certificateId = cleanShortText(request.data?.certificateId, 32).toUpperCase();
    if (!/^GIFT-[A-HJ-NP-Z2-9]{10}$/.test(certificateId)) {
      throw new HttpsError('invalid-argument', 'invalid_gift_certificate_id');
    }
    const db = getFirestore();
    const certificateRef = db.collection(GIFT_CERTIFICATE_DELIVERIES_COLLECTION).doc(certificateId);
    const promoRef = db.collection('promo_codes').doc(certificateId);
    const auditRef = db.collection('admin_log').doc();
    const nowMs = Date.now();
    const actorUid = String(request.auth?.uid ?? '');
    const actorEmail = cleanShortText(request.auth?.token?.email, 200);
    await db.runTransaction(async (tx) => {
      const [certificateSnapshot, promoSnapshot] = await Promise.all([
        tx.get(certificateRef),
        tx.get(promoRef),
      ]);
      if (!certificateSnapshot.exists) {
        throw new HttpsError('not-found', 'gift_certificate_not_found');
      }
      if (!promoSnapshot.exists) {
        throw new HttpsError('failed-precondition', 'gift_certificate_promo_missing');
      }
      const plan = buildGiftCertificateDeletePlan({
        certificateId,
        expectedUpdatedAtMs: request.data?.expectedUpdatedAtMs,
        certificate: certificateSnapshot.data() ?? {},
        promo: promoSnapshot.data() ?? {},
        nowMs,
        actorUid,
        actorEmail,
        reason: request.data?.reason,
      });
      tx.delete(certificateRef);
      tx.delete(promoRef);
      tx.create(auditRef, plan.auditDoc);
    });
    return { ok: true, certificateId, promoCodeDeleted: true };
  },
);

/** Same-origin-safe download payload for allowlisted certificate art and persisted metadata. */
export const adminGetGiftCertificateDownload = onCall(
  GIFT_CERTIFICATE_READ_OPTIONS,
  async (request) => {
    assertGiftCertificateAdminReadAccess(request.auth as GiftCertificateAdminAuth);
    const certificateId = cleanShortText(request.data?.certificateId, 32).toUpperCase();
    if (!/^GIFT-[A-HJ-NP-Z2-9]{10}$/.test(certificateId)) {
      throw new HttpsError('invalid-argument', 'invalid_gift_certificate_id');
    }
    const db = getFirestore();
    const [certificateSnapshot, promoSnapshot] = await Promise.all([
      db.collection(GIFT_CERTIFICATE_DELIVERIES_COLLECTION).doc(certificateId).get(),
      db.collection('promo_codes').doc(certificateId).get(),
    ]);
    if (!certificateSnapshot.exists || !promoSnapshot.exists) {
      throw new HttpsError('not-found', 'gift_certificate_not_found');
    }
    const record = certificateSnapshot.data() ?? {};
    const product = isWebPlan(record.product) ? record.product : null;
    const validRecord = product !== null
      && record.gift === true
      && record.testIssue !== true
      && String(record.certificateId ?? '') === certificateId
      && String(record.activationCode ?? '') === certificateId
      && record.assetUrl === GIFT_CERTIFICATE_ART[product];
    if (!validRecord || !product) throw new HttpsError('failed-precondition', 'gift_certificate_record_invalid');
    const updatedAtMs = Number(record.updatedAtMs ?? record.createdAtMs ?? 0);
    if (!Number.isSafeInteger(updatedAtMs) || Number(request.data?.expectedUpdatedAtMs) !== updatedAtMs) {
      throw new HttpsError('aborted', 'gift_certificate_download_conflict');
    }
    const nowMs = Date.now();
    const assetBase64 = await readGiftCertificateAssetBase64(product, nowMs);
    return {
      ok: true,
      certificate: buildGiftCertificateDownloadDisplayRecord(certificateId, record, promoSnapshot.data() ?? {}, nowMs),
      mimeType: 'image/webp',
      assetBase64,
    };
  },
);

/** Saves recipient identity before download or email; delivery states lock it fail-closed. */
export const adminUpdateGiftCertificateRecipient = onCall(
  GIFT_CERTIFICATE_MUTATION_OPTIONS,
  async (request) => {
    assertGiftCertificateAdminAccess(request.auth as GiftCertificateAdminAuth);
    const certificateId = cleanShortText(request.data?.certificateId, 32).toUpperCase();
    if (!/^GIFT-[A-HJ-NP-Z2-9]{10}$/.test(certificateId)) {
      throw new HttpsError('invalid-argument', 'invalid_gift_certificate_id');
    }
    const db = getFirestore();
    const certificateRef = db.collection(GIFT_CERTIFICATE_DELIVERIES_COLLECTION).doc(certificateId);
    const promoRef = db.collection('promo_codes').doc(certificateId);
    const auditRef = db.collection('admin_log').doc();
    const nowMs = Date.now();
    const actorUid = String(request.auth?.uid ?? '');
    const actorEmail = cleanShortText(request.auth?.token?.email, 200);
    const record = await db.runTransaction(async (tx) => {
      const [certificateSnapshot, promoSnapshot] = await Promise.all([tx.get(certificateRef), tx.get(promoRef)]);
      if (!certificateSnapshot.exists || !promoSnapshot.exists) {
        throw new HttpsError('not-found', 'gift_certificate_not_found');
      }
      const result = buildGiftCertificateRecipientUpdate({
        input: request.data ?? {},
        current: certificateSnapshot.data() ?? {},
        promo: promoSnapshot.data() ?? {},
        nowMs,
        actorUid,
        actorEmail,
      });
      tx.update(certificateRef, result.patch);
      tx.create(auditRef, {
        action: 'gift_certificate_recipient_update',
        targetUid: certificateId,
        details: { certificateId, recipientEmailSet: Boolean(result.record.recipientEmail) },
        adminEmail: actorEmail,
        adminUid: actorUid,
        ts: new Date(nowMs).toISOString(),
      });
      return giftCertificateDisplayRecord(certificateId, result.record, promoSnapshot.data() ?? {});
    });
    return { ok: true, certificate: record };
  },
);

/** Canonical personalization write; legacy recipient update remains exported for compatibility. */
export const adminUpdateGiftCertificatePersonalization = onCall(
  GIFT_CERTIFICATE_MUTATION_OPTIONS,
  async (request) => {
    assertGiftCertificateAdminAccess(request.auth as GiftCertificateAdminAuth);
    const certificateId = cleanShortText(request.data?.certificateId, 32).toUpperCase();
    if (!/^GIFT-[A-HJ-NP-Z2-9]{10}$/.test(certificateId)) {
      throw new HttpsError('invalid-argument', 'invalid_gift_certificate_id');
    }
    const db = getFirestore();
    const certificateRef = db.collection(GIFT_CERTIFICATE_DELIVERIES_COLLECTION).doc(certificateId);
    const promoRef = db.collection('promo_codes').doc(certificateId);
    const auditRef = db.collection('admin_log').doc();
    const nowMs = Date.now();
    const actorUid = String(request.auth?.uid ?? '');
    const actorEmail = cleanShortText(request.auth?.token?.email, 200);
    const certificate = await db.runTransaction(async (tx) => {
      const [certificateSnapshot, promoSnapshot] = await Promise.all([tx.get(certificateRef), tx.get(promoRef)]);
      if (!certificateSnapshot.exists || !promoSnapshot.exists) {
        throw new HttpsError('not-found', 'gift_certificate_not_found');
      }
      const result = buildGiftCertificatePersonalizationUpdate({
        input: request.data ?? {},
        current: certificateSnapshot.data() ?? {},
        promo: promoSnapshot.data() ?? {},
        nowMs,
        actorUid,
        actorEmail,
      });
      tx.update(certificateRef, result.patch);
      tx.create(auditRef, {
        action: 'gift_certificate_personalization_update',
        targetUid: certificateId,
        details: result.auditDetails,
        adminEmail: actorEmail,
        adminUid: actorUid,
        ts: new Date(nowMs).toISOString(),
      });
      return giftCertificateDisplayRecord(certificateId, result.record, promoSnapshot.data() ?? {});
    });
    return { ok: true, certificate };
  },
);

/** Atomically replaces one explicitly verified, unused no-payment test certificate. */
export const adminReplaceSyntheticGiftCertificate = onCall(
  GIFT_CERTIFICATE_MUTATION_OPTIONS,
  async (request) => {
    assertGiftCertificateAdminAccess(request.auth as GiftCertificateAdminAuth);
    const oldCode = GIFT_CERTIFICATE_REPAIR_OLD_CODE;

    // Resolve once outside the transaction so a fallback stays stable across Firestore retries.
    const giftPhraseId = resolveGiftPhrase('yearly', request.data?.giftPhraseId).id;
    const input: SyntheticGiftCertificateReplacementInput = {
      authorization: request.data?.authorization,
      recipientEmail: request.data?.recipientEmail,
      giftTo: request.data?.giftTo,
      giftFrom: request.data?.giftFrom,
      giftPhraseId,
      reason: request.data?.reason,
    };
    const newCode = generateGiftCertificateCode();
    const db = getFirestore();
    const oldRef = db.collection('promo_codes').doc(oldCode);
    const newRef = db.collection('promo_codes').doc(newCode);
    const deliveryRef = db.collection(GIFT_CERTIFICATE_DELIVERIES_COLLECTION).doc(newCode);
    const auditRef = db.collection('admin_log').doc();
    const nowMs = Date.now();
    const actorUid = String(request.auth?.uid ?? '');
    const actorEmail = cleanShortText(request.auth?.token?.email, 200);

    const result = await db.runTransaction(async (tx) => {
      const [oldSnap, newSnap, deliverySnap] = await Promise.all([
        tx.get(oldRef), tx.get(newRef), tx.get(deliveryRef),
      ]);
      if (!oldSnap.exists) throw new HttpsError('not-found', 'old_certificate_not_found');
      if (newSnap.exists || deliverySnap.exists) throw new HttpsError('already-exists', 'replacement_code_collision');
      const writes = buildSyntheticGiftCertificateReplacement({
        oldCode, newCode, nowMs, actorUid, actorEmail, input, oldDoc: oldSnap.data() ?? {},
      });
      tx.update(oldRef, writes.oldCodePatch);
      tx.create(newRef, writes.newCodeDoc);
      tx.create(deliveryRef, writes.deliveryDoc);
      tx.create(auditRef, writes.auditDoc);
      return writes;
    });
    return {
      ok: true,
      oldCode,
      newCode,
      deliveryId: deliveryRef.id,
      expiresAtMs: result.deliveryDoc.codeExpiresAtMs,
      emailStatus: 'prepared',
    };
  },
);

/** Explicit second step: claims a prepared delivery before using the established email transport. */
export const adminSendPreparedGiftCertificate = onCall(
  { ...GIFT_CERTIFICATE_MUTATION_OPTIONS, secrets: [RESEND_API_KEY] },
  async (request) => {
    assertGiftCertificateAdminAccess(request.auth as GiftCertificateAdminAuth);
    assertGiftCertificateSendAuthorization(request.data?.authorization);
    const deliveryId = cleanShortText(request.data?.deliveryId, 32).toUpperCase();
    if (!/^[A-Z0-9_-]{3,32}$/.test(deliveryId)) throw new HttpsError('invalid-argument', 'invalid_delivery_id');
    const expectedRecipientEmail = request.data?.expectedRecipientEmail;

    const db = getFirestore();
    const deliveryRef = db.collection(GIFT_CERTIFICATE_DELIVERIES_COLLECTION).doc(deliveryId);
    const codeRef = db.collection('promo_codes').doc(deliveryId);
    const nowMs = Date.now();
    const actorUid = String(request.auth?.uid ?? '');
    const actorEmail = cleanShortText(request.auth?.token?.email, 200);
    const claim = await db.runTransaction(async (tx) => {
      const [deliverySnap, codeSnap] = await Promise.all([tx.get(deliveryRef), tx.get(codeRef)]);
      if (!deliverySnap.exists) throw new HttpsError('not-found', 'prepared_delivery_not_found');
      const delivery = deliverySnap.data() ?? {};
      const decision = decideGiftCertificateDeliveryClaim(delivery, { deliveryId, expectedRecipientEmail, nowMs });
      if (decision.action === 'already_sent') return { decision, delivery };
      if (decision.action === 'reconciliation_required') {
        tx.update(deliveryRef, {
          status: 'reconciliation_required',
          reconciliationRequiredAtMs: nowMs,
          reconciliationReason: 'resend_idempotency_window_expired',
        });
        return { decision, delivery };
      }

      const code = codeSnap.exists ? (codeSnap.data() ?? {}) : {};
      if (!codeSnap.exists) throw new HttpsError('failed-precondition', 'gift_certificate_not_sendable');
      assertGiftCertificateSendCoherence(delivery, code, { deliveryId, nowMs });
      tx.update(deliveryRef, {
        status: 'sending',
        updatedAtMs: nowMs,
        sendClaimedAtMs: nowMs,
        sendClaimedBy: actorEmail,
        sendClaimedByUid: actorUid,
        sendAttemptCount: FieldValue.increment(1),
        firstProviderAttemptAtMs: Number(delivery.firstProviderAttemptAtMs) > 0
          ? Number(delivery.firstProviderAttemptAtMs)
          : nowMs,
      });
      return { decision, delivery };
    });

    if (claim.decision.action === 'already_sent') return { ok: true, deliveryId, alreadySent: true };
    if (claim.decision.action === 'reconciliation_required') {
      throw new HttpsError('failed-precondition', 'delivery_reconciliation_required');
    }
    const sent = await sendActivationEmail({
      ...claim.delivery,
      orderId: deliveryId,
      email: claim.decision.email,
      testIssue: false,
    }, deliveryRef, deliveryId);
    if (!sent) throw new HttpsError('failed-precondition', 'gift_certificate_email_not_sent');
    return { ok: true, deliveryId, alreadySent: false };
  },
);

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
        giftPhraseId: gift ? resolveGiftPhrase(plan, body.giftPhraseId).id : undefined,
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
        giftPhraseId: body.gift === true ? resolveGiftPhrase(plan, body.giftPhraseId).id : undefined,
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
