"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const premium_status_1 = require("./premium_status");
const NOW = 1700000000000;
const FUTURE = NOW + 86400000;
const PAST = NOW - 86400000;
describe('premium_status — серверный источник правды по премиуму', () => {
    describe('store-премиум (RevenueCat)', () => {
        it('monthly с expiry=0 (бессрочный активный) → премиум', () => {
            expect((0, premium_status_1.isPremiumAccessActive)({ premium_plan: 'monthly', premium_expiry: '0' }, NOW)).toBe(true);
        });
        it('yearly с expiry в будущем → премиум', () => {
            expect((0, premium_status_1.isPremiumAccessActive)({ premium_plan: 'yearly', premium_expiry: String(FUTURE) }, NOW)).toBe(true);
        });
        it('monthly с истёкшим expiry → НЕ премиум', () => {
            expect((0, premium_status_1.isPremiumAccessActive)({ premium_plan: 'monthly', premium_expiry: String(PAST) }, NOW)).toBe(false);
        });
        it('пустой plan → НЕ премиум', () => {
            expect((0, premium_status_1.isPremiumAccessActive)({ premium_plan: '', premium_expiry: '0' }, NOW)).toBe(false);
        });
    });
    describe('админский грант', () => {
        it('admin_premium_override=true бессрочно → премиум', () => {
            expect((0, premium_status_1.isPremiumAccessActive)({ premium_plan: 'admin_grant', admin_premium_override: 'true', premium_expiry: '0' }, NOW)).toBe(true);
        });
        it('admin_grant с истёкшим сроком → НЕ премиум', () => {
            expect((0, premium_status_1.isPremiumAccessActive)({ premium_plan: 'admin_grant', premium_expiry: String(PAST) }, NOW)).toBe(false);
        });
        it('override=false гасит грант', () => {
            expect((0, premium_status_1.isPremiumAccessActive)({ premium_plan: 'admin_grant', admin_premium_override: 'false', premium_expiry: '0' }, NOW)).toBe(false);
        });
    });
    describe('VIP-доступ (рефералка / опрос / ручная выдача)', () => {
        it('vip_active=true, окно открыто → премиум', () => {
            expect((0, premium_status_1.isVipActive)({ vip_active: 'true', vip_until: String(FUTURE) }, NOW)).toBe(true);
            expect((0, premium_status_1.isPremiumAccessActive)({ vip_active: 'true', vip_until: String(FUTURE) }, NOW)).toBe(true);
        });
        it('vip_until истёк → НЕ премиум', () => {
            expect((0, premium_status_1.isVipActive)({ vip_active: 'true', vip_until: String(PAST) }, NOW)).toBe(false);
        });
        it('vip_admin_override=false (revoke) гасит VIP даже при vip_active', () => {
            expect((0, premium_status_1.isVipActive)({ vip_active: 'true', vip_admin_override: 'false', vip_until: String(FUTURE) }, NOW)).toBe(false);
        });
        it('vip_until=0 (бессрочный VIP) → активен', () => {
            expect((0, premium_status_1.isVipActive)({ vip_active: 'true', vip_until: '0' }, NOW)).toBe(true);
        });
    });
    describe('защита от подделки', () => {
        it('пустой progress → НЕ премиум (тело запроса не влияет)', () => {
            expect((0, premium_status_1.isPremiumAccessActive)({}, NOW)).toBe(false);
            expect((0, premium_status_1.isPremiumAccessActive)(null, NOW)).toBe(false);
            expect((0, premium_status_1.isPremiumAccessActive)(undefined, NOW)).toBe(false);
        });
        it('левые поля не дают премиум', () => {
            expect((0, premium_status_1.isPremiumAccessActive)({ isPremium: true, premium: 'yes', wantPremium: '1' }, NOW)).toBe(false);
        });
    });
    describe('parseProgressMs', () => {
        it('строка/число/Timestamp-подобное', () => {
            expect((0, premium_status_1.parseProgressMs)('123')).toBe(123);
            expect((0, premium_status_1.parseProgressMs)(456)).toBe(456);
            expect((0, premium_status_1.parseProgressMs)({ toMillis: () => 789 })).toBe(789);
            expect((0, premium_status_1.parseProgressMs)({ seconds: 2 })).toBe(2000);
            expect((0, premium_status_1.parseProgressMs)('')).toBe(0);
            expect((0, premium_status_1.parseProgressMs)(null)).toBe(0);
        });
    });
});
//# sourceMappingURL=premium_status.test.js.map