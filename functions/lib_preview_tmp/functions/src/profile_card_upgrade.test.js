"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let autoId = 0;
function collectionFor(path) {
    const depth = path.split('/').length + 1;
    return {
        doc: (id) => refFor(`${path}/${id || `auto_${++autoId}`}`),
        get: async () => {
            const children = [...docs.keys()]
                .filter((k) => k.startsWith(`${path}/`) && k.split('/').length === depth)
                .map((k) => snapFor(k));
            return { docs: children, size: children.length };
        },
    };
}
const docs = new Map();
function deepMerge(target, source) {
    // Mirrors Firestore { merge: true }: nested plain objects are deep-merged so writing
    // progress.profile_card_level keeps sibling progress.* keys intact.
    const result = { ...target };
    for (const [key, value] of Object.entries(source)) {
        const existing = target[key];
        if (value &&
            typeof value === 'object' &&
            !Array.isArray(value) &&
            existing &&
            typeof existing === 'object' &&
            !Array.isArray(existing)) {
            result[key] = deepMerge(existing, value);
        }
        else {
            result[key] = value;
        }
    }
    return result;
}
function refFor(path) {
    const id = path.split('/').pop() || path;
    return {
        id,
        path,
        get: async () => snapFor(path),
        set: async (data, opts) => {
            docs.set(path, opts?.merge ? deepMerge(docs.get(path) ?? {}, data) : { ...data });
        },
        collection: (name) => collectionFor(`${path}/${name}`),
    };
}
function snapFor(path) {
    const data = docs.get(path);
    return {
        id: path.split('/').pop() || path,
        exists: data !== undefined,
        data: () => data,
    };
}
function fakeDb() {
    return {
        collection: (name) => ({
            doc: (id) => refFor(`${name}/${id || 'auto'}`),
        }),
        runTransaction: async (fn) => {
            const writes = [];
            const result = await fn({
                get: (ref) => ref.get(),
                set: (ref, data, opts) => {
                    writes.push(() => {
                        docs.set(ref.path, opts?.merge ? deepMerge(docs.get(ref.path) ?? {}, data) : { ...data });
                    });
                },
            });
            writes.forEach((write) => write());
            return result;
        },
    };
}
class FakeHttpsError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
jest.mock('firebase-functions/v2/https', () => ({
    HttpsError: FakeHttpsError,
    onCall: (optsOrHandler, maybeHandler) => typeof optsOrHandler === 'function' ? optsOrHandler : maybeHandler,
}));
jest.mock('./callable_options', () => ({ HOT_CALLABLE_OPTIONS: {} }));
jest.mock('./auth_identity', () => ({
    // Mirror the real resolver's key behaviour: when a stableId is passed it wins (the doc
    // the client stores shards under); otherwise fall back to the auth uid.
    resolveStableUidForAuth: jest.fn(async (_db, authUid, requestedStableId) => typeof requestedStableId === 'string' && requestedStableId ? requestedStableId : authUid),
}));
jest.mock('firebase-admin', () => {
    const firestore = jest.fn(() => fakeDb());
    firestore.FieldValue = {
        serverTimestamp: () => ({ __op: 'serverTimestamp' }),
    };
    return { firestore };
});
async function callUpgrade(data, authUid = 'u1') {
    const { profileCardUpgrade } = require('./profile_card_upgrade');
    return profileCardUpgrade({ auth: { uid: authUid }, data });
}
beforeEach(() => {
    jest.resetModules();
    docs.clear();
});
describe('profileCardUpgrade', () => {
    it('rejects unauthenticated callers', async () => {
        const { profileCardUpgrade } = require('./profile_card_upgrade');
        await expect(profileCardUpgrade({ auth: undefined, data: {} })).rejects.toThrow('Not authenticated');
    });
    it('charges the exact next-level cost and raises the authoritative level (progress field)', async () => {
        docs.set('users/u1', { shards: 250, progress: { profile_card_level: 0 } });
        const res = await callUpgrade({ expectedLevel: 0 });
        expect(res).toMatchObject({ ok: true, alreadyApplied: false, level: 1, spent: 200, balance: 50 });
        const u = docs.get('users/u1');
        expect(u.shards).toBe(50);
        // The badge reads progress.profile_card_level (sync_leaderboard.ts), so the CF must
        // write THERE — not a dead root field that nothing renders from.
        expect(u.progress.profile_card_level).toBe(1);
    });
    it('reads the doc under the client stableId, not the auth uid (the shop-bug fix)', async () => {
        // Shards live under the stableId doc; the auth-uid doc is empty (or absent). Before the
        // fix the CF resolved to the auth uid → balance 0 → false "insufficient" → shard shop.
        docs.set('users/stable-1', { shards: 250, progress: { profile_card_level: 0 } });
        // (no users/auth-1 doc on purpose)
        const res = await callUpgrade({ expectedLevel: 0, stableId: 'stable-1' }, 'auth-1');
        expect(res).toMatchObject({ ok: true, level: 1, spent: 200, balance: 50 });
        expect(docs.get('users/stable-1').progress.profile_card_level).toBe(1);
        expect(docs.get('users/auth-1')).toBeUndefined();
    });
    it('preserves sibling progress keys when upgrading', async () => {
        docs.set('users/u1', { shards: 250, progress: { profile_card_level: 0, streak_count: '7', user_total_xp: '999' } });
        await callUpgrade({ expectedLevel: 0 });
        const u = docs.get('users/u1');
        expect(u.progress).toMatchObject({ profile_card_level: 1, streak_count: '7', user_total_xp: '999' });
    });
    it('refuses to upgrade when shards are insufficient and spends nothing', async () => {
        docs.set('users/u1', { shards: 190, progress: { profile_card_level: 0 } });
        const res = await callUpgrade({ expectedLevel: 0 });
        expect(res).toMatchObject({ ok: false, reason: 'insufficient', level: 0, balance: 190, cost: 200 });
        const u = docs.get('users/u1');
        expect(u.shards).toBe(190);
        expect(u.progress.profile_card_level).toBe(0);
    });
    it('is idempotent: a duplicate call after the server already advanced does not double-charge', async () => {
        // Server already has Pro, but client still thinks it is at level 0 (retry / race).
        docs.set('users/u1', { shards: 500, progress: { profile_card_level: 1 } });
        const res = await callUpgrade({ expectedLevel: 0 });
        expect(res).toMatchObject({ ok: true, alreadyApplied: true, level: 1, spent: 0 });
        const u = docs.get('users/u1');
        expect(u.shards).toBe(500);
        expect(u.progress.profile_card_level).toBe(1);
    });
    it('returns max at Legend (V) without charging', async () => {
        docs.set('users/u1', { shards: 9999, progress: { profile_card_level: 5 } });
        const res = await callUpgrade({ expectedLevel: 5 });
        expect(res).toMatchObject({ ok: false, reason: 'max', level: 5 });
        const u = docs.get('users/u1');
        expect(u.shards).toBe(9999);
        expect(u.progress.profile_card_level).toBe(5);
    });
    it('charges the ladder prices level by level (200/450/800/1400/2400)', async () => {
        const total = 200 + 450 + 800 + 1400 + 2400;
        docs.set('users/u1', { shards: total, progress: { profile_card_level: 0 } });
        const expected = [
            { level: 1, spent: 200 },
            { level: 2, spent: 450 },
            { level: 3, spent: 800 },
            { level: 4, spent: 1400 },
            { level: 5, spent: 2400 },
        ];
        for (const step of expected) {
            const res = await callUpgrade({ expectedLevel: step.level - 1 });
            expect(res).toMatchObject({ ok: true, alreadyApplied: false, level: step.level, spent: step.spent });
        }
        const u = docs.get('users/u1');
        expect(u.shards).toBe(0);
        expect(u.progress.profile_card_level).toBe(5);
    });
    it('refuses a mid-ladder step when shards cover only the previous price', async () => {
        // 200 was enough for I, but II costs 450 — no charge, no level bump.
        docs.set('users/u1', { shards: 449, progress: { profile_card_level: 1 } });
        const res = await callUpgrade({ expectedLevel: 1 });
        expect(res).toMatchObject({ ok: false, reason: 'insufficient', level: 1, balance: 449, cost: 450 });
        expect(docs.get('users/u1').progress.profile_card_level).toBe(1);
    });
    it('assigns sequential Legend numbers from the global counter, once per player', async () => {
        docs.set('users/u1', { shards: 2400, progress: { profile_card_level: 4 } });
        docs.set('users/u2', { shards: 2400, progress: { profile_card_level: 4 } });
        const first = await callUpgrade({ expectedLevel: 4 }, 'u1');
        const second = await callUpgrade({ expectedLevel: 4, stableId: 'u2' }, 'auth-x');
        expect(first).toMatchObject({ ok: true, level: 5, spent: 2400, legendNo: 1 });
        expect(second).toMatchObject({ ok: true, level: 5, spent: 2400, legendNo: 2 });
        expect(docs.get('users/u1').progress.profile_card_legend_no).toBe(1);
        expect(docs.get('users/u2').progress.profile_card_legend_no).toBe(2);
        expect(docs.get('stats/profile_card_legends').issued).toBe(2);
    });
    it('does not attach a legend number to non-Legend upgrades', async () => {
        docs.set('users/u1', { shards: 450, progress: { profile_card_level: 1 } });
        const res = await callUpgrade({ expectedLevel: 1 });
        expect(res).toMatchObject({ ok: true, level: 2, spent: 450 });
        expect(res.legendNo).toBeUndefined();
        expect(docs.get('users/u1').progress.profile_card_legend_no).toBeUndefined();
        expect(docs.get('stats/profile_card_legends')).toBeUndefined();
    });
    it('uses the server cost table, not a client-supplied cost', async () => {
        docs.set('users/u1', { shards: 1000, progress: { profile_card_level: 0 } });
        // Even though the client could try to pass a bogus cheap cost, the server uses Pro = 200.
        const res = await callUpgrade({ expectedLevel: 0, cost: 1 });
        expect(res).toMatchObject({ ok: true, level: 1, spent: 200, balance: 800 });
    });
});
describe('profileCardUpgrade — Фаза 4: «праздник легенды»', () => {
    it('grants +5 shards with server markers and a shard_log to every friend of a fresh Legend', async () => {
        docs.set('users/u1', { shards: 2400, progress: { profile_card_level: 4 } });
        docs.set('users/u1/friends/f1', { since: 1 });
        docs.set('users/u1/friends/f2', { since: 2 });
        docs.set('users/f1', { shards: 10 });
        docs.set('users/f2', { shards: 0 });
        const res = await callUpgrade({ expectedLevel: 4 });
        expect(res).toMatchObject({ ok: true, alreadyApplied: false, level: 5, legendNo: 1 });
        for (const [fid, before, after] of [['f1', 10, 15], ['f2', 0, 5]]) {
            const friend = docs.get(`users/${fid}`);
            expect(friend.shards).toBe(after);
            expect(friend.shards_updated_op).toBe('earn');
            expect(friend.shards_updated_reason).toBe('legend_celebration_gift');
            expect(Number.isFinite(friend.shards_updated_at_ms)).toBe(true);
            const log = [...docs.entries()].find(([path, data]) => path.startsWith(`users/${fid}/shard_log/`) && data.reason === 'legend_celebration_gift');
            expect(log).toBeDefined();
            expect(log[1]).toMatchObject({ type: 'earn', amount: 5, balanceBefore: before, balanceAfter: after, legendUid: 'u1', legendNo: 1 });
        }
    });
    it('announces the new Legend into the friends feed with a stable doc id (no duplicates)', async () => {
        docs.set('users/u1', { shards: 2400, progress: { profile_card_level: 4 } });
        const res = await callUpgrade({ expectedLevel: 4 });
        expect(res).toMatchObject({ ok: true, level: 5, legendNo: 1 });
        const feedDoc = docs.get('users/u1/my_events/legend_celebration');
        expect(feedDoc).toMatchObject({
            type: 'achievement',
            uid: 'u1',
            payload: { icon: '👑', nameRu: 'Легенда №1' },
        });
        expect(Number.isFinite(feedDoc.ts)).toBe(true);
    });
    it('does not gift or announce on an idempotent replay (level already granted earlier)', async () => {
        docs.set('users/u1', { shards: 500, progress: { profile_card_level: 5, profile_card_legend_no: 7 } });
        docs.set('users/u1/friends/f1', { since: 1 });
        docs.set('users/f1', { shards: 42 });
        const res = await callUpgrade({ expectedLevel: 4 });
        expect(res).toMatchObject({ ok: true, alreadyApplied: true, spent: 0 });
        expect(docs.get('users/f1').shards).toBe(42);
        expect(docs.get('users/u1/my_events/legend_celebration')).toBeUndefined();
    });
    it('does not gift or announce on non-Legend upgrades', async () => {
        docs.set('users/u1', { shards: 800, progress: { profile_card_level: 2 } });
        docs.set('users/u1/friends/f1', { since: 1 });
        docs.set('users/f1', { shards: 42 });
        const res = await callUpgrade({ expectedLevel: 2 });
        expect(res).toMatchObject({ ok: true, alreadyApplied: false, level: 3, spent: 800 });
        expect(docs.get('users/f1').shards).toBe(42);
        expect(docs.get('users/u1/my_events/legend_celebration')).toBeUndefined();
    });
    it('keeps the upgrade successful even when the legend has no friends', async () => {
        docs.set('users/u1', { shards: 2400, progress: { profile_card_level: 4 } });
        const res = await callUpgrade({ expectedLevel: 4 });
        expect(res).toMatchObject({ ok: true, level: 5, legendNo: 1 });
        expect(docs.get('users/u1/my_events/legend_celebration')).toBeDefined();
    });
});
//# sourceMappingURL=profile_card_upgrade.test.js.map