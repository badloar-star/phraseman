import * as admin from 'firebase-admin';
import { createHash } from 'crypto';
import { defineSecret } from 'firebase-functions/params';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { resolveStableUidForAuth } from './auth_identity';
import { ENFORCE_APP_CHECK } from './callable_options';
import * as logger from 'firebase-functions/logger';
import { isStorePremiumActive } from './premium_status';
import {
  applyVerifiedPremiumSubscriptionEvent,
  isManagedPremiumProductId,
} from './revenuecat_shards';

const REGION = 'us-central1';
const REVENUECAT_API_ORIGIN = 'https://api.revenuecat.com';
const REVENUECAT_V2_ROOT = 'https://api.revenuecat.com/v2/projects/proj6af7e8d5';
const REVENUECAT_SECRET_API_KEY = defineSecret('REVENUECAT_SECRET_API_KEY');
const REQUEST_TIMEOUT_MS = 8_000;
const LEASE_MS = 30_000;
const RETRY_COOLDOWN_MS = 5 * 60 * 1000;
const SUCCESS_COOLDOWN_MS = 6 * 60 * 60 * 1000;
const MAX_SUBSCRIPTION_PAGES = 5;
const MAX_SUBSCRIPTIONS = 100;

type Row = Record<string, unknown>;
type FetchLike = (input: string, init: RequestInit) => Promise<Response>;
type ReconciliationScope = 'premium';

function row(value: unknown): Row | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Row
    : null;
}

function text(value: unknown, max = 256): string {
  if (typeof value !== 'string') return '';
  const normalized = value.trim();
  return normalized && normalized.length <= max ? normalized : '';
}

function positiveMs(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function subscriptionEndsAtMs(subscription: Row): number | null {
  return positiveMs(subscription.current_period_ends_at) ?? positiveMs(subscription.ends_at);
}

function hasActivePremiumEntitlement(subscription: Row): boolean {
  const entitlements = row(subscription.entitlements);
  const items = Array.isArray(entitlements?.items) ? entitlements.items : [];
  return items.some((item) => {
    const entitlement = row(item);
    return text(entitlement?.lookup_key).toLowerCase() === 'premium'
      && text(entitlement?.state).toLowerCase() === 'active';
  });
}

function eligibleSubscription(subscription: Row, nowMs: number): boolean {
  const environment = text(subscription.environment).toLowerCase();
  const ownership = text(subscription.ownership).toLowerCase();
  const store = text(subscription.store).toLowerCase();
  const endsAtMs = subscriptionEndsAtMs(subscription);
  return Boolean(
    text(subscription.id)
    && text(subscription.product_id)
    && text(subscription.store_subscription_identifier)
    && environment === 'production'
    && ownership === 'purchased'
    && subscription.gives_access === true
    && (store === 'play_store' || store === 'app_store')
    && hasActivePremiumEntitlement(subscription)
    && endsAtMs !== null
    && endsAtMs > nowMs
  );
}

function selectEligiblePremiumSubscription(items: unknown[], nowMs: number): Row | null {
  if (!Number.isSafeInteger(nowMs) || nowMs <= 0) return null;
  return items
    .map(row)
    .filter((item): item is Row => item !== null && eligibleSubscription(item, nowMs))
    .sort((left, right) => (subscriptionEndsAtMs(right) ?? 0) - (subscriptionEndsAtMs(left) ?? 0))[0]
    ?? null;
}

function mapSubscriptionToSyntheticEvent(
  stableUid: string,
  subscription: Row,
  storeIdentifier: string,
  appId: string,
): Row {
  const ownerUid = text(stableUid, 160);
  const subscriptionId = text(subscription.id);
  const originalTransactionId = text(subscription.store_subscription_identifier);
  const productId = text(storeIdentifier);
  const authoritativeAppId = text(appId, 128);
  const purchasedAtMs = positiveMs(subscription.starts_at);
  const periodStartsAtMs = positiveMs(subscription.current_period_starts_at);
  const periodEndsAtMs = subscriptionEndsAtMs(subscription);
  const rawStore = text(subscription.store).toLowerCase();
  if (!isManagedPremiumProductId(productId)) {
    throw new Error('revenuecat_reconcile_unmanaged_product');
  }
  if (!hasActivePremiumEntitlement(subscription)) {
    throw new Error('revenuecat_reconcile_premium_entitlement_unverified');
  }
  if (
    !ownerUid
    || !/^app[a-zA-Z0-9]+$/.test(authoritativeAppId)
    || !subscriptionId
    || !originalTransactionId
    || purchasedAtMs === null
    || periodStartsAtMs === null
    || periodEndsAtMs === null
    || periodEndsAtMs <= periodStartsAtMs
    || (rawStore !== 'play_store' && rawStore !== 'app_store')
  ) {
    throw new Error('revenuecat_reconcile_subscription_invalid');
  }
  const eventHash = createHash('sha256')
    .update(`${subscriptionId.length}:${subscriptionId}|${periodStartsAtMs}|${periodEndsAtMs}`)
    .digest('hex')
    .slice(0, 40);
  return {
    id: `rc_reconcile_${eventHash}`,
    type: 'RENEWAL',
    app_id: authoritativeAppId,
    app_user_id: ownerUid,
    original_app_user_id: ownerUid,
    aliases: [],
    product_id: productId,
    entitlement_ids: ['premium'],
    store: rawStore.toUpperCase(),
    environment: 'PRODUCTION',
    original_transaction_id: originalTransactionId,
    transaction_id: subscriptionId,
    purchased_at_ms: purchasedAtMs,
    event_timestamp_ms: periodStartsAtMs,
    expiration_at_ms: periodEndsAtMs,
    period_type: 'NORMAL',
  };
}

// ── Разовая покупка «навсегда» ───────────────────────────────────────────────
// зачем (координатор 25.10, разбор «оплата в отсрочке удаления»): вебхук в отсрочке отказывает навсегда (квитанция отказа), а
// подтяжка брала только подписки — «навсегда», купленное за 14 дней, после восстановления на сервер не приходило (телефон
// показывал Plus, сервер — нет). Теперь подтяжка смотрит и разовые покупки RevenueCat v2 и применяет то же синтетическое
// событие NON_RENEWING_PURCHASE, что прислал бы вебхук. Отбор строгий — только наш lifetime-продукт, оплачено и не возвращено.
const LIFETIME_STORE_IDENTIFIER = 'phraseman_premium_lifetime_v1';

function eligibleLifetimePurchase(purchase: Row): boolean {
  const status = text(purchase.status).toLowerCase();
  const store = text(purchase.store).toLowerCase();
  return Boolean(
    text(purchase.id)
    && text(purchase.product_id)
    && text(purchase.store_purchase_identifier)
    && text(purchase.environment).toLowerCase() === 'production'
    && text(purchase.ownership).toLowerCase() === 'purchased'
    && status === 'owned'
    && (store === 'play_store' || store === 'app_store')
    && hasActivePremiumEntitlement(purchase)
    && positiveMs(purchase.purchased_at) !== null
  );
}

/** Почему разовая покупка не подошла — для журнала [PREMIUM-RECONCILE] (без идентификаторов). */
function lifetimeSkipReason(purchase: Row): string {
  if (text(purchase.environment).toLowerCase() !== 'production') return 'not_production';
  if (text(purchase.ownership).toLowerCase() !== 'purchased') return 'not_purchased';
  if (text(purchase.status).toLowerCase() !== 'owned') return `status_${text(purchase.status).toLowerCase() || 'missing'}`;
  const store = text(purchase.store).toLowerCase();
  if (store !== 'play_store' && store !== 'app_store') return `store_${store || 'missing'}`;
  if (!hasActivePremiumEntitlement(purchase)) return 'no_premium_entitlement';
  return 'invalid_fields';
}

function selectEligibleLifetimePurchase(items: unknown[]): Row | null {
  return items
    .map(row)
    .filter((item): item is Row => item !== null && eligibleLifetimePurchase(item))
    .sort((left, right) => (positiveMs(right.purchased_at) ?? 0) - (positiveMs(left.purchased_at) ?? 0))[0]
    ?? null;
}

function mapLifetimePurchaseToSyntheticEvent(
  stableUid: string,
  purchase: Row,
  storeIdentifier: string,
  appId: string,
): Row {
  const ownerUid = text(stableUid, 160);
  const purchaseId = text(purchase.id);
  const storePurchaseId = text(purchase.store_purchase_identifier);
  const productId = text(storeIdentifier);
  const authoritativeAppId = text(appId, 128);
  const purchasedAtMs = positiveMs(purchase.purchased_at);
  const rawStore = text(purchase.store).toLowerCase();
  if (productId !== LIFETIME_STORE_IDENTIFIER || !isManagedPremiumProductId(productId)) {
    throw new Error('revenuecat_reconcile_not_lifetime_product');
  }
  if (!hasActivePremiumEntitlement(purchase)) {
    throw new Error('revenuecat_reconcile_premium_entitlement_unverified');
  }
  if (
    !ownerUid
    || !/^app[a-zA-Z0-9]+$/.test(authoritativeAppId)
    || !purchaseId
    || !storePurchaseId
    || purchasedAtMs === null
    || (rawStore !== 'play_store' && rawStore !== 'app_store')
  ) {
    throw new Error('revenuecat_reconcile_purchase_invalid');
  }
  // id от самой покупки: повтор подтяжки даёт то же событие → квитанция «duplicate», без второго начисления
  const eventHash = createHash('sha256')
    .update(`lifetime|${purchaseId.length}:${purchaseId}|${purchasedAtMs}`)
    .digest('hex')
    .slice(0, 40);
  return {
    id: `rc_reconcile_lt_${eventHash}`,
    type: 'NON_RENEWING_PURCHASE',
    app_id: authoritativeAppId,
    app_user_id: ownerUid,
    original_app_user_id: ownerUid,
    aliases: [],
    product_id: productId,
    entitlement_ids: ['premium'],
    store: rawStore.toUpperCase(),
    environment: 'PRODUCTION',
    original_transaction_id: storePurchaseId,
    transaction_id: storePurchaseId,
    purchased_at_ms: purchasedAtMs,
    event_timestamp_ms: purchasedAtMs,
    period_type: 'NORMAL',
  };
}

async function fetchEligibleLifetimePurchase(
  initialUrl: string,
  secret: string,
  fetchImpl: FetchLike = fetch,
): Promise<{ purchase: Row | null; seen: number; skipped: Record<string, number> }> {
  const validatedInitialUrl = validatedRevenueCatPageUrl(initialUrl);
  if (!validatedInitialUrl || !new URL(validatedInitialUrl).pathname.endsWith('/purchases')) {
    throw new Error('revenuecat_v2_next_page_invalid');
  }
  const expectedPathname = new URL(validatedInitialUrl).pathname;
  let nextUrl: string | null = validatedInitialUrl;
  const purchases: unknown[] = [];
  for (let page = 0; page < MAX_SUBSCRIPTION_PAGES && nextUrl; page += 1) {
    const payload = row(await fetchRevenueCatJson(nextUrl, secret, fetchImpl));
    if (!payload) throw new Error('revenuecat_v2_purchases_invalid');
    const pageItems = Array.isArray(payload.items) ? payload.items : [];
    const capacity = MAX_SUBSCRIPTIONS - purchases.length;
    purchases.push(...pageItems.slice(0, Math.max(0, capacity)));
    if (purchases.length >= MAX_SUBSCRIPTIONS) break;
    nextUrl = validatedRevenueCatPageUrl(payload.next_page, expectedPathname);
  }
  const skipped: Record<string, number> = {};
  for (const item of purchases.map(row)) {
    if (!item || eligibleLifetimePurchase(item)) continue;
    const reason = lifetimeSkipReason(item);
    skipped[reason] = (skipped[reason] ?? 0) + 1;
  }
  return { purchase: selectEligibleLifetimePurchase(purchases), seen: purchases.length, skipped };
}

/**
 * «Навсегда»: разовые покупки RevenueCat v2 → синтетическое NON_RENEWING_PURCHASE через тот же редьюсер.
 * Журнал [PREMIUM-RECONCILE]: сколько пришло, что пропущено и почему, что применено (без идентификаторов покупки и uid).
 */
async function reconcileLifetimePurchase(
  db: FirebaseFirestore.Firestore,
  stableUid: string,
  customerPath: string,
  secret: string,
  fetchImpl: FetchLike,
  apply: typeof applyVerifiedPremiumSubscriptionEvent,
): Promise<{ applied: boolean; reason: string }> {
  const found = await fetchEligibleLifetimePurchase(`${customerPath}/purchases?limit=20`, secret, fetchImpl);
  if (!found.purchase) {
    logger.info('[PREMIUM-RECONCILE] lifetime none', JSON.stringify({ seen: found.seen, skipped: found.skipped }));
    return { applied: false, reason: 'no_verified_subscription_or_lifetime' };
  }
  const productPayload = row(await fetchRevenueCatJson(
    `${REVENUECAT_V2_ROOT}/products/${encodeURIComponent(text(found.purchase.product_id))}`,
    secret,
    fetchImpl,
  ));
  const storeIdentifier = text(productPayload?.store_identifier);
  if (storeIdentifier !== LIFETIME_STORE_IDENTIFIER) {
    logger.info('[PREMIUM-RECONCILE] lifetime skip', JSON.stringify({ reason: 'not_lifetime_product', seen: found.seen }));
    return { applied: false, reason: 'no_verified_subscription_or_lifetime' };
  }
  const event = mapLifetimePurchaseToSyntheticEvent(stableUid, found.purchase, storeIdentifier, text(productPayload?.app_id, 128));
  const outcome = await apply(event, String(event.type), String(event.product_id));
  const existingStoreProjectionActive = outcome.statusCode === 200
    && outcome.body.reason === 'duplicate'
    && await hasActiveStorePremiumProjection(db, stableUid, Date.now());
  const applied = isCacheablePaidLineageOutcome(outcome, existingStoreProjectionActive);
  logger.info('[PREMIUM-RECONCILE] lifetime applied', JSON.stringify({
    eventIdHash: String(event.id).slice(-8),
    status: outcome.statusCode,
    reason: outcome.body.reason ?? null,
    updated: outcome.body.updated ?? null,
    applied,
  }));
  if (!applied) throw new Error('revenuecat_reconcile_paid_lineage_unconfirmed');
  return { applied: true, reason: 'lifetime' };
}

function reconcileReservationDecision(
  state: Row,
  nowMs: number,
): { kind: 'acquire' | 'cooldown' | 'in_progress' } {
  const leaseUntilMs = positiveMs(state.leaseUntilMs) ?? 0;
  const nextAllowedAtMs = positiveMs(state.nextAllowedAtMs) ?? 0;
  if (leaseUntilMs > nowMs) return { kind: 'in_progress' };
  if (nextAllowedAtMs > nowMs) return { kind: 'cooldown' };
  return { kind: 'acquire' };
}

function reservationId(
  stableUid: string,
  scope: ReconciliationScope = 'premium',
): string {
  const material = scope === 'premium' ? stableUid : `${stableUid}|${scope}`;
  return createHash('sha256').update(material).digest('hex');
}

async function fetchRevenueCatJson(
  url: string,
  secret: string,
  fetchImpl: FetchLike = fetch,
): Promise<unknown> {
  const response = await fetchImpl(url, {
    method: 'GET',
    headers: { Accept: 'application/json', Authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`revenuecat_v2_status_${response.status}`);
  return response.json();
}

function validatedRevenueCatPageUrl(value: unknown, expectedPathname?: string): string | null {
  if (value == null || value === '') return null;
  const rawUrl = text(value, 2_048);
  if (!rawUrl) throw new Error('revenuecat_v2_next_page_invalid');
  try {
    const url = new URL(rawUrl, `${REVENUECAT_API_ORIGIN}/`);
    // зачем (координатор 25.10): кроме подписок — разовые покупки («навсегда»); тот же проект, тот же хост, только два пути.
    const isCustomerSubscriptionsPath = /^\/v2\/projects\/proj6af7e8d5\/customers\/[^/]+\/(?:subscriptions|purchases)$/.test(
      url.pathname,
    );
    if (
      url.origin !== REVENUECAT_API_ORIGIN
      || !isCustomerSubscriptionsPath
      || (expectedPathname !== undefined && url.pathname !== expectedPathname)
      || url.username
      || url.password
      || url.hash
    ) {
      throw new Error('revenuecat_v2_next_page_invalid');
    }
    return url.toString();
  } catch (error) {
    if (error instanceof Error && error.message === 'revenuecat_v2_next_page_invalid') throw error;
    throw new Error('revenuecat_v2_next_page_invalid');
  }
}

async function fetchEligiblePremiumSubscription(
  initialUrl: string,
  secret: string,
  nowMs: number,
  fetchImpl: FetchLike = fetch,
): Promise<Row | null> {
  const validatedInitialUrl = validatedRevenueCatPageUrl(initialUrl);
  if (!validatedInitialUrl) throw new Error('revenuecat_v2_next_page_invalid');
  const expectedPathname = new URL(validatedInitialUrl).pathname;
  let nextUrl: string | null = validatedInitialUrl;
  const subscriptions: unknown[] = [];
  for (let page = 0; page < MAX_SUBSCRIPTION_PAGES && nextUrl; page += 1) {
    const payload = row(await fetchRevenueCatJson(nextUrl, secret, fetchImpl));
    if (!payload) throw new Error('revenuecat_v2_subscriptions_invalid');
    const pageItems = Array.isArray(payload.items) ? payload.items : [];
    const capacity = MAX_SUBSCRIPTIONS - subscriptions.length;
    subscriptions.push(...pageItems.slice(0, Math.max(0, capacity)));
    if (subscriptions.length >= MAX_SUBSCRIPTIONS) break;
    nextUrl = validatedRevenueCatPageUrl(payload.next_page, expectedPathname);
  }
  return selectEligiblePremiumSubscription(subscriptions, nowMs);
}

function isCacheablePaidLineageOutcome(
  outcome: { statusCode: number; body: Record<string, unknown> },
  existingStoreProjectionActive: boolean,
): boolean {
  if (outcome.statusCode !== 200 || outcome.body.ok !== true) return false;
  if (
    outcome.body.active === true
    && (outcome.body.updated === true || outcome.body.reason === 'stale_event')
  ) {
    return true;
  }
  return outcome.body.reason === 'duplicate' && existingStoreProjectionActive;
}

async function hasActiveStorePremiumProjection(
  db: FirebaseFirestore.Firestore,
  stableUid: string,
  nowMs: number,
): Promise<boolean> {
  const snapshot = await db.collection('users').doc(stableUid).get();
  if (!snapshot.exists) return false;
  const progress = (snapshot.data()?.progress ?? {}) as Record<string, unknown>;
  return isStorePremiumActive(progress, nowMs);
}

async function activeStorePremiumPlan(
  db: FirebaseFirestore.Firestore,
  stableUid: string,
  nowMs: number,
): Promise<string | null> {
  const snapshot = await db.collection('users').doc(stableUid).get();
  if (!snapshot.exists) return null;
  const progress = (snapshot.data()?.progress ?? {}) as Record<string, unknown>;
  if (!isStorePremiumActive(progress, nowMs)) return null;
  const plan = text(progress.premium_plan).toLowerCase();
  return plan || null;
}

async function acquireReservation(
  db: FirebaseFirestore.Firestore,
  stableUid: string,
  nowMs: number,
  scope: ReconciliationScope = 'premium',
): Promise<'acquired' | 'cooldown' | 'in_progress'> {
  const ref = db.collection('revenuecat_reconcile_reservations').doc(reservationId(stableUid, scope));
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const decision = reconcileReservationDecision(snapshot.data() ?? {}, nowMs);
    if (decision.kind !== 'acquire') return decision.kind;
    transaction.set(ref, {
      leaseUntilMs: nowMs + LEASE_MS,
      nextAllowedAtMs: nowMs + RETRY_COOLDOWN_MS,
      attemptedAtMs: nowMs,
      outcome: 'in_progress',
    }, { merge: true });
    return 'acquired' as const;
  });
}

async function finishReservation(
  db: FirebaseFirestore.Firestore,
  stableUid: string,
  nowMs: number,
  outcome: 'active' | 'not_found' | 'error',
  scope: ReconciliationScope = 'premium',
): Promise<void> {
  const ref = db.collection('revenuecat_reconcile_reservations').doc(reservationId(stableUid, scope));
  const cooldown = reservationCooldownMs(outcome, scope);
  await ref.set({
    leaseUntilMs: 0,
    nextAllowedAtMs: nowMs + cooldown,
    completedAtMs: nowMs,
    outcome,
  }, { merge: true });
}

function reservationCooldownMs(
  outcome: 'active' | 'not_found' | 'error',
  _scope: ReconciliationScope = 'premium',
): number {
  if (outcome === 'active') return SUCCESS_COOLDOWN_MS;
  return RETRY_COOLDOWN_MS;
}

async function reconcileMine(
  db: FirebaseFirestore.Firestore,
  stableUid: string,
  authUid: string,
  secret: string,
  nowMs: number,
  fetchImpl: FetchLike = fetch,
  scope: ReconciliationScope = 'premium',
  /** Применение события (по умолчанию — общий редьюсер вебхука; тесты подменяют). */
  apply: typeof applyVerifiedPremiumSubscriptionEvent = applyVerifiedPremiumSubscriptionEvent,
): Promise<Record<string, unknown>> {
  const reservation = await acquireReservation(db, stableUid, nowMs, scope);
  if (reservation !== 'acquired') {
    const plan = await activeStorePremiumPlan(db, stableUid, nowMs);
    if (plan) {
      return {
        ok: true,
        active: true,
        reconciled: true,
        source: 'revenuecat_v2',
        plan,
      };
    }
    return { ok: true, active: false, reconciled: false, reason: reservation };
  }

  try {
    const customerPath = `${REVENUECAT_V2_ROOT}/customers/${encodeURIComponent(stableUid)}`;
    const subscription = await fetchEligiblePremiumSubscription(
      `${customerPath}/subscriptions?limit=20`,
      secret,
      nowMs,
      fetchImpl,
    );
    if (!subscription) {
      // зачем (координатор 25.10): подписки нет — смотрим разовую покупку «навсегда» (подписки, как раньше, первыми).
      const lifetime = await reconcileLifetimePurchase(db, stableUid, customerPath, secret, fetchImpl, apply);
      if (lifetime.applied) {
        await finishReservation(db, stableUid, Date.now(), 'active', scope);
        return { ok: true, active: true, reconciled: true, source: 'revenuecat_v2', plan: 'lifetime' };
      }
      await finishReservation(db, stableUid, Date.now(), 'not_found', scope);
      return { ok: true, active: false, reconciled: false, reason: lifetime.reason };
    }
    const revenueCatProductId = text(subscription.product_id);
    const productPayload = row(await fetchRevenueCatJson(
      `${REVENUECAT_V2_ROOT}/products/${encodeURIComponent(revenueCatProductId)}`,
      secret,
      fetchImpl,
    ));
    const storeIdentifier = text(productPayload?.store_identifier);
    const productAppId = text(productPayload?.app_id, 128);
    if (/^phraseman_max_monthly_v1(?::monthly-base)?$/.test(storeIdentifier)) {
      await finishReservation(db, stableUid, Date.now(), 'not_found', scope);
      return { ok: true, active: false, reconciled: false, reason: 'retired_max_product' };
    }
    const event = mapSubscriptionToSyntheticEvent(
      stableUid,
      subscription,
      storeIdentifier,
      productAppId,
    );
    const outcome = await apply(
      event,
      String(event.type),
      String(event.product_id),
    );
    const existingStoreProjectionActive = outcome.statusCode === 200
      && outcome.body.reason === 'duplicate'
      && await hasActiveStorePremiumProjection(db, stableUid, Date.now());
    if (!isCacheablePaidLineageOutcome(outcome, existingStoreProjectionActive)) {
      throw new Error('revenuecat_reconcile_paid_lineage_unconfirmed');
    }
    await finishReservation(db, stableUid, Date.now(), 'active', scope);
    return {
      ok: true,
      active: true,
      reconciled: true,
      source: 'revenuecat_v2',
    };
  } catch (error) {
    // зачем (§126, 04.10): немой catch прятал отказ закрытия резервации — причина обязана быть в журнале.
    await finishReservation(db, stableUid, Date.now(), 'error', scope).catch((finishError: unknown) => {
      logger.warn('[RC-RECONCILE] finishReservation(error) failed', JSON.stringify({
        scope, error: String((finishError as Error)?.message ?? finishError).slice(0, 200),
      }));
    });
    throw error;
  }
}

export const revenueCatPremiumReconcileMine = onCall({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK,
  secrets: [REVENUECAT_SECRET_API_KEY],
  timeoutSeconds: 20,
  memory: '256MiB',
  maxInstances: 40,
  // зачем (владелец 17.10): вход, старт приложения, Пик и диалоги — полное ядро (белый список к setGlobalOptions cpu gcf_gen1):
  // при доле ядра ответ замедлялся на 30–100 % (замер Cloud Monitoring 17.10), владелец заметил долгую загрузку Пика.
  cpu: 1,
}, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const authUid = request.auth.uid;
  const stableUid = await resolveStableUidForAuth(db, authUid, undefined, {
    repairLinks: false,
    requireKnownIdentity: true,
  });
  const secret = REVENUECAT_SECRET_API_KEY.value().trim();
  if (!secret) throw new HttpsError('failed-precondition', 'revenuecat_reconcile_unconfigured');
  try {
    return await reconcileMine(db, stableUid, authUid, secret, Date.now(), fetch, 'premium');
  } catch (error) {
    // зачем (§126, 04.10): клиент видит только «unavailable»; настоящая причина (RevenueCat HTTP,
    // неподтверждённая линия оплаты, резервация) обязана быть в журнале функции. Секрет не печатаем.
    logger.warn('[RC-RECONCILE] reconcileMine failed', JSON.stringify({
      authUidPrefix: authUid.slice(0, 6),
      error: String((error as Error)?.message ?? error).slice(0, 200),
    }));
    throw new HttpsError('unavailable', 'revenuecat_reconcile_unavailable');
  }
});

export const __revenueCatReconcileTestHooks = {
  selectEligiblePremiumSubscription,
  mapSubscriptionToSyntheticEvent,
  reconcileReservationDecision,
  reservationId,
  acquireReservation,
  finishReservation,
  reservationCooldownMs,
  fetchRevenueCatJson,
  fetchEligiblePremiumSubscription,
  isCacheablePaidLineageOutcome,
  reconcileMine,
  selectEligibleLifetimePurchase,
  mapLifetimePurchaseToSyntheticEvent,
  fetchEligibleLifetimePurchase,
};

/** Для сброса задержки подтяжки при восстановлении аккаунта (account_delete_restore). */
export const REVENUECAT_RECONCILE_RESERVATIONS = 'revenuecat_reconcile_reservations';
export function revenueCatPremiumReconcileReservationId(stableUid: string): string {
  return reservationId(stableUid, 'premium');
}
