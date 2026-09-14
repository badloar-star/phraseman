import * as admin from 'firebase-admin';
import { onDocumentCreated, onDocumentWritten } from 'firebase-functions/v2/firestore';
import { enqueueAdminAlert, type EnqueueAdminAlertInput } from './admin_alert_outbox';
import type { AdminAlertType } from './admin_alert_catalog';

const REGION = 'us-central1';
type Row = Readonly<Record<string, unknown>>;

const EVENT_MAP: Readonly<Record<string, AdminAlertType>> = Object.freeze({
  NON_RENEWING_PURCHASE: 'premiumPurchase',
  RENEWAL: 'renewal',
  CANCELLATION: 'cancellation',
  EXPIRATION: 'expiration',
  BILLING_ISSUE: 'billingIssue',
  REFUND: 'refund',
});

function token(value: unknown): string {
  return String(value ?? '').trim().split('_').join(' ').slice(0, 64);
}

function last4(value: unknown): string {
  return String(value ?? '').replace(/[^A-Za-z0-9]/g, '').slice(-4);
}

function occurredAtMs(value: unknown, fallback: number): number {
  const n = Number(value);
  if (Number.isFinite(n) && n > 0) return Math.floor(n);
  if (value && typeof value === 'object' && 'toMillis' in value) {
    const fn = (value as { toMillis?: unknown }).toMillis;
    if (typeof fn === 'function') {
      const result = Number(fn.call(value));
      if (Number.isFinite(result) && result > 0) return Math.floor(result);
    }
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return Math.floor(fallback);
}

function money(data: Row): { amount?: number; currency?: string } {
  const purchasedMicros = Number(data.grossPurchasedCurrencyMicros);
  const purchasedCurrency = String(data.purchasedCurrency ?? '').trim().toUpperCase();
  if (Number.isFinite(purchasedMicros) && /^[A-Z]{3}$/.test(purchasedCurrency)) {
    return { amount: Math.abs(purchasedMicros) / 1_000_000, currency: purchasedCurrency };
  }
  const usdMicros = Number(data.grossUsdMicros);
  return Number.isFinite(usdMicros) ? { amount: Math.abs(usdMicros) / 1_000_000, currency: 'USD' } : {};
}

export function revenueAlertFromReceipt(input: {
  readonly receiptId: string;
  readonly data: Row;
  readonly nowMs: number;
}): EnqueueAdminAlertInput | null {
  const rawType = String(input.data.eventType ?? '').trim().toUpperCase();
  const periodType = String(input.data.periodType ?? '').trim().toUpperCase();
  const eventType: AdminAlertType | undefined = rawType === 'INITIAL_PURCHASE'
    ? (periodType === 'TRIAL' ? 'trialStart' : 'premiumPurchase')
    : EVENT_MAP[rawType];
  if (!input.receiptId || !eventType) return null;
  return {
    eventType,
    source: 'revenuecat.receipt',
    sourceId: input.receiptId,
    occurredAtMs: occurredAtMs(input.data.eventTimestampMs ?? input.data.createdAt, input.nowMs),
    payload: {
      provider: token(input.data.store) || 'RevenueCat',
      product: token(input.data.productId) || 'Premium',
      environment: token(input.data.environment) || 'UNKNOWN',
      ...money(input.data),
      uidLast4: last4(input.data.uid),
      status: token(rawType).toLowerCase(),
      route: '#revenue',
    },
  };
}

export function paidOrderAlertFromWrite(
  channel: 'web' | 'telegram', id: string, before: Row | null, after: Row | null, nowMs: number,
): EnqueueAdminAlertInput | null {
  if (!id || !after) return null;
  const status = String(after.status ?? '').toLowerCase();
  const previousRenewalCount = Math.max(0, Number(before?.renewalCount) || 0);
  const renewalCount = Math.max(0, Number(after.renewalCount) || 0);
  const telegramRenewal = channel === 'telegram' && status.startsWith('paid_renewal') && status !== String(before?.status ?? '').toLowerCase();
  const webRenewal = channel === 'web' && renewalCount > previousRenewalCount;
  const cancellation = channel === 'web'
    && after.stripeCancelAtPeriodEnd === true
    && before?.stripeCancelAtPeriodEnd !== true;
  const paid = status === 'paid' || status.startsWith('paid_');
  const wasPaid = String(before?.status ?? '').toLowerCase() === 'paid' || String(before?.status ?? '').toLowerCase().startsWith('paid_');
  let eventType: AdminAlertType;
  let lifecycleKey: string;
  let eventOccurredAtMs: number;
  if (cancellation) {
    eventType = 'cancellation';
    eventOccurredAtMs = occurredAtMs(after.stripeCancellationRequestedAtMs, nowMs);
    lifecycleKey = `cancellation:${eventOccurredAtMs}`;
  } else if (telegramRenewal || webRenewal) {
    eventType = 'renewal';
    eventOccurredAtMs = occurredAtMs(after.lastRenewalAtIso ?? after.paidAtMs ?? after.paidAtIso ?? after.paidAt ?? after.createdAtMs ?? after.createdAt, nowMs);
    lifecycleKey = `renewal:${channel === 'web' ? renewalCount : status}:${eventOccurredAtMs}`;
  } else if (paid && !wasPaid) {
    eventType = 'premiumPurchase';
    eventOccurredAtMs = occurredAtMs(after.paidAtMs ?? after.paidAtIso ?? after.paidAt ?? after.createdAtMs ?? after.createdAt, nowMs);
    lifecycleKey = `purchase:${eventOccurredAtMs}`;
  } else {
    return null;
  }
  const amount = channel === 'web'
    ? Math.max(0, Number(after.amountCents) || 0) / 100
    : Math.max(0, Number(after.amountStars ?? after.totalAmount) || 0);
  return {
    eventType, source: `${channel}.paid_order`, sourceId: `${id}:${lifecycleKey}`,
    occurredAtMs: eventOccurredAtMs,
    payload: {
      provider: channel === 'web' ? token(after.provider) || 'Web' : 'Telegram Stars',
      product: token(after.planDuration ?? after.plan) || 'Premium',
      environment: token(after.environment) || 'PRODUCTION',
      ...(amount > 0 ? { amount, currency: channel === 'web' ? String(after.currency ?? 'USD').toUpperCase() : 'XTR' } : {}),
      status: eventType === 'cancellation' ? 'cancel at period end' : eventType === 'renewal' ? 'renewed' : 'paid',
      route: channel === 'web' ? '#site-admin' : '#testers',
    },
  };
}

export function communityPackAlertFromWrite(id: string, before: Row | null, after: Row | null, nowMs: number): EnqueueAdminAlertInput | null {
  if (!id || !after) return null;
  if (after.acquisitionSource === 'weekly_boon_gift') return null;
  const status = String(after.status ?? '').toLowerCase();
  const previous = String(before?.status ?? '').toLowerCase();
  if ((status !== 'completed' && status !== 'refunded') || previous === status) return null;
  const amount = Math.max(0, Number(status === 'refunded' ? after.refundedAmountShards : after.priceShards) || 0);
  return {
    eventType: 'ugcPurchase', source: 'community_pack.purchase', sourceId: `${id}:${status}`,
    occurredAtMs: occurredAtMs(status === 'refunded' ? after.refundedAtMs ?? after.refundedAt : after.createdAt, nowMs),
    payload: { provider: 'Community', product: 'Community Pack', ...(amount ? { amount, currency: 'SHARD' } : {}), uidLast4: last4(after.buyerStableId ?? after.buyerUid), status, route: '#ugc-purchases' },
  };
}

export function promoGiftAlertFromCreate(id: string, data: Row, nowMs: number): EnqueueAdminAlertInput | null {
  if (!id) return null;
  return {
    eventType: 'promoGift', source: 'gift_certificate.created', sourceId: id,
    occurredAtMs: occurredAtMs(data.createdAtMs ?? data.createdAt, nowMs),
    payload: { provider: 'Phraseman', product: token(data.plan ?? data.planDuration) || 'Gift', environment: 'PRODUCTION', status: token(data.status) || 'created', route: '#gift-certificates' },
  };
}

export function promoRedemptionAlertFromCreate(userId: string, redemptionId: string, data: Row, nowMs: number): EnqueueAdminAlertInput | null {
  if (!userId || !redemptionId) return null;
  return {
    eventType: 'promoGift', source: 'promo.redemption', sourceId: `${userId}:${redemptionId}`,
    occurredAtMs: occurredAtMs(data.redeemedAtMs ?? data.createdAtMs, nowMs),
    payload: { provider: 'Phraseman', product: 'Promo', status: 'redeemed', uidLast4: last4(userId), route: '#promo' },
  };
}

export const adminAlertOnRevenueCatReceipt = onDocumentCreated(
  { document: 'revenuecat_premium_events/{receiptId}', region: REGION, retry: true },
  async (event) => {
    if (!event.data) return;
    const alert = revenueAlertFromReceipt({
      receiptId: String(event.params.receiptId ?? ''),
      data: (event.data.data() ?? {}) as Row,
      nowMs: Date.now(),
    });
    if (alert) await enqueueAdminAlert(admin.firestore(), alert);
  },
);

function writtenOrder(channel: 'web' | 'telegram', collection: string) {
  return onDocumentWritten({ document: `${collection}/{orderId}`, region: REGION, retry: true }, async (event) => {
    const alert = paidOrderAlertFromWrite(channel, String(event.params.orderId ?? ''), event.data?.before?.exists ? event.data.before.data() as Row : null, event.data?.after?.exists ? event.data.after.data() as Row : null, occurredAtMs(event.time, Date.now()));
    if (alert) await enqueueAdminAlert(admin.firestore(), alert);
  });
}

export const adminAlertOnWebPremiumOrderWritten = writtenOrder('web', 'web_premium_orders');
export const adminAlertOnTelegramPremiumOrderWritten = writtenOrder('telegram', 'telegram_premium_orders');
export const adminAlertOnCommunityPackPurchaseWritten = onDocumentWritten(
  { document: 'community_pack_purchases/{purchaseId}', region: REGION, retry: true },
  async (event) => {
    const alert = communityPackAlertFromWrite(String(event.params.purchaseId ?? ''), event.data?.before?.exists ? event.data.before.data() as Row : null, event.data?.after?.exists ? event.data.after.data() as Row : null, Date.now());
    if (alert) await enqueueAdminAlert(admin.firestore(), alert);
  },
);
export const adminAlertOnGiftCertificateCreated = onDocumentCreated(
  { document: 'gift_certificate_deliveries/{deliveryId}', region: REGION, retry: true },
  async (event) => {
    if (!event.data) return;
    const alert = promoGiftAlertFromCreate(String(event.params.deliveryId ?? ''), event.data.data() as Row, Date.now());
    if (alert) await enqueueAdminAlert(admin.firestore(), alert);
  },
);
export const adminAlertOnPromoRedemptionCreated = onDocumentCreated(
  { document: 'users/{userId}/promo_redemptions/{redemptionId}', region: REGION, retry: true },
  async (event) => {
    if (!event.data) return;
    const alert = promoRedemptionAlertFromCreate(
      String(event.params.userId ?? ''), String(event.params.redemptionId ?? ''), event.data.data() as Row, Date.now(),
    );
    if (alert) await enqueueAdminAlert(admin.firestore(), alert);
  },
);
