"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const docs = new Map();
let autoId = 0;
function refFor(path) {
    const id = path.split('/').pop() || path;
    return {
        id,
        path,
        get: async () => snapFor(path),
        set: async (data, opts) => {
            docs.set(path, opts?.merge ? { ...(docs.get(path) ?? {}), ...data } : { ...data });
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
function collectionDocs(path) {
    const prefix = `${path}/`;
    return Array.from(docs.entries())
        .filter(([docPath]) => docPath.startsWith(prefix) && !docPath.slice(prefix.length).includes('/'))
        .map(([docPath, data]) => ({
        id: docPath.slice(prefix.length),
        path: docPath,
        data,
    }));
}
function fakeDb() {
    return {
        collection: (name) => ({
            doc: (id) => refFor(`${name}/${id || `auto-${++autoId}`}`),
            limit: (count) => ({
                get: async () => {
                    const matches = collectionDocs(name)
                        .slice(0, count)
                        .map((doc) => ({ id: doc.id, exists: true, data: () => doc.data }));
                    return { empty: matches.length === 0, docs: matches };
                },
            }),
        }),
        runTransaction: async (fn) => {
            const writes = [];
            const result = await fn({
                get: (ref) => ref.get(),
                set: (ref, data, opts) => {
                    writes.push(() => {
                        docs.set(ref.path, opts?.merge ? { ...(docs.get(ref.path) ?? {}), ...data } : { ...data });
                    });
                },
                create: (ref, data) => {
                    writes.push(() => {
                        if (docs.has(ref.path))
                            throw new Error('already exists');
                        docs.set(ref.path, { ...data });
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
jest.mock('firebase-admin', () => {
    const firestore = jest.fn(() => fakeDb());
    firestore.FieldValue = {
        serverTimestamp: () => ({ __op: 'serverTimestamp' }),
    };
    return { firestore };
});
const ADMIN_AUTH = { uid: 'admin-1', token: { admin: true, adminRole: 'owner' } };
function validPayload(overrides = {}) {
    return {
        variants: {
            a: { enabled: true, pct: 50 },
            b: { enabled: true, pct: 50 },
            c: { enabled: false, pct: 0 },
            d: { enabled: false, pct: 0 },
            e: { enabled: false, pct: 0 },
            f: { enabled: false, pct: 0 },
            g: { enabled: false, pct: 0 },
        },
        salt: 'v9',
        rating_x10: 47,
        ratings_count: 1200,
        idempotencyKey: 'op-paywall-1',
        reason: 'Запуск нового сплита экранов оплаты',
        requestId: 'req-paywall-1',
        ...overrides,
    };
}
async function callPublish(data, auth = ADMIN_AUTH) {
    const { adminPublishPaywallAb } = require('./admin_paywall_ab');
    return adminPublishPaywallAb({ auth, data });
}
async function callWorkspace(auth = ADMIN_AUTH) {
    const { adminGetPaywallAbWorkspace } = require('./admin_paywall_ab');
    return adminGetPaywallAbWorkspace({ auth, data: {} });
}
function parse(data) {
    const { parsePaywallAbRequest } = require('./admin_paywall_ab');
    return parsePaywallAbRequest(data);
}
function buildDoc(input, before, actorUid = 'admin-1', nowMs = Date.now()) {
    const { buildPaywallAbDoc, parsePaywallAbRequest } = require('./admin_paywall_ab');
    return buildPaywallAbDoc(parsePaywallAbRequest(input), before, actorUid, nowMs);
}
beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers().setSystemTime(new Date('2026-07-15T12:00:00.000Z'));
    docs.clear();
    autoId = 0;
});
afterEach(() => {
    jest.useRealTimers();
});
describe('parsePaywallAbRequest', () => {
    it('accepts a valid seven-variant payload with salt and rating', () => {
        const parsed = parse(validPayload());
        expect(parsed).toMatchObject({ idempotencyKey: 'op-paywall-1', salt: 'v9', rating_x10: 47, ratings_count: 1200 });
        expect(parsed.variants.a).toEqual({ enabled: true, pct: 50 });
        expect(parsed.variants.g).toEqual({ enabled: false, pct: 0 });
    });
    it('rejects unknown variant letters', () => {
        expect(() => parse(validPayload({ variants: { a: { enabled: true, pct: 100 }, h: { enabled: true, pct: 0 } } })))
            .toThrow(FakeHttpsError);
        try {
            parse(validPayload({ variants: { a: { enabled: true, pct: 100 }, h: { enabled: true, pct: 0 } } }));
        }
        catch (error) {
            expect(error.code).toBe('invalid-argument');
        }
    });
    it('rejects out-of-range, negative and fractional pct', () => {
        for (const pct of [101, -1, 12.5, Number.NaN]) {
            expect(() => parse(validPayload({ variants: { a: { enabled: true, pct } } }))).toThrow(FakeHttpsError);
        }
    });
    it('rejects non-boolean enabled flags and empty variants', () => {
        expect(() => parse(validPayload({ variants: { a: { enabled: 'yes', pct: 100 } } }))).toThrow(FakeHttpsError);
        expect(() => parse(validPayload({ variants: {} }))).toThrow(FakeHttpsError);
    });
    it('rejects enabled sums different from 100', () => {
        expect(() => parse(validPayload({
            variants: {
                a: { enabled: true, pct: 60 },
                b: { enabled: true, pct: 30 },
            },
        }))).toThrow(FakeHttpsError);
    });
    it('excludes disabled variants from the 100 percent sum', () => {
        const parsed = parse(validPayload({
            variants: {
                a: { enabled: true, pct: 70 },
                b: { enabled: true, pct: 30 },
                c: { enabled: false, pct: 25 },
                d: { enabled: false, pct: 25 },
            },
        }));
        expect(parsed.variants.c).toEqual({ enabled: false, pct: 25 });
    });
    it('rejects payloads where every variant is disabled', () => {
        const allOff = Object.fromEntries(['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((letter) => [letter, { enabled: false, pct: 0 }]));
        expect(() => parse(validPayload({ variants: allOff }))).toThrow(FakeHttpsError);
    });
    it('validates salt, rating and count bounds', () => {
        expect(() => parse(validPayload({ salt: '' }))).toThrow(FakeHttpsError);
        expect(() => parse(validPayload({ salt: 'x'.repeat(41) }))).toThrow(FakeHttpsError);
        expect(() => parse(validPayload({ rating_x10: 51 }))).toThrow(FakeHttpsError);
        expect(() => parse(validPayload({ rating_x10: -1 }))).toThrow(FakeHttpsError);
        expect(() => parse(validPayload({ rating_x10: 4.7 }))).toThrow(FakeHttpsError);
        expect(() => parse(validPayload({ ratings_count: -1 }))).toThrow(FakeHttpsError);
        expect(() => parse(validPayload({ ratings_count: 1.5 }))).toThrow(FakeHttpsError);
        expect(parse(validPayload({ rating_x10: 50, ratings_count: 0 }))).toMatchObject({ rating_x10: 50, ratings_count: 0 });
    });
    it('requires idempotencyKey, reason and requestId', () => {
        expect(() => parse(validPayload({ idempotencyKey: '' }))).toThrow(FakeHttpsError);
        expect(() => parse(validPayload({ reason: '' }))).toThrow(FakeHttpsError);
        expect(() => parse(validPayload({ requestId: '' }))).toThrow(FakeHttpsError);
    });
    it('defaults omitted letters to the app contract: enabled with zero share', () => {
        const parsed = parse(validPayload({ variants: { c: { enabled: true, pct: 100 } } }));
        expect(parsed.variants.a).toEqual({ enabled: true, pct: 0 });
        expect(parsed.variants.g).toEqual({ enabled: true, pct: 0 });
    });
});
describe('buildPaywallAbDoc / paywallAbChanges', () => {
    it('writes all variant fields and preserves salt and rating when omitted', () => {
        const { salt: _salt, rating_x10: _rating, ratings_count: _count, ...rest } = validPayload();
        const doc = buildDoc(rest, { salt: 'v7', rating_x10: 33, ratings_count: 42, legacy_junk: true });
        expect(doc).toMatchObject({
            a_pct: 50, a_enabled: true,
            b_pct: 50, b_enabled: true,
            c_pct: 0, c_enabled: false,
            d_pct: 0, d_enabled: false,
            e_pct: 0, e_enabled: false,
            f_pct: 0, f_enabled: false,
            g_pct: 0, g_enabled: false,
            salt: 'v7',
            rating_x10: 33,
            ratings_count: 42,
            updatedBy: 'admin-1',
        });
        expect(doc.updatedAt).toBe(Date.now());
        expect(doc).not.toHaveProperty('legacy_junk');
    });
    it('produces a per-field old-to-new change list', () => {
        const { paywallAbChanges } = require('./admin_paywall_ab');
        const before = { a_pct: 100, a_enabled: true, salt: 'v3', rating_x10: 0, ratings_count: 0 };
        const after = { ...before, a_pct: 50, b_pct: 50, b_enabled: true, salt: 'v4' };
        const changes = paywallAbChanges(before, after);
        expect(changes).toContain('a_pct: 100 → 50');
        expect(changes).toContain('b_pct: ∅ → 50');
        expect(changes).toContain('b_enabled: ∅ → true');
        expect(changes).toContain('salt: v3 → v4');
        expect(changes).not.toContainEqual(expect.stringContaining('rating_x10'));
    });
});
describe('adminPublishPaywallAb', () => {
    it('denies callers without the admin claim or a config-write role', async () => {
        await expect(callPublish(validPayload(), null)).rejects.toMatchObject({ code: 'permission-denied' });
        await expect(callPublish(validPayload(), { uid: 'x', token: { admin: false, adminRole: 'owner' } }))
            .rejects.toMatchObject({ code: 'permission-denied' });
        await expect(callPublish(validPayload(), { uid: 'x', token: { admin: true, adminRole: 'support' } }))
            .rejects.toMatchObject({ code: 'permission-denied' });
        await expect(callPublish(validPayload(), { uid: 'x', token: { admin: true } }))
            .rejects.toMatchObject({ code: 'permission-denied' });
    });
    it('rejects an invalid enabled sum before any write', async () => {
        await expect(callPublish(validPayload({
            variants: {
                a: { enabled: true, pct: 60 },
                b: { enabled: true, pct: 30 },
            },
        }))).rejects.toMatchObject({ code: 'invalid-argument' });
        expect(docs.has('remote_config/paywall_ab')).toBe(false);
        expect(collectionDocs('admin_log')).toHaveLength(0);
    });
    it('writes the full document with merge:false plus audit, history and idempotency records', async () => {
        docs.set('remote_config/paywall_ab', { a_pct: 100, legacy_junk: true, updatedAt: 1, updatedBy: 'legacy-admin' });
        const result = await callPublish(validPayload());
        expect(result).toMatchObject({ ok: true, replayed: false, updatedAt: Date.now() });
        const doc = docs.get('remote_config/paywall_ab') ?? {};
        expect(doc).toMatchObject({
            a_pct: 50, a_enabled: true,
            b_pct: 50, b_enabled: true,
            g_pct: 0, g_enabled: false,
            salt: 'v9',
            rating_x10: 47,
            ratings_count: 1200,
            updatedAt: Date.now(),
            updatedBy: 'admin-1',
        });
        expect(doc).not.toHaveProperty('legacy_junk');
        const audits = collectionDocs('admin_log');
        expect(audits).toHaveLength(1);
        expect(audits[0].data).toMatchObject({
            action: 'paywall_ab.publish',
            actorUid: 'admin-1',
            operationId: 'op-paywall-1',
            reason: 'Запуск нового сплита экранов оплаты',
        });
        const history = collectionDocs('remote_config_history');
        expect(history).toHaveLength(1);
        expect(history[0].data).toMatchObject({ doc: 'paywall_ab', by: 'admin-1', operationId: 'op-paywall-1' });
        expect(history[0].data.changes).toEqual(expect.arrayContaining(['a_pct: 100 → 50', 'salt: ∅ → v9']));
        const operation = docs.get('admin_command_operations/op-paywall-1');
        expect(operation).toMatchObject({ operationId: 'op-paywall-1', updatedAt: Date.now() });
    });
    it('replays the same idempotency key without a second write and rejects payload reuse', async () => {
        const first = await callPublish(validPayload());
        const second = await callPublish(validPayload());
        expect(first).toMatchObject({ ok: true, replayed: false });
        expect(second).toMatchObject({ ok: true, replayed: true, auditId: first.auditId, updatedAt: first.updatedAt });
        expect(collectionDocs('admin_log')).toHaveLength(1);
        await expect(callPublish(validPayload({ reason: 'Другая причина', variants: { a: { enabled: true, pct: 100 } } })))
            .rejects.toMatchObject({ code: 'already-exists' });
    });
    it('preserves the existing salt and rating when the payload omits them', async () => {
        docs.set('remote_config/paywall_ab', { salt: 'v11', rating_x10: 21, ratings_count: 77, updatedAt: 5 });
        const { salt: _salt, rating_x10: _rating, ratings_count: _count, ...rest } = validPayload();
        await callPublish(rest);
        expect(docs.get('remote_config/paywall_ab')).toMatchObject({ salt: 'v11', rating_x10: 21, ratings_count: 77 });
    });
    it('enforces optimistic concurrency on expectedUpdatedAt', async () => {
        docs.set('remote_config/paywall_ab', { a_pct: 100, updatedAt: 111 });
        await expect(callPublish(validPayload({ expectedUpdatedAt: 222 })))
            .rejects.toMatchObject({ code: 'failed-precondition' });
        expect(docs.get('remote_config/paywall_ab')).toMatchObject({ a_pct: 100 });
        const result = await callPublish(validPayload({ expectedUpdatedAt: 111 }));
        expect(result).toMatchObject({ ok: true, replayed: false });
    });
    it('fails the concurrency check when the document does not exist yet', async () => {
        await expect(callPublish(validPayload({ expectedUpdatedAt: 0 })))
            .rejects.toMatchObject({ code: 'failed-precondition' });
        expect(docs.has('remote_config/paywall_ab')).toBe(false);
    });
});
describe('adminGetPaywallAbWorkspace', () => {
    it('denies roles without the config-write permission', async () => {
        await expect(callWorkspace({ uid: 'x', token: { admin: true, adminRole: 'support' } }))
            .rejects.toMatchObject({ code: 'permission-denied' });
        await expect(callWorkspace(null)).rejects.toMatchObject({ code: 'permission-denied' });
    });
    it('returns the current document and only its own history entries, newest first', async () => {
        docs.set('remote_config/paywall_ab', { a_pct: 34, b_pct: 33, c_pct: 33, salt: 'v3' });
        docs.set('remote_config_history/h-app', { doc: 'app', at: '2026-07-03T00:00:00.000Z' });
        docs.set('remote_config_history/h-old', { doc: 'paywall_ab', at: '2026-07-01T00:00:00.000Z', changes: ['a_pct: 0 → 34'] });
        docs.set('remote_config_history/h-new', { entity: { collection: 'remote_config', id: 'paywall_ab' }, timestamp: '2026-07-02T00:00:00.000Z' });
        const result = await callWorkspace();
        expect(result).toMatchObject({ ok: true, exists: true });
        expect(result.config).toMatchObject({ a_pct: 34, salt: 'v3' });
        expect(result.history.map((entry) => entry.id)).toEqual(['h-new', 'h-old']);
    });
    it('reports a missing document without failing', async () => {
        const result = await callWorkspace();
        expect(result).toMatchObject({ ok: true, exists: false, config: {}, history: [] });
    });
});
//# sourceMappingURL=admin_paywall_ab.test.js.map