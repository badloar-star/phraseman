/**
 * duel_core — «Дуэль на 5 фраз» (идея 3, макет friends-full.html; правила — docs/work/tasks/friends-duel-2026-10-22.md).
 * Сторож: побеждает точность, при равенстве — время, иначе ничья; ход — ровно 5 ответов и время в пределах; три вызова в день
 * и одна открытая дуэль на друга; срок 24 ч; 5 разных фраз из пройденного, мало материала — дуэли нет.
 */
import {
  DUEL_DAILY_LIMIT,
  DUEL_PHRASES,
  canChallenge,
  duelCorrect,
  duelExpiresAt,
  duelOutcome,
  duelTimeLeftMs,
  isValidDuelMove,
  pickDuelPhrases,
} from '../app/friends_together/duel_core';

const move = (correct: number, elapsedMs: number) => ({
  results: Array.from({ length: DUEL_PHRASES }, (_, i) => i < correct),
  elapsedMs,
});

describe('итог дуэли', () => {
  it('решает точность', () => {
    expect(duelOutcome(move(4, 48_000), move(3, 30_000))).toBe('win');
    expect(duelOutcome(move(3, 30_000), move(4, 52_000))).toBe('loss');
  });

  it('при равной точности — меньшее время; равны и они — ничья', () => {
    expect(duelOutcome(move(4, 48_000), move(4, 65_000))).toBe('win');
    expect(duelOutcome(move(4, 65_000), move(4, 48_000))).toBe('loss');
    expect(duelOutcome(move(5, 40_000), move(5, 40_000))).toBe('draw');
  });

  it('верных — по отметкам', () => {
    expect(duelCorrect({ results: [true, false, true, true, false], elapsedMs: 1 })).toBe(3);
  });
});

describe('ход', () => {
  it('ровно 5 ответов-отметок и время целым числом в пределах 15 минут', () => {
    expect(isValidDuelMove(move(5, 60_000))).toBe(true);
    expect(isValidDuelMove({ results: [true, true, true, true], elapsedMs: 1 })).toBe(false);
    expect(isValidDuelMove({ results: [true, true, true, true, 1], elapsedMs: 1 })).toBe(false);
    expect(isValidDuelMove(move(3, -1))).toBe(false);
    expect(isValidDuelMove(move(3, 1.5))).toBe(false);
    expect(isValidDuelMove(move(3, 16 * 60_000))).toBe(false);
    expect(isValidDuelMove(null)).toBe(false);
  });
});

describe('вызов', () => {
  it('три вызова в день; пока с другом открыта дуэль — новый нельзя', () => {
    expect(DUEL_DAILY_LIMIT).toBe(3);
    expect(canChallenge({ sentToday: 2, openWithFriend: false })).toEqual({ ok: true });
    expect(canChallenge({ sentToday: 3, openWithFriend: false })).toEqual({ ok: false, reason: 'limit' });
    expect(canChallenge({ sentToday: 0, openWithFriend: true })).toEqual({ ok: false, reason: 'open_duel' });
  });

  it('срок ответа — сутки; остаток не уходит в минус', () => {
    expect(duelExpiresAt(1_000)).toBe(1_000 + 24 * 60 * 60 * 1000);
    expect(duelTimeLeftMs(10_000, 4_000)).toBe(6_000);
    expect(duelTimeLeftMs(10_000, 20_000)).toBe(0);
  });
});

describe('фразы дуэли', () => {
  const pool = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

  it('пять разных из пройденного; одно зерно — один набор', () => {
    const first = pickDuelPhrases(pool, 42);
    expect(first).toHaveLength(5);
    expect(new Set(first).size).toBe(5);
    expect(first.every((p) => pool.includes(p))).toBe(true);
    expect(pickDuelPhrases(pool, 42)).toEqual(first);
  });

  it('повторы в пуле не дают повторов в дуэли; мало материала — дуэли нет', () => {
    expect(new Set(pickDuelPhrases([...pool, 'a', 'b'], 7)).size).toBe(5);
    expect(pickDuelPhrases(['a', 'b', 'c', 'd'], 1)).toEqual([]);
  });

  it('входной пул не меняется', () => {
    const input = [...pool];
    pickDuelPhrases(input, 3);
    expect(input).toEqual(pool);
  });
});
