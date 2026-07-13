import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import {
  applyNativePatch, approveNativeMutation, asRecord, boundedLimit, cleanText, createNativePreview,
  documentVersion, parseMutationEnvelope, projectNativeRow, readBoundedCollection, requestNativeApproval,
  requireNativePermission, type NativeRow,
} from './admin_native_operations';
import { hasPermission, type AdminPermission } from './admin/permissions';

if (admin.apps.length === 0) admin.initializeApp();
const REGION = 'us-central1';

const MONEY_SOURCES = Object.freeze({
  'ugc-purchases': 'community_pack_purchases',
  refunds: 'revenuecat_premium_events',
  referrals: 'referral_attributions',
  'telegram-payments': 'telegram_premium_orders',
  'website-payments': 'web_premium_orders',
} as const);
type MoneyCapability = keyof typeof MONEY_SOURCES;

export function parseMoneyWorkspaceInput(value: unknown) {
  const data = asRecord(value); const capabilityId = cleanText(data.capabilityId || 'ugc-purchases', 60) as MoneyCapability;
  if (!Object.prototype.hasOwnProperty.call(MONEY_SOURCES, capabilityId)) throw new Error('invalid_money_capability');
  return { capabilityId, limit: boundedLimit(data.limit), cursor: cleanText(data.cursor, 200), query: cleanText(data.query, 120).toLowerCase(), status: cleanText(data.status, 40) };
}

function filterMoneyRows(items: NativeRow[], query: string, status: string): NativeRow[] { return items.filter((item) => (!status || cleanText(item.status || item.eventType, 40) === status) && (!query || JSON.stringify(item).toLowerCase().includes(query))); }

type MoneyPlan = { collection: string; requiredPermission: AdminPermission; consequence: string; providerOwned?: boolean; allowMissing?: boolean };

export function buildMoneyMutationPlan(action: string, _targetId: string, _before: NativeRow, _payload: NativeRow): MoneyPlan {
  switch (action) {
    case 'ugc-refund': return { collection: 'community_pack_purchases', requiredPermission: 'money.refunds.write', consequence: 'Returns the canonical shard amount to the buyer and marks the purchase refunded.' };
    case 'provider-refund': throw new Error('provider-owned: App Store and RevenueCat refunds are read-only in Phraseman Admin.');
    case 'referral-status': return { collection: 'referral_attributions', requiredPermission: 'money.payment_orders.write', consequence: 'Updates the reviewed referral status; it does not award shards.' };
    case 'telegram-activate': return { collection: 'telegram_premium_orders', requiredPermission: 'money.payment_orders.write', consequence: 'Activates Plus on the selected canonical user and closes the paid Telegram order.' };
    case 'web-order-close': return { collection: 'web_premium_orders', requiredPermission: 'money.payment_orders.write', consequence: 'Marks a paid web order as activated; provider settlement is unchanged.' };
    case 'web-checkout-config': return { collection: 'web_checkout', requiredPermission: 'money.payment_config.write', consequence: 'Changes checkout price/currency configuration used by the website.', allowMissing: true };
    default: throw new Error('unsupported_money_action');
  }
}

export function buildTelegramVipProgress(nowMs: number, months: number, existingUntilMs = 0): Record<string, string> {
  const baseMs = Number.isFinite(existingUntilMs) && existingUntilMs > nowMs ? existingUntilMs : nowMs;
  const until = new Date(baseMs);
  until.setUTCMonth(until.getUTCMonth() + months);
  const grantedAt = String(nowMs);
  return {
    vip_active: 'true',
    vip_plan: 'telegram_paid',
    vip_from: grantedAt,
    vip_until: String(until.getTime()),
    vip_admin_override: 'true',
    vip_admin_grant_at: grantedAt,
  };
}

function mutationPlanFromEnvelope(input: ReturnType<typeof parseMutationEnvelope>) {
  try { return buildMoneyMutationPlan(input.action, input.targetId, {}, input.payload); }
  catch (error) { throw new HttpsError('invalid-argument', error instanceof Error ? error.message : 'unsupported_money_action'); }
}

export const adminGetMoneyOperationsWorkspace = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const { role } = requireNativePermission(request, 'money.read');
  let input: ReturnType<typeof parseMoneyWorkspaceInput>;
  try { input = parseMoneyWorkspaceInput(request.data); } catch (error) { throw new HttpsError('invalid-argument', error instanceof Error ? error.message : 'invalid_money_input'); }
  const db = admin.firestore(); const source = MONEY_SOURCES[input.capabilityId];
  try {
    const revealIdentity = hasPermission(role, 'users.read');
    if (input.capabilityId === 'refunds') {
      const [ugc, provider] = await Promise.all([
        readBoundedCollection(db, 'community_pack_purchases', input.limit, input.cursor, revealIdentity),
        readBoundedCollection(db, 'revenuecat_premium_events', input.limit, '', revealIdentity),
      ]);
      const ugcRows = ugc.items as NativeRow[]; const providerRows = provider.items as NativeRow[];
      const refundedUgc: NativeRow[] = ugcRows.filter((item) => cleanText(item.status, 40) === 'refunded').map((item) => ({ ...item, source: 'community_pack_purchases', refundKind: 'ugc-soft' }));
      const refundedProvider: NativeRow[] = providerRows.filter((item) => cleanText(item.eventType, 40).toUpperCase() === 'REFUND').map((item) => ({ ...item, source: 'revenuecat_premium_events', refundKind: 'provider-read-only' }));
      const refunds: NativeRow[] = [...refundedUgc, ...refundedProvider];
      const counts = new Map<string, number>(); for (const item of refunds) { const key = cleanText(item.buyerStableId || item.uid || item.appUserId, 160); if (key) counts.set(key, (counts.get(key) || 0) + 1); }
      const items = filterMoneyRows(refunds.map((item) => ({ ...item, serialRefunder: (counts.get(cleanText(item.buyerStableId || item.uid || item.appUserId, 160)) || 0) >= 2 })), input.query, input.status);
      return { ok: true, capabilityId: input.capabilityId, items, streams: { ugc: refundedUgc, provider: refundedProvider }, nextCursor: ugc.nextCursor, truncated: ugc.truncated || provider.truncated, providerOwned: true, sourceHealth: [{ source: 'community_pack_purchases', state: 'ready', count: refundedUgc.length }, { source: 'revenuecat_premium_events', state: 'ready', count: refundedProvider.length }], role };
    }
    if (input.capabilityId === 'website-payments') {
      const [orders, telegram, configSnap] = await Promise.all([readBoundedCollection(db, 'web_premium_orders', input.limit, input.cursor, revealIdentity), readBoundedCollection(db, 'telegram_premium_orders', Math.min(input.limit, 50), '', revealIdentity), db.collection('web_checkout').doc('config').get()]);
      const config = configSnap.exists ? { id: configSnap.id, ...asRecord(projectNativeRow(configSnap.data(), revealIdentity)), version: documentVersion(configSnap.id, configSnap.data()) } : null;
      const webOrders = orders.items.map((item) => ({ ...item, source: 'web_premium_orders' })); const telegramOrders = telegram.items.map((item) => ({ ...item, source: 'telegram_premium_orders' }));
      return { ok: true, capabilityId: input.capabilityId, items: filterMoneyRows([...webOrders, ...telegramOrders], input.query, input.status), sections: { orders: webOrders, telegramOrders, config }, config, nextCursor: orders.nextCursor, truncated: orders.truncated || telegram.truncated, providerOwned: false, sourceHealth: [{ source: 'web_premium_orders', state: 'ready', count: orders.items.length }, { source: 'telegram_premium_orders', state: 'ready', count: telegram.items.length }, { source: 'web_checkout/config', state: config ? 'ready' : 'empty', count: config ? 1 : 0 }], role };
    }
    const page = await readBoundedCollection(db, source, input.limit, input.cursor, hasPermission(role, 'users.read'));
    const items = filterMoneyRows(page.items, input.query, input.status);
    return { ok: true, capabilityId: input.capabilityId, items, nextCursor: page.nextCursor, truncated: page.truncated, providerOwned: false, sourceHealth: [{ source, state: 'ready', count: items.length }], role };
  } catch (error) {
    return { ok: true, capabilityId: input.capabilityId, items: [], nextCursor: '', truncated: false, providerOwned: input.capabilityId === 'refunds', sourceHealth: [{ source, state: 'error', message: cleanText(error instanceof Error ? error.message : error, 240) }], role };
  }
});

export const adminGetMoneyOperationDetail = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const { role } = requireNativePermission(request, 'money.read'); const data = asRecord(request.data);
  const capabilityId = cleanText(data.capabilityId, 60) as MoneyCapability; const id = cleanText(data.id, 200); const requestedSource = cleanText(data.source, 120);
  if (!id || !Object.prototype.hasOwnProperty.call(MONEY_SOURCES, capabilityId)) throw new HttpsError('invalid-argument', 'valid capabilityId and id required');
  const allowedSources: Partial<Record<MoneyCapability, readonly string[]>> = { refunds: ['community_pack_purchases', 'revenuecat_premium_events'], 'website-payments': ['web_premium_orders', 'telegram_premium_orders', 'web_checkout'] };
  const source = requestedSource && allowedSources[capabilityId]?.includes(requestedSource) ? requestedSource : MONEY_SOURCES[capabilityId];
  const snap = await admin.firestore().collection(source).doc(id).get();
  if (!snap.exists) throw new HttpsError('not-found', 'money_row_not_found');
  return { ok: true, item: { id: snap.id, ...asRecord(projectNativeRow(snap.data(), hasPermission(role, 'users.read'))), version: documentVersion(snap.id, snap.data()) }, providerOwned: capabilityId === 'refunds' };
});

export const adminPreviewMoneyMutation = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const input = parseMutationEnvelope(request.data); const plan = mutationPlanFromEnvelope(input);
  const actor = requireNativePermission(request, plan.requiredPermission);
  return createNativePreview({ db: admin.firestore(), packageId: 'money', ...actor, collection: plan.collection, action: input.action, targetId: input.targetId, reason: input.reason, expectedVersion: input.expectedVersion, payload: input.payload, consequence: plan.consequence, requiredPermission: plan.requiredPermission, requiresApproval: true, allowMissing: plan.allowMissing });
});

export const adminRequestMoneyApproval = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const { actorUid } = requireNativePermission(request, 'money.read'); const data = asRecord(request.data);
  return requestNativeApproval(admin.firestore(), actorUid, cleanText(data.previewId, 160), cleanText(data.confirmation, 240));
});

export const adminApproveMoneyMutation = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const { actorUid } = requireNativePermission(request, 'money.approve'); const data = asRecord(request.data);
  return approveNativeMutation(admin.firestore(), actorUid, cleanText(data.previewId, 160), cleanText(data.reason, 500));
});

const MONEY_ACTIONS = new Set(['ugc-refund', 'referral-status', 'telegram-activate', 'web-order-close', 'web-checkout-config']);

export const adminApplyMoneyMutation = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const actor = requireNativePermission(request, 'money.read'); const data = asRecord(request.data);
  return applyNativePatch({
    db: admin.firestore(), packageId: 'money', ...actor,
    previewId: cleanText(data.previewId, 160), confirmation: cleanText(data.confirmation, 240), idempotencyKey: cleanText(data.idempotencyKey, 160), allowedActions: MONEY_ACTIONS,
    transform: async ({ action, targetId, before, payload, nowMs, db, tx }) => {
      const iso = new Date(nowMs).toISOString();
      if (action === 'ugc-refund') {
        if (cleanText(before.status, 40) !== 'completed') throw new HttpsError('failed-precondition', 'purchase_not_completed');
        const buyer = cleanText(before.buyerStableId || before.buyerUid, 160); const amount = Number(before.priceShards);
        if (!buyer || !Number.isFinite(amount) || amount < 0) throw new HttpsError('failed-precondition', 'invalid_canonical_refund_values');
        const userRef = db.collection('users').doc(buyer); const userSnap = await tx.get(userRef);
        if (!userSnap.exists) throw new HttpsError('not-found', 'buyer_not_found');
        tx.update(userRef, { shards: admin.firestore.FieldValue.increment(amount) });
        tx.set(userRef.collection('shard_log').doc(), { ts: iso, amount, source: 'admin_refund_pack', packId: cleanText(before.packId, 160), purchaseId: targetId, reason: cleanText(payload.note, 500), adminUid: actor.actorUid });
        return { status: 'refunded', refundedAt: iso, refundedByUid: actor.actorUid, refundReason: cleanText(payload.note, 500) };
      }
      if (action === 'telegram-activate') {
        if (!['paid', 'paid_confirmed'].includes(cleanText(before.status, 40))) throw new HttpsError('failed-precondition', 'telegram_order_not_paid');
        const uid = cleanText(payload.uid || before.appStableId || before.stableUid, 160); if (!uid) throw new HttpsError('invalid-argument', 'canonical uid required');
        const userRef = db.collection('users').doc(uid); const userSnap = await tx.get(userRef); if (!userSnap.exists) throw new HttpsError('not-found', 'user_not_found');
        const plan = cleanText(before.planDuration || before.plan, 40); const months = plan.includes('year') ? 12 : plan.includes('3') ? 3 : 1;
        const progress = asRecord(userSnap.data()?.progress); const existingUntilMs = Number(progress.vip_until || progress.vip_expiry || 0);
        const vip = buildTelegramVipProgress(nowMs, months, existingUntilMs);
        tx.update(userRef, {
          'progress.vip_active': vip.vip_active,
          'progress.vip_plan': vip.vip_plan,
          'progress.vip_from': vip.vip_from,
          'progress.vip_until': vip.vip_until,
          'progress.vip_admin_override': vip.vip_admin_override,
          'progress.vip_admin_grant_at': vip.vip_admin_grant_at,
          updatedAt: nowMs,
        });
        return { status: 'vip_activated', testerActivationStatus: 'activated', activatedAt: iso, activatedUserId: uid, activatedPeriod: plan };
      }
      if (action === 'web-order-close') {
        if (!cleanText(before.status, 40).startsWith('paid')) throw new HttpsError('failed-precondition', 'web_order_not_paid');
        return { status: 'activated', activatedAtIso: iso, activatedByUid: actor.actorUid };
      }
      if (action === 'web-checkout-config') {
        const rawPrices = asRecord(payload.priceCents); const priceCents = { monthly: Math.floor(Number(rawPrices.monthly)), yearly: Math.floor(Number(rawPrices.yearly)), lifetime: Math.floor(Number(rawPrices.lifetime)) }; const currency = cleanText(payload.currency, 3).toLowerCase();
        if (Object.values(priceCents).some((price) => price < 100 || price > 1_000_000) || !/^[a-z]{3}$/.test(currency)) throw new HttpsError('invalid-argument', 'valid monthly/yearly/lifetime priceCents and currency required');
        return { priceCents, currency, paypalLive: payload.paypalLive === true, updatedAtIso: iso, updatedByUid: actor.actorUid };
      }
      if (action === 'referral-status') {
        const status = cleanText(payload.status, 40); if (!['reviewed', 'needs_review', 'dismissed'].includes(status)) throw new HttpsError('invalid-argument', 'invalid referral status');
        return { adminStatus: status, adminReviewedAt: iso, adminReviewedByUid: actor.actorUid };
      }
      throw new HttpsError('invalid-argument', 'unsupported_money_action');
    },
  });
});
