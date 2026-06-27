"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mockDocs = new Map();
let mockAutoId = 0;
function deepMerge(target, source) {
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
function resolveFieldValue(existing, value) {
    if (value && typeof value === 'object' && value.__op === 'increment') {
        const by = Number(value.by) || 0;
        return (Number(existing) || 0) + by;
    }
    if (value && typeof value === 'object' && value.__op === 'serverTimestamp') {
        return 1779000000000;
    }
    return value;
}
function applyData(path, data, opts) {
    const base = opts?.merge ? { ...(mockDocs.get(path) ?? {}) } : {};
    const next = { ...base };
    for (const [key, value] of Object.entries(data)) {
        next[key] = resolveFieldValue(next[key], value);
    }
    mockDocs.set(path, opts?.merge ? deepMerge(mockDocs.get(path) ?? {}, next) : next);
}
function snapFor(ref) {
    const data = mockDocs.get(ref.path);
    return {
        id: ref.id,
        exists: data !== undefined,
        ref,
        data: () => data,
    };
}
function makeRef(path) {
    const id = path.split('/').pop() || path;
    return {
        id,
        path,
        collection: (name) => makeCollection(`${path}/${name}`),
        get: async () => snapFor(makeRef(path)),
        set: async (data, opts) => applyData(path, data, opts),
        update: async (data) => applyData(path, data, { merge: true }),
    };
}
function queryCollection(path, filters, limitCount) {
    const prefix = `${path}/`;
    const docs = Array.from(mockDocs.entries())
        .filter(([docPath]) => docPath.startsWith(prefix) && !docPath.slice(prefix.length).includes('/'))
        .map(([docPath, data]) => ({ ref: makeRef(docPath), data }))
        .filter(({ data }) => filters.every(([field, value]) => data[field] === value))
        .slice(0, limitCount ?? Number.MAX_SAFE_INTEGER)
        .map(({ ref }) => snapFor(ref));
    return { empty: docs.length === 0, docs };
}
function makeQuery(path, filters = [], limitCount) {
    return {
        where: (field, op, value) => {
            if (op !== '==')
                throw new Error(`Unsupported op ${op}`);
            return makeQuery(path, [...filters, [field, value]], limitCount);
        },
        limit: (count) => makeQuery(path, filters, count),
        get: async () => queryCollection(path, filters, limitCount),
    };
}
function makeCollection(path) {
    return {
        path,
        doc: (id) => makeRef(`${path}/${id || `auto-${++mockAutoId}`}`),
        add: async (data) => {
            const ref = makeRef(`${path}/auto-${++mockAutoId}`);
            applyData(ref.path, data);
            return ref;
        },
        where: (field, op, value) => makeQuery(path).where(field, op, value),
        limit: (count) => makeQuery(path).limit(count),
        get: async () => queryCollection(path, []),
    };
}
function buildDb() {
    return {
        collection: (name) => makeCollection(name),
        batch: () => {
            const writes = [];
            return {
                set: (ref, data, opts) => {
                    writes.push(() => applyData(ref.path, data, opts));
                },
                commit: async () => {
                    writes.forEach((write) => write());
                },
            };
        },
        runTransaction: async (fn) => {
            const writes = [];
            const tx = {
                get: async (ref) => snapFor(ref),
                set: (ref, data, opts) => {
                    writes.push(() => applyData(ref.path, data, opts));
                },
                update: (ref, data) => {
                    writes.push(() => applyData(ref.path, data, { merge: true }));
                },
            };
            const result = await fn(tx);
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
jest.mock('firebase-functions/params', () => ({
    defineString: () => ({ value: () => '' }),
    defineSecret: () => ({ value: () => '' }),
}));
jest.mock('firebase-admin', () => {
    const firestore = jest.fn(() => buildDb());
    firestore.FieldValue = {
        increment: (by) => ({ __op: 'increment', by }),
        serverTimestamp: () => ({ __op: 'serverTimestamp' }),
    };
    return { firestore };
});
function seedVictimIdentity() {
    mockDocs.set('users/victim', { firebaseAuthUid: 'auth-victim', shards: 200 });
    mockDocs.set('users/attacker', { firebaseAuthUid: 'auth-attacker', shards: 200 });
}
function seedPublishedPack() {
    mockDocs.set('community_packs/pack-1', {
        listingStatus: 'published',
        authorStableId: 'author',
        studyTarget: 'en',
        priceShards: 50,
        salesCount: 0,
        cards: [{ id: 'c1', en: 'hello', ru: 'privet', es: 'hola' }],
    });
    mockDocs.set('users/author', { firebaseAuthUid: 'auth-author', shards: 0 });
}
function submissionPayload() {
    return {
        studyTarget: 'en',
        sourceLang: 'ru',
        title: 'Starter pack',
        description: 'Starter pack',
        cards: Array.from({ length: 10 }, (_, i) => ({
            id: `card-${i + 1}`,
            en: `word ${i + 1}`,
            ru: `slovo ${i + 1}`,
            es: `palabra ${i + 1}`,
        })),
    };
}
function callCommunity(name, data, authUid = 'auth-attacker') {
    const mod = require('./community_packs');
    return mod[name]({ auth: { uid: authUid }, data });
}
beforeEach(() => {
    jest.resetModules();
    mockDocs.clear();
    mockAutoId = 0;
    seedVictimIdentity();
});
describe('community pack callable ownership', () => {
    test('rejects submitting a pack with another author stable id', async () => {
        await expect(callCommunity('communitySubmitPackForReview', {
            authorStableId: 'victim',
            payload: submissionPayload(),
        })).rejects.toMatchObject({
            code: 'permission-denied',
            message: 'stable_id_mismatch',
        });
        expect(Array.from(mockDocs.keys()).some((path) => path.startsWith('community_pack_submissions/'))).toBe(false);
    });
    test('rejects buying a pack with another user stable id', async () => {
        seedPublishedPack();
        await expect(callCommunity('communityPurchasePack', {
            buyerStableId: 'victim',
            packId: 'pack-1',
            studyTarget: 'en',
            buyerDisplayName: 'Mallory',
        })).rejects.toMatchObject({
            code: 'permission-denied',
            message: 'stable_id_mismatch',
        });
        expect(mockDocs.get('users/victim')?.shards).toBe(200);
    });
    test('allows buying a pack with the caller own stable id', async () => {
        seedPublishedPack();
        const result = await callCommunity('communityPurchasePack', {
            buyerStableId: 'victim',
            packId: 'pack-1',
            studyTarget: 'en',
            buyerDisplayName: 'Alice',
        }, 'auth-victim');
        expect(result).toMatchObject({ alreadyOwned: false, buyerBalanceAfter: 190 });
        expect(result.shardsUpdatedAtMs).toBeGreaterThan(0);
        expect(mockDocs.get('users/victim')?.shards).toBe(190);
        expect(mockDocs.get('community_pack_purchases/victim__pack-1')).toMatchObject({
            buyerStableId: 'victim',
            packId: 'pack-1',
        });
    });
    test('rejects reading cards through another user purchase', async () => {
        seedPublishedPack();
        mockDocs.set('community_pack_purchases/victim__pack-1', {
            buyerStableId: 'victim',
            packId: 'pack-1',
        });
        await expect(callCommunity('communityFetchPackCardsIfAccessible', {
            stableId: 'victim',
            packId: 'pack-1',
            studyTarget: 'en',
        })).rejects.toMatchObject({
            code: 'permission-denied',
            message: 'stable_id_mismatch',
        });
    });
    test('allows reading cards through the caller own purchase', async () => {
        seedPublishedPack();
        mockDocs.set('community_pack_purchases/victim__pack-1', {
            buyerStableId: 'victim',
            packId: 'pack-1',
        });
        const result = await callCommunity('communityFetchPackCardsIfAccessible', {
            stableId: 'victim',
            packId: 'pack-1',
            studyTarget: 'en',
        }, 'auth-victim');
        expect(result.cards).toHaveLength(1);
    });
    test('rejects listing another seller inbox', async () => {
        mockDocs.set('users/victim/community_seller_inbox/event-1', {
            seen: false,
            type: 'pack_sold',
        });
        await expect(callCommunity('communityListSellerInbox', {
            authorStableId: 'victim',
            limit: 20,
        })).rejects.toMatchObject({
            code: 'permission-denied',
            message: 'stable_id_mismatch',
        });
    });
    test('allows listing the caller own seller inbox', async () => {
        mockDocs.set('users/victim/community_seller_inbox/event-1', {
            seen: false,
            type: 'pack_sold',
        });
        const result = await callCommunity('communityListSellerInbox', {
            authorStableId: 'victim',
            limit: 20,
        }, 'auth-victim');
        expect(result.events).toHaveLength(1);
        expect(result.events[0].id).toBe('event-1');
    });
    test('rejects marking another seller inbox seen', async () => {
        mockDocs.set('users/victim/community_seller_inbox/event-1', {
            seen: false,
            type: 'pack_sold',
        });
        await expect(callCommunity('communityMarkSellerInboxSeen', {
            authorStableId: 'victim',
            eventIds: ['event-1'],
        })).rejects.toMatchObject({
            code: 'permission-denied',
            message: 'stable_id_mismatch',
        });
        expect(mockDocs.get('users/victim/community_seller_inbox/event-1')?.seen).toBe(false);
    });
    test('allows marking the caller own seller inbox seen', async () => {
        mockDocs.set('users/victim/community_seller_inbox/event-1', {
            seen: false,
            type: 'pack_sold',
        });
        await expect(callCommunity('communityMarkSellerInboxSeen', {
            authorStableId: 'victim',
            eventIds: ['event-1'],
        }, 'auth-victim')).resolves.toEqual({ ok: true });
        expect(mockDocs.get('users/victim/community_seller_inbox/event-1')?.seen).toBe(true);
    });
});
//# sourceMappingURL=community_packs.test.js.map