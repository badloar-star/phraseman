"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const admin_analytics_core_1 = require("./admin_analytics_core");
const NOW = Date.UTC(2026, 6, 12, 12);
const DAY = 24 * 60 * 60 * 1000;
function user(progress, extra = {}) {
    return { id: 'user', progress, ...extra };
}
describe('admin analytics active access definitions', () => {
    test('classifies an active RevenueCat subscription as store-backed', () => {
        expect((0, admin_analytics_core_1.classifyActiveAccess)(user({
            premium_plan: 'yearly',
            premium_rc_product_id: 'phraseman_yearly',
            premium_rc_expiry_ms: String(NOW + DAY),
        }), NOW)?.kind).toBe('store_subscription');
    });
    test('keeps an expired RevenueCat subscription only during the 72 hour grace period', () => {
        const inGrace = user({
            premium_plan: 'monthly',
            premium_rc_product_id: 'phraseman_monthly',
            premium_rc_expiry_ms: String(NOW - 2 * DAY),
        });
        const expired = user({
            premium_plan: 'monthly',
            premium_rc_product_id: 'phraseman_monthly',
            premium_rc_expiry_ms: String(NOW - 4 * DAY),
        });
        expect((0, admin_analytics_core_1.classifyActiveAccess)(inGrace, NOW)?.kind).toBe('store_subscription');
        expect((0, admin_analytics_core_1.classifyActiveAccess)(expired, NOW)).toBeNull();
    });
    test('does not grant an expiry-less recurring RevenueCat subscription forever', () => {
        expect((0, admin_analytics_core_1.classifyActiveAccess)(user({
            premium_plan: 'monthly',
            premium_rc_product_id: 'phraseman_monthly',
        }), NOW)).toBeNull();
        expect((0, admin_analytics_core_1.classifyActiveAccess)(user({
            premium_plan: 'lifetime',
            premium_rc_product_id: 'phraseman_lifetime',
        }), NOW)?.kind).toBe('store_lifetime');
    });
    test('separates active store trial and lifetime access', () => {
        expect((0, admin_analytics_core_1.classifyActiveAccess)(user({
            premium_plan: 'yearly',
            premium_rc_product_id: 'yearly',
            premium_rc_period_type: 'TRIAL',
            premium_rc_expiry_ms: String(NOW + DAY),
        }), NOW)?.kind).toBe('store_trial');
        expect((0, admin_analytics_core_1.classifyActiveAccess)(user({
            premium_plan: 'lifetime',
            premium_rc_product_id: 'lifetime',
            premium_expiry: '0',
        }), NOW)?.kind).toBe('store_lifetime');
    });
    test('separates gift, admin grant, vip and stale manual access', () => {
        expect((0, admin_analytics_core_1.classifyActiveAccess)(user({ intro_access_until_ms: String(NOW + DAY) }), NOW)?.kind).toBe('gift');
        expect((0, admin_analytics_core_1.classifyActiveAccess)(user({ premium_plan: 'admin_grant', admin_premium_override: 'true' }), NOW)?.kind).toBe('admin_grant');
        expect((0, admin_analytics_core_1.classifyActiveAccess)(user({ vip_plan: 'referral_vip', vip_active: 'true', vip_until: String(NOW + DAY) }), NOW)?.kind).toBe('vip');
        expect((0, admin_analytics_core_1.classifyActiveAccess)(user({ premium_plan: 'yearly', premium_expiry: '0' }), NOW)?.kind).toBe('manual_or_unknown');
    });
    test('honours revocation, expiry, hidden identities and store priority over vip', () => {
        expect((0, admin_analytics_core_1.classifyActiveAccess)(user({ vip_plan: 'vip', vip_active: 'false', vip_until: String(NOW + DAY) }), NOW)).toBeNull();
        expect((0, admin_analytics_core_1.classifyActiveAccess)(user({ vip_plan: 'vip', vip_active: 'true', vip_until: String(NOW - 1) }), NOW)).toBeNull();
        expect((0, admin_analytics_core_1.classifyActiveAccess)(user({ vip_plan: 'vip', vip_active: 'true' }, { identityHidden: true }), NOW)).toBeNull();
        expect((0, admin_analytics_core_1.classifyActiveAccess)(user({
            premium_plan: 'monthly',
            premium_rc_product_id: 'monthly',
            premium_rc_expiry_ms: String(NOW + DAY),
            vip_plan: 'vip',
            vip_active: 'true',
        }), NOW)?.kind).toBe('store_subscription');
    });
    test('produces an exclusive decomposition that reconciles to the total', () => {
        const result = (0, admin_analytics_core_1.aggregateActiveAccess)([
            user({ premium_plan: 'monthly', premium_rc_product_id: 'monthly', premium_rc_expiry_ms: String(NOW + DAY) }, { id: 'store' }),
            user({ vip_plan: 'vip', vip_active: 'true' }, { id: 'vip' }),
            user({ loyalty_gift_until_ms: String(NOW + DAY) }, { id: 'gift' }),
            user({}, { id: 'free' }),
        ], NOW);
        expect(result.activeAccessTotal).toBe(3);
        expect(Object.values(result.byKind).reduce((sum, value) => sum + value, 0)).toBe(result.activeAccessTotal);
        expect(result.scannedUsers).toBe(4);
    });
});
describe('admin analytics period event definitions', () => {
    test('counts production RevenueCat activity and only initial trial purchases as trial starts', () => {
        const result = (0, admin_analytics_core_1.aggregateRevenueCatPeriod)([
            { id: 'trial', environment: 'PRODUCTION', eventType: 'INITIAL_PURCHASE', periodType: 'TRIAL' },
            { id: 'renewal', environment: 'PRODUCTION', eventType: 'RENEWAL', periodType: 'NORMAL' },
            { id: 'cancel', environment: 'PRODUCTION', eventType: 'CANCELLATION', periodType: 'TRIAL' },
            { id: 'nonrenew', environment: 'PRODUCTION', eventType: 'NON_RENEWING_PURCHASE' },
            { id: 'refund', environment: 'PRODUCTION', eventType: 'REFUND' },
            { id: 'sandbox', environment: 'SANDBOX', eventType: 'INITIAL_PURCHASE', periodType: 'TRIAL' },
            { id: 'unknown', environment: '', eventType: 'INITIAL_PURCHASE' },
            { id: 'trial', environment: 'PRODUCTION', eventType: 'INITIAL_PURCHASE', periodType: 'TRIAL' },
        ]);
        expect(result.newPurchases).toBe(2);
        expect(result.initialSubscriptionEvents).toBe(1);
        expect(result.nonRenewingPurchaseEvents).toBe(1);
        expect(result.renewals).toBe(1);
        expect(result.trialStarts).toBe(1);
        expect(result.refunds).toBe(1);
        expect(result.trialLifecycleEvents).toBe(2);
        expect(result.excluded).toEqual({ sandbox: 1, unknownEnvironment: 1, duplicates: 1 });
    });
    test('counts only production shard purchases', () => {
        const result = (0, admin_analytics_core_1.aggregateShardPeriod)([
            { id: 'prod', environment: 'PRODUCTION' },
            { id: 'sandbox', environment: 'SANDBOX' },
            { id: 'unknown', environment: '' },
            { id: 'prod', environment: 'PRODUCTION' },
        ]);
        expect(result.productionPurchases).toBe(1);
        expect(result.excluded).toEqual({ sandbox: 1, unknownEnvironment: 1, duplicates: 1 });
    });
    test('keeps the consented funnel as raw non-dev events', () => {
        const result = (0, admin_analytics_core_1.aggregateFunnelSignals)([
            { step: 'shown' }, { step: 'shown' }, { step: 'shown', dev: true },
            { step: 'cta_click' }, { step: 'purchase_completed' }, { step: 'trial_started' },
        ]);
        expect(result.events).toEqual({ shown: 2, ctaClick: 1, trialStarted: 1, purchaseCompleted: 1, close: 0, purchaseCancelled: 0 });
        expect(result.purchaseSignalRate).toBe(0.5);
        expect(result.excludedDevEvents).toBe(1);
    });
    test('returns no ratio when there are no shown events', () => {
        expect((0, admin_analytics_core_1.aggregateFunnelSignals)([{ step: 'purchase_completed' }]).purchaseSignalRate).toBeNull();
    });
});
//# sourceMappingURL=admin_analytics_core.test.js.map