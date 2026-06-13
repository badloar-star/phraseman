"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const referral_1 = require("./referral");
const DAY = 24 * 60 * 60 * 1000;
const NOW = 1700000000000; // фиксированный «сейчас» для детерминизма
describe('vipUntilFromProgress', () => {
    it('returns 0 for empty/missing progress', () => {
        expect((0, referral_1.vipUntilFromProgress)(undefined)).toBe(0);
        expect((0, referral_1.vipUntilFromProgress)({})).toBe(0);
        expect((0, referral_1.vipUntilFromProgress)({ vip_until: '0' })).toBe(0);
        expect((0, referral_1.vipUntilFromProgress)({ vip_until: 'abc' })).toBe(0);
    });
    it('parses numeric and string ms', () => {
        expect((0, referral_1.vipUntilFromProgress)({ vip_until: NOW })).toBe(NOW);
        expect((0, referral_1.vipUntilFromProgress)({ vip_until: String(NOW) })).toBe(NOW);
    });
    it('falls back to legacy vip_expiry when vip_until absent', () => {
        expect((0, referral_1.vipUntilFromProgress)({ vip_expiry: NOW })).toBe(NOW);
    });
    it('prefers vip_until over vip_expiry', () => {
        expect((0, referral_1.vipUntilFromProgress)({ vip_until: NOW, vip_expiry: 1 })).toBe(NOW);
    });
});
describe('stackVipUntilMs — «копить на потом»', () => {
    it('grants 7 days from now when no existing VIP window', () => {
        expect((0, referral_1.stackVipUntilMs)(0, NOW, 7)).toBe(NOW + 7 * DAY);
    });
    it('stacks on top of a future VIP window (does not burn existing days)', () => {
        const existing = NOW + 3 * DAY; // ещё 3 дня осталось
        // ключевой инвариант: новые 7 дней добавляются к концу, итого 10 дней от now
        expect((0, referral_1.stackVipUntilMs)(existing, NOW, 7)).toBe(NOW + 10 * DAY);
    });
    it('treats an expired window as if starting from now', () => {
        const expired = NOW - 5 * DAY;
        expect((0, referral_1.stackVipUntilMs)(expired, NOW, 7)).toBe(NOW + 7 * DAY);
    });
    it('is associative across multiple friends claimed in one call', () => {
        // 3 друга подряд → 21 день от now
        let until = 0;
        for (let i = 0; i < 3; i += 1)
            until = (0, referral_1.stackVipUntilMs)(until, NOW, 7);
        expect(until).toBe(NOW + 21 * DAY);
    });
    it('stacking already-active referral window keeps accumulating', () => {
        // первый клик дал 7 дней; ещё один друг qualified → +7 = 14 дней
        const afterFirst = (0, referral_1.stackVipUntilMs)(0, NOW, 7); // NOW + 7d
        // второй клик чуть позже (now+1h), окно ещё открыто → стакаем к концу
        const later = NOW + 60 * 60 * 1000;
        expect((0, referral_1.stackVipUntilMs)(afterFirst, later, 7)).toBe(afterFirst + 7 * DAY);
    });
    it('ignores negative/zero day grants safely', () => {
        expect((0, referral_1.stackVipUntilMs)(0, NOW, 0)).toBe(NOW);
        expect((0, referral_1.stackVipUntilMs)(0, NOW, -5)).toBe(NOW);
    });
    it('grants 7 days to the invited friend and 7 separate days to the referrer', () => {
        const referee = (0, referral_1.buildReferralVipProgressPatch)(undefined, NOW, referral_1.REFERRAL_REWARD_DAYS, 'referee');
        const referrer = (0, referral_1.buildReferralVipProgressPatch)(undefined, NOW, referral_1.REFERRAL_REWARD_DAYS, 'referrer');
        expect(referee.vip_until).toBe(String(NOW + 7 * DAY));
        expect(referrer.vip_until).toBe(String(NOW + 7 * DAY));
        expect(referee.referral_vip_last_source).toBe('referee');
        expect(referrer.referral_vip_last_source).toBe('referrer');
    });
    it('keeps 7+7 as two people, not 14 days on one clean account', () => {
        const referee = (0, referral_1.buildReferralVipProgressPatch)(undefined, NOW, referral_1.REFERRAL_REWARD_DAYS, 'referee');
        expect(referee.vip_until).not.toBe(String(NOW + 14 * DAY));
    });
});
//# sourceMappingURL=referral.test.js.map