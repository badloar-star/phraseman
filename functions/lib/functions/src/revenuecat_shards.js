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
exports.shouldDeactivateOnInactiveEvent = shouldDeactivateOnInactiveEvent;
exports.isSandboxEvent = isSandboxEvent;
exports.transferTargetIds = transferTargetIds;
exports.transferSourceIds = transferSourceIds;
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
    'NON_RENEWING_PURCHASE', // lifetime / one-time non-consumable (e.g. phraseman_premium_lifetime_v1)
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
function normalizeLifecycleReason(raw) {
    if (typeof raw !== 'string')
        return '';
    const reason = raw.trim().toUpperCase();
    return reason.length <= 64 && /^[A-Z][A-Z0-9_]*$/.test(reason) ? reason : '';
}
function revenueCatLifecycleReasonFields(event, eventType) {
    if (eventType === 'CANCELLATION') {
        const cancelReason = normalizeLifecycleReason(event.cancel_reason);
        return cancelReason ? { cancelReason } : {};
    }
    if (eventType === 'EXPIRATION') {
        const expirationReason = normalizeLifecycleReason(event.expiration_reason);
        return expirationReason ? { expirationReason } : {};
    }
    return {};
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
    if (/lifetime|forever|one.?time|onetime|perpetual/.test(productId))
        return 'lifetime';
    if (/year|yearly|annual|12.?month/.test(productId))
        return 'yearly';
    return 'monthly';
}
/**
 * Деактивировать ли Premium на «inactive»-событии (EXPIRATION / REFUND).
 *
 * REFUND — всегда да (вернули деньги, доступ снять даже у lifetime). EXPIRATION на
 * lifetime — НЕТ: non-renewing «Навсегда» не может законно истечь, и спурьёзный
 * EXPIRATION иначе молча даунгрейднул бы платящего lifetime-клиента до free (аудит #24).
 * Чистая функция — тестируемая в отрыве от Firestore-транзакции.
 */
function shouldDeactivateOnInactiveEvent(eventType, plan) {
    if (eventType === 'EXPIRATION' && plan === 'lifetime')
        return false;
    return true;
}
function eventMs(raw) {
    const n = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(n) || n <= 0)
        return null;
    return Math.floor(n);
}
/**
 * Sandbox-события RevenueCat (TestFlight, sandbox-аккаунты App Store, Play Console
 * testing) НЕ должны писать реальный premium / осколки в production Firestore.
 * Иначе тестер получает пожизненный платный доступ на проде, а sandbox-покупка
 * лояльности зачисляет настоящие осколки.
 *
 * Фильтруем только ЯВНЫЙ SANDBOX (RC шлёт 'SANDBOX' для тестовых событий). Пустой
 * environment не блокируем — это сохраняет совместимость с legacy-вебхуками /
 * тестами, где поле не выставлено, и не превращает фильтр в fail-closed (когда RC
 * по какой-то причине не пришлёт environment вообще, реальные покупки продолжат
 * процессироваться).
 */
function isSandboxEvent(event) {
    return cleanId(event.environment).toUpperCase() === 'SANDBOX';
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
                // EXPIRATION на lifetime НЕ деактивируем (см. shouldDeactivateOnInactiveEvent):
                // спурьёзный EXPIRATION иначе молча даунгрейднул бы платящего lifetime до free.
                // REFUND снимает доступ как обычно (вернули деньги).
                if (shouldDeactivateOnInactiveEvent(eventType, plan)) {
                    progressPatch.premium_plan = '';
                    progressPatch.premium_expiry = String(expiryMs ?? now);
                }
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
                ...revenueCatLifecycleReasonFields(event, eventType),
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
    // REFUND consumable-покупки осколков обрабатывается отдельно: ищем оригинальную
    // транзакцию начисления и списываем ровно ту сумму, что была начислена (не из
    // pack — RC шлёт REFUND с тем же product_id, но идемпотентность ведём по
    // original_transaction_id оригинальной покупки).
    if (eventType === 'REFUND') {
        await handleShardRefundEvent(event, productId, res);
        return;
    }
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
/**
 * REFUND осколков (consumable). Раньше REFUND-вебхуки для shard-продуктов отдавали
 * 200 ignored — пользователь возвращал деньги, но осколки оставались. Прямая утечка
 * дохода: за возвращённую покупку он мог тратить осколки на премиум-наборы.
 *
 * Логика: идемпотентность по eventId; находим оригинальную транзакцию начисления
 * в `revenuecat_shard_transactions` по original_transaction_id (или transaction_id);
 * если уже размечена как рефанд — не списываем повторно; иначе уменьшаем баланс на
 * ту сумму, что была начислена (clamp на 0 — баланс не уходит в минус), пишем
 * `shards_refund_marker` и запись в shard_log.
 */
async function handleShardRefundEvent(event, productId, res) {
    const originalTxId = cleanId(event.original_transaction_id || event.transaction_id);
    if (!originalTxId) {
        res.status(400).send('Missing original_transaction_id for REFUND');
        return;
    }
    const eventId = cleanId(event.id) || `REFUND_${originalTxId}_${event.event_timestamp_ms || Date.now()}`;
    const db = admin.firestore();
    const refundRef = db.collection('revenuecat_shard_refunds').doc(eventId);
    const originalRef = db.collection('revenuecat_shard_transactions').doc(originalTxId);
    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    try {
        const out = await db.runTransaction(async (tx) => {
            const refundSnap = await tx.get(refundRef);
            if (refundSnap.exists) {
                return { refunded: false, reason: 'duplicate' };
            }
            const originalSnap = await tx.get(originalRef);
            if (!originalSnap.exists) {
                // Нет оригинала — невозможно знать, сколько списывать. Маркируем рефанд как
                // обработанный, чтобы повторные доставки не висели, и логируем для аудита.
                tx.set(refundRef, {
                    eventId,
                    originalTransactionId: originalTxId,
                    productId,
                    reason: 'original_not_found',
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                return { refunded: false, reason: 'original_not_found' };
            }
            const original = originalSnap.data() ?? {};
            const refundedAlready = original.refundedAt != null;
            if (refundedAlready) {
                tx.set(refundRef, {
                    eventId,
                    originalTransactionId: originalTxId,
                    productId,
                    reason: 'already_refunded',
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                return { refunded: false, reason: 'already_refunded' };
            }
            const uid = cleanId(original.uid);
            const grantedShards = parseShards(original.shards);
            if (!uid || grantedShards <= 0) {
                tx.set(refundRef, {
                    eventId,
                    originalTransactionId: originalTxId,
                    productId,
                    reason: 'invalid_original',
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                return { refunded: false, reason: 'invalid_original' };
            }
            const userRef = db.collection('users').doc(uid);
            const userSnap = await tx.get(userRef);
            const before = parseShards(userSnap.data()?.shards);
            // Clamp на 0 — пользователь мог потратить часть/все осколки до рефанда.
            // Бухгалтерски корректнее иначе (минус-баланс), но в текущей системе
            // отрицательные осколки нигде не предусмотрены и поломают UI/гейты.
            const after = Math.max(0, before - grantedShards);
            const actuallyDeducted = before - after;
            tx.set(refundRef, {
                eventId,
                originalTransactionId: originalTxId,
                productId,
                uid,
                grantedShards,
                balanceBefore: before,
                balanceAfter: after,
                actuallyDeducted,
                environment: cleanId(event.environment),
                store: cleanId(event.store),
                eventTimestampMs: eventMs(event.event_timestamp_ms),
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            tx.set(originalRef, {
                refundedAt: now,
                refundEventId: eventId,
                refundedShards: actuallyDeducted,
            }, { merge: true });
            tx.set(userRef, {
                shards: after,
                shards_updated_at_ms: now,
                shards_updated_op: 'spend',
                shards_updated_reason: 'shards_store_refund',
                updatedAt: now,
            }, { merge: true });
            tx.set(userRef.collection('shard_log').doc(), {
                ts: nowIso,
                type: 'spend',
                amount: actuallyDeducted,
                reason: 'shards_store_refund',
                productId,
                revenueCatOriginalTransactionId: originalTxId,
                revenueCatRefundEventId: eventId,
                grantedShards,
                balanceBefore: before,
                balanceAfter: after,
            });
            return { refunded: true, deducted: actuallyDeducted, balanceAfter: after };
        });
        res.status(200).json({ ok: true, kind: 'shards_refund', ...out });
    }
    catch (error) {
        logger.error('revenuecat_shards_refund_webhook_failed', error);
        res.status(500).send('Internal error');
    }
}
// ── TRANSFER: anonymous → stable_id entitlement move (closes the "premium written
//    to an anonymous RC id" gap, scenario #13). When a purchase happened before
//    Purchases.logIn(stable_id), premium landed on users/{$RCAnonymousID}. After
//    login RevenueCat fires TRANSFER with transferred_from (anon ids) → transferred_to
//    (the stable_id). We move any premium block to the recipient and deactivate the
//    donor, so the paying user sees premium on their real account. ────────────────
const PREMIUM_PROGRESS_KEYS = [
    'premium_plan',
    'premium_expiry',
    'premium_rc_product_id',
    'premium_rc_period_type',
    'premium_rc_store',
    'premium_rc_environment',
    'premium_rc_event_type',
    'premium_rc_updated_at',
    'premium_rc_expiry_ms',
    'premium_rc_purchased_at_ms',
    'premium_rc_cancelled_at',
    'had_premium_ever',
];
function idList(raw) {
    const out = new Set();
    for (const v of Array.isArray(raw) ? raw : []) {
        const id = cleanId(v);
        if (id)
            out.add(id);
    }
    return [...out];
}
/** Recipients of a transfer: prefer stable (non-anonymous) ids. */
function transferTargetIds(event) {
    return stableCandidateUserIds(idList(event.transferred_to));
}
/** Donors of a transfer (the ids losing the entitlement). */
function transferSourceIds(event) {
    return idList(event.transferred_from);
}
/** Reads the active store-premium block from a donor doc, if any. */
function readDonorPremiumBlock(progress, now) {
    const plan = cleanId(progress.premium_plan).toLowerCase();
    // Lifetime — это законный store-план (NON_RENEWING_PURCHASE phraseman_premium_lifetime_v1,
    // см. premiumPlanFromEvent). Без него TRANSFER от анонимного RC-id (купил «Навсегда»
    // до Purchases.logIn) возвращал null → доступ исчезал у реального аккаунта после логина.
    const isStorePlan = plan === 'monthly' || plan === 'yearly' || plan === 'annual' || plan === 'lifetime';
    if (!isStorePlan)
        return null;
    const expiryMs = eventMs(progress.premium_expiry);
    const rcExpiryMs = eventMs(progress.premium_rc_expiry_ms);
    // Lifetime по определению бессрочный (premium_expiry='0'), так что отдельный guard:
    // в общем случае активность = expiry открытый или ещё впереди.
    const active = plan === 'lifetime'
        || (expiryMs == null || expiryMs <= 0 || expiryMs > now)
        || (rcExpiryMs != null && rcExpiryMs > now);
    if (!active)
        return null;
    const block = {};
    for (const key of PREMIUM_PROGRESS_KEYS) {
        const v = cleanId(progress[key]);
        if (v)
            block[key] = v;
    }
    block.premium_plan = plan === 'annual' ? 'yearly' : plan;
    block.had_premium_ever = '1';
    return block;
}
async function handleTransferEvent(event, eventType, res) {
    const targets = transferTargetIds(event);
    const sources = transferSourceIds(event);
    if (targets.length === 0 || sources.length === 0) {
        res.status(200).json({ ok: true, kind: 'transfer', ignored: 'missing_transfer_ids' });
        return;
    }
    const db = admin.firestore();
    const now = Date.now();
    const eventId = cleanId(event.id) || `TRANSFER_${event.event_timestamp_ms || now}_${targets[0]}`;
    const processedRef = db.collection('revenuecat_premium_events').doc(eventId);
    try {
        const out = await db.runTransaction(async (tx) => {
            const processedSnap = await tx.get(processedRef);
            if (processedSnap.exists)
                return { moved: false, reason: 'duplicate' };
            // Find a donor doc that actually holds active store premium.
            let premiumBlock = null;
            let donorId = '';
            for (const src of sources) {
                const snap = await tx.get(db.collection('users').doc(src));
                if (!snap.exists)
                    continue;
                const progress = (snap.data()?.progress ?? {});
                const block = readDonorPremiumBlock(progress, now);
                if (block) {
                    premiumBlock = block;
                    donorId = src;
                    break;
                }
            }
            // Recipient = first stable target that already has a user doc (the real account).
            let recipientId = '';
            for (const t of targets) {
                const snap = await tx.get(db.collection('users').doc(t));
                if (snap.exists) {
                    recipientId = t;
                    break;
                }
            }
            if (!recipientId)
                recipientId = targets[0];
            tx.set(processedRef, {
                eventId,
                eventType,
                transferredFrom: sources,
                transferredTo: targets,
                donorId,
                recipientId,
                movedPremium: !!premiumBlock,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            if (!premiumBlock)
                return { moved: false, reason: 'no_active_donor_premium', recipientId };
            // Move premium to the recipient.
            tx.set(db.collection('users').doc(recipientId), {
                progress: { ...premiumBlock, premium_rc_event_type: 'TRANSFER', premium_rc_updated_at: String(now) },
                updatedAt: now,
                last_active_at: now,
            }, { merge: true });
            // Deactivate the donor (no dup premium across two docs).
            if (donorId && donorId !== recipientId) {
                tx.set(db.collection('users').doc(donorId), {
                    progress: { premium_plan: '', premium_expiry: String(now), premium_rc_event_type: 'TRANSFER_OUT', premium_rc_updated_at: String(now) },
                    updatedAt: now,
                }, { merge: true });
            }
            return { moved: true, recipientId, donorId };
        });
        res.status(200).json({ ok: true, kind: 'transfer', ...out });
    }
    catch (error) {
        logger.error('revenuecat_transfer_webhook_failed', error);
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
    // Sandbox-события (TestFlight / sandbox App Store / Play Console testing) НЕ
    // должны изменять production Firestore: иначе тестер получает реальный premium
    // на бою, а sandbox-«покупка» осколков зачисляет настоящую валюту.
    if (isSandboxEvent(event)) {
        logger.info('revenuecat_webhook_sandbox_ignored', { eventType, productId, environment: cleanId(event.environment) });
        res.status(200).json({ ok: true, ignored: 'sandbox_environment', environment: cleanId(event.environment) });
        return;
    }
    // TRANSFER moves entitlements between app_user_ids (anonymous → stable_id after
    // login). It carries no product_id, so handle it before the premium/shard routing.
    if (eventType === 'TRANSFER') {
        await handleTransferEvent(event, eventType, res);
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
    transferTargetIds,
    transferSourceIds,
    revenueCatLifecycleReasonFields,
    handleTransferEvent,
};
//# sourceMappingURL=revenuecat_shards.js.map