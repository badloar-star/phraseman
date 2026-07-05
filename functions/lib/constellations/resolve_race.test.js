"use strict";
// ════════════════════════════════════════════════════════════════════════════
// resolve_race.test.ts — гонка резолва раунда (ЭТАП 7.3, P0).
//
// resolveCurrentRound триггерится и submit-фаст-форвардом, и watchdog-cron'ом —
// возможен КОНКУРЕНТНЫЙ вызов на одном раунде. Защита — re-read guard в
// транзакции: `if (match.phase !== 'answer') return`. После первого резолва
// фаза уже 'choose', раунд инкрементнут → повторный вызов обязан выйти без
// изменений (не резолвить раунд дважды, не начислять события повторно).
// ════════════════════════════════════════════════════════════════════════════
Object.defineProperty(exports, "__esModule", { value: true });
const docs = new Map();
function snapFor(path) {
    const data = docs.get(path);
    return { path, exists: data !== undefined, data: () => (data ? { ...data } : undefined) };
}
function makeRef(path) {
    return { path, collection: (n) => ({ doc: (id) => makeRef(`${path}/${n}/${id ?? 'auto'}`) }) };
}
function buildDb() {
    return {
        collection: (name) => ({ doc: (id) => makeRef(`${name}/${id ?? 'auto'}`) }),
        getAll: async (...refs) => refs.map((r) => snapFor(r.path)),
        runTransaction: async (fn) => {
            const writes = [];
            const tx = {
                get: async (r) => snapFor(r.path),
                update: (r, d) => { writes.push(() => docs.set(r.path, { ...(docs.get(r.path) ?? {}), ...d })); },
                set: (r, d, o) => {
                    writes.push(() => docs.set(r.path, o?.merge ? { ...(docs.get(r.path) ?? {}), ...d } : { ...d }));
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
jest.mock('firebase-functions/v2/https', () => ({ HttpsError: FakeHttpsError, onCall: (_o, h) => h }));
jest.mock('firebase-admin', () => ({ firestore: jest.fn(() => buildDb()) }));
jest.mock('./config', () => {
    const actual = jest.requireActual('./config');
    return { ...actual, resolveConstellationConfig: jest.fn(async () => actual.constellationConfigFromData({})) };
});
// finalize не должен реально начислять в этом тесте — no-op.
const finalizeSpy = jest.fn(async () => { });
const MATCH_ID = 'm1';
// Минимальный валидный матч в фазе answer: 1 человек + карта из движка.
function seedAnswerPhase() {
    const { createInitialMatchState } = require('./engine');
    const { generateMap } = require('./hex');
    const map = generateMap(MATCH_ID);
    const uids = ['h1', 'b1', 'b2', 'b3'];
    const state = createInitialMatchState({ uids, homes: map.homes, roundsTotal: 10, homeCores: 3 });
    docs.set(`constellation_matches/${MATCH_ID}`, {
        id: MATCH_ID, stage: 'active', phase: 'answer', round: 1,
        roundsTotal: 10,
        playerIds: uids,
        starfall: { golden: false },
        wagerBySlot: {},
        stars: state.stars,
        players: uids.map((uid, slot) => ({
            slot, uid, name: uid, avatar: '1', avatarLevel: 1,
            status: 'alive', cores: 3, fallingLight: 0, shieldUsed: false,
            bonusPoints: 0, liveScore: 0, perfectCaptures: 0, dustEarned: 0,
            starfallEarned: 0, roundDone: false,
        })),
    });
    docs.set(`constellation_server/${MATCH_ID}`, {
        matchId: MATCH_ID,
        state,
        humanUids: ['h1'],
        bots: [
            { uid: 'b1', slot: 1, plan: null, target: null, shieldStarKey: null },
            { uid: 'b2', slot: 2, plan: null, target: null, shieldStarKey: null },
            { uid: 'b3', slot: 3, plan: null, target: null, shieldStarKey: null },
        ],
        duels: [],
        correctByQid: {},
        starfallBySlot: {},
        answerStats: { 0: { timeSumMs: 0, count: 0 }, 1: {}, 2: {}, 3: {} },
        ratingBySlot: { 0: 0, 1: 0, 2: 0, 3: 0 },
    });
    // Игрок-человек: в этом раунде ничего не выбрал (idle) — пустой резолв, но
    // ВАЛИДНЫЙ переход фазы (round++ , phase='choose').
    docs.set(`constellation_players/${MATCH_ID}_h1`, {
        matchId: MATCH_ID, uid: 'h1', slot: 0, round: 1,
        kind: 'idle', target: null, shieldStarKey: null,
        questions: [], answers: [], processedActionIds: [],
    });
}
describe('resolveCurrentRound — гонка/re-read guard (7.3)', () => {
    beforeEach(() => {
        jest.useFakeTimers().setSystemTime(new Date('2026-05-14T10:00:00.000Z'));
        jest.resetModules();
        docs.clear();
        finalizeSpy.mockClear();
    });
    test('второй конкурентный резолв выходит без изменений (phase уже не answer)', async () => {
        seedAnswerPhase();
        const svc = require('./match_service');
        // Подменяем finalize, чтобы фокус был на переходе фазы, не на начислении.
        jest.spyOn(svc, 'finalizeConstellationMatch').mockImplementation(finalizeSpy);
        await svc.resolveCurrentRound(MATCH_ID);
        const afterFirst = docs.get(`constellation_matches/${MATCH_ID}`);
        // Раунд перешёл: phase='choose', round инкрементнут.
        expect(afterFirst.phase).toBe('choose');
        const roundAfterFirst = afterFirst.round;
        expect(roundAfterFirst).toBe(2);
        const deadlineAfterFirst = afterFirst.phaseDeadlineAt;
        // Второй вызов на том же (уже перешедшем) состоянии — guard'ом выходит.
        await svc.resolveCurrentRound(MATCH_ID);
        const afterSecond = docs.get(`constellation_matches/${MATCH_ID}`);
        // Ничего не изменилось: раунд не ушёл в 3, фаза осталась choose.
        expect(afterSecond.round).toBe(roundAfterFirst);
        expect(afterSecond.phase).toBe('choose');
        expect(afterSecond.phaseDeadlineAt).toBe(deadlineAfterFirst);
    });
    test('резолв на матче не в фазе answer (choose) ничего не делает', async () => {
        seedAnswerPhase();
        const m = docs.get(`constellation_matches/${MATCH_ID}`);
        docs.set(`constellation_matches/${MATCH_ID}`, { ...m, phase: 'choose' });
        const svc = require('./match_service');
        jest.spyOn(svc, 'finalizeConstellationMatch').mockImplementation(finalizeSpy);
        await svc.resolveCurrentRound(MATCH_ID);
        const after = docs.get(`constellation_matches/${MATCH_ID}`);
        expect(after.round).toBe(1); // не тронут
        expect(after.phase).toBe('choose');
    });
});
//# sourceMappingURL=resolve_race.test.js.map