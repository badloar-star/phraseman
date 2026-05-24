"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auth_identity_1 = require("./auth_identity");
function makeDbStub(initial = {}) {
    const store = {
        users: { ...(initial.users ?? {}) },
        auth_links: { ...(initial.auth_links ?? {}) },
        leaderboard: { ...(initial.leaderboard ?? {}) },
        league_groups: { ...(initial.league_groups ?? {}) },
        identity_cleanup_candidates: { ...(initial.identity_cleanup_candidates ?? {}) },
    };
    const sets = [];
    const snapFor = (id, data) => ({
        id,
        exists: !!data,
        data: () => data,
    });
    const db = {
        collection: (name) => ({
            doc: (id) => ({
                get: async () => snapFor(id, store[name]?.[id]),
                set: async (data, options) => {
                    sets.push({ path: `${name}/${id}`, data, options });
                    store[name] = store[name] ?? {};
                    store[name][id] = { ...(store[name][id] ?? {}), ...data };
                },
            }),
            where: () => ({
                limit: () => ({
                    get: async () => ({ empty: true, docs: [] }),
                }),
            }),
        }),
    };
    return { db, store, sets };
}
describe('linkStableAuthUid', () => {
    beforeEach(() => {
        jest.spyOn(Date, 'now').mockReturnValue(1777000000000);
    });
    afterEach(() => {
        jest.restoreAllMocks();
    });
    it('writes the stable user auth uid when the user doc is missing', async () => {
        const { db, store, sets } = makeDbStub();
        await (0, auth_identity_1.linkStableAuthUid)(db, 'stable-1', 'auth-1');
        expect(store.users['stable-1']).toEqual({
            firebaseAuthUid: 'auth-1',
            updatedAt: 1777000000000,
        });
        expect(sets).toEqual([
            {
                path: 'users/stable-1',
                data: { firebaseAuthUid: 'auth-1', updatedAt: 1777000000000 },
                options: { merge: true },
            },
        ]);
    });
    it('skips Firestore writes when user and leaderboard are already linked', async () => {
        const { db, sets } = makeDbStub({
            users: {
                'stable-1': { firebaseAuthUid: 'auth-1', updatedAt: 111 },
            },
            leaderboard: {
                'stable-1': { firebaseAuthUid: 'auth-1', updatedAt: 222 },
            },
        });
        await (0, auth_identity_1.linkStableAuthUid)(db, 'stable-1', 'auth-1');
        expect(sets).toEqual([]);
    });
    it('keeps the corrective path for a stale user auth uid', async () => {
        const { db, store, sets } = makeDbStub({
            users: {
                'stable-1': { firebaseAuthUid: 'old-auth', updatedAt: 111 },
            },
        });
        await (0, auth_identity_1.linkStableAuthUid)(db, 'stable-1', 'auth-1');
        expect(store.users['stable-1']).toMatchObject({
            firebaseAuthUid: 'auth-1',
            updatedAt: 1777000000000,
        });
        expect(sets).toEqual([
            {
                path: 'users/stable-1',
                data: { firebaseAuthUid: 'auth-1', updatedAt: 1777000000000 },
                options: { merge: true },
            },
        ]);
    });
    it('repairs an existing leaderboard doc without creating a missing one', async () => {
        const present = makeDbStub({
            users: {
                'stable-1': { firebaseAuthUid: 'auth-1', updatedAt: 111 },
            },
            leaderboard: {
                'stable-1': { firebaseAuthUid: 'old-auth', updatedAt: 222 },
            },
        });
        await (0, auth_identity_1.linkStableAuthUid)(present.db, 'stable-1', 'auth-1');
        expect(present.sets).toEqual([
            {
                path: 'leaderboard/stable-1',
                data: { firebaseAuthUid: 'auth-1', updatedAt: 1777000000000 },
                options: { merge: true },
            },
        ]);
        const missing = makeDbStub({
            users: {
                'stable-2': { firebaseAuthUid: 'auth-2', updatedAt: 333 },
            },
        });
        await (0, auth_identity_1.linkStableAuthUid)(missing.db, 'stable-2', 'auth-2');
        expect(missing.sets).toEqual([]);
        expect(missing.store.leaderboard['stable-2']).toBeUndefined();
    });
});
//# sourceMappingURL=auth_identity.test.js.map