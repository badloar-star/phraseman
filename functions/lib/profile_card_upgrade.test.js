"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
        docs.set('users/u1', { shards: 100, progress: { profile_card_level: 0 } });
        const res = await callUpgrade({ expectedLevel: 0 });
        expect(res).toMatchObject({ ok: true, alreadyApplied: false, level: 1, spent: 30, balance: 70 });
        const u = docs.get('users/u1');
        expect(u.shards).toBe(70);
        // The badge reads progress.profile_card_level (sync_leaderboard.ts), so the CF must
        // write THERE — not a dead root field that nothing renders from.
        expect(u.progress.profile_card_level).toBe(1);
    });
    it('reads the doc under the client stableId, not the auth uid (the shop-bug fix)', async () => {
        // Shards live under the stableId doc; the auth-uid doc is empty (or absent). Before the
        // fix the CF resolved to the auth uid → balance 0 → false "insufficient" → shard shop.
        docs.set('users/stable-1', { shards: 100, progress: { profile_card_level: 0 } });
        // (no users/auth-1 doc on purpose)
        const res = await callUpgrade({ expectedLevel: 0, stableId: 'stable-1' }, 'auth-1');
        expect(res).toMatchObject({ ok: true, level: 1, spent: 30, balance: 70 });
        expect(docs.get('users/stable-1').progress.profile_card_level).toBe(1);
        expect(docs.get('users/auth-1')).toBeUndefined();
    });
    it('preserves sibling progress keys when upgrading', async () => {
        docs.set('users/u1', { shards: 100, progress: { profile_card_level: 0, streak_count: '7', user_total_xp: '999' } });
        await callUpgrade({ expectedLevel: 0 });
        const u = docs.get('users/u1');
        expect(u.progress).toMatchObject({ profile_card_level: 1, streak_count: '7', user_total_xp: '999' });
    });
    it('refuses to upgrade when shards are insufficient and spends nothing', async () => {
        docs.set('users/u1', { shards: 20, progress: { profile_card_level: 0 } });
        const res = await callUpgrade({ expectedLevel: 0 });
        expect(res).toMatchObject({ ok: false, reason: 'insufficient', level: 0, balance: 20, cost: 30 });
        const u = docs.get('users/u1');
        expect(u.shards).toBe(20);
        expect(u.progress.profile_card_level).toBe(0);
    });
    it('is idempotent: a duplicate call after the server already advanced does not double-charge', async () => {
        // Server already at level 2, but client still thinks it is at level 1 (retry / race).
        docs.set('users/u1', { shards: 500, progress: { profile_card_level: 2 } });
        const res = await callUpgrade({ expectedLevel: 1 });
        expect(res).toMatchObject({ ok: true, alreadyApplied: true, level: 2, spent: 0 });
        const u = docs.get('users/u1');
        expect(u.shards).toBe(500);
        expect(u.progress.profile_card_level).toBe(2);
    });
    it('returns max at level 5 without charging', async () => {
        docs.set('users/u1', { shards: 999, progress: { profile_card_level: 5 } });
        const res = await callUpgrade({ expectedLevel: 5 });
        expect(res).toMatchObject({ ok: false, reason: 'max', level: 5 });
        const u = docs.get('users/u1');
        expect(u.shards).toBe(999);
        expect(u.progress.profile_card_level).toBe(5);
    });
    it('uses the server cost table, not a client-supplied cost', async () => {
        docs.set('users/u1', { shards: 1000, progress: { profile_card_level: 3 } });
        // Even though the client could try to pass a bogus cheap cost, the server uses level 4 = 160.
        const res = await callUpgrade({ expectedLevel: 3, cost: 1 });
        expect(res).toMatchObject({ ok: true, level: 4, spent: 160, balance: 840 });
    });
});
//# sourceMappingURL=profile_card_upgrade.test.js.map