"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const premium_expiry_cron_1 = require("./premium_expiry_cron");
const premium_status_1 = require("./premium_status");
const NOW = 1700000000000;
const DAY = 86400000;
const FUTURE = NOW + DAY;
const PAST = NOW - DAY;
/** Дальше grace-окна в прошлом — rc-срок «точно умер». */
const RC_DEAD = NOW - premium_expiry_cron_1.RC_GRACE_MS - DAY;
/** В прошлом, но ещё внутри grace-окна — снимать НЕЛЬЗЯ. */
const RC_IN_GRACE = NOW - premium_expiry_cron_1.RC_GRACE_MS + 60000;
/** Применяет patch к progress, как это сделает merge в Firestore. */
function applied(progress) {
    const d = (0, premium_expiry_cron_1.planExpiryDeactivation)(progress, NOW);
    return d ? { ...progress, ...d.patch } : progress;
}
describe('premium_expiry_cron — снимаем ТОЛЬКО просроченное, бессрочное не трогаем', () => {
    describe('store-премиум: ГЛАВНЫЙ инвариант — действующий платящий неприкосновенен', () => {
        it('expiry=0 БЕЗ premium_rc_expiry_ms (бессрочная ручная выдача) → НЕ снимается', () => {
            expect((0, premium_expiry_cron_1.planExpiryDeactivation)({ premium_plan: 'monthly', premium_expiry: '0' }, NOW)).toBeNull();
            expect((0, premium_expiry_cron_1.planExpiryDeactivation)({ premium_plan: 'yearly', premium_expiry: '0' }, NOW)).toBeNull();
        });
        it('expiry=0 + rc-срок в будущем (активная подписка) → НЕ снимается', () => {
            expect((0, premium_expiry_cron_1.planExpiryDeactivation)({ premium_plan: 'monthly', premium_expiry: '0', premium_rc_expiry_ms: String(FUTURE) }, NOW)).toBeNull();
        });
        it('expiry=0 + rc-срок прошёл, но ВНУТРИ grace (billing retry) → НЕ снимается', () => {
            expect((0, premium_expiry_cron_1.planExpiryDeactivation)({ premium_plan: 'monthly', premium_expiry: '0', premium_rc_expiry_ms: String(RC_IN_GRACE) }, NOW)).toBeNull();
        });
        it('expiry=0 + rc-срок умер дальше grace (потерянный EXPIRATION-вебхук) → снимается как вебхук', () => {
            const d = (0, premium_expiry_cron_1.planExpiryDeactivation)({ premium_plan: 'monthly', premium_expiry: '0', premium_rc_expiry_ms: String(RC_DEAD) }, NOW);
            expect(d).not.toBeNull();
            expect(d.patch.premium_plan).toBe('');
            expect(d.patch.premium_expiry).toBe(String(RC_DEAD));
            expect(d.reasons).toEqual(['store_rc_expired']);
        });
        it('конкретный expiry в будущем → НЕ снимается', () => {
            expect((0, premium_expiry_cron_1.planExpiryDeactivation)({ premium_plan: 'monthly', premium_expiry: String(FUTURE) }, NOW)).toBeNull();
        });
        it('конкретный expiry в прошлом (ручная выдача на срок) → plan чистится', () => {
            const d = (0, premium_expiry_cron_1.planExpiryDeactivation)({ premium_plan: 'monthly', premium_expiry: String(PAST) }, NOW);
            expect(d).not.toBeNull();
            expect(d.patch.premium_plan).toBe('');
            expect(d.reasons).toEqual(['store_expiry_passed']);
        });
    });
    describe('админский грант', () => {
        it('бессрочный (expiry=0) → НЕ снимается', () => {
            expect((0, premium_expiry_cron_1.planExpiryDeactivation)({ premium_plan: 'admin_grant', admin_premium_override: 'true', premium_expiry: '0' }, NOW)).toBeNull();
        });
        it('срок в будущем → НЕ снимается', () => {
            expect((0, premium_expiry_cron_1.planExpiryDeactivation)({ premium_plan: 'admin_grant', admin_premium_override: 'true', premium_expiry: String(FUTURE) }, NOW)).toBeNull();
        });
        it('срок в прошлом → override=false, legacy-plan чистится', () => {
            const d = (0, premium_expiry_cron_1.planExpiryDeactivation)({ premium_plan: 'admin_grant', admin_premium_override: 'true', premium_expiry: String(PAST) }, NOW);
            expect(d).not.toBeNull();
            expect(d.patch.admin_premium_override).toBe('false');
            expect(d.patch.premium_plan).toBe('');
            expect(d.reasons).toEqual(['admin_grant_expired']);
        });
    });
    describe('VIP (рефералка / опрос / ручная выдача)', () => {
        it('бессрочный VIP (vip_until=0) → НЕ снимается', () => {
            expect((0, premium_expiry_cron_1.planExpiryDeactivation)({ vip_active: 'true', vip_until: '0' }, NOW)).toBeNull();
        });
        it('vip_until в будущем → НЕ снимается', () => {
            expect((0, premium_expiry_cron_1.planExpiryDeactivation)({ vip_active: 'true', vip_until: String(FUTURE) }, NOW)).toBeNull();
        });
        it('vip_until в прошлом → гасится как vipRevokeProgressFields', () => {
            const d = (0, premium_expiry_cron_1.planExpiryDeactivation)({ vip_active: 'true', vip_until: String(PAST) }, NOW);
            expect(d).not.toBeNull();
            expect(d.patch.vip_active).toBe('false');
            expect(d.patch.vip_admin_override).toBe('false');
            expect(d.reasons).toEqual(['vip_expired']);
        });
        it('vip_expiry (legacy-алиас vip_until) в прошлом → тоже гасится', () => {
            const d = (0, premium_expiry_cron_1.planExpiryDeactivation)({ vip_plan: 'referral', vip_active: 'true', vip_expiry: String(PAST) }, NOW);
            expect(d).not.toBeNull();
            expect(d.reasons).toEqual(['vip_expired']);
        });
        it('уже отозванный VIP (vip_active=false) → не трогаем повторно', () => {
            expect((0, premium_expiry_cron_1.planExpiryDeactivation)({ vip_active: 'false', vip_admin_override: 'false', vip_until: String(PAST) }, NOW)).toBeNull();
        });
    });
    describe('комбинации источников: гасим только просроченный, остальное живёт', () => {
        it('активный store + истёкший VIP → патчатся только vip-поля, премиум остаётся', () => {
            const progress = {
                premium_plan: 'yearly', premium_expiry: '0', premium_rc_expiry_ms: String(FUTURE),
                vip_active: 'true', vip_until: String(PAST),
            };
            const d = (0, premium_expiry_cron_1.planExpiryDeactivation)(progress, NOW);
            expect(d.reasons).toEqual(['vip_expired']);
            expect(d.patch.premium_plan).toBeUndefined();
            expect((0, premium_status_1.isPremiumAccessActive)(applied(progress), NOW)).toBe(true);
        });
        it('истёкший store + бессрочный VIP → store чистится, доступ остаётся по VIP', () => {
            const progress = {
                premium_plan: 'monthly', premium_expiry: String(PAST),
                vip_active: 'true', vip_until: '0',
            };
            const d = (0, premium_expiry_cron_1.planExpiryDeactivation)(progress, NOW);
            expect(d.reasons).toEqual(['store_expiry_passed']);
            expect((0, premium_status_1.isPremiumAccessActive)(applied(progress), NOW)).toBe(true);
        });
    });
    describe('идемпотентность и согласованность с premium_status', () => {
        it('пустой/чистый progress → null', () => {
            expect((0, premium_expiry_cron_1.planExpiryDeactivation)({}, NOW)).toBeNull();
            expect((0, premium_expiry_cron_1.planExpiryDeactivation)(null, NOW)).toBeNull();
            expect((0, premium_expiry_cron_1.planExpiryDeactivation)(undefined, NOW)).toBeNull();
        });
        it.each([
            ['store: потерянный вебхук', { premium_plan: 'monthly', premium_expiry: '0', premium_rc_expiry_ms: String(RC_DEAD) }],
            ['store: ручной срок прошёл', { premium_plan: 'monthly', premium_expiry: String(PAST) }],
            ['admin grant просрочен', { premium_plan: 'admin_grant', admin_premium_override: 'true', premium_expiry: String(PAST) }],
            ['VIP просрочен', { vip_active: 'true', vip_until: String(PAST) }],
        ])('%s: после patch доступа нет и повторный прогон null', (_label, progress) => {
            const after = applied(progress);
            expect((0, premium_status_1.isPremiumAccessActive)(after, NOW)).toBe(false);
            expect((0, premium_expiry_cron_1.planExpiryDeactivation)(after, NOW)).toBeNull();
            expect((0, premium_expiry_cron_1.planExpiryDeactivation)(after, NOW + 30 * DAY)).toBeNull();
        });
        it('никогда не трогает юзера, чей доступ сейчас легитимно активен', () => {
            const activeCases = [
                { premium_plan: 'monthly', premium_expiry: '0' },
                { premium_plan: 'monthly', premium_expiry: '0', premium_rc_expiry_ms: String(FUTURE) },
                { premium_plan: 'yearly', premium_expiry: String(FUTURE) },
                { premium_plan: 'admin_grant', admin_premium_override: 'true', premium_expiry: '0' },
                { vip_active: 'true', vip_until: String(FUTURE) },
                { vip_active: 'true', vip_until: '0' },
            ];
            for (const progress of activeCases) {
                expect((0, premium_status_1.isPremiumAccessActive)(progress, NOW)).toBe(true);
                expect((0, premium_expiry_cron_1.planExpiryDeactivation)(progress, NOW)).toBeNull();
            }
        });
    });
});
//# sourceMappingURL=premium_expiry_cron.test.js.map