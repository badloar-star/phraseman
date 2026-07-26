"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let currentDb = null;
jest.mock('firebase-admin', () => ({
    firestore: Object.assign(() => currentDb, {
        FieldValue: { delete: () => ({ __delete: true }) },
    }),
}));
// The searcher-identity resolver is exercised separately in auth tests; here we just
// need it to be a no-op that never blocks the read path.
jest.mock('./auth_identity', () => ({
    resolveStableUidForAuth: jest.fn(async () => 'searcher-stable'),
}));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { friendLookupUser } = require('./friend_lookup');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { resolveStableUidForAuth } = require('./auth_identity');
function readField(data, path) {
    let cur = data;
    for (const part of path.split('.')) {
        if (cur == null || typeof cur !== 'object')
            return undefined;
        cur = cur[part];
    }
    return cur;
}
function makeDbStub(initial = {}) {
    const store = {
        users: { ...(initial.users ?? {}) },
        banned_users: { ...(initial.banned_users ?? {}) },
        leaderboard: { ...(initial.leaderboard ?? {}) },
        name_index: { ...(initial.name_index ?? {}) },
    };
    const snapFor = (id, data) => ({
        id,
        exists: !!data,
        data: () => data,
    });
    // Query builder supporting chained .where (== and range), .orderBy, .limit, .get.
    const makeQuery = (name) => {
        const filters = [];
        const api = {
            where: (field, op, value) => {
                filters.push({ field, op, value });
                return api;
            },
            orderBy: () => api,
            limit: (n) => ({
                get: async () => {
                    let rows = Object.entries(store[name] ?? {}).filter(([, d]) => !!d);
                    for (const f of filters) {
                        rows = rows.filter(([, d]) => {
                            const v = readField(d, f.field);
                            if (f.op === '==')
                                return v === f.value;
                            if (f.op === '>=')
                                return typeof v === 'string' && v >= f.value;
                            if (f.op === '<')
                                return typeof v === 'string' && v < f.value;
                            return false;
                        });
                    }
                    const docs = rows.slice(0, n).map(([id, d]) => snapFor(id, d));
                    return { empty: docs.length === 0, docs };
                },
            }),
            // Some callers .get() a query without .limit(); support that too.
            get: async () => {
                const docs = Object.entries(store[name] ?? {}).filter(([, d]) => !!d)
                    .map(([id, d]) => snapFor(id, d));
                return { empty: docs.length === 0, docs };
            },
        };
        return api;
    };
    const db = {
        collection: (name) => ({
            doc: (id) => ({
                get: async () => snapFor(id, store[name]?.[id]),
                set: async (data, opts) => {
                    store[name] = store[name] ?? {};
                    store[name][id] = opts?.merge ? { ...(store[name][id] ?? {}), ...data } : { ...data };
                },
            }),
            where: (field, op, value) => makeQuery(name).where(field, op, value),
        }),
    };
    currentDb = db;
    return { db, store };
}
function run(fn, data, authUid) {
    const req = { auth: authUid ? { uid: authUid, token: {} } : undefined, data, rawRequest: { headers: {} }, app: {} };
    if (typeof fn.run === 'function')
        return fn.run(req);
    return fn(req);
}
const VISIBLE = (name, xp = 100, level = 5) => ({
    progress: { user_name: name, user_name_lower: name.toLowerCase(), user_total_xp: String(xp), user_level: String(level) },
});
describe('friendLookupUser — finds players across all storage paths', () => {
    beforeEach(() => {
        resolveStableUidForAuth.mockClear();
        jest.spyOn(Date, 'now').mockReturnValue(1777000000000);
    });
    afterEach(() => jest.restoreAllMocks());
    it('rejects an unauthenticated request', async () => {
        makeDbStub();
        await expect(run(friendLookupUser, { query: 'Roma' }, null)).rejects.toMatchObject({ code: 'unauthenticated' });
    });
    it('finds a user via the fast name_index path', async () => {
        makeDbStub({
            name_index: { roma: { uid: 'u-roma', name: 'Roma', nameLower: 'roma' } },
            users: { 'u-roma': VISIBLE('Roma', 4200, 12) },
        });
        const res = await run(friendLookupUser, { query: '  @Roma ' }, 'searcher-auth');
        expect(res.user).toMatchObject({ uid: 'u-roma', name: 'Roma', level: 12, totalXp: 4200, source: 'name_index' });
    });
    it('finds a legacy user who is NOT in name_index (via users.progress) and self-heals the index', async () => {
        const { store } = makeDbStub({
            users: { 'u-old': VISIBLE('Olga') },
            // name_index intentionally empty — the old bug returned "not found" here.
        });
        const res = await run(friendLookupUser, { query: 'Olga' }, 'searcher-auth');
        expect(res.user).toMatchObject({ uid: 'u-old', name: 'Olga' });
        // Self-heal: the index now has the entry so next search hits the fast path.
        expect(store.name_index['olga']).toMatchObject({ uid: 'u-old', nameLower: 'olga' });
    });
    it('finds a legacy user present only in leaderboard', async () => {
        makeDbStub({
            users: { 'u-lb': { progress: { user_name: 'Boris', user_total_xp: '900' } } },
            leaderboard: { 'u-lb': { name: 'Boris', nameLower: 'boris' } },
        });
        const res = await run(friendLookupUser, { query: 'Boris' }, 'searcher-auth');
        expect(res.user).toMatchObject({ uid: 'u-lb', name: 'Boris' });
    });
    it('finds a user by name prefix ("Vitalii" → "Vitalii Virchyk")', async () => {
        makeDbStub({
            users: { 'u-vit': VISIBLE('Vitalii Virchyk') },
        });
        const res = await run(friendLookupUser, { query: 'Vitalii' }, 'searcher-auth');
        expect(res.user).toMatchObject({ uid: 'u-vit', name: 'Vitalii Virchyk' });
    });
    it('does not return banned or hidden targets', async () => {
        makeDbStub({
            name_index: { troll: { uid: 'u-troll', name: 'Troll', nameLower: 'troll' } },
            users: { 'u-troll': { ...VISIBLE('Troll'), identityHidden: true } },
        });
        const res = await run(friendLookupUser, { query: 'Troll' }, 'searcher-auth');
        expect(res.user).toBeNull();
    });
    it('returns null (not an error) for a genuinely unknown name', async () => {
        makeDbStub({ users: { 'u-x': VISIBLE('Someone') } });
        const res = await run(friendLookupUser, { query: 'Nobody' }, 'searcher-auth');
        expect(res).toEqual({ ok: true, user: null });
    });
    it('still searches when the searcher identity cannot be resolved (cold start)', async () => {
        // The reader-identity resolver may reject on cold start; the search must not throw.
        resolveStableUidForAuth.mockRejectedValueOnce(new Error('stable_id_required'));
        makeDbStub({
            name_index: { roma: { uid: 'u-roma', name: 'Roma', nameLower: 'roma' } },
            users: { 'u-roma': VISIBLE('Roma') },
        });
        const res = await run(friendLookupUser, { query: 'Roma' }, 'fresh-auth');
        expect(res.user).toMatchObject({ uid: 'u-roma', name: 'Roma' });
    });
});
//# sourceMappingURL=friend_lookup.test.js.map