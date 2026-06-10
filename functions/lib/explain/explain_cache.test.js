"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const docs = new Map();
function refFor(path) {
    return {
        id: path.split('/').pop() || path,
        path,
        get: async () => snapFor(path),
        set: async (data, opts) => {
            docs.set(path, opts?.merge ? { ...(docs.get(path) ?? {}), ...data } : { ...data });
        },
    };
}
function snapFor(path) {
    const data = docs.get(path);
    return { id: path.split('/').pop() || path, exists: data !== undefined, data: () => data };
}
function fakeDb() {
    return {
        collection: (name) => ({ doc: (id) => refFor(`${name}/${id ?? 'auto'}`) }),
        runTransaction: async (fn) => {
            const writes = [];
            const result = await fn({
                get: (ref) => ref.get(),
                set: (ref, data, opts) => {
                    writes.push(() => docs.set(ref.path, opts?.merge ? { ...(docs.get(ref.path) ?? {}), ...data } : { ...data }));
                },
            });
            writes.forEach((w) => w());
            return result;
        },
    };
}
jest.mock('firebase-admin', () => {
    const firestore = jest.fn(() => fakeDb());
    firestore.FieldValue = {
        serverTimestamp: () => ({ __op: 'serverTimestamp' }),
    };
    return { firestore };
});
const explain_cache_1 = require("./explain_cache");
beforeEach(() => docs.clear());
describe('normalizePhrase + phraseHashFor — deterministic, dedup-friendly', () => {
    it('collapses case, surrounding whitespace and trailing punctuation to one key', () => {
        const a = (0, explain_cache_1.phraseHashFor)('Hello!');
        const b = (0, explain_cache_1.phraseHashFor)('  hello ');
        const c = (0, explain_cache_1.phraseHashFor)('HELLO?');
        expect(a).toBe(b);
        expect(a).toBe(c);
    });
    it('collapses internal whitespace runs', () => {
        expect((0, explain_cache_1.normalizePhrase)('break   a  leg')).toBe((0, explain_cache_1.normalizePhrase)('break a leg'));
    });
    it('produces a 40-char hex id and distinguishes different phrases', () => {
        expect((0, explain_cache_1.phraseHashFor)('Hello')).toMatch(/^[0-9a-f]{40}$/);
        expect((0, explain_cache_1.phraseHashFor)('Hello')).not.toBe((0, explain_cache_1.phraseHashFor)('Goodbye'));
    });
});
describe('readCachedExplanation', () => {
    it('returns null when the doc is absent', async () => {
        expect(await (0, explain_cache_1.readCachedExplanation)((0, explain_cache_1.phraseHashFor)('x'))).toBeNull();
    });
    it('returns ready text after writeReadyExplanation', async () => {
        const hash = (0, explain_cache_1.phraseHashFor)('Break a leg');
        await (0, explain_cache_1.writeReadyExplanation)(hash, 'Это значит удачи.', { lang: 'ru', phraseEn: 'Break a leg' });
        const got = await (0, explain_cache_1.readCachedExplanation)(hash);
        expect(got?.status).toBe('ready');
        expect(got?.text).toBe('Это значит удачи.');
        expect(got?.schemaVersion).toBe(1);
    });
    it('returns rejected after writeRejectedExplanation', async () => {
        const hash = (0, explain_cache_1.phraseHashFor)('bad');
        await (0, explain_cache_1.writeRejectedExplanation)(hash, 'toxic');
        const got = await (0, explain_cache_1.readCachedExplanation)(hash);
        expect(got?.status).toBe('rejected');
    });
});
describe('claimPendingLock — race + staleness', () => {
    it('first claim on an absent doc wins, second is blocked', async () => {
        const hash = (0, explain_cache_1.phraseHashFor)('race');
        expect(await (0, explain_cache_1.claimPendingLock)(hash, 1000)).toBe(true);
        expect(await (0, explain_cache_1.claimPendingLock)(hash, 1500)).toBe(false); // fresh pending blocks
    });
    it('does not re-claim a ready doc', async () => {
        const hash = (0, explain_cache_1.phraseHashFor)('done');
        await (0, explain_cache_1.writeReadyExplanation)(hash, 'ok', { lang: 'en', phraseEn: 'done' });
        expect(await (0, explain_cache_1.claimPendingLock)(hash, 5000)).toBe(false);
    });
    it('does not re-claim a rejected doc', async () => {
        const hash = (0, explain_cache_1.phraseHashFor)('nope');
        await (0, explain_cache_1.writeRejectedExplanation)(hash, 'off_topic');
        expect(await (0, explain_cache_1.claimPendingLock)(hash, 5000)).toBe(false);
    });
    it('re-claims a STALE pending (older than LOCK_TTL_MS), not a fresh one', async () => {
        const hash = (0, explain_cache_1.phraseHashFor)('stuck');
        const t0 = 10000;
        expect(await (0, explain_cache_1.claimPendingLock)(hash, t0)).toBe(true);
        // fresh: within TTL → blocked
        expect(await (0, explain_cache_1.claimPendingLock)(hash, t0 + explain_cache_1.LOCK_TTL_MS - 1)).toBe(false);
        // stale: past TTL → re-claimable (crashed generation recovery)
        expect(await (0, explain_cache_1.claimPendingLock)(hash, t0 + explain_cache_1.LOCK_TTL_MS + 1)).toBe(true);
    });
    it('writes createdAtMs on the pending doc (staleness is computable)', async () => {
        const hash = (0, explain_cache_1.phraseHashFor)('ts');
        await (0, explain_cache_1.claimPendingLock)(hash, 42000);
        const got = await (0, explain_cache_1.readCachedExplanation)(hash);
        expect(got?.status).toBe('pending');
        expect(got?.createdAtMs).toBe(42000);
    });
});
describe('collection name', () => {
    it('is phrase_explanations', () => {
        expect(explain_cache_1.EXPLAIN_COLLECTION).toBe('phrase_explanations');
    });
});
//# sourceMappingURL=explain_cache.test.js.map