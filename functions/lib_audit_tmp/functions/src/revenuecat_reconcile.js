"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.__revenueCatReconcileTestHooks = exports.revenueCatPremiumReconcileMine = void 0;
const admin = __importStar(require("firebase-admin"));
const crypto_1 = require("crypto");
const params_1 = require("firebase-functions/params");
const https_1 = require("firebase-functions/v2/https");
const auth_identity_1 = require("./auth_identity");
const callable_options_1 = require("./callable_options");
const premium_status_1 = require("./premium_status");
const revenuecat_shards_1 = require("./revenuecat_shards");
const REGION = 'us-central1';
const REVENUECAT_API_ORIGIN = 'https://api.revenuecat.com';
const REVENUECAT_V2_ROOT = 'https://api.revenuecat.com/v2/projects/proj6af7e8d5';
const REVENUECAT_SECRET_API_KEY = (0, params_1.defineSecret)('REVENUECAT_SECRET_API_KEY');
const REQUEST_TIMEOUT_MS = 8000;
const LEASE_MS = 30000;
const RETRY_COOLDOWN_MS = 5 * 60 * 1000;
const SUCCESS_COOLDOWN_MS = 6 * 60 * 60 * 1000;
const MAX_SUBSCRIPTION_PAGES = 5;
const MAX_SUBSCRIPTIONS = 100;
function row(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
        ? value
        : null;
}
function text(value, max = 256) {
    if (typeof value !== 'string')
        return '';
    const normalized = value.trim();
    return normalized && normalized.length <= max ? normalized : '';
}
function positiveMs(value) {
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}
function subscriptionEndsAtMs(subscription) {
    return positiveMs(subscription.current_period_ends_at) ?? positiveMs(subscription.ends_at);
}
function hasActivePremiumEntitlement(subscription) {
    const entitlements = row(subscription.entitlements);
    const items = Array.isArray(entitlements?.items) ? entitlements.items : [];
    return items.some((item) => {
        const entitlement = row(item);
        return text(entitlement?.lookup_key).toLowerCase() === 'premium'
            && text(entitlement?.state).toLowerCase() === 'active';
    });
}
function eligibleSubscription(subscription, nowMs) {
    const environment = text(subscription.environment).toLowerCase();
    const ownership = text(subscription.ownership).toLowerCase();
    const store = text(subscription.store).toLowerCase();
    const endsAtMs = subscriptionEndsAtMs(subscription);
    return Boolean(text(subscription.id)
        && text(subscription.product_id)
        && text(subscription.store_subscription_identifier)
        && environment === 'production'
        && ownership === 'purchased'
        && subscription.gives_access === true
        && (store === 'play_store' || store === 'app_store')
        && hasActivePremiumEntitlement(subscription)
        && endsAtMs !== null
        && endsAtMs > nowMs);
}
function selectEligiblePremiumSubscription(items, nowMs) {
    if (!Number.isSafeInteger(nowMs) || nowMs <= 0)
        return null;
    return items
        .map(row)
        .filter((item) => item !== null && eligibleSubscription(item, nowMs))
        .sort((left, right) => (subscriptionEndsAtMs(right) ?? 0) - (subscriptionEndsAtMs(left) ?? 0))[0]
        ?? null;
}
function mapSubscriptionToSyntheticEvent(stableUid, subscription, storeIdentifier, appId) {
    const ownerUid = text(stableUid, 160);
    const subscriptionId = text(subscription.id);
    const originalTransactionId = text(subscription.store_subscription_identifier);
    const productId = text(storeIdentifier);
    const authoritativeAppId = text(appId, 128);
    const purchasedAtMs = positiveMs(subscription.starts_at);
    const periodStartsAtMs = positiveMs(subscription.current_period_starts_at);
    const periodEndsAtMs = subscriptionEndsAtMs(subscription);
    const rawStore = text(subscription.store).toLowerCase();
    if (!(0, revenuecat_shards_1.isManagedPremiumProductId)(productId)) {
        throw new Error('revenuecat_reconcile_unmanaged_product');
    }
    if (!ownerUid
        || !/^app[a-zA-Z0-9]+$/.test(authoritativeAppId)
        || !subscriptionId
        || !originalTransactionId
        || purchasedAtMs === null
        || periodStartsAtMs === null
        || periodEndsAtMs === null
        || periodEndsAtMs <= periodStartsAtMs
        || (rawStore !== 'play_store' && rawStore !== 'app_store')) {
        throw new Error('revenuecat_reconcile_subscription_invalid');
    }
    const eventHash = (0, crypto_1.createHash)('sha256')
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
function reconcileReservationDecision(state, nowMs) {
    const leaseUntilMs = positiveMs(state.leaseUntilMs) ?? 0;
    const nextAllowedAtMs = positiveMs(state.nextAllowedAtMs) ?? 0;
    if (leaseUntilMs > nowMs)
        return { kind: 'in_progress' };
    if (nextAllowedAtMs > nowMs)
        return { kind: 'cooldown' };
    return { kind: 'acquire' };
}
function reservationId(stableUid) {
    return (0, crypto_1.createHash)('sha256').update(stableUid).digest('hex');
}
async function fetchRevenueCatJson(url, secret, fetchImpl = fetch) {
    const response = await fetchImpl(url, {
        method: 'GET',
        headers: { Accept: 'application/json', Authorization: `Bearer ${secret}` },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok)
        throw new Error(`revenuecat_v2_status_${response.status}`);
    return response.json();
}
function validatedRevenueCatPageUrl(value, expectedPathname) {
    if (value == null || value === '')
        return null;
    const rawUrl = text(value, 2048);
    if (!rawUrl)
        throw new Error('revenuecat_v2_next_page_invalid');
    try {
        const url = new URL(rawUrl, `${REVENUECAT_API_ORIGIN}/`);
        const isCustomerSubscriptionsPath = /^\/v2\/projects\/proj6af7e8d5\/customers\/[^/]+\/subscriptions$/.test(url.pathname);
        if (url.origin !== REVENUECAT_API_ORIGIN
            || !isCustomerSubscriptionsPath
            || (expectedPathname !== undefined && url.pathname !== expectedPathname)
            || url.username
            || url.password
            || url.hash) {
            throw new Error('revenuecat_v2_next_page_invalid');
        }
        return url.toString();
    }
    catch (error) {
        if (error instanceof Error && error.message === 'revenuecat_v2_next_page_invalid')
            throw error;
        throw new Error('revenuecat_v2_next_page_invalid');
    }
}
async function fetchEligiblePremiumSubscription(initialUrl, secret, nowMs, fetchImpl = fetch) {
    const validatedInitialUrl = validatedRevenueCatPageUrl(initialUrl);
    if (!validatedInitialUrl)
        throw new Error('revenuecat_v2_next_page_invalid');
    const expectedPathname = new URL(validatedInitialUrl).pathname;
    let nextUrl = validatedInitialUrl;
    const subscriptions = [];
    for (let page = 0; page < MAX_SUBSCRIPTION_PAGES && nextUrl; page += 1) {
        const payload = row(await fetchRevenueCatJson(nextUrl, secret, fetchImpl));
        if (!payload)
            throw new Error('revenuecat_v2_subscriptions_invalid');
        const pageItems = Array.isArray(payload.items) ? payload.items : [];
        const capacity = MAX_SUBSCRIPTIONS - subscriptions.length;
        subscriptions.push(...pageItems.slice(0, Math.max(0, capacity)));
        if (subscriptions.length >= MAX_SUBSCRIPTIONS)
            break;
        nextUrl = validatedRevenueCatPageUrl(payload.next_page, expectedPathname);
    }
    return selectEligiblePremiumSubscription(subscriptions, nowMs);
}
function isCacheablePaidLineageOutcome(outcome, existingStoreProjectionActive) {
    if (outcome.statusCode !== 200 || outcome.body.ok !== true)
        return false;
    if (outcome.body.active === true
        && (outcome.body.updated === true || outcome.body.reason === 'stale_event')) {
        return true;
    }
    return outcome.body.reason === 'duplicate' && existingStoreProjectionActive;
}
async function hasActiveStorePremiumProjection(db, stableUid, nowMs) {
    const snapshot = await db.collection('users').doc(stableUid).get();
    if (!snapshot.exists)
        return false;
    const progress = (snapshot.data()?.progress ?? {});
    return (0, premium_status_1.isStorePremiumActive)(progress, nowMs);
}
async function acquireReservation(db, stableUid, nowMs) {
    const ref = db.collection('revenuecat_reconcile_reservations').doc(reservationId(stableUid));
    return db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(ref);
        const decision = reconcileReservationDecision(snapshot.data() ?? {}, nowMs);
        if (decision.kind !== 'acquire')
            return decision.kind;
        transaction.set(ref, {
            leaseUntilMs: nowMs + LEASE_MS,
            nextAllowedAtMs: nowMs + RETRY_COOLDOWN_MS,
            attemptedAtMs: nowMs,
            outcome: 'in_progress',
        }, { merge: true });
        return 'acquired';
    });
}
async function finishReservation(db, stableUid, nowMs, outcome) {
    const cooldown = outcome === 'active' ? SUCCESS_COOLDOWN_MS : RETRY_COOLDOWN_MS;
    await db.collection('revenuecat_reconcile_reservations').doc(reservationId(stableUid)).set({
        leaseUntilMs: 0,
        nextAllowedAtMs: nowMs + cooldown,
        completedAtMs: nowMs,
        outcome,
    }, { merge: true });
}
async function reconcileMine(db, stableUid, authUid, secret, nowMs, fetchImpl = fetch) {
    const reservation = await acquireReservation(db, stableUid, nowMs);
    if (reservation !== 'acquired') {
        return { ok: true, active: false, reconciled: false, reason: reservation };
    }
    try {
        const customerPath = `${REVENUECAT_V2_ROOT}/customers/${encodeURIComponent(stableUid)}`;
        const subscription = await fetchEligiblePremiumSubscription(`${customerPath}/subscriptions?limit=20`, secret, nowMs, fetchImpl);
        if (!subscription) {
            await finishReservation(db, stableUid, Date.now(), 'not_found');
            return { ok: true, active: false, reconciled: false, reason: 'no_verified_subscription' };
        }
        const revenueCatProductId = text(subscription.product_id);
        const productPayload = row(await fetchRevenueCatJson(`${REVENUECAT_V2_ROOT}/products/${encodeURIComponent(revenueCatProductId)}`, secret, fetchImpl));
        const storeIdentifier = text(productPayload?.store_identifier);
        const productAppId = text(productPayload?.app_id, 128);
        const event = mapSubscriptionToSyntheticEvent(stableUid, subscription, storeIdentifier, productAppId);
        const outcome = await (0, revenuecat_shards_1.applyVerifiedPremiumSubscriptionEvent)(event, String(event.type), String(event.product_id));
        const existingStoreProjectionActive = outcome.statusCode === 200
            && outcome.body.reason === 'duplicate'
            && await hasActiveStorePremiumProjection(db, stableUid, Date.now());
        if (!isCacheablePaidLineageOutcome(outcome, existingStoreProjectionActive)) {
            throw new Error('revenuecat_reconcile_paid_lineage_unconfirmed');
        }
        await finishReservation(db, stableUid, Date.now(), 'active');
        return { ok: true, active: true, reconciled: true, source: 'revenuecat_v2' };
    }
    catch (error) {
        await finishReservation(db, stableUid, Date.now(), 'error').catch(() => undefined);
        throw error;
    }
}
exports.revenueCatPremiumReconcileMine = (0, https_1.onCall)({
    region: REGION,
    enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK,
    secrets: [REVENUECAT_SECRET_API_KEY],
    timeoutSeconds: 20,
    memory: '256MiB',
    maxInstances: 40,
}, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    const db = admin.firestore();
    const authUid = request.auth.uid;
    const stableUid = await (0, auth_identity_1.resolveStableUidForAuth)(db, authUid, undefined, {
        repairLinks: false,
        requireKnownIdentity: true,
    });
    const secret = REVENUECAT_SECRET_API_KEY.value().trim();
    if (!secret)
        throw new https_1.HttpsError('failed-precondition', 'revenuecat_reconcile_unconfigured');
    try {
        return await reconcileMine(db, stableUid, authUid, secret, Date.now());
    }
    catch {
        throw new https_1.HttpsError('unavailable', 'revenuecat_reconcile_unavailable');
    }
});
exports.__revenueCatReconcileTestHooks = {
    selectEligiblePremiumSubscription,
    mapSubscriptionToSyntheticEvent,
    reconcileReservationDecision,
    fetchRevenueCatJson,
    fetchEligiblePremiumSubscription,
    isCacheablePaidLineageOutcome,
    reconcileMine,
};
//# sourceMappingURL=revenuecat_reconcile.js.map