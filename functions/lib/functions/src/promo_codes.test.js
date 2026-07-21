"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const promo_codes_1 = require("./promo_codes");
function code(over = {}) {
    return { rewardDays: 7, rewardKind: 'days', enabled: true, maxRedemptions: 0, usedCount: 0, expiresAtMs: 0, ...over };
}
describe('normalizePromoCode', () => {
    it('trim + upper', () => {
        expect((0, promo_codes_1.normalizePromoCode)('  welcome7 ')).toBe('WELCOME7');
        expect((0, promo_codes_1.normalizePromoCode)('Free-Month')).toBe('FREE-MONTH');
    });
    it('пусто/мусор → пустая строка', () => {
        expect((0, promo_codes_1.normalizePromoCode)(undefined)).toBe('');
        expect((0, promo_codes_1.normalizePromoCode)(null)).toBe('');
    });
});
describe('decidePromoRedemption', () => {
    const now = 1700000000000;
    it('валидный код → ok с дням награды', () => {
        expect((0, promo_codes_1.decidePromoRedemption)({ code: code({ rewardDays: 30 }), alreadyRedeemed: false, nowMs: now }))
            .toEqual({ ok: true, rewardDays: 30, rewardKind: 'days' });
    });
    it('глобальный флаг выключен → promo_disabled', () => {
        expect((0, promo_codes_1.decidePromoRedemption)({ code: code({ rewardDays: 30 }), alreadyRedeemed: false, nowMs: now, globallyEnabled: false }))
            .toEqual({ ok: false, reason: 'promo_disabled' });
    });
    it('lifetime код → ok без дней, но с rewardKind lifetime', () => {
        expect((0, promo_codes_1.decidePromoRedemption)({ code: code({ rewardDays: 0, rewardKind: 'lifetime' }), alreadyRedeemed: false, nowMs: now }))
            .toEqual({ ok: true, rewardDays: 0, rewardKind: 'lifetime' });
    });
    it('нет кода → not_found', () => {
        expect((0, promo_codes_1.decidePromoRedemption)({ code: null, alreadyRedeemed: false, nowMs: now }))
            .toEqual({ ok: false, reason: 'not_found' });
    });
    it('выключенный код → disabled', () => {
        expect((0, promo_codes_1.decidePromoRedemption)({ code: code({ enabled: false }), alreadyRedeemed: false, nowMs: now }))
            .toEqual({ ok: false, reason: 'disabled' });
    });
    it('истёкший код → expired (0 = бессрочно)', () => {
        expect((0, promo_codes_1.decidePromoRedemption)({ code: code({ expiresAtMs: now - 1 }), alreadyRedeemed: false, nowMs: now }))
            .toEqual({ ok: false, reason: 'expired' });
        // 0 = бессрочно → не истекает
        expect((0, promo_codes_1.decidePromoRedemption)({ code: code({ expiresAtMs: 0 }), alreadyRedeemed: false, nowMs: now }).ok).toBe(true);
    });
    it('юзер уже активировал → already_redeemed', () => {
        expect((0, promo_codes_1.decidePromoRedemption)({ code: code(), alreadyRedeemed: true, nowMs: now }))
            .toEqual({ ok: false, reason: 'already_redeemed' });
    });
    it('лимит активаций исчерпан → limit_reached (0 = без лимита)', () => {
        expect((0, promo_codes_1.decidePromoRedemption)({ code: code({ maxRedemptions: 5, usedCount: 5 }), alreadyRedeemed: false, nowMs: now }))
            .toEqual({ ok: false, reason: 'limit_reached' });
        // 0 = без лимита → не упирается
        expect((0, promo_codes_1.decidePromoRedemption)({ code: code({ maxRedemptions: 0, usedCount: 9999 }), alreadyRedeemed: false, nowMs: now }).ok).toBe(true);
    });
    it('нулевая/отрицательная награда → bad_reward', () => {
        expect((0, promo_codes_1.decidePromoRedemption)({ code: code({ rewardDays: 0 }), alreadyRedeemed: false, nowMs: now }))
            .toEqual({ ok: false, reason: 'bad_reward' });
    });
    it('приоритет проверок: disabled раньше лимита/срока', () => {
        expect((0, promo_codes_1.decidePromoRedemption)({ code: code({ enabled: false, expiresAtMs: now - 1 }), alreadyRedeemed: true, nowMs: now }))
            .toEqual({ ok: false, reason: 'disabled' });
    });
});
describe('buildPromoVipPatch', () => {
    const dayMs = 24 * 60 * 60 * 1000;
    const now = 1700000000000;
    it('дневной промокод сразу включает Plus на выбранный срок', () => {
        const patch = (0, promo_codes_1.buildPromoVipPatch)(undefined, now, 30, 'days', 'TEST30');
        expect(patch).toMatchObject({
            vip_active: 'true',
            vip_plan: 'promo',
            vip_from: String(now),
            vip_until: String(now + 30 * dayMs),
            vip_admin_override: 'true',
            vip_admin_grant_at: String(now),
            promo_vip_last_code: 'TEST30',
        });
    });
    it('промокод докидывает дни к уже активному будущему Plus', () => {
        const currentUntil = now + 10 * dayMs;
        const patch = (0, promo_codes_1.buildPromoVipPatch)({ vip_until: String(currentUntil) }, now, 30, 'days', 'STACK30');
        expect(patch.vip_plan).toBe('promo');
        expect(patch.vip_until).toBe(String(currentUntil + 30 * dayMs));
    });
    it('lifetime промокод включает бессрочный Plus tier', () => {
        const patch = (0, promo_codes_1.buildPromoVipPatch)(undefined, now, 0, 'lifetime', 'FOREVER');
        expect(patch.vip_active).toBe('true');
        expect(patch.vip_plan).toBe('promo_lifetime');
        expect(patch.vip_until).toBe('0');
        expect(patch.promo_vip_last_code).toBe('FOREVER');
    });
});
//# sourceMappingURL=promo_codes.test.js.map