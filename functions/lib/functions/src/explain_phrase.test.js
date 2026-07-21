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
            where: (field, op, value) => {
                if (op !== '==')
                    throw new Error(`unsupported op ${op}`);
                return {
                    limit: (count) => ({
                        get: async () => {
                            const matches = collectionDocs(name)
                                .filter((doc) => doc.data[field] === value)
                                .slice(0, count)
                                .map((doc) => ({ id: doc.id, exists: true, data: () => doc.data }));
                            return { empty: matches.length === 0, docs: matches };
                        },
                    }),
                };
            },
        }),
        runTransaction: async (fn) => {
            const writes = [];
            const result = await fn({
                get: (ref) => ref.get(),
                set: (ref, data, opts) => {
                    writes.push(() => docs.set(ref.path, opts?.merge ? deepMerge(docs.get(ref.path) ?? {}, data) : { ...data }));
                },
            });
            writes.forEach((w) => w());
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
// Provider + judge are mocked so NO real OpenAI call happens in CI.
const mockOpenAiChat = jest.fn();
jest.mock('./explain/explain_provider', () => ({
    openAiChat: (...args) => mockOpenAiChat(...args),
}));
const mockJudge = jest.fn();
jest.mock('./explain/explain_judge', () => ({
    judgeExplanation: (...args) => mockJudge(...args),
}));
const explain_phrase_1 = require("./explain_phrase");
const ai_language_gate_1 = require("./ai_language_gate");
const explain_cache_1 = require("./explain/explain_cache");
const explainPhrase = explain_phrase_1.explainPhrase;
const AUTH_UID = 'auth-1';
const STABLE_UID = 'stable-1';
const PHRASE = 'Break a leg';
const MEANING = 'Пожелание удачи';
function billingDocs() {
    return collectionDocs('explain_billing').map((d) => d.data);
}
function explanationDoc(phraseEn) {
    return docs.get(`phrase_explanations/${(0, explain_cache_1.phraseHashFor)(phraseEn, 'ru')}`);
}
async function callExplain(data, authUid = AUTH_UID) {
    // authUid === null means "no auth" — pass null explicitly to avoid the default-param trap
    // where an explicit `undefined` would fall back to AUTH_UID.
    return explainPhrase({ auth: authUid ? { uid: authUid } : undefined, data });
}
function genReply(text, promptTokens = 100, completionTokens = 50) {
    return { text, promptTokens, completionTokens };
}
function verdict(ok, reason, promptTokens = 12, completionTokens = 5) {
    return { ok, reason, promptTokens, completionTokens };
}
beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-09T12:00:00.000Z'));
    docs.clear();
    autoId = 0;
    mockOpenAiChat.mockReset();
    mockJudge.mockReset();
    // Seed the identity so resolveStableUidForAuth(db, authUid) resolves to STABLE_UID from AUTH.
    docs.set(`users/${STABLE_UID}`, { firebaseAuthUid: AUTH_UID });
});
afterEach(() => {
    jest.useRealTimers();
});
describe('explainPhrase — auth + identity', () => {
    it('rejects unauthenticated callers', async () => {
        await expect(callExplain({ phraseEn: PHRASE, phraseMeaning: MEANING, lang: 'ru' }, null))
            .rejects.toMatchObject({ code: 'unauthenticated', message: 'auth_required' });
    });
    it('IGNORES a body-supplied stableId — identity comes from auth (closes the audit bug class)', async () => {
        mockOpenAiChat.mockResolvedValue(genReply('Это значит пожелать удачи перед важным делом.'));
        mockJudge.mockResolvedValue(verdict(true, 'ok'));
        const res = await callExplain({
            phraseEn: PHRASE,
            phraseMeaning: MEANING,
            lang: 'ru',
            // attacker-controlled identity fields in the body:
            stableId: 'attacker-stable',
            uid: 'attacker-uid',
        });
        expect(res.status).toBe('ok');
        // Billing doc must record the AUTH-derived stable uid, never the body value.
        expect(billingDocs()).toHaveLength(1);
        expect(billingDocs()[0]).toMatchObject({ uid: STABLE_UID, authUid: AUTH_UID });
        expect(billingDocs()[0].uid).not.toBe('attacker-stable');
    });
});
describe('explainPhrase — cache short-circuits (0 AI calls)', () => {
    it('cache READY ⇒ returns cached text, calls neither provider nor judge', async () => {
        docs.set(`phrase_explanations/${(0, explain_cache_1.phraseHashFor)(PHRASE, 'ru')}`, {
            status: 'ready',
            text: 'Готовое объяснение из кэша.',
            schemaVersion: explain_cache_1.EXPLAIN_SCHEMA_VERSION,
        });
        const res = await callExplain({ phraseEn: PHRASE, phraseMeaning: MEANING, lang: 'ru' });
        expect(res).toEqual({ ok: true, text: 'Готовое объяснение из кэша.', status: 'ok', fromCache: true });
        expect(mockOpenAiChat).not.toHaveBeenCalled();
        expect(mockJudge).not.toHaveBeenCalled();
        expect(billingDocs()).toHaveLength(0); // a hit writes no billing doc
    });
    it('es-запрос НЕ получает ru-кэш той же фразы — генерит своё (audit bug 2026-06-10)', async () => {
        // Русское объяснение уже в кэше под ru-ключом.
        docs.set(`phrase_explanations/${(0, explain_cache_1.phraseHashFor)(PHRASE, 'ru')}`, {
            status: 'ready',
            text: 'Готовое РУССКОЕ объяснение.',
            schemaVersion: explain_cache_1.EXPLAIN_SCHEMA_VERSION,
        });
        mockOpenAiChat.mockResolvedValue(genReply('Una explicación sencilla de la gramática inglesa.'));
        mockJudge.mockResolvedValue(verdict(true, 'ok'));
        const res = await callExplain({ phraseEn: PHRASE, phraseMeaning: MEANING, lang: 'es' });
        // НЕ кэш-хит: испанец не должен увидеть русский текст.
        expect(res.fromCache).toBe(false);
        expect(res.text).not.toContain('РУССКОЕ');
        expect(mockOpenAiChat).toHaveBeenCalledTimes(1);
        // Новый док лёг под es-ключом, ru-док не тронут.
        expect(docs.get(`phrase_explanations/${(0, explain_cache_1.phraseHashFor)(PHRASE, 'es')}`)).toMatchObject({ status: 'ready' });
        expect(docs.get(`phrase_explanations/${(0, explain_cache_1.phraseHashFor)(PHRASE, 'ru')}`)).toMatchObject({
            text: 'Готовое РУССКОЕ объяснение.',
        });
    });
    it('FRESH judge-rejected cache ⇒ returns fallback, no regen, no AI calls', async () => {
        docs.set(`phrase_explanations/${(0, explain_cache_1.phraseHashFor)(PHRASE, 'ru')}`, {
            status: 'rejected',
            reason: 'toxic',
            schemaVersion: explain_cache_1.EXPLAIN_SCHEMA_VERSION,
            updatedAtMs: Date.now(), // только что отклонили — TTL ретрая ещё не прошёл
        });
        const res = await callExplain({ phraseEn: PHRASE, phraseMeaning: MEANING, lang: 'ru' });
        expect(res.status).toBe('rejected');
        expect(res.fromCache).toBe(true);
        expect(res.text).toBe((0, explain_phrase_1.buildFallback)(MEANING));
        expect(mockOpenAiChat).not.toHaveBeenCalled();
        expect(mockJudge).not.toHaveBeenCalled();
    });
    it('judge-rejected cache PAST retry TTL ⇒ regenerates (false-positive recovery, prod 2026-06-10)', async () => {
        const { REJECTED_RETRY_TTL_MS } = require('./explain/explain_cache');
        docs.set(`phrase_explanations/${(0, explain_cache_1.phraseHashFor)(PHRASE, 'ru')}`, {
            status: 'rejected',
            reason: 'non_target_language', // ложный вердикт судьи (реальный прод-кейс «i am ready»)
            schemaVersion: explain_cache_1.EXPLAIN_SCHEMA_VERSION,
            updatedAtMs: Date.now() - REJECTED_RETRY_TTL_MS - 1,
        });
        mockOpenAiChat.mockResolvedValue(genReply('Слово "am" — это связка для "I". Поэтому порядок такой.'));
        mockJudge.mockResolvedValue(verdict(true, 'ok'));
        const res = await callExplain({ phraseEn: PHRASE, phraseMeaning: MEANING, lang: 'ru' });
        expect(mockOpenAiChat).toHaveBeenCalledTimes(1);
        expect(res.status).toBe('ok');
        expect(res.fromCache).toBe(false);
        // Фраза вылечилась: кэш снова ready, фолбэк больше не отдаётся.
        expect(explanationDoc(PHRASE)).toMatchObject({ status: 'ready' });
    });
    it('report_threshold-rejected cache ⇒ fallback FOREVER (no regen even past TTL)', async () => {
        const { REJECTED_RETRY_TTL_MS, REPORT_REJECT_REASON } = require('./explain/explain_cache');
        docs.set(`phrase_explanations/${(0, explain_cache_1.phraseHashFor)(PHRASE, 'ru')}`, {
            status: 'rejected',
            reason: REPORT_REJECT_REASON,
            schemaVersion: explain_cache_1.EXPLAIN_SCHEMA_VERSION,
            updatedAtMs: Date.now() - REJECTED_RETRY_TTL_MS * 100,
        });
        const res = await callExplain({ phraseEn: PHRASE, phraseMeaning: MEANING, lang: 'ru' });
        expect(res.status).toBe('rejected');
        expect(res.text).toBe((0, explain_phrase_1.buildFallback)(MEANING));
        expect(mockOpenAiChat).not.toHaveBeenCalled();
    });
});
describe('explainPhrase — full miss path', () => {
    it('generate → judge ok ⇒ writeReady, returns generated text, writes one billing doc with both token sets', async () => {
        mockOpenAiChat.mockResolvedValue(genReply('Это значит пожелать удачи. Например: перед экзаменом.', 120, 60));
        mockJudge.mockResolvedValue(verdict(true, 'ok', 15, 4));
        const res = await callExplain({ phraseEn: PHRASE, phraseMeaning: MEANING, lang: 'ru' });
        expect(mockOpenAiChat).toHaveBeenCalledTimes(1);
        expect(mockJudge).toHaveBeenCalledTimes(1);
        expect(res).toMatchObject({ ok: true, status: 'ok', fromCache: false });
        expect(res.text).toContain('пожелать удачи');
        // Cache became public (ready).
        expect(explanationDoc(PHRASE)).toMatchObject({ status: 'ready', lang: 'ru', model: 'gpt-4o-mini' });
        // One billing doc with BOTH gen and judge token usage.
        expect(billingDocs()).toHaveLength(1);
        expect(billingDocs()[0]).toMatchObject({
            uid: STABLE_UID,
            genPromptTokens: 120,
            genCompletionTokens: 60,
            judgePromptTokens: 15,
            judgeCompletionTokens: 4,
            verdict: 'ok',
            published: true,
        });
    });
    it('judge ok:FALSE writes rejected evidence and returns only fallback to the live caller', async () => {
        mockOpenAiChat.mockResolvedValue(genReply('Сырой непроверенный текст объяснения фразы.'));
        mockJudge.mockResolvedValue(verdict(false, 'off_topic'));
        const res = await callExplain({ phraseEn: PHRASE, phraseMeaning: MEANING, lang: 'ru' });
        expect(explanationDoc(PHRASE)).toMatchObject({ status: 'rejected', reason: 'off_topic' });
        expect(res.status).toBe('rejected');
        expect(res.fromCache).toBe(false);
        expect(res.text).toBe((0, explain_phrase_1.buildFallback)(MEANING));
        expect(res.text).not.toContain('Сырой');
        expect(billingDocs()[0]).toMatchObject({ verdict: 'off_topic', published: false });
    });
    it('sanitizes markdown out of the generated text before judging and caching', async () => {
        mockOpenAiChat.mockResolvedValue(genReply('**Это** значит `удачи`. Например: перед делом.'));
        mockJudge.mockResolvedValue(verdict(true, 'ok'));
        const res = await callExplain({ phraseEn: PHRASE, phraseMeaning: MEANING, lang: 'ru' });
        expect(res.text).not.toContain('**');
        expect(res.text).not.toContain('`');
        // Judge received the sanitized text.
        const judgedText = mockJudge.mock.calls[0][0].text;
        expect(judgedText).not.toContain('**');
    });
});
describe('explainPhrase — budget exhaustion degrades gracefully (no 500)', () => {
    it('per-user cap reached ⇒ fallback with status exhausted, no AI calls', async () => {
        // Pre-fill the user limit doc to the cap so enforceUserGenLimit throws resource-exhausted.
        // docId is deterministic; the limiter reads dailyCount vs USER_DAILY_GEN_CAP (20).
        const { USER_DAILY_GEN_CAP, USER_LIMIT_COLLECTION } = require('./explain/explain_budget');
        const crypto = require('crypto');
        const hash = crypto.createHash('sha256').update(`gen|${AUTH_UID}|${STABLE_UID}`).digest('hex').slice(0, 48);
        docs.set(`${USER_LIMIT_COLLECTION}/gen_${hash}`, {
            dailyCount: USER_DAILY_GEN_CAP,
            resetAtMs: Date.UTC(2026, 5, 10, 0, 0, 0, 0), // tomorrow → still in window, count is at cap
        });
        const res = await callExplain({ phraseEn: PHRASE, phraseMeaning: MEANING, lang: 'ru' });
        expect(res).toMatchObject({ ok: true, status: 'exhausted', fromCache: false });
        expect(res.text).toBe((0, explain_phrase_1.buildFallback)(MEANING));
        expect(mockOpenAiChat).not.toHaveBeenCalled();
        expect(billingDocs()).toHaveLength(0);
    });
    it('global budget cap reached ⇒ fallback with status exhausted', async () => {
        const { GLOBAL_DAILY_CAP, GLOBAL_BUDGET_COLLECTION } = require('./explain/explain_budget');
        const dateKey = new Date('2026-06-09T12:00:00.000Z').toISOString().slice(0, 10);
        docs.set(`${GLOBAL_BUDGET_COLLECTION}/${dateKey}`, { genCount: GLOBAL_DAILY_CAP });
        const res = await callExplain({ phraseEn: PHRASE, phraseMeaning: MEANING, lang: 'ru' });
        expect(res.status).toBe('exhausted');
        expect(mockOpenAiChat).not.toHaveBeenCalled();
    });
});
describe('explainPhrase — concurrent generation (lost lock race)', () => {
    it('a fresh pending lock held by someone else ⇒ fallback with status pending, no generate', async () => {
        // Another request is actively generating: a fresh pending doc exists.
        docs.set(`phrase_explanations/${(0, explain_cache_1.phraseHashFor)(PHRASE, 'ru')}`, {
            status: 'pending',
            schemaVersion: explain_cache_1.EXPLAIN_SCHEMA_VERSION,
            createdAtMs: Date.now(), // fresh → claimPendingLock returns false
        });
        const res = await callExplain({ phraseEn: PHRASE, phraseMeaning: MEANING, lang: 'ru' });
        expect(res).toMatchObject({ ok: true, status: 'pending', fromCache: true });
        expect(res.text).toBe((0, explain_phrase_1.buildFallback)(MEANING));
        expect(mockOpenAiChat).not.toHaveBeenCalled();
    });
});
describe('explainPhrase — input validation', () => {
    it('empty phrase ⇒ invalid-argument (no AI work)', async () => {
        await expect(callExplain({ phraseEn: '', phraseMeaning: MEANING, lang: 'ru' }))
            .rejects.toMatchObject({ code: 'invalid-argument' });
        expect(mockOpenAiChat).not.toHaveBeenCalled();
    });
    it('missing meaning ⇒ invalid-argument (fallback needs it)', async () => {
        await expect(callExplain({ phraseEn: PHRASE, phraseMeaning: '', lang: 'ru' }))
            .rejects.toMatchObject({ code: 'invalid-argument' });
    });
});
describe('buildFallback — neutral, never echoes the meaning/translation', () => {
    it('NEVER includes the phrase meaning (feature explains English grammar, not RU sense)', () => {
        // Even when a meaning is passed, it must NOT appear in the fallback text.
        expect((0, explain_phrase_1.buildFallback)('Привет, как дела')).not.toContain('Привет');
        expect((0, explain_phrase_1.buildFallback)('Привет, как дела')).not.toContain('Например');
    });
    it('is a neutral try-again message regardless of input (with or without meaning)', () => {
        const neutral = 'Не получилось подготовить объяснение. Попробуйте позже.';
        expect((0, explain_phrase_1.buildFallback)('')).toBe(neutral);
        expect((0, explain_phrase_1.buildFallback)('что угодно')).toBe(neutral);
        expect((0, explain_phrase_1.buildFallback)()).toBe(neutral);
    });
    it('localizes the neutral fallback for every explain output language', () => {
        const cyrillic = /[\u0400-\u052f]/;
        const plannedLocales = ['es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
        for (const [lang, expected] of Object.entries(explain_phrase_1.EXPLAIN_FALLBACK_BY_LANG)) {
            const text = (0, explain_phrase_1.buildFallback)('Привет, как дела', lang);
            expect(text).toBe(expected);
            expect(text).not.toContain('Привет');
            expect((0, ai_language_gate_1.rejectGeneratedLanguageText)(text, lang)).toBeNull();
            if (plannedLocales.includes(lang))
                expect(text).not.toMatch(cyrillic);
        }
    });
});
//# sourceMappingURL=explain_phrase.test.js.map