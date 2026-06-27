"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const docs = new Map();
function snapFor(path) {
    const data = docs.get(path);
    return { exists: data !== undefined, data: () => data };
}
function makeRef(path) {
    return {
        path,
        get: async () => snapFor(path),
        collection: (name) => ({
            doc: (id) => makeRef(`${path}/${name}/${id}`),
        }),
    };
}
function setPath(target, dottedKey, value) {
    const parts = dottedKey.split('.');
    let cursor = target;
    for (let i = 0; i < parts.length - 1; i += 1) {
        const key = parts[i];
        const existing = cursor[key];
        if (!existing || typeof existing !== 'object' || Array.isArray(existing))
            cursor[key] = {};
        cursor = cursor[key];
    }
    cursor[parts[parts.length - 1]] = value;
}
function mergeFirestore(existing, patch) {
    const next = { ...existing };
    for (const [key, value] of Object.entries(patch)) {
        if (key.includes('.')) {
            setPath(next, key, value);
        }
        else if (value &&
            typeof value === 'object' &&
            !Array.isArray(value) &&
            existing[key] &&
            typeof existing[key] === 'object' &&
            !Array.isArray(existing[key])) {
            next[key] = mergeFirestore(existing[key], value);
        }
        else {
            next[key] = value;
        }
    }
    return next;
}
function buildDb() {
    return {
        collection: (name) => ({
            doc: (id) => makeRef(`${name}/${id}`),
        }),
        runTransaction: async (fn) => {
            const writes = [];
            const tx = {
                get: async (ref) => snapFor(ref.path),
                set: (ref, data, opts) => {
                    writes.push(() => {
                        const existing = docs.get(ref.path) ?? {};
                        docs.set(ref.path, opts?.merge ? mergeFirestore(existing, data) : mergeFirestore({}, data));
                    });
                },
            };
            const result = await fn(tx);
            writes.forEach(write => write());
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
    onCall: (_opts, handler) => handler,
}));
jest.mock('firebase-admin', () => ({
    firestore: jest.fn(() => buildDb()),
}));
async function recordBotMatch(overrides = {}) {
    const { arenaBotMatchRecord } = require('./arena_bot_match');
    return arenaBotMatchRecord({
        auth: { uid: 'auth-1' },
        data: {
            sessionId: 'bot_session_1',
            won: true,
            isLast: false,
            isDraw: false,
            myScore: 480,
            oppScore: 250,
            oppName: 'Bot',
            myName: 'Tester',
            ...overrides,
        },
    });
}
beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-14T10:00:00.000Z'));
    jest.resetModules();
    docs.clear();
    docs.set('arena_profiles/auth-1', {
        userId: 'auth-1',
        rank: { tier: 'bronze', level: 'I', stars: 0 },
        xp: 10,
        stats: { matchesPlayed: 0, matchesWon: 0, totalScore: 0, winStreak: 0, bestWinStreak: 0 },
    });
});
afterEach(() => {
    jest.useRealTimers();
});
describe('arenaBotMatchRecord', () => {
    it('records a bot match once and replays duplicate session delivery without second XP/stat increment', async () => {
        const first = await recordBotMatch();
        expect(first).toMatchObject({
            xpDelta: 50,
            oldStars: 0,
            newStars: 1,
        });
        expect(first.idempotentReplay).toBeUndefined();
        expect(docs.get('arena_profiles/auth-1')).toMatchObject({
            xp: 60,
            rank: { tier: 'bronze', level: 'I', stars: 1 },
            stats: { matchesPlayed: 1, matchesWon: 1, totalScore: 480, winStreak: 1, bestWinStreak: 1 },
        });
        expect(docs.get('arena_profiles/auth-1/match_history/bot_session_1')).toMatchObject({
            sessionId: 'bot_session_1',
            xpGained: 50,
            isBot: true,
            rankBefore: { tier: 'bronze', level: 'I', stars: 0 },
            rankAfter: { tier: 'bronze', level: 'I', stars: 1 },
        });
        const second = await recordBotMatch();
        expect(second).toMatchObject({
            idempotentReplay: true,
            xpDelta: 50,
            oldStars: 0,
            newStars: 1,
        });
        expect(docs.get('arena_profiles/auth-1')).toMatchObject({
            xp: 60,
            rank: { tier: 'bronze', level: 'I', stars: 1 },
            stats: { matchesPlayed: 1, matchesWon: 1, totalScore: 480, winStreak: 1, bestWinStreak: 1 },
        });
    });
    it('still records a different session as a new match', async () => {
        await recordBotMatch();
        const secondSession = await recordBotMatch({ sessionId: 'bot_session_2', myScore: 510 });
        expect(secondSession).toMatchObject({
            xpDelta: 50,
        });
        expect(secondSession.idempotentReplay).toBeUndefined();
        expect(docs.get('arena_profiles/auth-1')).toMatchObject({
            xp: 110,
            rank: { tier: 'bronze', level: 'I', stars: 2 },
            stats: { matchesPlayed: 2, matchesWon: 2, totalScore: 990, winStreak: 2, bestWinStreak: 2 },
        });
        expect(docs.get('arena_profiles/auth-1/match_history/bot_session_2')).toMatchObject({
            sessionId: 'bot_session_2',
            xpGained: 50,
        });
    });
});
//# sourceMappingURL=arena_bot_match.test.js.map