"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auth_merge_1 = require("./auth_merge");
const NOW = 1777000000000;
const FUTURE = NOW + 30 * 24 * 60 * 60 * 1000; // +30d
const PAST = NOW - 30 * 24 * 60 * 60 * 1000; // -30d
// ── Referral repoint on merge ───────────────────────────────────────────────────
describe('mergeUserProgress — referral claim counters (анти-сброс капа через мерж)', () => {
    it('СУММИРУЕТ месячные счётчики наград по месяцам (не теряет счёт лузера)', () => {
        const out = (0, auth_merge_1.mergeUserProgress)({ referral_vip_claims_monthly: { '2026-06': 20 } }, { referral_vip_claims_monthly: { '2026-06': 15, '2026-05': 7 } }, NOW);
        const m = out.referral_vip_claims_monthly;
        expect(m['2026-06']).toBe(35); // 20 + 15 — иначе мерж сбрасывал бы кап
        expect(m['2026-05']).toBe(7);
    });
    it('суммирует дневные счётчики по дням', () => {
        const out = (0, auth_merge_1.mergeUserProgress)({ referral_vip_claims_daily: { '2026-06-14': 3 } }, { referral_vip_claims_daily: { '2026-06-14': 2, '2026-06-13': 1 } }, NOW);
        const d = out.referral_vip_claims_daily;
        expect(d['2026-06-14']).toBe(5);
        expect(d['2026-06-13']).toBe(1);
    });
    it('берёт сторону, где есть данные, если у другой пусто', () => {
        const out = (0, auth_merge_1.mergeUserProgress)({}, { referral_vip_claims_monthly: { '2026-06': 9 } }, NOW);
        expect(out.referral_vip_claims_monthly['2026-06']).toBe(9);
    });
});
describe('chooseSurvivingAttribution — какой referee-attribution оставить при коллизии', () => {
    // На новый id (winner) переезжает attribution лузера; если у winner уже есть свой —
    // оставляем «дальше прошедший» по статусу, чтобы НЕ потерять награду и НЕ выдать дважды.
    const att = (status, extra = {}) => ({ status, ...extra });
    it('rewarded побеждает qualified и pending', () => {
        expect((0, auth_merge_1.chooseSurvivingAttribution)(att('rewarded'), att('qualified')).status).toBe('rewarded');
        expect((0, auth_merge_1.chooseSurvivingAttribution)(att('pending'), att('rewarded')).status).toBe('rewarded');
    });
    it('qualified побеждает pending', () => {
        expect((0, auth_merge_1.chooseSurvivingAttribution)(att('qualified'), att('pending')).status).toBe('qualified');
    });
    it('при равном статусе берёт существующий у winner (a)', () => {
        const a = att('qualified', { refCode: 'AAA' });
        const b = att('qualified', { refCode: 'BBB' });
        expect((0, auth_merge_1.chooseSurvivingAttribution)(a, b).refCode).toBe('AAA');
    });
    it('если одна сторона отсутствует — берёт имеющуюся', () => {
        expect((0, auth_merge_1.chooseSurvivingAttribution)(undefined, att('pending')).status).toBe('pending');
        expect((0, auth_merge_1.chooseSurvivingAttribution)(att('qualified'), undefined).status).toBe('qualified');
    });
});
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
    it('lifetime (plan=lifetime, expiry=0) wins over an active subscription', () => {
        const a = { premium_plan: 'yearly', premium_expiry: String(FUTURE), premium_rc_store: 'APP_STORE' };
        const b = { premium_plan: 'lifetime', premium_expiry: '0', premium_rc_store: 'APP_STORE' };
        const out = (0, auth_merge_1.mergeUserProgress)(a, b, NOW);
        // lifetime expiry=0 → MAX_SAFE_INTEGER strength → wins
        expect(out.premium_plan).toBe('lifetime');
        expect(out.premium_expiry).toBe('0');
    });
    it('lifetime from loser side carries over to winner with no premium', () => {
        const winner = { user_total_xp: '9999', premium_plan: '' };
        const loser = { user_total_xp: '5', premium_plan: 'lifetime', premium_expiry: '0' };
        const out = (0, auth_merge_1.mergeUserProgress)(winner, loser, NOW);
        expect(out.premium_plan).toBe('lifetime');
        expect(out.premium_expiry).toBe('0');
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
    const docApi = (name, id) => ({
        id,
        get: async () => snapFor(name, id, store[name]?.[id]),
        set: async (data) => {
            store[name] = store[name] ?? {};
            store[name][id] = { ...(store[name][id] ?? {}), ...data };
        },
        delete: async () => {
            if (store[name])
                delete store[name][id];
        },
    });
    // ref carries a functional handle (set/delete) so query-result .ref works in repoint logic.
    const snapFor = (name, id, data) => ({
        id,
        ref: docApi(name, id),
        exists: !!data,
        data: () => data,
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
                .map(([id, data]) => snapFor(name, id, data));
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
                // ref (from docApi/snapFor.ref) carries its own collection via closure — write
                // through it directly. Раньше стаб сканировал коллекции по ref.id и писал в ПЕРВУЮ
                // совпавшую — это ломалось, как только один и тот же id жил в двух коллекциях
                // (напр. auth_links/{authUid} + users/{authUid}). Пишем по настоящей ссылке.
                set: (ref, data) => {
                    ops.push(() => ref.set(data));
                },
                delete: (ref) => {
                    ops.push(() => ref.delete());
                },
                commit: async () => { for (const fn of ops)
                    await fn(); },
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
        expect(winner.shards_updated_at_ms).toBe(NOW);
        expect(winner.shards_updated_op).toBe('replace');
        expect(winner.shards_updated_reason).toBe('account_merge');
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
    // ── #11: absorb a device-held anonymous account via a fresh self-stamped claim ──
    it('absorbs an unowned anonymous LOSER that carries a fresh anon_merge_claim', async () => {
        // 2nd device played anonymously as anon-uid-2; it stamped anon_merge_claim
        // while still anonymous, then signed into the existing account (owned by
        // google-11, higher XP). The anon progress must merge in, not orphan.
        const { db, store } = makeDbStub({
            users: {
                'stable-mine': { firebaseAuthUid: 'google-11', progress: { user_total_xp: '5000' }, shards: 100 },
                'stable-anon': {
                    firebaseAuthUid: 'anon-uid-2',
                    anon_merge_claim: { authUid: 'anon-uid-2', at: NOW - 60000 }, // 1 min ago = fresh
                    progress: { user_total_xp: '300', streak_count: '7' },
                    shards: 40,
                },
            },
        });
        const res = await (0, auth_merge_1.mergeStableAccounts)(db, 'google-11', 'stable-anon', 'stable-mine', NOW);
        expect(res.canonicalStableId).toBe('stable-mine'); // owned + higher XP wins
        expect(res.mergedFromStableId).toBe('stable-anon');
        const winner = store.users['stable-mine'];
        expect(winner.progress.streak_count).toBe('7'); // absorbed from anon
        expect(winner.shards).toBe(100); // max(100,40)
        expect(winner.shards_updated_at_ms).toBe(NOW);
        expect(winner.shards_updated_reason).toBe('account_merge');
        expect(store.users['stable-anon'].identityHidden).toBe(true);
    });
    it('rejects absorbing an unowned account with NO claim', async () => {
        const { db } = makeDbStub({
            users: {
                'stable-mine': { firebaseAuthUid: 'google-12', progress: { user_total_xp: '5000' } },
                'stable-anon': { firebaseAuthUid: 'anon-x', progress: { user_total_xp: '300' } }, // no claim
            },
        });
        await expect((0, auth_merge_1.mergeStableAccounts)(db, 'google-12', 'stable-anon', 'stable-mine', NOW)).rejects.toMatchObject({ code: 'permission-denied' });
    });
    it('rejects a STALE anon_merge_claim (older than the TTL)', async () => {
        const { db } = makeDbStub({
            users: {
                'stable-mine': { firebaseAuthUid: 'google-13', progress: { user_total_xp: '5000' } },
                'stable-anon': {
                    firebaseAuthUid: 'anon-y',
                    anon_merge_claim: { authUid: 'anon-y', at: NOW - 60 * 60 * 1000 }, // 1h ago = stale
                    progress: { user_total_xp: '300' },
                },
            },
        });
        await expect((0, auth_merge_1.mergeStableAccounts)(db, 'google-13', 'stable-anon', 'stable-mine', NOW)).rejects.toMatchObject({ code: 'permission-denied' });
    });
    it('rejects a claim whose authUid does NOT match the loser doc owner', async () => {
        // An attacker who learned a stable_id could try to forge a claim, but the
        // claim.authUid must equal the loser doc's firebaseAuthUid (the anon uid that
        // truly held it). A mismatch is rejected.
        const { db } = makeDbStub({
            users: {
                'stable-mine': { firebaseAuthUid: 'google-14', progress: { user_total_xp: '5000' } },
                'stable-anon': {
                    firebaseAuthUid: 'anon-real-owner',
                    anon_merge_claim: { authUid: 'attacker-uid', at: NOW - 1000 }, // mismatched
                    progress: { user_total_xp: '300' },
                },
            },
        });
        await expect((0, auth_merge_1.mergeStableAccounts)(db, 'google-14', 'stable-anon', 'stable-mine', NOW)).rejects.toMatchObject({ code: 'permission-denied' });
    });
    it('still rejects when the unowned side would WIN even with a claim (never overwrite owned)', async () => {
        const { db } = makeDbStub({
            users: {
                'stable-mine': { firebaseAuthUid: 'google-15', progress: { user_total_xp: '10' } },
                'stable-anon-rich': {
                    firebaseAuthUid: 'anon-z',
                    anon_merge_claim: { authUid: 'anon-z', at: NOW - 1000 },
                    progress: { user_total_xp: '99999' }, // higher XP → would be winner
                },
            },
        });
        await expect((0, auth_merge_1.mergeStableAccounts)(db, 'google-15', 'stable-anon-rich', 'stable-mine', NOW)).rejects.toMatchObject({ code: 'permission-denied' });
    });
    // ── Account-takeover regressions (#11 / #12): a leaked stable_id (public as a
    //    leaderboard doc id) must NEVER let a caller who does not own the account
    //    rebind it to their own auth uid. ─────────────────────────────────────────
    it('#11: a===b — attacker with NO users doc cannot rebind a stranger account', async () => {
        // Attacker signed in fresh (attacker-uid), has no users doc of their own.
        // They pass a victim stable_id (harvested from the public leaderboard) as BOTH
        // ids to hit the a===b short-circuit. Must be rejected, and the victim's
        // firebaseAuthUid must be left untouched.
        const { db, store } = makeDbStub({
            users: {
                'victim-anon': { firebaseAuthUid: 'victim-uid', progress: { user_total_xp: '4200' } },
            },
        });
        await expect((0, auth_merge_1.mergeStableAccounts)(db, 'attacker-uid', 'victim-anon', 'victim-anon', NOW)).rejects.toMatchObject({ code: 'permission-denied' });
        expect(store.users['victim-anon'].firebaseAuthUid).toBe('victim-uid'); // NOT rebound
    });
    it('#12: attacker with no users doc cannot win-merge a purely-anonymous victim', async () => {
        // Two purely-anonymous victim accounts harvested from the leaderboard. Attacker
        // has no users doc, so the old anon-relink probe reported owned:true. The winner
        // gate now requires GENUINE ownership → rejected, and neither victim is rebound.
        const { db, store } = makeDbStub({
            users: {
                'victim-a': { firebaseAuthUid: 'victim-a-uid', progress: { user_total_xp: '9000' } },
                'victim-b': { firebaseAuthUid: 'victim-b-uid', progress: { user_total_xp: '100' } },
            },
        });
        await expect((0, auth_merge_1.mergeStableAccounts)(db, 'attacker-uid', 'victim-a', 'victim-b', NOW)).rejects.toMatchObject({ code: 'permission-denied' });
        expect(store.users['victim-a'].firebaseAuthUid).toBe('victim-a-uid'); // NOT rebound
        expect(store.users['victim-b'].firebaseAuthUid).toBe('victim-b-uid'); // NOT rebound
    });
    it('legit: idempotent a===b still works for the genuine owner', async () => {
        const { db } = makeDbStub({
            users: { 'stable-own': { firebaseAuthUid: 'google-99', progress: { user_total_xp: '7' } } },
        });
        const res = await (0, auth_merge_1.mergeStableAccounts)(db, 'google-99', 'stable-own', 'stable-own', NOW);
        expect(res.alreadyMerged).toBe(true);
        expect(res.canonicalStableId).toBe('stable-own');
    });
});
// ── Integration: repointReferralOnMerge ──────────────────────────────────────
describe('repointReferralOnMerge — перенос реферальных данных loser → winner', () => {
    it('переносит attribution-роль REFEREE (doc loser → winner) и удаляет лузерский', async () => {
        const { db, store } = makeDbStub();
        store.referral_attributions = {
            loser: { referrerStableId: 'someoneElse', status: 'qualified', refCode: 'ABC123' },
        };
        await (0, auth_merge_1.repointReferralOnMerge)(db, 'winner', 'loser');
        expect(store.referral_attributions.loser).toBeUndefined();
        expect(store.referral_attributions.winner).toMatchObject({ referrerStableId: 'someoneElse', status: 'qualified' });
    });
    it('переносит роль REFERRER (referrerStableId loser → winner) на всех приглашённых', async () => {
        const { db, store } = makeDbStub();
        store.referral_attributions = {
            friendA: { referrerStableId: 'loser', status: 'qualified' },
            friendB: { referrerStableId: 'loser', status: 'pending' },
            other: { referrerStableId: 'unrelated', status: 'qualified' },
        };
        await (0, auth_merge_1.repointReferralOnMerge)(db, 'winner', 'loser');
        expect(store.referral_attributions.friendA?.referrerStableId).toBe('winner');
        expect(store.referral_attributions.friendB?.referrerStableId).toBe('winner');
        expect(store.referral_attributions.other?.referrerStableId).toBe('unrelated');
    });
    it('НЕ создаёт self-referral: удаляет запись, где referrer стал бы == referee', async () => {
        const { db, store } = makeDbStub();
        store.referral_attributions = {
            // loser пригласил winner → после слияния это сам себя пригласил
            winner: { referrerStableId: 'loser', status: 'pending' },
        };
        await (0, auth_merge_1.repointReferralOnMerge)(db, 'winner', 'loser');
        expect(store.referral_attributions.winner).toBeUndefined();
    });
    it('при коллизии referee-доков оставляет дальше прошедший статус (rewarded > pending)', async () => {
        const { db, store } = makeDbStub();
        store.referral_attributions = {
            winner: { referrerStableId: 'refX', status: 'pending' },
            loser: { referrerStableId: 'refY', status: 'rewarded' },
        };
        await (0, auth_merge_1.repointReferralOnMerge)(db, 'winner', 'loser');
        expect(store.referral_attributions.loser).toBeUndefined();
        expect(store.referral_attributions.winner?.status).toBe('rewarded');
    });
    it('переносит владение кодом (referral_codes.ownerStableId + referral_owners)', async () => {
        const { db, store } = makeDbStub();
        store.referral_codes = { ZZZ999: { ownerStableId: 'loser', normalized: 'ZZZ999' } };
        store.referral_owners = { loser: { code: 'ZZZ999', ownerStableId: 'loser' } };
        await (0, auth_merge_1.repointReferralOnMerge)(db, 'winner', 'loser');
        expect(store.referral_codes.ZZZ999?.ownerStableId).toBe('winner');
        expect(store.referral_owners.loser).toBeUndefined();
        expect(store.referral_owners.winner).toMatchObject({ ownerStableId: 'winner', code: 'ZZZ999' });
    });
    it('no-op при winner === loser', async () => {
        const { db, store } = makeDbStub();
        store.referral_attributions = { x: { referrerStableId: 'x', status: 'pending' } };
        await (0, auth_merge_1.repointReferralOnMerge)(db, 'same', 'same');
        expect(store.referral_attributions.x).toBeDefined();
    });
});
//# sourceMappingURL=auth_merge.test.js.map