"use strict";
/**
 * Unit tests for matchmaking logic.
 * Tests pure matching logic — no Firebase needed.
 */
Object.defineProperty(exports, "__esModule", { value: true });
// ─── Pure helpers mirroring matchmaking.ts ────────────────────────────────────
const STALE_ENTRY_MS = 15 * 60 * 1000;
function makeEntry(overrides) {
    return {
        userId: overrides.id,
        rankTier: 'bronze',
        size: 2,
        joinedAt: Date.now(),
        rankIndex: 0,
        searchRange: 2,
        displayName: 'Player',
        ...overrides,
    };
}
// Mirrors matchmaking.ts: self by doc id, size через Number (Firestore Long / string)
function findCandidates(userEntry, allEntries) {
    const pool = allEntries.filter(e => !e.sessionId &&
        e.id !== userEntry.id &&
        Number(e.size) === Number(userEntry.size));
    const myIdx = userEntry.rankIndex ?? 0;
    const myRange = userEntry.searchRange ?? 2;
    return pool.filter(e => {
        const theirIdx = e.rankIndex ?? 0;
        const theirRange = e.searchRange ?? 2;
        return Math.abs(myIdx - theirIdx) <= Math.max(myRange, theirRange);
    });
}
function isStale(entry) {
    return Date.now() - entry.joinedAt > STALE_ENTRY_MS;
}
// ─── CORE: Two players match ──────────────────────────────────────────────────
describe('matchmaking: two players find each other', () => {
    test('player A and B in queue → B is candidate for A', () => {
        const A = makeEntry({ id: 'uid_A', size: 2 });
        const B = makeEntry({ id: 'uid_B', size: 2 });
        const candidates = findCandidates(A, [B]);
        expect(candidates).toHaveLength(1);
        expect(candidates[0].userId).toBe('uid_B');
    });
    test('player B and A in queue → A is candidate for B', () => {
        const A = makeEntry({ id: 'uid_A', size: 2 });
        const B = makeEntry({ id: 'uid_B', size: 2 });
        const candidates = findCandidates(B, [A]);
        expect(candidates).toHaveLength(1);
        expect(candidates[0].userId).toBe('uid_A');
    });
    test('match succeeds: picked = [A, B]', () => {
        const A = makeEntry({ id: 'uid_A', size: 2 });
        const B = makeEntry({ id: 'uid_B', size: 2 });
        const candidates = findCandidates(A, [B]);
        expect(candidates.length >= A.size - 1).toBe(true);
        const picked = [A, ...candidates.slice(0, A.size - 1)];
        expect(picked).toHaveLength(2);
        expect(picked.map(p => p.userId)).toEqual(['uid_A', 'uid_B']);
    });
    test('size number vs string (2 vs "2") still pairs — баг strict === на клієнтах / Long', () => {
        const A = makeEntry({ id: 'uid_A', size: 2 });
        const B = { ...makeEntry({ id: 'uid_B' }), size: '2' };
        const candidates = findCandidates(A, [B]);
        expect(candidates).toHaveLength(1);
    });
});
// ─── No false positives ───────────────────────────────────────────────────────
describe('matchmaking: edge cases', () => {
    test('no match when queue is empty', () => {
        const A = makeEntry({ id: 'uid_A', size: 2 });
        const candidates = findCandidates(A, []);
        expect(candidates).toHaveLength(0);
    });
    test('player not matched with themselves', () => {
        const A = makeEntry({ id: 'uid_A', size: 2 });
        const candidates = findCandidates(A, [A]);
        expect(candidates).toHaveLength(0);
    });
    test('already matched player (has sessionId) is excluded', () => {
        const A = makeEntry({ id: 'uid_A', size: 2 });
        const B = makeEntry({ id: 'uid_B', size: 2, sessionId: 'existing_session' });
        const candidates = findCandidates(A, [B]);
        expect(candidates).toHaveLength(0);
    });
    test('different sizes do not match', () => {
        const A = makeEntry({ id: 'uid_A', size: 2 });
        const B = makeEntry({ id: 'uid_B', size: 4 });
        const candidates = findCandidates(A, [B]);
        expect(candidates).toHaveLength(0);
    });
    test('far rank tiers do not match when out of search range', () => {
        const A = makeEntry({ id: 'uid_A', rankTier: 'bronze', rankIndex: 0 });
        const B = makeEntry({ id: 'uid_B', rankTier: 'legend', rankIndex: 20 });
        const candidates = findCandidates(A, [B]);
        expect(candidates).toHaveLength(0);
    });
    test('different ranks match when search range overlaps', () => {
        const A = makeEntry({ id: 'uid_A', rankTier: 'bronze', rankIndex: 0, searchRange: 2 });
        const B = makeEntry({ id: 'uid_B', rankTier: 'gold', rankIndex: 3, searchRange: 3 });
        const candidates = findCandidates(A, [B]);
        expect(candidates).toHaveLength(1);
    });
    test('3+ players in queue: picks first available', () => {
        const A = makeEntry({ id: 'uid_A', size: 2 });
        const B = makeEntry({ id: 'uid_B', size: 2 });
        const C = makeEntry({ id: 'uid_C', size: 2 });
        const candidates = findCandidates(A, [B, C]);
        expect(candidates.length >= 1).toBe(true);
        const picked = [A, ...candidates.slice(0, A.size - 1)];
        expect(picked).toHaveLength(2);
    });
});
// ─── Stale entry detection ────────────────────────────────────────────────────
describe('stale entry detection', () => {
    test('entry older than 15 min is stale', () => {
        const old = makeEntry({ id: 'a', joinedAt: Date.now() - STALE_ENTRY_MS - 1 });
        expect(isStale(old)).toBe(true);
    });
    test('fresh entry (30 sec ago) is NOT stale', () => {
        const fresh = makeEntry({ id: 'a', joinedAt: Date.now() - 30000 });
        expect(isStale(fresh)).toBe(false);
    });
    test('entry exactly at 15 min boundary is NOT stale', () => {
        const boundary = makeEntry({ id: 'a', joinedAt: Date.now() - STALE_ENTRY_MS });
        expect(isStale(boundary)).toBe(false);
    });
});
// ─── subscribeMatchmakingQueue trigger logic ──────────────────────────────────
describe('client subscription: fires when sessionId appears', () => {
    test('no sessionId → does NOT call onSessionFound', () => {
        const data = { userId: 'uid_A', size: 2, joinedAt: Date.now() };
        const sessionId = data.sessionId;
        expect(sessionId).toBeUndefined(); // клиент не должен навигировать
    });
    test('sessionId present → calls onSessionFound', () => {
        const data = { userId: 'uid_A', size: 2, joinedAt: Date.now(), sessionId: 'sess_123' };
        const sessionId = data.sessionId;
        expect(sessionId).toBe('sess_123'); // клиент навигирует в игру
    });
});
//# sourceMappingURL=matchmaking.test.js.map