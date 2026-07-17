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
        it('lifetime с expiry=0 (навсегда) → премиум', () => {
            expect((0, premium_status_1.isPremiumAccessActive)({ premium_plan: 'lifetime', premium_expiry: '0' }, NOW)).toBe(true);
        });
        it('lifetime без поля expiry (по умолчанию бессрочный) → премиум', () => {
            expect((0, premium_status_1.isPremiumAccessActive)({ premium_plan: 'lifetime' }, NOW)).toBe(true);
        });
        // ── rc_expiry leak (утечка дохода при потерянном EXPIRATION-вебхуке) ──
        it('expiry=0 но rc_expiry истёк ДАВНО (>72ч grace) → НЕ премиум (закрыта утечка)', () => {
            const rcExpiry = NOW - 80 * 60 * 60 * 1000; // 80ч назад > 72ч grace
            expect((0, premium_status_1.isPremiumAccessActive)({ premium_plan: 'monthly', premium_expiry: '0', premium_rc_expiry_ms: String(rcExpiry) }, NOW)).toBe(false);
        });
        it('expiry=0 и rc_expiry истёк НЕДАВНО (в пределах 72ч grace) → ещё премиум', () => {
            const rcExpiry = NOW - 10 * 60 * 60 * 1000; // 10ч назад < 72ч grace (опоздавший RENEWAL)
            expect((0, premium_status_1.isPremiumAccessActive)({ premium_plan: 'monthly', premium_expiry: '0', premium_rc_expiry_ms: String(rcExpiry) }, NOW)).toBe(true);
        });
        it('expiry=0 и rc_expiry в будущем → премиум', () => {
            expect((0, premium_status_1.isPremiumAccessActive)({ premium_plan: 'yearly', premium_expiry: '0', premium_rc_expiry_ms: String(FUTURE) }, NOW)).toBe(true);
        });
        it('lifetime: expiry=0 и НЕТ rc_expiry → премиум (бессрочный, не трогаем)', () => {
            expect((0, premium_status_1.isPremiumAccessActive)({ premium_plan: 'lifetime', premium_expiry: '0' }, NOW)).toBe(true);
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
        it('promo_lifetime + vip_until=0 → активный Plus/VIP на сервере', () => {
            expect((0, premium_status_1.isVipActive)({
                vip_active: 'true',
                vip_plan: 'promo_lifetime',
                vip_until: '0',
                vip_admin_override: 'true',
            }, NOW)).toBe(true);
            expect((0, premium_status_1.isPremiumAccessActive)({
                vip_active: 'true',
                vip_plan: 'promo_lifetime',
                vip_until: '0',
                vip_admin_override: 'true',
            }, NOW)).toBe(true);
        });
    });
    describe('подарок 72ч (intro / loyalty)', () => {
        it('loyalty_gift_until_ms в будущем даёт Premium access на сервере', () => {
            expect((0, premium_status_1.isGiftAccessActive)({ loyalty_gift_until_ms: String(FUTURE) }, NOW)).toBe(true);
            expect((0, premium_status_1.isPremiumAccessActive)({ loyalty_gift_until_ms: String(FUTURE) }, NOW)).toBe(true);
        });
        it('loyalty_gift_until_ms в прошлом не даёт доступ после истечения', () => {
            expect((0, premium_status_1.isGiftAccessActive)({ loyalty_gift_until_ms: String(PAST) }, NOW)).toBe(false);
            expect((0, premium_status_1.isPremiumAccessActive)({ loyalty_gift_until_ms: String(PAST) }, NOW)).toBe(false);
        });
        it('intro_access_until_ms тоже считается подарочным Premium access', () => {
            expect((0, premium_status_1.isGiftAccessActive)({ intro_access_until_ms: String(FUTURE) }, NOW)).toBe(true);
            expect((0, premium_status_1.isPremiumAccessActive)({ intro_access_until_ms: String(FUTURE) }, NOW)).toBe(true);
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
    describe('resolvePremiumAccess', () => {
        function fakeDb(users, links = {}) {
            return {
                collection(name) {
                    if (name === 'auth_links') {
                        return {
                            doc(id) {
                                return {
                                    async get() {
                                        const data = links[id];
                                        return { exists: !!data, data: () => data };
                                    },
                                };
                            },
                        };
                    }
                    return {
                        doc(id) {
                            return {
                                async get() {
                                    const data = users[id];
                                    return { exists: !!data, data: () => data };
                                },
                            };
                        },
                        where(field, _op, value) {
                            return {
                                limit(n) {
                                    return {
                                        async get() {
                                            const docs = Object.entries(users)
                                                .filter(([, data]) => {
                                                if (field === 'firebaseAuthUid')
                                                    return data.firebaseAuthUid === value;
                                                if (field === 'canonicalStableId')
                                                    return data.canonicalStableId === value;
                                                return false;
                                            })
                                                .slice(0, n)
                                                .map(([id, data]) => ({ id, data: () => data }));
                                            return { docs };
                                        },
                                    };
                                },
                            };
                        },
                    };
                },
            };
        }
        it('finds premium on the stable user linked to the current auth uid', async () => {
            const db = fakeDb({
                auth_1: { progress: {} },
                stable_1: {
                    firebaseAuthUid: 'auth_1',
                    progress: { premium_plan: 'monthly', premium_expiry: '0' },
                },
            });
            await expect((0, premium_status_1.resolvePremiumAccess)(db, 'auth_1', NOW, 'auth_1')).resolves.toBe(true);
        });
        it('follows auth_links when the callable resolved a legacy direct auth doc first', async () => {
            const db = fakeDb({
                auth_2: { progress: {} },
                stable_2: { progress: { vip_active: 'true', vip_until: String(FUTURE) } },
            }, { auth_2: { stable_id: 'stable_2' } });
            await expect((0, premium_status_1.resolvePremiumAccess)(db, 'auth_2', NOW, 'auth_2')).resolves.toBe(true);
        });
        it('finds an active admin VIP on an owned hidden alias after auth_links moved to canonical', async () => {
            const users = {
                stable_3: {
                    firebaseAuthUid: 'auth_3',
                    linkedAuth: { providerUid: 'auth_3' },
                    progress: {},
                },
            };
            // Production had more provider-owned duplicates than the defensive by-auth
            // lookup limit. The hidden VIP alias was therefore absent from those first
            // five results even though it belonged to the same signed-in account.
            for (let i = 0; i < 5; i += 1) {
                users[`duplicate_${i}`] = { firebaseAuthUid: 'auth_3', progress: {} };
            }
            users.vip_alias = {
                identityHidden: true,
                canonicalStableId: 'stable_3',
                firebaseAuthUid: 'auth_3',
                progress: {
                    vip_active: 'true',
                    vip_plan: 'admin_vip',
                    vip_until: String(FUTURE),
                    vip_admin_override: 'true',
                },
            };
            const db = fakeDb(users, { auth_3: { stable_id: 'stable_3' } });
            await expect((0, premium_status_1.resolvePremiumAccess)(db, 'stable_3', NOW, 'auth_3')).resolves.toBe(true);
        });
        it('keeps owned hidden-alias access when the alias is inside the normal lookup window', async () => {
            const db = fakeDb({
                stable_3b: { firebaseAuthUid: 'auth_3b', progress: {} },
                vip_alias_3b: {
                    identityHidden: true,
                    canonicalStableId: 'stable_3b',
                    firebaseAuthUid: 'auth_3b',
                    progress: {
                        vip_active: 'true',
                        vip_until: '0',
                        vip_admin_override: 'true',
                    },
                },
            }, { auth_3b: { stable_id: 'stable_3b' } });
            await expect((0, premium_status_1.resolvePremiumAccess)(db, 'stable_3b', NOW, 'auth_3b')).resolves.toBe(true);
        });
        it('does not inherit VIP from a hidden alias owned by another auth uid', async () => {
            const users = {
                stable_4: { firebaseAuthUid: 'auth_4', progress: {} },
                foreign_alias: {
                    identityHidden: true,
                    canonicalStableId: 'stable_4',
                    firebaseAuthUid: 'different_auth',
                    progress: {
                        vip_active: 'true',
                        vip_until: String(FUTURE),
                        vip_admin_override: 'true',
                    },
                },
            };
            for (let i = 0; i < 4; i += 1) {
                users[`owned_duplicate_${i}`] = { firebaseAuthUid: 'auth_4', progress: {} };
            }
            const db = fakeDb(users, { auth_4: { stable_id: 'stable_4' } });
            await expect((0, premium_status_1.resolvePremiumAccess)(db, 'stable_4', NOW, 'auth_4')).resolves.toBe(false);
        });
        it('does not resurrect a canonical VIP that was explicitly revoked', async () => {
            const users = {
                stable_5: {
                    firebaseAuthUid: 'auth_5',
                    progress: { vip_active: 'false', vip_admin_override: 'false', vip_until: String(PAST) },
                },
                stale_alias: {
                    identityHidden: true,
                    canonicalStableId: 'stable_5',
                    firebaseAuthUid: 'auth_5',
                    progress: {
                        vip_active: 'true',
                        vip_until: String(FUTURE),
                        vip_admin_override: 'true',
                    },
                },
            };
            for (let i = 0; i < 4; i += 1) {
                users[`revoked_duplicate_${i}`] = { firebaseAuthUid: 'auth_5', progress: {} };
            }
            const db = fakeDb(users, { auth_5: { stable_id: 'stable_5' } });
            await expect((0, premium_status_1.resolvePremiumAccess)(db, 'stable_5', NOW, 'auth_5')).resolves.toBe(false);
        });
        it('treats a canonical legacy admin revoke as authoritative over a stale VIP alias', async () => {
            const db = fakeDb({
                stable_6: {
                    firebaseAuthUid: 'auth_6',
                    progress: {
                        admin_premium_override: 'false',
                        premium_plan: 'admin_grant',
                        premium_expiry: '0',
                    },
                },
                stale_legacy_alias: {
                    identityHidden: true,
                    canonicalStableId: 'stable_6',
                    firebaseAuthUid: 'auth_6',
                    progress: {
                        vip_active: 'true',
                        vip_until: String(FUTURE),
                        vip_admin_override: 'true',
                    },
                },
            }, { auth_6: { stable_id: 'stable_6' } });
            await expect((0, premium_status_1.resolvePremiumAccess)(db, 'stable_6', NOW, 'auth_6')).resolves.toBe(false);
        });
    });
});
//# sourceMappingURL=premium_status.test.js.map