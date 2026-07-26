"use strict";
// ════════════════════════════════════════════════════════════════════════════
// finalize.test.ts — идемпотентность начисления наград (ЭТАП 7.1, P0).
//
// finalizeConstellationMatch начисляет ОСКОЛКИ/XP/★/SR и пишет shard_log.
// Watchdog дёргает finalize на каждый тик → реальный риск ДВОЙНОГО начисления.
// Гейт — match.resultProcessedAt. Тест: два (и три) последовательных вызова
// начисляют РОВНО раз, shard_log — одна запись, баланс не удваивается.
// Fake-firestore с auto-id doc() (для shard_log), getAll, update, set(merge).
// ════════════════════════════════════════════════════════════════════════════
Object.defineProperty(exports, "__esModule", { value: true });
const docs = new Map();
let autoId = 0;
function snapFor(path) {
    const data = docs.get(path);
    return { path, exists: data !== undefined, data: () => (data ? { ...data } : undefined) };
}
function makeRef(path) {
    return {
        path,
        collection: (name) => makeCol(`${path}/${name}`),
    };
}
function makeCol(path) {
    return {
        doc: (id) => makeRef(`${path}/${id ?? `auto_${autoId += 1}`}`),
    };
}
function mergeDeep(existing, patch) {
    const next = { ...existing };
    for (const [k, v] of Object.entries(patch)) {
        if (v && typeof v === 'object' && !Array.isArray(v) && existing[k]
            && typeof existing[k] === 'object' && !Array.isArray(existing[k])) {
            next[k] = mergeDeep(existing[k], v);
        }
        else {
            next[k] = v;
        }
    }
    return next;
}
function buildDb() {
    return {
        collection: (name) => makeCol(name),
        getAll: async (...refs) => refs.map((r) => snapFor(r.path)),
        runTransaction: async (fn) => {
            const writes = [];
            const tx = {
                get: async (ref) => snapFor(ref.path),
                update: (ref, data) => {
                    writes.push(() => {
                        // dot-path update (rank.tier и пр.) + плоские поля.
                        const cur = { ...(docs.get(ref.path) ?? {}) };
                        for (const [k, v] of Object.entries(data)) {
                            if (k.includes('.')) {
                                const [head, tail] = k.split('.');
                                cur[head] = { ...(cur[head] ?? {}), [tail]: v };
                            }
                            else {
                                cur[k] = v;
                            }
                        }
                        docs.set(ref.path, cur);
                    });
                },
                set: (ref, data, opts) => {
                    writes.push(() => {
                        const existing = docs.get(ref.path) ?? {};
                        docs.set(ref.path, opts?.merge ? mergeDeep(existing, data) : { ...data });
                    });
                },
            };
            const result = await fn(tx);
            writes.forEach((w) => w());
            return result;
        },
    };
}
class FakeHttpsError extends Error {
    constructor(code, message) { super(message); this.code = code; }
}
jest.mock('firebase-functions/v2/https', () => ({
    HttpsError: FakeHttpsError,
    onCall: (_o, h) => h,
}));
jest.mock('firebase-admin', () => ({ firestore: jest.fn(() => buildDb()) }));
jest.mock('./config', () => {
    const actual = jest.requireActual('./config');
    return { ...actual, resolveConstellationConfig: jest.fn(async () => actual.constellationConfigFromData({})) };
});
const MATCH_ID = 'm1';
const HUMAN = 'human1';
function seedFinishedMatch() {
    // Один человек (slot 0, 1 место), три бота — награды человеку начисляются.
    docs.set(`constellation_matches/${MATCH_ID}`, {
        id: MATCH_ID, stage: 'finished', phase: 'answer', round: 10,
        finishedAt: Date.now(),
        starfall: { golden: false },
        wagerBySlot: {},
        players: [
            { slot: 0, uid: HUMAN, name: 'Игрок' },
            { slot: 1, uid: 'bot1', name: 'B1' },
            { slot: 2, uid: 'bot2', name: 'B2' },
            { slot: 3, uid: 'bot3', name: 'B3' },
        ],
    });
    docs.set(`constellation_server/${MATCH_ID}`, {
        matchId: MATCH_ID,
        state: {
            players: [
                { slot: 0, uid: HUMAN, status: 'alive', bonusPoints: 30, perfectCaptures: 0, dustEarned: 0 },
                { slot: 1, uid: 'bot1', status: 'out', bonusPoints: 0, perfectCaptures: 0, dustEarned: 0 },
                { slot: 2, uid: 'bot2', status: 'out', bonusPoints: 0, perfectCaptures: 0, dustEarned: 0 },
                { slot: 3, uid: 'bot3', status: 'out', bonusPoints: 0, perfectCaptures: 0, dustEarned: 0 },
            ],
            stars: {},
        },
        bots: [
            { uid: 'bot1', slot: 1 }, { uid: 'bot2', slot: 2 }, { uid: 'bot3', slot: 3 },
        ],
        answerStats: { 0: { timeSumMs: 3000, count: 3 }, 1: {}, 2: {}, 3: {} },
        starfallBySlot: {},
    });
    // Профиль и юзер человека с известным стартовым балансом осколков.
    docs.set(`arena_profiles/${HUMAN}`, {
        userId: HUMAN, rank: { tier: 'bronze', level: 'I', stars: 0 }, xp: 100,
    });
    docs.set(`users/${HUMAN}`, { shards: 50, constellation_stats: { matchesPlayed: 10 } });
}
function shardLogEntries() {
    const out = [];
    for (const [path, data] of docs.entries()) {
        if (path.includes(`users/${HUMAN}/shard_log/`))
            out.push(data);
    }
    return out;
}
describe('finalizeConstellationMatch — идемпотентность (7.1)', () => {
    beforeEach(() => {
        jest.useFakeTimers().setSystemTime(new Date('2026-05-14T10:00:00.000Z'));
        jest.resetModules();
        docs.clear();
        autoId = 0;
    });
    test('двойной finalize начисляет осколки РОВНО раз', async () => {
        seedFinishedMatch();
        const { finalizeConstellationMatch } = require('./match_service');
        await finalizeConstellationMatch(MATCH_ID);
        const afterFirst = Number(docs.get(`users/${HUMAN}`).shards);
        const xpAfterFirst = Number(docs.get(`arena_profiles/${HUMAN}`).xp);
        const logAfterFirst = shardLogEntries().length;
        const processedAt = docs.get(`constellation_matches/${MATCH_ID}`).resultProcessedAt;
        expect(processedAt).toBeDefined();
        // 1 место даёт положительные осколки — баланс вырос.
        expect(afterFirst).toBeGreaterThan(50);
        // Второй вызов — ничего не меняет (resultProcessedAt-гейт).
        await finalizeConstellationMatch(MATCH_ID);
        const afterSecond = Number(docs.get(`users/${HUMAN}`).shards);
        const xpAfterSecond = Number(docs.get(`arena_profiles/${HUMAN}`).xp);
        expect(afterSecond).toBe(afterFirst);
        expect(xpAfterSecond).toBe(xpAfterFirst);
        // shard_log не растёт — записи не задваиваются.
        expect(shardLogEntries().length).toBe(logAfterFirst);
        // resultProcessedAt не перезаписан.
        expect(docs.get(`constellation_matches/${MATCH_ID}`).resultProcessedAt).toBe(processedAt);
    });
    test('тройной finalize так же безопасен (watchdog дёргает многократно)', async () => {
        seedFinishedMatch();
        const { finalizeConstellationMatch } = require('./match_service');
        await finalizeConstellationMatch(MATCH_ID);
        const shards1 = Number(docs.get(`users/${HUMAN}`).shards);
        const log1 = shardLogEntries().length;
        await finalizeConstellationMatch(MATCH_ID);
        await finalizeConstellationMatch(MATCH_ID);
        expect(Number(docs.get(`users/${HUMAN}`).shards)).toBe(shards1);
        expect(shardLogEntries().length).toBe(log1);
    });
    test('finalize на НЕ finished матче ничего не начисляет', async () => {
        seedFinishedMatch();
        // Матч ещё active → finalize должен выйти без начислений.
        const m = docs.get(`constellation_matches/${MATCH_ID}`);
        docs.set(`constellation_matches/${MATCH_ID}`, { ...m, stage: 'active' });
        const { finalizeConstellationMatch } = require('./match_service');
        await finalizeConstellationMatch(MATCH_ID);
        expect(Number(docs.get(`users/${HUMAN}`).shards)).toBe(50);
        expect(shardLogEntries().length).toBe(0);
        expect(docs.get(`constellation_matches/${MATCH_ID}`).resultProcessedAt).toBeUndefined();
    });
});
//# sourceMappingURL=finalize.test.js.map