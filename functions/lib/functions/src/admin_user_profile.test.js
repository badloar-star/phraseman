"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const https_1 = require("firebase-functions/v2/https");
const admin_user_profile_1 = require("./admin_user_profile");
describe('admin user profile read contracts', () => {
    it('normalizes bounded search requests without allowing an unbounded directory scan', () => {
        expect((0, admin_user_profile_1.parseUserSearchRequest)({ query: '  Alice@example.com ', limit: 999 })).toEqual({
            query: 'Alice@example.com',
            normalizedQuery: 'alice@example.com',
            kind: 'email',
            limit: 20,
        });
        expect((0, admin_user_profile_1.parseUserSearchRequest)({ query: 'Stable-Uid_123', limit: 5 })).toMatchObject({
            kind: 'uid_or_name',
            limit: 5,
        });
        expect(() => (0, admin_user_profile_1.parseUserSearchRequest)({ query: 'a' })).toThrow(https_1.HttpsError);
        expect(() => (0, admin_user_profile_1.parseUserSearchRequest)({ query: 'x'.repeat(161) })).toThrow(https_1.HttpsError);
        expect(() => (0, admin_user_profile_1.parseUserSearchRequest)({ query: '' })).toThrow(https_1.HttpsError);
    });
    it('accepts only bounded stable user ids for a profile request', () => {
        expect((0, admin_user_profile_1.parseUserProfileRequest)({ uid: 'stable-user_1' })).toEqual({ uid: 'stable-user_1' });
        expect(() => (0, admin_user_profile_1.parseUserProfileRequest)({ uid: '../users' })).toThrow(https_1.HttpsError);
        expect(() => (0, admin_user_profile_1.parseUserProfileRequest)({ uid: '' })).toThrow(https_1.HttpsError);
    });
    it('distinguishes safe direct document ids from names that must use field queries', () => {
        expect((0, admin_user_profile_1.isSafeDocumentId)('stable-user_1')).toBe(true);
        expect((0, admin_user_profile_1.isSafeDocumentId)('Алиса')).toBe(true);
        expect((0, admin_user_profile_1.isSafeDocumentId)('AC/DC')).toBe(false);
        expect((0, admin_user_profile_1.isSafeDocumentId)('..')).toBe(false);
    });
    it('lets a valid provider auth link win over stale local identity hints', () => {
        expect((0, admin_user_profile_1.resolveCanonicalStableId)({
            requestedUid: 'local-old',
            user: { canonicalStableId: 'local-canonical', firebaseAuthUid: 'provider-1' },
            authLink: { stable_id: 'provider-stable' },
            existingUserIds: new Set(['local-old', 'local-canonical', 'provider-stable']),
        })).toEqual({ canonicalUid: 'provider-stable', reason: 'auth_link', providerUid: 'provider-1' });
        expect((0, admin_user_profile_1.resolveCanonicalStableId)({
            requestedUid: 'local-old',
            user: { canonicalStableId: 'local-canonical', firebaseAuthUid: 'provider-1' },
            authLink: { stable_id: 'deleted-user' },
            existingUserIds: new Set(['local-old', 'local-canonical']),
        })).toEqual({ canonicalUid: 'local-canonical', reason: 'canonical_field', providerUid: 'provider-1' });
    });
    it('projects an allowlisted summary and never returns push tokens or raw progress', () => {
        const summary = (0, admin_user_profile_1.buildUserProfileSummary)('stable-1', {
            progress: {
                user_name: 'Alice', user_total_xp: '1250', streak_count: '9', premium_plan: 'annual',
                app_lang: 'ru', app_version: '2.4.0', device_platform: 'ios', unlocked_lessons: '[1,2,3]',
                secret_inside_progress: 'must-not-leak',
            },
            linkedAuth: { provider: 'google', email: 'Alice@example.com', providerUid: 'provider-1' },
            expoPushToken: 'ExponentPushToken[secret]',
            shards: 45,
            banned: false,
            created_at: 100,
            last_active_at: 200,
        });
        expect(summary).toMatchObject({
            uid: 'stable-1', name: 'Alice', xp: 1250, streak: 9, premiumPlan: 'annual',
            language: 'ru', appVersion: '2.4.0', platform: 'ios', lessonsCompleted: 3, shards: 45,
            auth: { provider: 'google', email: 'Alice@example.com' },
        });
        expect(JSON.stringify(summary)).not.toContain('ExponentPushToken');
        expect(JSON.stringify(summary)).not.toContain('secret_inside_progress');
        expect(summary).not.toHaveProperty('raw');
    });
    it('keeps the real document id and drops unexpected nested values from event rows', () => {
        expect((0, admin_user_profile_1.projectAdminRow)('real-id', {
            id: 'forged-id',
            type: 'purchase',
            amount: 5,
            createdAt: { seconds: 10 },
            nested: { secret: 'drop' },
        }, ['id', 'type', 'amount', 'createdAt', 'nested'], ['type'])).toEqual({
            id: 'real-id', type: 'purchase', amount: 5, createdAt: 10000,
        });
    });
    it('lets the authoritative banned_users document override a stale active users flag', () => {
        expect((0, admin_user_profile_1.applyAuthoritativeBan)({ uid: 'u1', banned: false }, true)).toEqual({ uid: 'u1', banned: true });
        expect((0, admin_user_profile_1.applyAuthoritativeBan)({ uid: 'u1', banned: true }, false)).toEqual({ uid: 'u1', banned: true });
    });
    it('marks search ban state unknown when the authoritative source failed', () => {
        expect((0, admin_user_profile_1.applySearchBanState)({ uid: 'u1', banned: false }, false, true)).toEqual({ uid: 'u1', banned: false, banState: 'unknown' });
        expect((0, admin_user_profile_1.applySearchBanState)({ uid: 'u1', banned: false }, true, false)).toEqual({ uid: 'u1', banned: true, banState: 'banned' });
        expect((0, admin_user_profile_1.applySearchBanState)({ uid: 'u1', banned: false }, false, false)).toEqual({ uid: 'u1', banned: false, banState: 'active' });
    });
    it('distinguishes empty, partial and failed sources instead of reporting false zeroes', () => {
        expect((0, admin_user_profile_1.sourceResult)('reports', [], { limit: 20 })).toMatchObject({ state: 'empty', count: 0, truncated: false });
        expect((0, admin_user_profile_1.sourceResult)('reports', [{ id: '1' }, { id: '2' }], { limit: 2 })).toMatchObject({ state: 'partial', count: 2, truncated: true });
        expect((0, admin_user_profile_1.sourceResult)('reports', [], { limit: 20, error: new Error('missing index') })).toMatchObject({ state: 'error', count: 0, error: 'missing index' });
    });
    it('bounds user-controlled daily JSON to the last 30 numeric dates', () => {
        const dailyStats = Object.fromEntries(Array.from({ length: 40 }, (_, index) => [`2026-06-${String(index + 1).padStart(2, '0')}`, index]));
        dailyStats['not-a-date'] = { secret: 'drop' };
        const learning = (0, admin_user_profile_1.buildLearningSnapshot)({
            user_total_xp: '100',
            streak_count: '4',
            daily_stats: JSON.stringify(dailyStats),
            phraseman_foreground_daily_ms_v1: JSON.stringify({ '2026-07-01': 60000, bad: 'secret' }),
        });
        expect(Object.keys(learning.dailyStats)).toHaveLength(30);
        expect(learning.dailyStats).not.toHaveProperty('not-a-date');
        expect(learning.foregroundDailyMs).toEqual({ '2026-07-01': 60000 });
    });
});
//# sourceMappingURL=admin_user_profile.test.js.map