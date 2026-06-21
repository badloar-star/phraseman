"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const docs = new Map();
let autoId = 0;
function deepMerge(target, source) {
    const result = { ...target };
    for (const [key, value] of Object.entries(source)) {
        const existing = target[key];
        if (value && typeof value === 'object' && !Array.isArray(value) && existing && typeof existing === 'object' && !Array.isArray(existing)) {
            result[key] = deepMerge(existing, value);
        }
        else {
            result[key] = value;
        }
    }
    return result;
}
function refFor(path) {
    return {
        id: path.split('/').pop() || path,
        path,
        get: async () => snapFor(path),
        set: async (data, opts) => {
            docs.set(path, opts?.merge ? deepMerge(docs.get(path) ?? {}, data) : { ...data });
        },
    };
}
function snapFor(path) {
    const data = docs.get(path);
    return { id: path.split('/').pop() || path, exists: data !== undefined, data: () => data };
}
function collectionDocs(path) {
    const prefix = `${path}/`;
    return Array.from(docs.entries())
        .filter(([docPath]) => docPath.startsWith(prefix) && !docPath.slice(prefix.length).includes('/'))
        .map(([docPath, data]) => ({ id: docPath.slice(prefix.length), path: docPath, data }));
}
function fakeDb() {
    return {
        collection: (name) => ({
            doc: (id) => refFor(`${name}/${id || `auto-${++autoId}`}`),
        }),
        runTransaction: async (fn) => {
            const writes = [];
            const result = await fn({
                get: (ref) => ref.get(),
                set: (ref, data, opts) => {
                    writes.push(() => docs.set(ref.path, opts?.merge ? deepMerge(docs.get(ref.path) ?? {}, data) : { ...data }));
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
jest.mock('firebase-functions/params', () => ({
    defineSecret: () => ({ value: () => 'sk-test-key' }),
}));
jest.mock('firebase-admin', () => {
    const firestore = jest.fn(() => fakeDb());
    firestore.FieldValue = {
        serverTimestamp: () => ({ __op: 'serverTimestamp' }),
    };
    return { firestore };
});
jest.mock('./auth_identity', () => ({
    resolveStableUidForAuth: jest.fn(async (_db, authUid) => `stable-${authUid}`),
}));
jest.mock('./openai_dialog_model_config', () => ({
    // The mistake breakdown runs on the strong tier (gpt-4.1) so the ONE governing distinction
    // (e.g. "that" vs "it") is taught with a minimal pair, not watered down to generic filler.
    resolveConfiguredDialogModel: jest.fn(async () => 'gpt-4.1'),
}));
const mistake_explain_1 = require("./mistake_explain");
const explainMistake = mistake_explain_1.explainMistake;
const validPayload = {
    lessonId: 18,
    phraseId: 'lesson18_phrase_31',
    studyTarget: 'en',
    interfaceLang: 'ru',
    prompt: 'Say: I have a reservation.',
    userAnswer: 'I has a reservation',
    targetAnswer: 'I have a reservation.',
    phraseMeaning: 'У меня есть бронь.',
    selectedWrongWord: 'has',
    expectedWord: 'have',
    diffPairs: [{ expected: 'have', picked: 'has' }],
};
function billingDocs() {
    return collectionDocs('mistake_explain_billing').map((doc) => doc.data);
}
function cacheDocs() {
    return collectionDocs('mistake_explanations').map((doc) => doc.data);
}
function mockOkProvider(text) {
    global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
            choices: [{ message: { content: text } }],
            usage: { prompt_tokens: 44, completion_tokens: 22, total_tokens: 66 },
        }),
    });
}
async function callExplain(data, authUid = 'auth-1') {
    return explainMistake({ auth: authUid ? { uid: authUid } : undefined, data });
}
beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-12T12:00:00.000Z'));
    docs.clear();
    autoId = 0;
    global.fetch = jest.fn();
    mockOkProvider('Use "have" after "I": say "I have a reservation."');
});
afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
});
describe('explainMistake', () => {
    it('rejects unauthenticated callers before the provider call', async () => {
        await expect(callExplain(validPayload, null)).rejects.toMatchObject({ code: 'unauthenticated' });
        expect(global.fetch).not.toHaveBeenCalled();
    });
    it('rejects invalid payloads before the provider call', async () => {
        await expect(callExplain({ ...validPayload, targetAnswer: '' })).rejects.toMatchObject({ code: 'invalid-argument' });
        expect(global.fetch).not.toHaveBeenCalled();
    });
    it('is free for everyone — no daily cap blocks repeated breakdowns', async () => {
        await callExplain(validPayload);
        await callExplain({ ...validPayload, userAnswer: 'I has table' });
        await callExplain({ ...validPayload, userAnswer: 'I has booking' });
        await callExplain({ ...validPayload, userAnswer: 'I has seat' });
        // Four DISTINCT mistakes → four generations, none blocked.
        expect(global.fetch).toHaveBeenCalledTimes(4);
        expect(billingDocs()).toHaveLength(4);
    });
    it('serves the SAME mistake from the warm cache on the second call ($0, no provider hit)', async () => {
        const first = await callExplain(validPayload);
        expect(first.fromCache).toBe(false);
        expect(cacheDocs().some((d) => d.status === 'ready')).toBe(true);
        const second = await callExplain(validPayload, 'auth-2');
        expect(second.fromCache).toBe(true);
        expect(second.text).toBe(first.text);
        // Still only ONE provider call total — the cache absorbed the second reader.
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });
    it('builds a prompt that targets the WHOLE error and lists every wrong→right swap', async () => {
        const res = await callExplain(validPayload);
        expect(res).toMatchObject({ ok: true, model: 'gpt-4.1', variant: 'full', fromCache: false });
        const body = JSON.parse(global.fetch.mock.calls[0][1].body);
        const prompt = JSON.stringify(body.messages);
        expect(prompt).toContain('I has a reservation');
        expect(prompt).toContain('I have a reservation.');
        // The wrong→right swap list is embedded (quotes are JSON-escaped inside the body string).
        expect(prompt).toContain('has');
        expect(prompt).toContain('have');
        expect(prompt).toContain('→');
        expect(prompt).toContain('EVERY word that differs');
        expect(billingDocs()[0]).toMatchObject({
            uid: 'stable-auth-1',
            authUid: 'auth-1',
            lessonId: 18,
            phraseId: 'lesson18_phrase_31',
            variant: 'full',
            promptTokens: 44,
            completionTokens: 22,
        });
    });
    it('generates a separate ELI5 text on the eli5 variant and caches it onto the ready doc', async () => {
        await callExplain(validPayload); // warm the full breakdown first
        mockOkProvider('You said "has" but say "have". "Have" is the friend word for "I". Say: I have a reservation.');
        const eli5 = await callExplain({ ...validPayload, variant: 'eli5' });
        expect(eli5.variant).toBe('eli5');
        expect(eli5.text).toContain('friend word');
        // Second eli5 read for the same mistake comes from cache ($0).
        const eli5Again = await callExplain({ ...validPayload, variant: 'eli5' }, 'auth-3');
        expect(eli5Again.fromCache).toBe(true);
        expect(eli5Again.text).toBe(eli5.text);
    });
    it('persists ELI5 even when it is requested BEFORE the full breakdown (no money leak on repeat)', async () => {
        mockOkProvider('Tiny words: say "have", not "has". "Have" is the buddy of "I".');
        // ELI5 first — no full breakdown cached yet.
        const first = await callExplain({ ...validPayload, variant: 'eli5' });
        expect(first.variant).toBe('eli5');
        expect(first.fromCache).toBe(false);
        // The doc must now be ready WITH an eli5, so a later identical request is free.
        expect(cacheDocs().some((d) => d.status === 'ready' && d.eli5)).toBe(true);
        const fetchCallsAfterFirst = global.fetch.mock.calls.length;
        const second = await callExplain({ ...validPayload, variant: 'eli5' }, 'auth-9');
        expect(second.fromCache).toBe(true);
        expect(second.text).toBe(first.text);
        // No new provider call for the cached repeat.
        expect(global.fetch.mock.calls.length).toBe(fetchCallsAfterFirst);
    });
});
//# sourceMappingURL=mistake_explain.test.js.map