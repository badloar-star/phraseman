"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auth_merge_1 = require("./auth_merge");
const NOW = 1777000000000;
const FUTURE = NOW + 30 * 24 * 60 * 60 * 1000; // +30d
const PAST = NOW - 30 * 24 * 60 * 60 * 1000; // -30d
// ── Pure merge math ───────────────────────────────────────────────────────────
describe('mergeUserProgress — numeric accumulation', () => {
    it('takes the max of integer-string fields', () => {
        const out = (0, auth_merge_1.mergeUserProgress)({ user_total_xp: '6812', streak_count: '2', achievement_quiz_total_count: '40' }, { user_total_xp: '2309', streak_count: '9', achievement_quiz_total_count: '12' }, NOW);
        expect(out.user_total_xp).toBe('6812');
        expect(out.streak_count).toBe('9'); // loser had a higher streak — kept
        expect(out.achievement_quiz_total_count).toBe('40');
    });
    it('keeps numeric strings as strings (progress is a string map)', () => {
        const out = (0, auth_merge_1.mergeUserProgress)({ user_total_xp: '100' }, { user_total_xp: '200' }, NOW);
        expect(out.user_total_xp).toBe('200');
        expect(typeof out.user_total_xp).toBe('string');
    });
    it('does NOT max JSON-blob / non-integer fields (treats as opaque, winner wins)', () => {
        const winnerLessons = JSON.stringify(['l1', 'l2', 'l3']);
        const loserLessons = JSON.stringify(['l9']);
        const out = (0, auth_merge_1.mergeUserProgress)({ unlocked_lessons: winnerLessons }, { unlocked_lessons: loserLessons }, NOW);
        expect(out.unlocked_lessons).toBe(winnerLessons); // winner's, not numerically maxed
    });
    it('fills a field from loser when winner is missing it', () => {
        const out = (0, auth_merge_1.mergeUserProgress)({ user_total_xp: '100' }, { user_avatar: 'cat' }, NOW);
        expect(out.user_total_xp).toBe('100');
        expect(out.user_avatar).toBe('cat');
    });
    it('fills from loser when winner value is blank/null-ish', () => {
        const out = (0, auth_merge_1.mergeUserProgress)({ user_name: '', user_avatar: 'null' }, { user_name: 'Civi', user_avatar: 'fox' }, NOW);
        expect(out.user_name).toBe('Civi');
        expect(out.user_avatar).toBe('fox');
    });
    it('prefers winner for conflicting opaque strings', () => {
        const out = (0, auth_merge_1.mergeUserProgress)({ user_name: 'Winner' }, { user_name: 'Loser' }, NOW);
        expect(out.user_name).toBe('Winner');
    });
    it('does not mutate the inputs', () => {
        const w = { user_total_xp: '1' };
        const l = { user_total_xp: '2' };
        (0, auth_merge_1.mergeUserProgress)(w, l, NOW);
        expect(w).toEqual({ user_total_xp: '1' });
        expect(l).toEqual({ user_total_xp: '2' });
    });
});
describe('mergeUserProgress — premium carries over (must never drop a paid user)', () => {
    it('carries an active store-premium block from the LOSER onto the result', () => {
        const winner = { user_total_xp: '9999' }; // higher XP, but free
        const loser = {
            user_total_xp: '10',
            premium_plan: 'yearly',
            premium_expiry: String(FUTURE),
            premium_rc_store: 'app_store',
            had_premium_ever: 'true',
        };
        const out = (0, auth_merge_1.mergeUserProgress)(winner, loser, NOW);
        expect(out.premium_plan).toBe('yearly');
        expect(out.premium_expiry).toBe(String(FUTURE));
        expect(out.premium_rc_store).toBe('app_store');
        expect(out.had_premium_ever).toBe('true');
    });
    it('prefers the side with the furthest premium expiry', () => {
        const a = { user_total_xp: '50', premium_plan: 'monthly', premium_expiry: String(NOW + 1000) };
        const b = { user_total_xp: '10', premium_plan: 'yearly', premium_expiry: String(FUTURE) };
        const out = (0, auth_merge_1.mergeUserProgress)(a, b, NOW);
        expect(out.premium_plan).toBe('yearly');
        expect(out.premium_expiry).toBe(String(FUTURE));
    });
    it('treats an open-ended (expiry<=0) subscription as the strongest', () => {
        const a = { premium_plan: 'monthly', premium_expiry: String(FUTURE) };
        const b = { premium_plan: 'yearly', premium_expiry: '0' }; // no expiry = lifetime
        const out = (0, auth_merge_1.mergeUserProgress)(a, b, NOW);
        expect(out.premium_plan).toBe('yearly');
        expect(out.premium_expiry).toBe('0');
    });
    it('does not mix premium keys across the two sides (consistent block)', () => {
        const a = { premium_plan: 'yearly', premium_expiry: String(FUTURE), premium_rc_store: 'A' };
        const b = { premium_plan: 'monthly', premium_expiry: String(NOW + 5), premium_rc_store: 'B' };
        const out = (0, auth_merge_1.mergeUserProgress)(a, b, NOW);
        // Winning side is A (further expiry) — store must also be A's, not B's.
        expect(out.premium_plan).toBe('yearly');
        expect(out.premium_rc_store).toBe('A');
    });
    it('had_premium_ever is sticky-true if either side ever had premium', () => {
        const out = (0, auth_merge_1.mergeUserProgress)({ had_premium_ever: 'false' }, { had_premium_ever: 'true' }, NOW);
        expect(out.had_premium_ever).toBe('true');
    });
});
describe('mergeUserProgress — VIP carries over', () => {
    it('carries an active VIP block from the loser', () => {
        const winner = { user_total_xp: '9999' };
        const loser = {
            user_total_xp: '5',
            vip_active: 'true',
            vip_plan: 'admin_vip',
            vip_until: String(FUTURE),
            vip_admin_override: 'true',
        };
        const out = (0, auth_merge_1.mergeUserProgress)(winner, loser, NOW);
        expect(out.vip_active).toBe('true');
        expect(out.vip_plan).toBe('admin_vip');
        expect(out.vip_until).toBe(String(FUTURE));
    });
    it('prefers active VIP over expired VIP', () => {
        const a = { vip_active: 'true', vip_plan: 'admin_vip', vip_until: String(PAST) }; // expired
        const b = { vip_active: 'true', vip_plan: 'referral', vip_until: String(FUTURE) }; // active
        const out = (0, auth_merge_1.mergeUserProgress)(a, b, NOW);
        expect(out.vip_plan).toBe('referral');
        expect(out.vip_until).toBe(String(FUTURE));
    });
    it('keeps premium and VIP independent (both can carry from different sides)', () => {
        const a = { premium_plan: 'yearly', premium_expiry: String(FUTURE) }; // premium, no vip
        const b = { vip_active: 'true', vip_plan: 'admin_vip', vip_until: String(FUTURE) }; // vip, no premium
        const out = (0, auth_merge_1.mergeUserProgress)(a, b, NOW);
        expect(out.premium_plan).toBe('yearly');
        expect(out.vip_active).toBe('true');
        expect(out.vip_plan).toBe('admin_vip');
    });
});
describe('mergeShards', () => {
    it('takes the max balance', () => {
        expect((0, auth_merge_1.mergeShards)(491, 1325)).toBe(1325);
        expect((0, auth_merge_1.mergeShards)('100', '50')).toBe(100);
    });
    it('handles missing sides', () => {
        expect((0, auth_merge_1.mergeShards)(undefined, 10)).toBe(10);
        expect((0, auth_merge_1.mergeShards)(10, undefined)).toBe(10);
        expect((0, auth_merge_1.mergeShards)(undefined, undefined)).toBeUndefined();
    });
});
function makeDbStub(initial = {}) {
    const store = {
        users: { ...(initial.users ?? {}) },
        auth_links: { ...(initial.auth_links ?? {}) },
        leaderboard: { ...(initial.leaderboard ?? {}) },
        league_groups: { ...(initial.league_groups ?? {}) },
        name_index: { ...(initial.name_index ?? {}) },
        identity_cleanup_candidates: { ...(initial.identity_cleanup_candidates ?? {}) },
    };
    const snapFor = (id, data) => ({
        id,
        ref: { id },
        exists: !!data,
        data: () => data,
    });
    const docApi = (name, id) => ({
        id,
        get: async () => snapFor(id, store[name]?.[id]),
        set: async (data) => {
            store[name] = store[name] ?? {};
            store[name][id] = { ...(store[name][id] ?? {}), ...data };
        },
        delete: async () => {
            if (store[name])
                delete store[name][id];
        },
    });
    const matches = (data, field, op, value) => {
        if (!data || op !== '==')
            return false;
        const key = typeof field === 'string' ? field : String(field.toString());
        return data[key] === value;
    };
    const queryApi = (name, field, op, value) => ({
        limit: () => queryApi(name, field, op, value),
        get: async () => {
            const docs = Object.entries(store[name] ?? {})
                .filter(([, data]) => matches(data, field, op, value))
                .map(([id, data]) => snapFor(id, data));
            return { empty: docs.length === 0, docs, size: docs.length };
        },
    });
    const db = {
        collection: (name) => ({
            doc: (id) => docApi(name, id),
            where: (field, op, value) => queryApi(name, field, op, value),
        }),
        batch: () => {
            const ops = [];
            return {
                set: (ref, data) => {
                    // ref carries only id in this stub; find its collection by scanning.
                    ops.push(() => {
                        for (const coll of Object.keys(store)) {
                            if (store[coll] && Object.prototype.hasOwnProperty.call(store[coll], ref.id)) {
                                store[coll][ref.id] = { ...(store[coll][ref.id] ?? {}), ...data };
                                return;
                            }
                        }
                    });
                },
                delete: () => { },
                commit: async () => ops.forEach((fn) => fn()),
            };
        },
        runTransaction: async (fn) => {
            const tx = {
                get: async (ref) => ref.get(),
                set: async (ref, data) => ref.set(data),
                delete: async (ref) => ref.delete(),
                update: async (ref, data) => ref.set(data),
            };
            return fn(tx);
        },
    };
    return { db, store };
}
describe('mergeStableAccounts', () => {
    beforeEach(() => {
        jest.spyOn(Date, 'now').mockReturnValue(NOW);
        jest.spyOn(console, 'log').mockImplementation(() => { });
        jest.spyOn(console, 'warn').mockImplementation(() => { });
    });
    afterEach(() => jest.restoreAllMocks());
    it('merges two stable ids into the higher-XP one and hides the loser', async () => {
        const { db, store } = makeDbStub({
            users: {
                'stable-tablet': {
                    firebaseAuthUid: 'google-1',
                    progress: { user_total_xp: '6812', streak_count: '2' },
                    shards: 491,
                },
                'stable-phone': {
                    firebaseAuthUid: 'google-1',
                    progress: { user_total_xp: '2309', streak_count: '9' },
                    shards: 1325,
                },
            },
        });
        const res = await (0, auth_merge_1.mergeStableAccounts)(db, 'google-1', 'stable-phone', 'stable-tablet', NOW);
        expect(res.canonicalStableId).toBe('stable-tablet'); // higher XP wins
        expect(res.mergedFromStableId).toBe('stable-phone');
        expect(res.alreadyMerged).toBe(false);
        const winner = store.users['stable-tablet'];
        expect(winner.progress.user_total_xp).toBe('6812');
        expect(winner.progress.streak_count).toBe('9'); // best-of
        expect(winner.shards).toBe(1325); // max
        expect(winner.firebaseAuthUid).toBe('google-1');
        const loser = store.users['stable-phone'];
        expect(loser.identityHidden).toBe(true);
        expect(loser.canonicalStableId).toBe('stable-tablet');
    });
    it('carries the loser\'s active premium onto the winner', async () => {
        const { db, store } = makeDbStub({
            users: {
                'stable-rich': {
                    firebaseAuthUid: 'google-2',
                    progress: {
                        user_total_xp: '10',
                        premium_plan: 'yearly',
                        premium_expiry: String(FUTURE),
                        had_premium_ever: 'true',
                    },
                },
                'stable-active': {
                    firebaseAuthUid: 'google-2',
                    progress: { user_total_xp: '9999' }, // higher XP but free
                },
            },
        });
        const res = await (0, auth_merge_1.mergeStableAccounts)(db, 'google-2', 'stable-active', 'stable-rich', NOW);
        expect(res.canonicalStableId).toBe('stable-active'); // higher XP
        const winner = store.users['stable-active'].progress;
        expect(winner.premium_plan).toBe('yearly'); // premium preserved from loser
        expect(winner.premium_expiry).toBe(String(FUTURE));
        expect(winner.had_premium_ever).toBe('true');
    });
    it('is idempotent when already merged (loser hidden → winner)', async () => {
        const { db } = makeDbStub({
            users: {
                'stable-canon': { firebaseAuthUid: 'google-3', progress: { user_total_xp: '500' } },
                'stable-old': {
                    firebaseAuthUid: 'google-3',
                    identityHidden: true,
                    canonicalStableId: 'stable-canon',
                    progress: { user_total_xp: '100' },
                },
            },
        });
        const res = await (0, auth_merge_1.mergeStableAccounts)(db, 'google-3', 'stable-old', 'stable-canon', NOW);
        expect(res.alreadyMerged).toBe(true);
        expect(res.canonicalStableId).toBe('stable-canon');
    });
    it('returns canonical without change when both ids are equal', async () => {
        const { db } = makeDbStub({
            users: { 'stable-x': { firebaseAuthUid: 'google-4', progress: { user_total_xp: '1' } } },
        });
        const res = await (0, auth_merge_1.mergeStableAccounts)(db, 'google-4', 'stable-x', 'stable-x', NOW);
        expect(res.alreadyMerged).toBe(true);
        expect(res.canonicalStableId).toBe('stable-x');
    });
    it('rejects when caller does not own one of the accounts', async () => {
        const { db } = makeDbStub({
            users: {
                'stable-mine': { firebaseAuthUid: 'google-5', progress: { user_total_xp: '10' } },
                'stable-someone-else': { firebaseAuthUid: 'google-OTHER', progress: { user_total_xp: '10' } },
            },
        });
        await expect((0, auth_merge_1.mergeStableAccounts)(db, 'google-5', 'stable-mine', 'stable-someone-else', NOW)).rejects.toMatchObject({ code: 'permission-denied' });
    });
});
//# sourceMappingURL=auth_merge.test.js.map