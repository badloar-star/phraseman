import {
  DUEL_ELAPSED_MAX_MS,
  duelCorrect,
  duelDayKey,
  duelDocumentId,
  duelPairKey,
  isDuelExpired,
  parseDuelMove,
  parseDuelPhraseIds,
} from './friends_duel_core';

const ids = ['en:lesson-02:session-03:i01', 'en:lesson-02:session-03:i02', 'en:lesson-02:session-03:i03',
  'en:lesson-02:session-03:i04', 'en:lesson-02:session-03:i05'];

describe('friends duel core', () => {
  test('phrase ids: exactly five distinct strings up to 96 chars', () => {
    expect(parseDuelPhraseIds(ids)).toEqual(ids);
    expect(parseDuelPhraseIds(ids.slice(0, 4))).toBeNull();
    expect(parseDuelPhraseIds([...ids.slice(0, 4), ids[0]])).toBeNull();
    expect(parseDuelPhraseIds([...ids.slice(0, 4), 'x'.repeat(97)])).toBeNull();
    expect(parseDuelPhraseIds([...ids.slice(0, 4), '  '])).toBeNull();
    expect(parseDuelPhraseIds('nope')).toBeNull();
  });

  test('move: five booleans, elapsed clamped to 0…15 min, garbage results rejected', () => {
    expect(parseDuelMove({ results: [true, false, true, true, false], elapsedMs: 12_345.9 }))
      .toEqual({ results: [true, false, true, true, false], elapsedMs: 12_345 });
    expect(parseDuelMove({ results: [true, true, true, true, true], elapsedMs: -5 })?.elapsedMs).toBe(0);
    expect(parseDuelMove({ results: [true, true, true, true, true], elapsedMs: 99_999_999 })?.elapsedMs).toBe(DUEL_ELAPSED_MAX_MS);
    expect(parseDuelMove({ results: [true, true, true, true, true], elapsedMs: 'x' })?.elapsedMs).toBe(DUEL_ELAPSED_MAX_MS);
    expect(parseDuelMove({ results: [true, true, true, true], elapsedMs: 1 })).toBeNull();
    expect(parseDuelMove({ results: [true, true, true, true, 1], elapsedMs: 1 })).toBeNull();
    expect(parseDuelMove(null)).toBeNull();
  });

  test('correct count for the move summary (the outcome itself is computed on the phone)', () => {
    expect(duelCorrect({ results: [true, true, true, true, false], elapsedMs: 50_000 })).toBe(4);
  });

  test('pair key is order-independent and shared with friend_pairs; duel id carries the sequence', () => {
    expect(duelPairKey('b-uid', 'a-uid')).toBe('a-uid__b-uid');
    expect(duelPairKey('a-uid', 'b-uid')).toBe('a-uid__b-uid');
    expect(duelDocumentId('a-uid__b-uid', 3)).toBe('a-uid__b-uid_3');
  });

  test('lazy expiry and UTC day key', () => {
    expect(isDuelExpired(1_000, 999)).toBe(false);
    expect(isDuelExpired(1_000, 1_000)).toBe(true);
    expect(isDuelExpired(undefined, 1_000)).toBe(false);
    expect(duelDayKey(Date.parse('2026-10-22T23:59:59Z'))).toBe('2026-10-22');
  });
});
