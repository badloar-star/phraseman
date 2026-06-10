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
        const a = (0, explain_cache_1.phraseHashFor)('Hello!', 'ru');
        const b = (0, explain_cache_1.phraseHashFor)('  hello ', 'ru');
        const c = (0, explain_cache_1.phraseHashFor)('HELLO?', 'ru');
        expect(a).toBe(b);
        expect(a).toBe(c);
    });
    it('collapses internal whitespace runs', () => {
        expect((0, explain_cache_1.normalizePhrase)('break   a  leg')).toBe((0, explain_cache_1.normalizePhrase)('break a leg'));
    });
    it('produces a 40-char hex id and distinguishes different phrases', () => {
        expect((0, explain_cache_1.phraseHashFor)('Hello', 'ru')).toMatch(/^[0-9a-f]{40}$/);
        expect((0, explain_cache_1.phraseHashFor)('Hello', 'ru')).not.toBe((0, explain_cache_1.phraseHashFor)('Goodbye', 'ru'));
    });
    it('SAME phrase in DIFFERENT languages → DIFFERENT cache keys (audit bug 2026-06-10)', () => {
        // Раньше язык в ключе отсутствовал → испанец получал русское объяснение из кэша.
        const ru = (0, explain_cache_1.phraseHashFor)('It sounds good', 'ru');
        const es = (0, explain_cache_1.phraseHashFor)('It sounds good', 'es');
        const tr = (0, explain_cache_1.phraseHashFor)('It sounds good', 'tr');
        expect(ru).not.toBe(es);
        expect(ru).not.toBe(tr);
        expect(es).not.toBe(tr);
    });
    it('langKey is normalized inside the hash (case/whitespace-insensitive)', () => {
        expect((0, explain_cache_1.phraseHashFor)('Hello', 'RU')).toBe((0, explain_cache_1.phraseHashFor)('Hello', 'ru'));
        expect((0, explain_cache_1.phraseHashFor)('Hello', ' ru ')).toBe((0, explain_cache_1.phraseHashFor)('Hello', 'ru'));
    });
});
describe('resolvePromptLangKey — канонический язык для промпта И ключа кэша', () => {
    // Один резолвер на генерацию и кэш-ключ: ключ всегда совпадает с языком текста в доке.
    const { resolvePromptLangKey, PROMPT_LANGUAGES } = require('./explain_prompts');
    it('покрывает все 8 языков приложения (+en) — раньше было только ru/en', () => {
        for (const code of ['ru', 'en', 'uk', 'es', 'pt', 'vi', 'id', 'tr', 'pl']) {
            expect(PROMPT_LANGUAGES[code]).toBeDefined();
            expect(resolvePromptLangKey(code)).toBe(code);
        }
    });
    it("региональные коды режутся до базового: 'pt-BR' → 'pt'", () => {
        expect(resolvePromptLangKey('pt-BR')).toBe('pt');
    });
    it("неизвестный/пустой язык падает в 'ru' (дефолтная аудитория)", () => {
        expect(resolvePromptLangKey('xx')).toBe('ru');
        expect(resolvePromptLangKey('')).toBe('ru');
    });
});
describe('readCachedExplanation', () => {
    it('returns null when the doc is absent', async () => {
        expect(await (0, explain_cache_1.readCachedExplanation)((0, explain_cache_1.phraseHashFor)('x', 'ru'))).toBeNull();
    });
    it('returns ready text after writeReadyExplanation', async () => {
        const hash = (0, explain_cache_1.phraseHashFor)('Break a leg', 'ru');
        await (0, explain_cache_1.writeReadyExplanation)(hash, 'Это значит удачи.', { lang: 'ru', phraseEn: 'Break a leg' });
        const got = await (0, explain_cache_1.readCachedExplanation)(hash);
        expect(got?.status).toBe('ready');
        expect(got?.text).toBe('Это значит удачи.');
        expect(got?.schemaVersion).toBe(explain_cache_1.EXPLAIN_SCHEMA_VERSION);
    });
    it('returns null for a doc written by an older schema (stale → regenerate)', async () => {
        const hash = (0, explain_cache_1.phraseHashFor)('Old cached phrase', 'ru');
        // Simulate a leftover doc from before the prompt rewrite: ready, but an older schemaVersion.
        docs.set(`${explain_cache_1.EXPLAIN_COLLECTION}/${hash}`, {
            status: 'ready',
            text: 'старое объяснение (re-telling, wrong)',
            schemaVersion: explain_cache_1.EXPLAIN_SCHEMA_VERSION - 1,
        });
        expect(await (0, explain_cache_1.readCachedExplanation)(hash)).toBeNull();
    });
    it('returns rejected after writeRejectedExplanation', async () => {
        const hash = (0, explain_cache_1.phraseHashFor)('bad', 'ru');
        await (0, explain_cache_1.writeRejectedExplanation)(hash, 'toxic');
        const got = await (0, explain_cache_1.readCachedExplanation)(hash);
        expect(got?.status).toBe('rejected');
    });
});
describe('claimPendingLock — race + staleness', () => {
    it('first claim on an absent doc wins, second is blocked', async () => {
        const hash = (0, explain_cache_1.phraseHashFor)('race', 'ru');
        expect(await (0, explain_cache_1.claimPendingLock)(hash, 1000)).toBe(true);
        expect(await (0, explain_cache_1.claimPendingLock)(hash, 1500)).toBe(false); // fresh pending blocks
    });
    it('does not re-claim a ready doc', async () => {
        const hash = (0, explain_cache_1.phraseHashFor)('done', 'ru');
        await (0, explain_cache_1.writeReadyExplanation)(hash, 'ok', { lang: 'en', phraseEn: 'done' });
        expect(await (0, explain_cache_1.claimPendingLock)(hash, 5000)).toBe(false);
    });
    it('does NOT re-claim a FRESH judge-rejected doc (TTL not passed)', async () => {
        const hash = (0, explain_cache_1.phraseHashFor)('nope', 'ru');
        const t0 = 100000;
        docs.set(`${explain_cache_1.EXPLAIN_COLLECTION}/${hash}`, {
            status: 'rejected',
            reason: 'off_topic',
            schemaVersion: explain_cache_1.EXPLAIN_SCHEMA_VERSION,
            updatedAtMs: t0,
        });
        expect(await (0, explain_cache_1.claimPendingLock)(hash, t0 + explain_cache_1.REJECTED_RETRY_TTL_MS - 1)).toBe(false);
    });
    it('RE-claims a judge-rejected doc once REJECTED_RETRY_TTL_MS passed (false-positive recovery)', async () => {
        // Прод-кейс 2026-06-10: судья ложно отклонил нормальное русское объяснение как
        // non_target_language → фраза навсегда отдавала fallback. Теперь judge-reject ретраится.
        const hash = (0, explain_cache_1.phraseHashFor)('retry me', 'ru');
        const t0 = 100000;
        docs.set(`${explain_cache_1.EXPLAIN_COLLECTION}/${hash}`, {
            status: 'rejected',
            reason: 'non_target_language',
            schemaVersion: explain_cache_1.EXPLAIN_SCHEMA_VERSION,
            updatedAtMs: t0,
        });
        expect(await (0, explain_cache_1.claimPendingLock)(hash, t0 + explain_cache_1.REJECTED_RETRY_TTL_MS + 1)).toBe(true);
        // Claim перевёл док в pending и очистил старую причину (не утечёт в будущий ready-док).
        const claimed = docs.get(`${explain_cache_1.EXPLAIN_COLLECTION}/${hash}`);
        expect(claimed).toMatchObject({ status: 'pending', reason: null });
    });
    it('NEVER re-claims a report_threshold-rejected doc (sticky until admin reset)', async () => {
        const hash = (0, explain_cache_1.phraseHashFor)('mass reported', 'ru');
        const t0 = 100000;
        docs.set(`${explain_cache_1.EXPLAIN_COLLECTION}/${hash}`, {
            status: 'rejected',
            reason: explain_cache_1.REPORT_REJECT_REASON,
            schemaVersion: explain_cache_1.EXPLAIN_SCHEMA_VERSION,
            updatedAtMs: t0,
        });
        expect(await (0, explain_cache_1.claimPendingLock)(hash, t0 + explain_cache_1.REJECTED_RETRY_TTL_MS * 1000)).toBe(false);
    });
    it('re-claims a STALE pending (older than LOCK_TTL_MS), not a fresh one', async () => {
        const hash = (0, explain_cache_1.phraseHashFor)('stuck', 'ru');
        const t0 = 10000;
        expect(await (0, explain_cache_1.claimPendingLock)(hash, t0)).toBe(true);
        // fresh: within TTL → blocked
        expect(await (0, explain_cache_1.claimPendingLock)(hash, t0 + explain_cache_1.LOCK_TTL_MS - 1)).toBe(false);
        // stale: past TTL → re-claimable (crashed generation recovery)
        expect(await (0, explain_cache_1.claimPendingLock)(hash, t0 + explain_cache_1.LOCK_TTL_MS + 1)).toBe(true);
    });
    it('writes createdAtMs on the pending doc (staleness is computable)', async () => {
        const hash = (0, explain_cache_1.phraseHashFor)('ts', 'ru');
        await (0, explain_cache_1.claimPendingLock)(hash, 42000);
        const got = await (0, explain_cache_1.readCachedExplanation)(hash);
        expect(got?.status).toBe('pending');
        expect(got?.createdAtMs).toBe(42000);
    });
});
describe('isRetryableRejected — judge rejects heal, report rejects stay', () => {
    const t0 = 50000;
    it('false for non-rejected / absent docs', () => {
        expect((0, explain_cache_1.isRetryableRejected)(undefined, t0)).toBe(false);
        expect((0, explain_cache_1.isRetryableRejected)(null, t0)).toBe(false);
        expect((0, explain_cache_1.isRetryableRejected)({ status: 'ready', updatedAtMs: 0 }, t0)).toBe(false);
        expect((0, explain_cache_1.isRetryableRejected)({ status: 'pending', updatedAtMs: 0 }, t0)).toBe(false);
    });
    it('judge-rejected: false within TTL, true after TTL', () => {
        const doc = { status: 'rejected', reason: 'incoherent', updatedAtMs: t0 };
        expect((0, explain_cache_1.isRetryableRejected)(doc, t0 + explain_cache_1.REJECTED_RETRY_TTL_MS - 1)).toBe(false);
        expect((0, explain_cache_1.isRetryableRejected)(doc, t0 + explain_cache_1.REJECTED_RETRY_TTL_MS + 1)).toBe(true);
    });
    it('report_threshold-rejected: false forever (admin-only reset)', () => {
        const doc = { status: 'rejected', reason: explain_cache_1.REPORT_REJECT_REASON, updatedAtMs: t0 };
        expect((0, explain_cache_1.isRetryableRejected)(doc, t0 + explain_cache_1.REJECTED_RETRY_TTL_MS * 1000000)).toBe(false);
    });
    it('rejected doc WITHOUT a timestamp (legacy/corrupt) is retryable, not stuck forever', () => {
        expect((0, explain_cache_1.isRetryableRejected)({ status: 'rejected', reason: 'toxic' }, explain_cache_1.REJECTED_RETRY_TTL_MS + 1)).toBe(true);
    });
});
describe('collection name', () => {
    it('is phrase_explanations', () => {
        expect(explain_cache_1.EXPLAIN_COLLECTION).toBe('phrase_explanations');
    });
});
//# sourceMappingURL=explain_cache.test.js.map