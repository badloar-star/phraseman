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
            where: (field, op, value) => ({
                limit: () => ({
                    get: async () => {
                        const docs = Object.entries(store[name] ?? {})
                            .filter(([, data]) => data && op === '==' && data[field] === value)
                            .map(([id, data]) => snapFor(id, data));
                        return { empty: docs.length === 0, docs };
                    },
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
describe('resolveStableUidForAuth', () => {
    beforeEach(() => {
        jest.spyOn(Date, 'now').mockReturnValue(1777000000000);
    });
    afterEach(() => {
        jest.restoreAllMocks();
    });
    it('allows provider sign-in to repair a stable id still linked to the old anonymous auth uid', async () => {
        const { db, store } = makeDbStub({
            users: {
                'stable-1': { firebaseAuthUid: 'old-anon-auth', updatedAt: 111 },
            },
        });
        const stableUid = await (0, auth_identity_1.resolveStableUidForAuth)(db, 'google-auth-1', 'stable-1', {
            allowProviderRelink: true,
        });
        expect(stableUid).toBe('stable-1');
        expect(store.users['stable-1']).toMatchObject({
            firebaseAuthUid: 'google-auth-1',
            updatedAt: 1777000000000,
        });
    });
    it('does not let an anonymous auth session take over a stable id linked to a different auth uid', async () => {
        const { db } = makeDbStub({
            users: {
                'stable-1': { firebaseAuthUid: 'old-anon-auth', updatedAt: 111 },
            },
        });
        await expect((0, auth_identity_1.resolveStableUidForAuth)(db, 'new-anon-auth', 'stable-1')).rejects.toMatchObject({
            code: 'permission-denied',
            message: 'stable_id_mismatch',
        });
    });
    it('does not let a provider auth uid already linked to another user take over this stable id', async () => {
        const { db } = makeDbStub({
            users: {
                'stable-1': { firebaseAuthUid: 'old-anon-auth', updatedAt: 111 },
                'stable-2': { firebaseAuthUid: 'google-auth-1', updatedAt: 222 },
            },
        });
        await expect((0, auth_identity_1.resolveStableUidForAuth)(db, 'google-auth-1', 'stable-1', { allowProviderRelink: true })).rejects.toMatchObject({
            code: 'permission-denied',
            message: 'stable_id_mismatch',
        });
    });
});
//# sourceMappingURL=auth_identity.test.js.map