import {
  BONUS_PERCENT_BY_LEVEL,
  LEVEL_THRESHOLDS,
  MAX_WINDOW_DAYS,
  STAR_REWARD_BY_LEVEL,
  bonusPercentForLevel,
  daysTogether,
  decodeActiveDays,
  encodeActiveDays,
  hasCommonDay,
  levelForDays,
  markActiveDay,
  mergeActiveDays,
  nextThreshold,
  starRewardForLevel,
  starRewardForLevelRange,
  friendGiftCostForLevel,
  type ActiveDays,
} from '../app/friends_together/together_days';

describe('together_days codec', () => {
  it('round-trips a set of dates through encode/decode', () => {
    const dates = ['2026-08-17', '2026-08-16', '2026-08-14'];
    const encoded = encodeActiveDays(dates);
    expect(encoded.anchor).toBe('2026-08-17');
    const decoded = decodeActiveDays(encoded);
    expect([...decoded].sort()).toEqual([...dates].sort());
  });

  it('decodes empty/invalid state to an empty set', () => {
    expect(decodeActiveDays(null).size).toBe(0);
    expect(decodeActiveDays(undefined).size).toBe(0);
    expect(decodeActiveDays({ anchor: '', bits: '' }).size).toBe(0);
    expect(decodeActiveDays({ anchor: 'not-a-date', bits: '111' }).size).toBe(0);
  });

  it('caps encoding at MAX_WINDOW_DAYS bits', () => {
    const anchor = '2026-08-17';
    // Ask to encode a date far outside the window — must be silently dropped.
    const farDate = '2020-01-01';
    const encoded = encodeActiveDays([anchor, farDate], anchor);
    expect(encoded.bits.length).toBeLessThanOrEqual(MAX_WINDOW_DAYS);
    expect(decodeActiveDays(encoded).has(farDate)).toBe(false);
  });
});

describe('Together milestone and gift perks', () => {
  it('keeps every unclaimed milestone reward when several levels are crossed', () => {
    expect(starRewardForLevelRange(1, 5)).toBe(85);
    expect(starRewardForLevelRange(3, 5)).toBe(70);
    expect(starRewardForLevelRange(5, 5)).toBe(0);
  });

  it('applies the 25% friend-gift discount from level 3', () => {
    expect(friendGiftCostForLevel(8, 2)).toBe(8);
    expect(friendGiftCostForLevel(8, 3)).toBe(6);
    expect(friendGiftCostForLevel(30, 5)).toBe(22);
  });
});

describe('markActiveDay', () => {
  it('creates a fresh state from null when marking the first day', () => {
    const next = markActiveDay(null, '2026-08-17');
    expect(next.anchor).toBe('2026-08-17');
    expect(decodeActiveDays(next).has('2026-08-17')).toBe(true);
  });

  it('is idempotent when marking the same (already anchor) day twice', () => {
    const first = markActiveDay(null, '2026-08-17');
    const second = markActiveDay(first, '2026-08-17');
    expect(second).toEqual(first);
  });

  it('shifts the anchor forward when marking a newer day, keeping old days', () => {
    const day1 = markActiveDay(null, '2026-08-15');
    const day2 = markActiveDay(day1, '2026-08-16');
    const day3 = markActiveDay(day2, '2026-08-17');
    expect(day3.anchor).toBe('2026-08-17');
    const decoded = decodeActiveDays(day3);
    expect(decoded.has('2026-08-15')).toBe(true);
    expect(decoded.has('2026-08-16')).toBe(true);
    expect(decoded.has('2026-08-17')).toBe(true);
  });

  it('marks a gap correctly — skipped days stay unmarked', () => {
    const day1 = markActiveDay(null, '2026-08-10');
    const day2 = markActiveDay(day1, '2026-08-17'); // 7-day gap
    const decoded = decodeActiveDays(day2);
    expect(decoded.has('2026-08-10')).toBe(true);
    expect(decoded.has('2026-08-17')).toBe(true);
    expect(decoded.has('2026-08-13')).toBe(false);
    expect(decoded.size).toBe(2);
  });

  it('marks a day older than anchor but within window (backfill)', () => {
    const anchorState = markActiveDay(null, '2026-08-17');
    const backfilled = markActiveDay(anchorState, '2026-08-15');
    expect(backfilled.anchor).toBe('2026-08-17'); // anchor unchanged
    const decoded = decodeActiveDays(backfilled);
    expect(decoded.has('2026-08-15')).toBe(true);
    expect(decoded.has('2026-08-17')).toBe(true);
  });

  it('ignores days outside the MAX_WINDOW_DAYS cap without throwing', () => {
    const anchorState: ActiveDays = { anchor: '2026-08-17', bits: '1' };
    const tooOld = '2020-01-01'; // way beyond 120 days
    const next = markActiveDay(anchorState, tooOld);
    expect(decodeActiveDays(next).has(tooOld)).toBe(false);
  });

  it('ignores invalid dayKey input, returning a safe fallback', () => {
    const state = markActiveDay(null, 'garbage');
    expect(state).toEqual({ anchor: '', bits: '' });
    const existing = markActiveDay({ anchor: '2026-08-17', bits: '1' }, 'garbage');
    expect(existing).toEqual({ anchor: '2026-08-17', bits: '1' });
  });
});

describe('mergeActiveDays (OR by date)', () => {
  it('unions dates from two states with different anchors', () => {
    const a = markActiveDay(null, '2026-08-15');
    const b = markActiveDay(null, '2026-08-17');
    const merged = mergeActiveDays(a, b);
    const decoded = decodeActiveDays(merged);
    expect(decoded.has('2026-08-15')).toBe(true);
    expect(decoded.has('2026-08-17')).toBe(true);
    expect(merged.anchor).toBe('2026-08-17'); // newer anchor wins
  });

  it('treats null/undefined as empty and returns the other side unchanged (functionally)', () => {
    const a = markActiveDay(null, '2026-08-17');
    const merged = mergeActiveDays(a, null);
    expect(decodeActiveDays(merged)).toEqual(decodeActiveDays(a));
  });

  it('merging two empties yields empty', () => {
    const merged = mergeActiveDays(null, undefined);
    expect(merged).toEqual({ anchor: '', bits: '' });
  });
});

describe('hasCommonDay', () => {
  it('true only when both sides have the exact date marked', () => {
    const a = markActiveDay(null, '2026-08-17');
    const b = markActiveDay(null, '2026-08-17');
    expect(hasCommonDay(a, b, '2026-08-17')).toBe(true);
    expect(hasCommonDay(a, b, '2026-08-16')).toBe(false);
  });

  it('false when one side is missing the day', () => {
    const a = markActiveDay(null, '2026-08-17');
    const b = markActiveDay(null, '2026-08-16');
    expect(hasCommonDay(a, b, '2026-08-17')).toBe(false);
  });

  it('false for invalid dayKey', () => {
    const a = markActiveDay(null, '2026-08-17');
    expect(hasCommonDay(a, a, 'nope')).toBe(false);
  });
});

describe('daysTogether', () => {
  it('counts the intersection size across different anchors', () => {
    // a active on 15,16,17; b active on 16,17,18
    let a = markActiveDay(null, '2026-08-15');
    a = markActiveDay(a, '2026-08-16');
    a = markActiveDay(a, '2026-08-17');
    let b = markActiveDay(null, '2026-08-16');
    b = markActiveDay(b, '2026-08-17');
    b = markActiveDay(b, '2026-08-18');
    expect(daysTogether(a, b)).toBe(2); // 16, 17
  });

  it('adds bonusDays (referral bonus) on top of the intersection', () => {
    const a = markActiveDay(null, '2026-08-17');
    const b = markActiveDay(null, '2026-08-17');
    expect(daysTogether(a, b, 3)).toBe(4); // 1 common day + 3 bonus
  });

  it('clamps negative/non-finite bonusDays to 0', () => {
    const a = markActiveDay(null, '2026-08-17');
    const b = markActiveDay(null, '2026-08-17');
    expect(daysTogether(a, b, -5)).toBe(1);
    expect(daysTogether(a, b, NaN)).toBe(1);
  });

  it('is 0 for two friends with no common day', () => {
    const a = markActiveDay(null, '2026-08-15');
    const b = markActiveDay(null, '2026-08-16');
    expect(daysTogether(a, b)).toBe(0);
  });
});

describe('levelForDays / nextThreshold', () => {
  it('matches the documented thresholds [0,3,10,30,100]', () => {
    expect(LEVEL_THRESHOLDS).toEqual([0, 3, 10, 30, 100]);
    expect(levelForDays(0)).toBe(1);
    expect(levelForDays(2)).toBe(1);
    expect(levelForDays(3)).toBe(2);
    expect(levelForDays(9)).toBe(2);
    expect(levelForDays(10)).toBe(3);
    expect(levelForDays(29)).toBe(3);
    expect(levelForDays(30)).toBe(4);
    expect(levelForDays(99)).toBe(4);
    expect(levelForDays(100)).toBe(5);
    expect(levelForDays(1000)).toBe(5);
  });

  it('nextThreshold returns the boundary for the next level, null at max', () => {
    expect(nextThreshold(1)).toBe(3);
    expect(nextThreshold(2)).toBe(10);
    expect(nextThreshold(3)).toBe(30);
    expect(nextThreshold(4)).toBe(100);
    expect(nextThreshold(5)).toBeNull();
  });
});

describe('bonusPercentForLevel / starRewardForLevel', () => {
  it('matches the documented tables', () => {
    expect(BONUS_PERCENT_BY_LEVEL).toEqual([0, 0, 5, 5, 10, 15]);
    expect(STAR_REWARD_BY_LEVEL).toEqual([0, 0, 5, 10, 20, 50]);
    expect(bonusPercentForLevel(1)).toBe(0);
    expect(bonusPercentForLevel(2)).toBe(5);
    expect(bonusPercentForLevel(3)).toBe(5);
    expect(bonusPercentForLevel(4)).toBe(10);
    expect(bonusPercentForLevel(5)).toBe(15);
    expect(starRewardForLevel(2)).toBe(5);
    expect(starRewardForLevel(3)).toBe(10);
    expect(starRewardForLevel(4)).toBe(20);
    expect(starRewardForLevel(5)).toBe(50);
  });
});
