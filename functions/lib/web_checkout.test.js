"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const web_checkout_1 = require("./web_checkout");
describe('activationRewardForPlan', () => {
    it('monthly → 31 день', () => {
        expect((0, web_checkout_1.activationRewardForPlan)('monthly')).toEqual({ rewardDays: 31, rewardKind: 'days' });
    });
    it('yearly → 366 дней', () => {
        expect((0, web_checkout_1.activationRewardForPlan)('yearly')).toEqual({ rewardDays: 366, rewardKind: 'days' });
    });
    it('lifetime → бессрочный VIP', () => {
        expect((0, web_checkout_1.activationRewardForPlan)('lifetime')).toEqual({ rewardDays: 0, rewardKind: 'lifetime' });
    });
});
describe('generateActivationCode', () => {
    it('формат WEB-XXXXXXXXXX, совместим с promoCodeRedeem (CODE_RE), без похожих символов', () => {
        for (let i = 0; i < 50; i += 1) {
            const code = (0, web_checkout_1.generateActivationCode)();
            // Тот же контракт, что CODE_RE в promo_codes.ts: A-Z 0-9 _ - длиной 3..32.
            expect(code).toMatch(/^WEB-[A-HJ-NP-Z2-9]{10}$/);
            expect(code).not.toMatch(/[01IO]/);
            expect(code.length).toBeLessThanOrEqual(32);
        }
    });
    it('коды не повторяются', () => {
        const seen = new Set(Array.from({ length: 200 }, () => (0, web_checkout_1.generateActivationCode)()));
        expect(seen.size).toBe(200);
    });
});
//# sourceMappingURL=web_checkout.test.js.map