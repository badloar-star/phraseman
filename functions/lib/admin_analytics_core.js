"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REVENUECAT_GRACE_MS = exports.ANALYTICS_DEFINITION_VERSION = void 0;
exports.classifyActiveAccess = classifyActiveAccess;
exports.aggregateActiveAccess = aggregateActiveAccess;
exports.aggregateRevenueCatPeriod = aggregateRevenueCatPeriod;
exports.aggregateShardPeriod = aggregateShardPeriod;
exports.aggregateFunnelSignals = aggregateFunnelSignals;
exports.ANALYTICS_DEFINITION_VERSION = 'admin_v2_trustworthy_v1';
exports.REVENUECAT_GRACE_MS = 72 * 60 * 60 * 1000;
function text(value) {
    return String(value ?? '').trim();
}
function lower(value) {
    return text(value).toLowerCase();
}
function upper(value) {
    return text(value).toUpperCase();
}
function millis(value) {
    if (value == null || value === '')
        return 0;
    if (typeof value === 'number')
        return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
    if (typeof value === 'object') {
        const timestamp = value;
        if (typeof timestamp.toMillis === 'function')
            return Math.max(0, Math.floor(timestamp.toMillis() || 0));
        if (typeof timestamp.seconds === 'number')
            return Math.max(0, Math.floor(timestamp.seconds * 1000));
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
}
function trueFlag(value) {
    return ['true', '1', 'yes'].includes(lower(value));
}
function falseFlag(value) {
    return ['false', '0', 'no'].includes(lower(value));
}
function activeUntil(value, nowMs) {
    const until = millis(value);
    return until <= 0 || until > nowMs;
}
function storePlan(plan) {
    return ['monthly', 'yearly', 'annual', 'lifetime'].includes(plan);
}
function hasRevenueCatProvenance(progress) {
    return Boolean(text(progress.premium_rc_product_id)
        || text(progress.premium_rc_store)
        || millis(progress.premium_rc_updated_at)
        || millis(progress.premium_rc_purchased_at_ms)
        || millis(progress.premium_rc_expiry_ms));
}
function storeActive(progress, plan, nowMs) {
    if (!storePlan(plan) || !hasRevenueCatProvenance(progress))
        return false;
    const expiry = millis(progress.premium_expiry);
    if (expiry > 0)
        return expiry > nowMs;
    if (plan === 'lifetime')
        return true;
    const rcExpiry = millis(progress.premium_rc_expiry_ms);
    return rcExpiry > 0 && rcExpiry + exports.REVENUECAT_GRACE_MS >= nowMs;
}
function giftActive(progress, nowMs) {
    return millis(progress.intro_access_until_ms) > nowMs
        || millis(progress.loyalty_gift_until_ms) > nowMs;
}
function adminGrantActive(progress, plan, nowMs) {
    const override = lower(progress.admin_premium_override);
    const grant = override === 'true' || (plan === 'admin_grant' && override !== 'false');
    return grant && Boolean(plan) && activeUntil(progress.premium_expiry, nowMs);
}
function vipActive(progress, nowMs) {
    const plan = lower(progress.vip_plan);
    const active = trueFlag(progress.vip_active);
    const override = text(progress.vip_admin_override);
    const from = millis(progress.vip_from);
    const until = millis(progress.vip_until ?? progress.vip_expiry);
    const hasShape = Boolean(plan || active || override || from || until
        || text(progress.vip_admin_grant_at ?? progress.vip_grant_at));
    if (!hasShape || falseFlag(progress.vip_active) || falseFlag(progress.vip_admin_override))
        return false;
    if (!(active || trueFlag(progress.vip_admin_override) || plan))
        return false;
    return (from <= 0 || from <= nowMs) && (until <= 0 || until > nowMs);
}
function manualAccessActive(progress, plan, nowMs) {
    if (!plan || plan === 'null' || plan === 'undefined' || plan === 'admin_grant')
        return false;
    if (hasRevenueCatProvenance(progress))
        return false;
    return activeUntil(progress.premium_expiry, nowMs);
}
function classifyActiveAccess(row, nowMs = Date.now()) {
    if (row.identityHidden === true)
        return null;
    const progress = row.progress ?? {};
    const plan = lower(progress.premium_plan);
    if (storeActive(progress, plan, nowMs)) {
        if (upper(progress.premium_rc_period_type) === 'TRIAL') {
            return { kind: 'store_trial', storeBacked: true, activeTrial: true };
        }
        if (plan === 'lifetime')
            return { kind: 'store_lifetime', storeBacked: true, activeTrial: false };
        return { kind: 'store_subscription', storeBacked: true, activeTrial: false };
    }
    if (giftActive(progress, nowMs))
        return { kind: 'gift', storeBacked: false, activeTrial: false };
    if (adminGrantActive(progress, plan, nowMs))
        return { kind: 'admin_grant', storeBacked: false, activeTrial: false };
    if (vipActive(progress, nowMs))
        return { kind: 'vip', storeBacked: false, activeTrial: false };
    if (manualAccessActive(progress, plan, nowMs))
        return { kind: 'manual_or_unknown', storeBacked: false, activeTrial: false };
    return null;
}
function aggregateActiveAccess(rows, nowMs = Date.now()) {
    const byKind = {
        store_trial: 0,
        store_subscription: 0,
        store_lifetime: 0,
        gift: 0,
        admin_grant: 0,
        vip: 0,
        manual_or_unknown: 0,
    };
    let hiddenUsersExcluded = 0;
    for (const row of rows) {
        if (row.identityHidden === true)
            hiddenUsersExcluded += 1;
        const classified = classifyActiveAccess(row, nowMs);
        if (classified)
            byKind[classified.kind] += 1;
    }
    const activeAccessTotal = Object.values(byKind).reduce((sum, count) => sum + count, 0);
    return {
        activeAccessTotal,
        storeBackedTotal: byKind.store_trial + byKind.store_subscription + byKind.store_lifetime,
        activeTrials: byKind.store_trial,
        scannedUsers: rows.length,
        hiddenUsersExcluded,
        byKind,
    };
}
function eventIdentity(row, fallback) {
    return text(row.eventId) || text(row.id) || text(row.transactionId) || `row:${fallback}`;
}
function productionEnvironment(value) {
    const environment = upper(value);
    if (environment === 'PRODUCTION')
        return 'production';
    if (environment === 'SANDBOX')
        return 'sandbox';
    return 'unknown';
}
function aggregateRevenueCatPeriod(rows) {
    const seen = new Set();
    const byType = {};
    const excluded = { sandbox: 0, unknownEnvironment: 0, duplicates: 0 };
    let productionEvents = 0;
    let newPurchases = 0;
    let renewals = 0;
    let trialStarts = 0;
    let refunds = 0;
    let trialLifecycleEvents = 0;
    rows.forEach((row, index) => {
        const id = eventIdentity(row, index);
        if (seen.has(id)) {
            excluded.duplicates += 1;
            return;
        }
        seen.add(id);
        const environment = productionEnvironment(row.environment);
        if (environment === 'sandbox') {
            excluded.sandbox += 1;
            return;
        }
        if (environment === 'unknown') {
            excluded.unknownEnvironment += 1;
            return;
        }
        productionEvents += 1;
        const eventType = upper(row.eventType) || 'UNKNOWN';
        const periodType = upper(row.periodType);
        byType[eventType] = (byType[eventType] ?? 0) + 1;
        if (eventType === 'INITIAL_PURCHASE' || eventType === 'NON_RENEWING_PURCHASE')
            newPurchases += 1;
        if (eventType === 'RENEWAL')
            renewals += 1;
        if (eventType === 'REFUND')
            refunds += 1;
        if (periodType === 'TRIAL')
            trialLifecycleEvents += 1;
        if (eventType === 'INITIAL_PURCHASE' && periodType === 'TRIAL')
            trialStarts += 1;
    });
    return { productionEvents, newPurchases, renewals, trialStarts, refunds, trialLifecycleEvents, byType, excluded };
}
function aggregateShardPeriod(rows) {
    const seen = new Set();
    const excluded = { sandbox: 0, unknownEnvironment: 0, duplicates: 0 };
    let productionPurchases = 0;
    rows.forEach((row, index) => {
        const id = eventIdentity(row, index);
        if (seen.has(id)) {
            excluded.duplicates += 1;
            return;
        }
        seen.add(id);
        const environment = productionEnvironment(row.environment);
        if (environment === 'production')
            productionPurchases += 1;
        else if (environment === 'sandbox')
            excluded.sandbox += 1;
        else
            excluded.unknownEnvironment += 1;
    });
    return { productionPurchases, excluded };
}
function aggregateFunnelSignals(rows) {
    const events = { shown: 0, ctaClick: 0, trialStarted: 0, purchaseCompleted: 0, close: 0, purchaseCancelled: 0 };
    let excludedDevEvents = 0;
    for (const row of rows) {
        if (row.dev === true) {
            excludedDevEvents += 1;
            continue;
        }
        const step = lower(row.step);
        if (step === 'shown')
            events.shown += 1;
        else if (step === 'cta_click')
            events.ctaClick += 1;
        else if (step === 'trial_started')
            events.trialStarted += 1;
        else if (step === 'purchase_completed')
            events.purchaseCompleted += 1;
        else if (step === 'close')
            events.close += 1;
        else if (step === 'purchase_cancelled')
            events.purchaseCancelled += 1;
    }
    const totalEvents = Object.values(events).reduce((sum, count) => sum + count, 0);
    return {
        totalEvents,
        events,
        purchaseSignalRate: events.shown > 0 ? events.purchaseCompleted / events.shown : null,
        excludedDevEvents,
    };
}
//# sourceMappingURL=admin_analytics_core.js.map