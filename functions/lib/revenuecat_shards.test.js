"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const revenuecat_shards_1 = require("./revenuecat_shards");
const { candidateUserIds, isRevenueCatAnonymousId, looksLikePremiumSubscription, premiumPlanFromEvent, prioritizeUserCandidates, stableCandidateUserIds, } = revenuecat_shards_1.__revenueCatWebhookTestHooks;
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
    it('recognizes RevenueCat anonymous ids while preserving them as a fallback target', () => {
        const anonymous = '$RCAnonymousID:98b700338b6e43e9801338d94a164c35';
        const stable = 'df7b4820-8f3c-486e-8570-ac6b66ce6d98';
        expect(isRevenueCatAnonymousId(anonymous)).toBe(true);
        expect(isRevenueCatAnonymousId(stable)).toBe(false);
        expect(stableCandidateUserIds([anonymous])).toEqual([]);
        expect(stableCandidateUserIds([anonymous, stable])).toEqual([stable]);
        expect(prioritizeUserCandidates([anonymous])).toEqual([anonymous]);
    });
    it('prioritizes stable app user ids over RevenueCat aliases', () => {
        const anonymousA = '$RCAnonymousID:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
        const anonymousB = '$RCAnonymousID:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
        const stable = '3b64231e-e333-4b9b-b9e9-b2c4be8e7a57';
        const candidates = candidateUserIds({
            app_user_id: anonymousA,
            original_app_user_id: anonymousB,
            aliases: [stable, anonymousA],
        });
        expect(candidates).toEqual([anonymousA, anonymousB, stable]);
        expect(prioritizeUserCandidates(candidates)).toEqual([stable, anonymousA, anonymousB]);
    });
    it('uses Phraseman stable id attributes before RevenueCat anonymous ids', () => {
        const anonymous = '$RCAnonymousID:cccccccccccccccccccccccccccccccc';
        const stable = 'stable-user-123';
        const candidates = candidateUserIds({
            app_user_id: anonymous,
            original_app_user_id: anonymous,
            aliases: [anonymous],
            subscriber_attributes: {
                phraseman_uid: {
                    value: stable,
                    updated_at_ms: 1710000000000,
                },
            },
        });
        expect(candidates).toEqual([stable, anonymous]);
        expect(prioritizeUserCandidates(candidates)).toEqual([stable, anonymous]);
    });
    it('does not drop paid Premium events just because only an anonymous RevenueCat id is present', () => {
        const source = fs_1.default.readFileSync(path_1.default.join(process.cwd(), 'src', 'revenuecat_shards.ts'), 'utf8');
        expect(source).not.toContain('anonymous_only_unmatched');
        expect(source).not.toContain('allowAnonymousOnly: false');
    });
});
//# sourceMappingURL=revenuecat_shards.test.js.map