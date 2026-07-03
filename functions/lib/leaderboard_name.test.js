"use strict";
// Shared holder so the firebase-admin mock's firestore() returns the per-test
// stub db (the callables call admin.firestore() internally, ignoring any arg).
let currentDb = null;
// firebase-admin FieldValue.delete() → our stub recognizes { __delete: true }.
jest.mock('firebase-admin', () => ({
    firestore: Object.assign(() => currentDb, {
        FieldValue: { delete: () => ({ __delete: true }) },
    }),
}));
// Import AFTER the mock is registered.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { nameCheckAvailability, nameReserve } = require('./leaderboard');
function makeDbStub(initial = {}) {
    const store = {
        users: { ...(initial.users ?? {}) },
        banned_users: { ...(initial.banned_users ?? {}) },
        leaderboard: { ...(initial.leaderboard ?? {}) },
        name_index: { ...(initial.name_index ?? {}) },
        auth_links: { ...(initial.auth_links ?? {}) },
    };
    const snapFor = (id, data) => ({
        id,
        ref: { id, __coll: undefined },
        exists: !!data,
        data: () => data,
    });
    const readField = (data, path) => {
        let cur = data;
        for (const part of path.split('.')) {
            if (cur == null || typeof cur !== 'object')
                return undefined;
            cur = cur[part];
        }
        return cur;
    };
    const docApi = (name, id) => ({
        id,
        __coll: name,
        get: async () => {
            const s = snapFor(id, store[name]?.[id]);
            s.ref.__coll = name;
            return s;
        },
        set: async (data) => {
            store[name] = store[name] ?? {};
            const cur = { ...(store[name][id] ?? {}) };
            for (const [k, v] of Object.entries(data)) {
                if (v && typeof v === 'object' && v.__delete) {
                    delete cur[k];
                }
                else {
                    cur[k] = v;
                }
            }
            store[name][id] = cur;
        },
        delete: async () => {
            if (store[name])
                delete store[name][id];
        },
    });
    const db = {
        collection: (name) => ({
            doc: (id) => docApi(name, id),
            where: (field, op, value) => ({
                limit: () => ({
                    get: async () => {
                        const docs = Object.entries(store[name] ?? {})
                            .filter(([, data]) => data && op === '==' && readField(data, field) === value)
                            .map(([id, data]) => snapFor(id, data));
                        return { empty: docs.length === 0, docs };
                    },
                }),
            }),
        }),
        runTransaction: async (fn) => {
            const tx = {
                get: async (ref) => ref.get(),
                set: async (ref, data) => ref.set(data),
                delete: async (ref) => ref.delete(),
            };
            return fn(tx);
        },
    };
    currentDb = db;
    return { db, store };
}
// Invoke the onCall handler directly. firebase-functions v2 onCall returns a
// callable whose .run executes the handler; we call the wrapped fn via its
// internal handler by passing a CallableRequest-shaped object.
function callableRun(fn, data, authUid) {
    // firebase-functions v2 onCall returns a function with a `.run` in tests;
    // fall back to calling it as the raw handler.
    const req = { auth: { uid: authUid, token: {} }, data, rawRequest: { headers: {} }, app: {} };
    if (typeof fn.run === 'function')
        return fn.run(req);
    return fn(req);
}
describe('nameReserve — atomic uniqueness', () => {
    beforeEach(() => {
        jest.spyOn(Date, 'now').mockReturnValue(1777000000000);
    });
    afterEach(() => jest.restoreAllMocks());
    it('reserves a free name for a known user', async () => {
        const { db, store } = makeDbStub({
            users: { 'stable-a': { firebaseAuthUid: 'auth-a' } },
        });
        const res = await callableRun(nameReserve, { stableId: 'stable-a', name: 'Civi' }, 'auth-a');
        expect(res.status).toBe('ok');
        expect(store.name_index['civi']).toMatchObject({ uid: 'stable-a', name: 'Civi', nameLower: 'civi' });
        expect(store.leaderboard['stable-a']).toMatchObject({ name: 'Civi', nameLower: 'civi' });
    });
    it('BLOCKS a name owned by another LIVE account — even with no leaderboard row', async () => {
        // This is the core regression: owner has a users doc but never reached the
        // leaderboard. Old code treated them as "inactive" and let the name be stolen.
        const { db } = makeDbStub({
            users: {
                'stable-owner': { firebaseAuthUid: 'auth-owner' }, // live, no leaderboard doc
                'stable-thief': { firebaseAuthUid: 'auth-thief' },
            },
            name_index: { civi: { uid: 'stable-owner', name: 'Civi', nameLower: 'civi' } },
        });
        const res = await callableRun(nameReserve, { stableId: 'stable-thief', name: 'Civi' }, 'auth-thief');
        expect(res.status).toBe('taken');
    });
    it('is case- and whitespace-insensitive (Bob == bob == " Bob ")', async () => {
        const { db } = makeDbStub({
            users: {
                'stable-owner': { firebaseAuthUid: 'auth-owner' },
                'stable-other': { firebaseAuthUid: 'auth-other' },
            },
            name_index: { bob: { uid: 'stable-owner', name: 'Bob', nameLower: 'bob' } },
        });
        const r1 = await callableRun(nameReserve, { stableId: 'stable-other', name: 'bob' }, 'auth-other');
        const r2 = await callableRun(nameReserve, { stableId: 'stable-other', name: '  BOB  ' }, 'auth-other');
        expect(r1.status).toBe('taken');
        expect(r2.status).toBe('taken');
    });
    it('blocks a legacy live owner whose name is only in users.progress', async () => {
        const { db } = makeDbStub({
            users: {
                'stable-owner': { firebaseAuthUid: 'auth-owner', progress: { user_name: 'Civi', user_name_lower: 'civi' } },
                'stable-thief': { firebaseAuthUid: 'auth-thief' },
            },
        });
        const res = await callableRun(nameReserve, { stableId: 'stable-thief', name: 'Civi' }, 'auth-thief');
        expect(res.status).toBe('taken');
    });
    it('lets the SAME owner re-reserve their own name (idempotent)', async () => {
        const { db } = makeDbStub({
            users: { 'stable-a': { firebaseAuthUid: 'auth-a' } },
            name_index: { civi: { uid: 'stable-a', name: 'Civi', nameLower: 'civi' } },
        });
        const res = await callableRun(nameReserve, { stableId: 'stable-a', name: 'Civi' }, 'auth-a');
        expect(res.status).toBe('ok');
    });
    it('writes the reserved name back to users progress and public profile', async () => {
        const { db, store } = makeDbStub({
            users: { 'stable-a': { firebaseAuthUid: 'auth-a' } },
        });
        const res = await callableRun(nameReserve, { stableId: 'stable-a', name: 'Civi' }, 'auth-a');
        expect(res.status).toBe('ok');
        expect(store.users['stable-a']?.progress).toMatchObject({
            user_name: 'Civi',
            user_name_lower: 'civi',
            nickname_changed_at: '1777000000000',
            nickname_free_change_available: '1',
        });
        expect(store.public_profiles['stable-a']).toMatchObject({ uid: 'stable-a', name: 'Civi', nameLower: 'civi' });
    });
    it('blocks changing a reserved name again before 14 days', async () => {
        const { db } = makeDbStub({
            users: {
                'stable-a': {
                    firebaseAuthUid: 'auth-a',
                    progress: { user_name: 'Civi', user_name_lower: 'civi', nickname_changed_at: '1776999999000' },
                },
            },
            name_index: { civi: { uid: 'stable-a', name: 'Civi', nameLower: 'civi' } },
        });
        const res = await callableRun(nameReserve, { stableId: 'stable-a', name: 'Nova', oldName: 'Civi', source: 'settings' }, 'auth-a');
        expect(res.status).toBe('cooldown');
        expect(res.nextChangeAt).toBe(1778209599000);
    });
    it('allows the first settings change after onboarding and consumes the free-change flag', async () => {
        const { db, store } = makeDbStub({
            users: {
                'stable-a': {
                    firebaseAuthUid: 'auth-a',
                    progress: {
                        user_name: 'Civi',
                        user_name_lower: 'civi',
                        nickname_changed_at: '1776999999000',
                        nickname_free_change_available: '1',
                    },
                },
            },
            name_index: { civi: { uid: 'stable-a', name: 'Civi', nameLower: 'civi' } },
        });
        const res = await callableRun(nameReserve, { stableId: 'stable-a', name: 'Nova', oldName: 'Civi', source: 'settings' }, 'auth-a');
        expect(res.status).toBe('ok');
        expect(store.name_index['nova']).toMatchObject({ uid: 'stable-a', name: 'Nova', nameLower: 'nova' });
        expect(store.name_index['civi']).toBeUndefined();
        expect(store.users['stable-a']?.progress).toMatchObject({
            user_name: 'Nova',
            user_name_lower: 'nova',
            nickname_changed_at: '1777000000000',
            nickname_free_change_available: '0',
        });
    });
    it('allows changing an onboarding draft name before the profile is completed', async () => {
        const { db, store } = makeDbStub({
            users: {
                'stable-a': {
                    firebaseAuthUid: 'auth-a',
                    progress: {
                        user_name: 'Civi',
                        user_name_lower: 'civi',
                        nickname_changed_at: '1776999999000',
                        user_total_xp: '0',
                    },
                },
            },
            name_index: { civi: { uid: 'stable-a', name: 'Civi', nameLower: 'civi' } },
        });
        const res = await callableRun(nameReserve, { stableId: 'stable-a', name: 'Nova', oldName: 'Civi', source: 'onboarding' }, 'auth-a');
        expect(res.status).toBe('ok');
        expect(store.name_index['nova']).toMatchObject({ uid: 'stable-a', name: 'Nova', nameLower: 'nova' });
        expect(store.name_index['civi']).toBeUndefined();
    });
    it('allows changing an onboarding draft name even if progress already synced xp', async () => {
        const { db, store } = makeDbStub({
            users: {
                'stable-a': {
                    firebaseAuthUid: 'auth-a',
                    progress: {
                        user_name: 'Civi',
                        user_name_lower: 'civi',
                        nickname_changed_at: '1776999999000',
                        user_total_xp: '120',
                    },
                },
            },
            name_index: { civi: { uid: 'stable-a', name: 'Civi', nameLower: 'civi' } },
        });
        const res = await callableRun(nameReserve, { stableId: 'stable-a', name: 'Nova', oldName: 'Civi', source: 'onboarding' }, 'auth-a');
        expect(res.status).toBe('ok');
        expect(store.name_index['nova']).toMatchObject({ uid: 'stable-a', name: 'Nova', nameLower: 'nova' });
        expect(store.name_index['civi']).toBeUndefined();
    });
    it('treats an unfinished onboarding reservation as draft even without a source flag', async () => {
        const { db, store } = makeDbStub({
            users: {
                'stable-a': {
                    firebaseAuthUid: 'auth-a',
                    progress: {
                        user_name: 'Civi',
                        user_name_lower: 'civi',
                        nickname_changed_at: '1776999999000',
                    },
                },
            },
            name_index: { civi: { uid: 'stable-a', name: 'Civi', nameLower: 'civi' } },
        });
        const res = await callableRun(nameReserve, { stableId: 'stable-a', name: 'Nova', oldName: '' }, 'auth-a');
        expect(res.status).toBe('ok');
        expect(store.name_index['nova']).toMatchObject({ uid: 'stable-a', name: 'Nova', nameLower: 'nova' });
        expect(store.name_index['civi']).toBeUndefined();
    });
    it('keeps the 14-day cooldown for settings changes only', async () => {
        const { db } = makeDbStub({
            users: {
                'stable-a': {
                    firebaseAuthUid: 'auth-a',
                    progress: {
                        user_name: 'Civi',
                        user_name_lower: 'civi',
                        nickname_changed_at: '1776999999000',
                    },
                },
            },
            name_index: { civi: { uid: 'stable-a', name: 'Civi', nameLower: 'civi' } },
        });
        const res = await callableRun(nameReserve, { stableId: 'stable-a', name: 'Nova', oldName: 'Civi', source: 'settings' }, 'auth-a');
        expect(res.status).toBe('cooldown');
        expect(res.nextChangeAt).toBe(1778209599000);
    });
    it('still allows onboarding source to replace the profile name after onboarding was relaunched', async () => {
        const { db, store } = makeDbStub({
            users: {
                'stable-a': {
                    firebaseAuthUid: 'auth-a',
                    progress: {
                        user_name: 'Civi',
                        user_name_lower: 'civi',
                        nickname_changed_at: '1776999999000',
                        onboarding_done: '1',
                    },
                },
            },
            name_index: { civi: { uid: 'stable-a', name: 'Civi', nameLower: 'civi' } },
        });
        const res = await callableRun(nameReserve, { stableId: 'stable-a', name: 'Nova', oldName: 'Civi', source: 'onboarding' }, 'auth-a');
        expect(res.status).toBe('ok');
        expect(store.name_index['nova']).toMatchObject({ uid: 'stable-a', name: 'Nova', nameLower: 'nova' });
        expect(store.name_index['civi']).toBeUndefined();
    });
    it('reclaims a name whose owner account is GONE (no users doc)', async () => {
        const { db, store } = makeDbStub({
            users: { 'stable-new': { firebaseAuthUid: 'auth-new' } }, // owner 'stable-dead' absent
            name_index: { ghost: { uid: 'stable-dead', name: 'Ghost', nameLower: 'ghost' } },
        });
        const res = await callableRun(nameReserve, { stableId: 'stable-new', name: 'Ghost' }, 'auth-new');
        expect(res.status).toBe('ok');
        expect(store.name_index['ghost']).toMatchObject({ uid: 'stable-new' });
    });
    it('reclaims a name whose owner is tombstoned (identityHidden)', async () => {
        const { db, store } = makeDbStub({
            users: {
                'stable-new': { firebaseAuthUid: 'auth-new' },
                'stable-hidden': { firebaseAuthUid: 'auth-x', identityHidden: true, canonicalStableId: 'zzz' },
            },
            name_index: { phantom: { uid: 'stable-hidden', name: 'Phantom', nameLower: 'phantom' } },
        });
        const res = await callableRun(nameReserve, { stableId: 'stable-new', name: 'Phantom' }, 'auth-new');
        expect(res.status).toBe('ok');
        expect(store.name_index['phantom']).toMatchObject({ uid: 'stable-new' });
    });
    it('does NOT reclaim a name whose owner is banned (banned blocks but stays taken)', async () => {
        const { db } = makeDbStub({
            users: {
                'stable-new': { firebaseAuthUid: 'auth-new' },
                'stable-banned': { firebaseAuthUid: 'auth-b', banned: true },
            },
            name_index: { troll: { uid: 'stable-banned', name: 'Troll', nameLower: 'troll' } },
        });
        // Banned owner is "not live" → name is reclaimable. (Banned ≠ keep-forever.)
        const res = await callableRun(nameReserve, { stableId: 'stable-new', name: 'Troll' }, 'auth-new');
        expect(res.status).toBe('ok');
    });
});
describe('nameCheckAvailability — mirrors reservation logic', () => {
    beforeEach(() => jest.spyOn(Date, 'now').mockReturnValue(1777000000000));
    afterEach(() => jest.restoreAllMocks());
    it('reports a live-owned name as unavailable', async () => {
        const { db } = makeDbStub({
            users: {
                'stable-owner': { firebaseAuthUid: 'auth-owner' },
                'stable-me': { firebaseAuthUid: 'auth-me' },
            },
            name_index: { taken: { uid: 'stable-owner', name: 'Taken', nameLower: 'taken' } },
        });
        const res = await callableRun(nameCheckAvailability, { stableId: 'stable-me', name: 'Taken' }, 'auth-me');
        expect(res.available).toBe(false);
    });
    it('reports a legacy users.progress-owned name as unavailable', async () => {
        const { db } = makeDbStub({
            users: {
                'stable-owner': { firebaseAuthUid: 'auth-owner', progress: { user_name: 'Taken', user_name_lower: 'taken' } },
                'stable-me': { firebaseAuthUid: 'auth-me' },
            },
        });
        const res = await callableRun(nameCheckAvailability, { stableId: 'stable-me', name: 'Taken' }, 'auth-me');
        expect(res.available).toBe(false);
    });
    it('reports a free name as available', async () => {
        const { db } = makeDbStub({ users: { 'stable-me': { firebaseAuthUid: 'auth-me' } } });
        const res = await callableRun(nameCheckAvailability, { stableId: 'stable-me', name: 'Fresh' }, 'auth-me');
        expect(res.available).toBe(true);
    });
    it('reports the user\'s own name as available (to themselves)', async () => {
        const { db } = makeDbStub({
            users: { 'stable-me': { firebaseAuthUid: 'auth-me' } },
            name_index: { mine: { uid: 'stable-me', name: 'Mine', nameLower: 'mine' } },
        });
        const res = await callableRun(nameCheckAvailability, { stableId: 'stable-me', name: 'Mine' }, 'auth-me');
        expect(res.available).toBe(true);
    });
});
//# sourceMappingURL=leaderboard_name.test.js.map