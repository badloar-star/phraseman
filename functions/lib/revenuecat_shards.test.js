"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const revenuecat_shards_1 = require("./revenuecat_shards");
const { looksLikePremiumSubscription, premiumPlanFromEvent } = revenuecat_shards_1.__revenueCatWebhookTestHooks;
describe('RevenueCat webhook premium matching', () => {
    it('accepts explicit premium entitlement events', () => {
        expect(looksLikePremiumSubscription({
            type: 'INITIAL_PURCHASE',
            product_id: 'store_sku_123',
            entitlement_ids: ['premium'],
        })).toBe(true);
    });
    it('accepts premium-like subscription product ids and infers plan', () => {
        const yearly = { product_id: 'phraseman_premium_yearly' };
        const monthly = { product_id: 'phraseman_premium_monthly' };
        expect(looksLikePremiumSubscription(yearly)).toBe(true);
        expect(premiumPlanFromEvent(yearly)).toBe('yearly');
        expect(looksLikePremiumSubscription(monthly)).toBe(true);
        expect(premiumPlanFromEvent(monthly)).toBe('monthly');
    });
    it('does not classify shard products or unknown products as premium', () => {
        expect(looksLikePremiumSubscription({
            type: 'NON_RENEWING_PURCHASE',
            product_id: 'phraseman_shards_80',
        })).toBe(false);
        expect(looksLikePremiumSubscription({
            type: 'INITIAL_PURCHASE',
            product_id: 'some_future_consumable_pack',
        })).toBe(false);
    });
    it('accepts premium-like offering ids when product id is opaque', () => {
        expect(looksLikePremiumSubscription({
            type: 'INITIAL_PURCHASE',
            product_id: 'sku_001',
            presented_offering_id: 'premium',
        })).toBe(true);
    });
});
//# sourceMappingURL=revenuecat_shards.test.js.map