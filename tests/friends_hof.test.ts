// Unit tests for Friends Hall of Fame sort/rank helpers (TEST-04)
// Pure functions — no Firebase mocks needed.

import {
  sortAndRankHoF,
  isWeeklyAllZero,
  type HoFEntry,
} from '../app/friends_hof_helpers';

function makeEntry(uid: string, totalXp: number, weeklyXp: number, isMe = false): HoFEntry {
  return { uid, name: `Player ${uid}`, totalXp, weeklyXp, isMe };
}

// H01: alltime sort by totalXp descending, ranks 1,2,3
test('H01: sortAndRankHoF alltime sorts by totalXp descending with correct ranks', () => {
  const entries: HoFEntry[] = [
    makeEntry('b', 200, 10),
    makeEntry('a', 300, 5),
    makeEntry('c', 100, 20),
  ];
  const ranked = sortAndRankHoF(entries, 'alltime');
  expect(ranked[0].uid).toBe('a');
  expect(ranked[0].rank).toBe(1);
  expect(ranked[1].uid).toBe('b');
  expect(ranked[1].rank).toBe(2);
  expect(ranked[2].uid).toBe('c');
  expect(ranked[2].rank).toBe(3);
});

// H02: stable sort with equal totalXp — uid tiebreaker
test('H02: sortAndRankHoF alltime breaks ties by uid (lexicographic)', () => {
  const entries: HoFEntry[] = [
    makeEntry('zzz', 500, 0),
    makeEntry('aaa', 500, 0),
    makeEntry('mmm', 500, 0),
  ];
  const ranked = sortAndRankHoF(entries, 'alltime');
  expect(ranked[0].uid).toBe('aaa');
  expect(ranked[1].uid).toBe('mmm');
  expect(ranked[2].uid).toBe('zzz');
  expect(ranked.map(r => r.rank)).toEqual([1, 2, 3]);
});

// H03: weekly sort by weeklyXp descending
test('H03: sortAndRankHoF weekly sorts by weeklyXp descending', () => {
  const entries: HoFEntry[] = [
    makeEntry('x', 1000, 50),
    makeEntry('y', 200, 300),
    makeEntry('z', 500, 100),
  ];
  const ranked = sortAndRankHoF(entries, 'weekly');
  expect(ranked[0].uid).toBe('y');
  expect(ranked[0].weeklyXp).toBe(300);
  expect(ranked[1].uid).toBe('z');
  expect(ranked[2].uid).toBe('x');
});

// H04: isWeeklyAllZero returns true when all zero, false when any > 0
test('H04: isWeeklyAllZero returns true when all weeklyXp are 0', () => {
  const allZero: HoFEntry[] = [
    makeEntry('a', 100, 0),
    makeEntry('b', 200, 0),
  ];
  expect(isWeeklyAllZero(allZero)).toBe(true);
});

test('H04: isWeeklyAllZero returns false when any weeklyXp > 0', () => {
  const hasXp: HoFEntry[] = [
    makeEntry('a', 100, 0),
    makeEntry('b', 200, 50),
  ];
  expect(isWeeklyAllZero(hasXp)).toBe(false);
});

// H05: single entry has rank 1
test('H05: sortAndRankHoF with single entry returns rank 1', () => {
  const entries: HoFEntry[] = [makeEntry('solo', 999, 100, true)];
  const ranked = sortAndRankHoF(entries, 'alltime');
  expect(ranked).toHaveLength(1);
  expect(ranked[0].rank).toBe(1);
  expect(ranked[0].isMe).toBe(true);
});

// H06: all weeklyXp=0 in weekly mode — sorted array, no NaN ranks
test('H06: sortAndRankHoF weekly with all weeklyXp=0 produces valid sorted array with no NaN ranks', () => {
  const entries: HoFEntry[] = [
    makeEntry('alpha', 300, 0),
    makeEntry('beta', 100, 0),
    makeEntry('gamma', 200, 0),
  ];
  const ranked = sortAndRankHoF(entries, 'weekly');
  expect(ranked).toHaveLength(3);
  ranked.forEach(r => {
    expect(Number.isNaN(r.rank)).toBe(false);
    expect(r.rank).toBeGreaterThan(0);
  });
  // Tiebreaker by uid when all weekly are equal (lexicographic)
  expect(ranked.map(r => r.uid)).toEqual(['alpha', 'beta', 'gamma']);
});
