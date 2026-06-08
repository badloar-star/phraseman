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
exports.__revenueCatWebhookTestHooks = exports.revenueCatShardsWebhook = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const params_1 = require("firebase-functions/params");
const REGION = 'us-central1';
const REVENUECAT_WEBHOOK_AUTH = (0, params_1.defineSecret)('REVENUECAT_WEBHOOK_AUTH');
const SHARD_PACKS_BY_PRODUCT_ID = {
    phraseman_shards_30: { packId: 'starter', shards: 35 },
    phraseman_shards_80: { packId: 'popular', shards: 92 },
    phraseman_shards_180: { packId: 'value', shards: 210 },
    phraseman_shards_420: { packId: 'pro', shards: 500 },
};
const PREMIUM_ACTIVE_EVENTS = new Set([
    'INITIAL_PURCHASE',
    'RENEWAL',
    'UNCANCELLATION',
    'PRODUCT_CHANGE',
    'SUBSCRIPTION_EXTENDED',
    'TEMPORARY_ENTITLEMENT_GRANT',
]);
const PREMIUM_KEEP_ACTIVE_EVENTS = new Set([
    'CANCELLATION',
    'BILLING_ISSUE',
]);
const PREMIUM_INACTIVE_EVENTS = new Set([
    'EXPIRATION',
    // REFUND: пользователь вернул деньги — Premium нужно деактивировать,
    // иначе сохраняется платный доступ без оплаты (прямая утечка дохода).
    'REFUND',
]);
function cleanId(raw) {
    return String(raw ?? '').trim();
}
function isRevenueCatAnonymousId(raw) {
    const id = cleanId(raw);
    return id.startsWith('$RCAnonymousID:') || id.startsWith('$RCA');
}
function stableCandidateUserIds(candidates) {
    return candidates.filter((id) => id && !isRevenueCatAnonymousId(id));
}
function prioritizeUserCandidates(candidates) {
    const stable = stableCandidateUserIds(candidates);
    const anonymous = candidates.filter(isRevenueCatAnonymousId);
    return [...stable, ...anonymous];
}
function subscriberAttributeValue(raw) {
    if (raw != null && typeof raw === 'object' && 'value' in raw) {
        return cleanId(raw.value);
    }
    return cleanId(raw);
}
function addCandidate(out, raw) {
    const id = cleanId(raw);
    if (id)
        out.add(id);
}
function authMatches(header, expected) {
    const value = String(header ?? '').trim();
    if (!value)
        return false;
    return value === expected || value.toLowerCase() === `bearer ${expected}`.toLowerCase();
}
function parseShards(raw) {
    const n = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(n) || n < 0)
        return 0;
    return Math.floor(n);
}
function candidateUserIds(event) {
    const out = new Set();
    const attrs = event.subscriber_attributes ?? {};
    for (const key of ['phraseman_uid', 'phraseman_stable_id', 'stable_id']) {
        addCandidate(out, subscriberAttributeValue(attrs[key]));
    }
    for (const raw of [event.app_user_id, event.original_app_user_id])
        addCandidate(out, raw);
    for (const raw of Array.isArray(event.aliases) ? event.aliases : []) {
        addCandidate(out, raw);
    }
    return [...out];
}
function entitlementIds(event) {
    const out = new Set();
    const one = cleanId(event.entitlement_id);
    if (one)
        out.add(one.toLowerCase());
    for (const raw of Array.isArray(event.entitlement_ids) ? event.entitlement_ids : []) {
        const id = cleanId(raw);
        if (id)
            out.add(id.toLowerCase());
    }
    return [...out];
}
function looksLikePremiumSubscription(event) {
    const productId = cleanId(event.product_id).toLowerCase();
    const offeringId = cleanId(event.presented_offering_id).toLowerCase();
    const entitlements = entitlementIds(event);
    if (entitlements.includes('premium'))
        return true;
    if (/premium|monthly|month|yearly|annual|subscription|sub/.test(productId))
        return true;
    return /premium|subscription|sub/.test(offeringId);
}
function premiumPlanFromEvent(event) {
    const productId = cleanId(event.product_id).toLowerCase();
    if (/year|yearly|annual|12.?month/.test(productId))
        return 'yearly';
    return 'monthly';
}
function eventMs(raw) {
    const n = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(n) || n <= 0)
        return null;
    return Math.floor(n);
}
async function findExistingUserRef(tx, db, candidates) {
    const orderedCandidates = prioritizeUserCandidates(candidates);
    if (orderedCandidates.length === 0)
        return null;
    const stableCandidates = stableCandidateUserIds(orderedCandidates);
    const searchCandidates = stableCandidates.length > 0 ? stableCandidates : orderedCandidates;
    let uid = searchCandidates[0];
    let ref = db.collection('users').doc(uid);
    let snap = await tx.get(ref);
    for (const candidate of searchCandidates.slice(1)) {
        if (snap.exists)
            break;
        uid = candidate;
        ref = db.collection('users').doc(uid);
        snap = await tx.get(ref);
    }
    return { uid, ref, snap };
}
async function handlePremiumSubscriptionEvent(event, eventType, productId, res) {
    const candidates = candidateUserIds(event);
    if (candidates.length === 0) {
        res.status(400).send('Missing app_user_id');
        return;
    }
    const transactionId = cleanId(event.transaction_id ||
        event.original_transaction_id ||
        event.id ||
        `${eventType}_${event.event_timestamp_ms || Date.now()}_${candidates[0]}`);
    // При RENEWAL event.id уникален для каждого события; если отсутствует —
    // добавляем timestamp чтобы разные RENEWAL одной подписки не коллизировали.
    const eventId = cleanId(event.id)
        || (eventType === 'RENEWAL' || eventType === 'INITIAL_PURCHASE'
            ? `${eventType}_${transactionId}_${event.event_timestamp_ms || Date.now()}`
            : transactionId);
    const expiryMs = eventMs(event.expiration_at_ms);
    const purchasedMs = eventMs(event.purchased_at_ms);
    const now = Date.now();
    const plan = premiumPlanFromEvent(event);
    const periodType = cleanId(event.period_type).toUpperCase();
    const db = admin.firestore();
    const processedRef = db.collection('revenuecat_premium_events').doc(eventId);
    try {
        const out = await db.runTransaction(async (tx) => {
            const processedSnap = await tx.get(processedRef);
            if (processedSnap.exists) {
                return { updated: false, reason: 'duplicate' };
            }
            const match = await findExistingUserRef(tx, db, candidates);
            if (!match) {
                return { updated: false, reason: 'missing_user_candidate' };
            }
            const { uid, ref: userRef, snap: userSnap } = match;
            const progress = (userSnap.data()?.progress ?? {});
            const progressPlan = cleanId(progress.premium_plan).toLowerCase();
            const adminOverrideValue = cleanId(progress.admin_premium_override).toLowerCase();
            const legacyAdminVip = adminOverrideValue === 'true' || (progressPlan === 'admin_grant' && adminOverrideValue !== 'false');
            const activeEvent = PREMIUM_ACTIVE_EVENTS.has(eventType);
            const keepActiveEvent = PREMIUM_KEEP_ACTIVE_EVENTS.has(eventType);
            const inactiveEvent = PREMIUM_INACTIVE_EVENTS.has(eventType);
            const progressPatch = {
                premium_rc_product_id: productId,
                premium_rc_period_type: periodType,
                premium_rc_store: cleanId(event.store).toUpperCase(),
                premium_rc_environment: cleanId(event.environment).toUpperCase(),
                premium_rc_event_type: eventType,
                premium_rc_updated_at: String(now),
            };
            if (expiryMs != null)
                progressPatch.premium_rc_expiry_ms = String(expiryMs);
            if (purchasedMs != null)
                progressPatch.premium_rc_purchased_at_ms = String(purchasedMs);
            if (legacyAdminVip) {
                const legacyExpiryMs = eventMs(progress.premium_expiry);
                const legacyGrantAt = cleanId(progress.premium_admin_grant_at) || String(now);
                const legacyActive = legacyExpiryMs == null || legacyExpiryMs > now;
                progressPatch.vip_active = legacyActive ? 'true' : 'false';
                progressPatch.vip_plan = legacyActive ? 'admin_vip' : '';
                progressPatch.vip_from = cleanId(progress.vip_from) || legacyGrantAt;
                progressPatch.vip_until = legacyExpiryMs == null ? '0' : String(legacyExpiryMs);
                progressPatch.vip_admin_override = legacyActive ? 'true' : 'false';
                progressPatch.vip_admin_grant_at = cleanId(progress.vip_admin_grant_at) || legacyGrantAt;
                progressPatch.vip_migrated_from_admin_grant_at = String(now);
                progressPatch.admin_premium_override = 'false';
            }
            if (activeEvent || keepActiveEvent) {
                progressPatch.premium_plan = plan;
                progressPatch.premium_expiry = '0';
                progressPatch.had_premium_ever = '1';
                if (keepActiveEvent) {
                    progressPatch.premium_rc_cancelled_at = String(now);
                }
            }
            else if (inactiveEvent) {
                progressPatch.premium_plan = '';
                progressPatch.premium_expiry = String(expiryMs ?? now);
            }
            tx.set(processedRef, {
                uid,
                candidates,
                productId,
                eventId,
                eventType,
                periodType,
                store: cleanId(event.store),
                environment: cleanId(event.environment),
                transactionId,
                originalTransactionId: cleanId(event.original_transaction_id),
                purchasedAtMs: purchasedMs,
                expirationAtMs: expiryMs,
                eventTimestampMs: eventMs(event.event_timestamp_ms),
                userDocExists: userSnap.exists,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            tx.set(userRef, {
                progress: progressPatch,
                updatedAt: now,
                last_active_at: now,
            }, { merge: true });
            return {
                updated: true,
                uid,
                userDocExists: userSnap.exists,
                active: activeEvent || keepActiveEvent,
                migratedLegacyAdminVip: legacyAdminVip,
            };
        });
        res.status(200).json({ ok: true, kind: 'premium', ...out });
    }
    catch (error) {
        logger.error('revenuecat_premium_webhook_failed', error);
        res.status(500).send('Internal error');
    }
}
async function handleShardPurchaseEvent(event, eventType, productId, pack, res) {
    if (eventType !== 'NON_RENEWING_PURCHASE') {
        res.status(200).json({ ok: true, ignored: 'not_non_renewing_purchase' });
        return;
    }
    const transactionId = cleanId(event.transaction_id || event.original_transaction_id || event.id);
    const candidates = candidateUserIds(event);
    if (!transactionId || candidates.length === 0) {
        res.status(400).send('Missing transaction_id or app_user_id');
        return;
    }
    const db = admin.firestore();
    const processedRef = db.collection('revenuecat_shard_transactions').doc(transactionId);
    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    try {
        const out = await db.runTransaction(async (tx) => {
            const processedSnap = await tx.get(processedRef);
            if (processedSnap.exists) {
                return { granted: false, reason: 'duplicate' };
            }
            const match = await findExistingUserRef(tx, db, candidates);
            if (!match) {
                return { granted: false, reason: 'missing_user_candidate' };
            }
            const { uid, ref: userRef, snap: userSnap } = match;
            const before = parseShards(userSnap.data()?.shards);
            const after = before + pack.shards;
            tx.set(processedRef, {
                uid,
                productId,
                packId: pack.packId,
                shards: pack.shards,
                eventId: cleanId(event.id),
                eventType,
                store: cleanId(event.store),
                environment: cleanId(event.environment),
                purchasedAtMs: eventMs(event.purchased_at_ms),
                eventTimestampMs: eventMs(event.event_timestamp_ms),
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            tx.set(userRef, {
                shards: after,
                shards_updated_at_ms: now,
                shards_updated_op: 'earn',
                shards_updated_reason: 'shards_store_purchase',
                updatedAt: now,
            }, { merge: true });
            tx.set(userRef.collection('shard_log').doc(), {
                ts: nowIso,
                type: 'earn',
                amount: pack.shards,
                reason: 'shards_store_purchase',
                productId,
                packId: pack.packId,
                revenueCatTransactionId: transactionId,
                balanceBefore: before,
                balanceAfter: after,
            });
            return { granted: true, balanceAfter: after };
        });
        res.status(200).json({ ok: true, kind: 'shards', ...out });
    }
    catch (error) {
        logger.error('revenuecat_shards_webhook_failed', error);
        res.status(500).send('Internal error');
    }
}
exports.revenueCatShardsWebhook = (0, https_1.onRequest)({ region: REGION, secrets: [REVENUECAT_WEBHOOK_AUTH] }, async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method not allowed');
        return;
    }
    const body = req.body;
    const event = body?.event;
    const eventType = cleanId(event?.type).toUpperCase();
    const productId = cleanId(event?.product_id);
    if (!event || !eventType) {
        res.status(400).send('Bad request');
        return;
    }
    const expectedAuth = REVENUECAT_WEBHOOK_AUTH.value().trim();
    if (!expectedAuth || !authMatches(req.headers.authorization, expectedAuth)) {
        res.status(401).send('Unauthorized');
        return;
    }
    const pack = SHARD_PACKS_BY_PRODUCT_ID[productId];
    const premium = looksLikePremiumSubscription(event);
    if (!pack && !premium) {
        res.status(200).json({ ok: true, ignored: 'not_managed_product' });
        return;
    }
    if (premium) {
        await handlePremiumSubscriptionEvent(event, eventType, productId, res);
        return;
    }
    await handleShardPurchaseEvent(event, eventType, productId, pack, res);
});
exports.__revenueCatWebhookTestHooks = {
    candidateUserIds,
    isRevenueCatAnonymousId,
    looksLikePremiumSubscription,
    premiumPlanFromEvent,
    prioritizeUserCandidates,
    stableCandidateUserIds,
};
//# sourceMappingURL=revenuecat_shards.js.map