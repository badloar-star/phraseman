import {
  computeDayClosingRewardXp,
  nextDayClosingStreak,
  parseDayClosingStreak,
  prevDateKey,
} from '../app/compass/day_closing_reward_rules';

describe('day closing reward rules', () => {
  it('scales close XP by day richness: 10 base, +5 at 2 kinds, +5 at 3', () => {
    const h = (n: number) => ({ highlights: Array.from({ length: n }, (_, i) => ({ kind: 'xp' as const, value: String(i) })) });
    expect(computeDayClosingRewardXp(h(1))).toBe(10);
    expect(computeDayClosingRewardXp(h(2))).toBe(15);
    expect(computeDayClosingRewardXp(h(3))).toBe(20);
  });

  it('computes the previous UTC date key', () => {
    expect(prevDateKey('2026-07-02')).toBe('2026-07-01');
    expect(prevDateKey('2026-01-01')).toBe('2025-12-31');
    expect(prevDateKey('garbage')).toBe('');
  });

  it('grows the streak on consecutive days and is idempotent per day', () => {
    const empty = { count: 0, lastDateKey: null };
    const day1 = nextDayClosingStreak(empty, '2026-07-01');
    expect(day1).toEqual({ count: 1, lastDateKey: '2026-07-01' });

    // Повторное закрытие того же дня не растит серию.
    expect(nextDayClosingStreak(day1, '2026-07-01')).toBe(day1);

    const day2 = nextDayClosingStreak(day1, '2026-07-02');
    expect(day2).toEqual({ count: 2, lastDateKey: '2026-07-02' });

    // Пропуск ДВУХ и более вечеров → серия начинается заново с 1.
    const afterGap = nextDayClosingStreak(day2, '2026-07-05');
    expect(afterGap).toEqual({ count: 1, lastDateKey: '2026-07-05' });
  });

  it('forgives a single missed evening (streak survives one-day gap)', () => {
    // Щадящая серия: один пропущенный вечер не сжигает серию — иначе у любого,
    // кто не заходит каждый вечер, бейдж вечно показывал бы «1».
    const day2 = { count: 2, lastDateKey: '2026-07-02' };
    const afterOneMiss = nextDayClosingStreak(day2, '2026-07-04');
    expect(afterOneMiss).toEqual({ count: 3, lastDateKey: '2026-07-04' });

    // Два пропущенных вечера подряд — уже разрыв.
    const afterTwoMisses = nextDayClosingStreak(afterOneMiss, '2026-07-07');
    expect(afterTwoMisses).toEqual({ count: 1, lastDateKey: '2026-07-07' });
  });

  it('parses stored streaks defensively', () => {
    expect(parseDayClosingStreak(null)).toEqual({ count: 0, lastDateKey: null });
    expect(parseDayClosingStreak('not json')).toEqual({ count: 0, lastDateKey: null });
    expect(parseDayClosingStreak('{"count":"7","lastDateKey":"2026-07-01"}')).toEqual({ count: 7, lastDateKey: '2026-07-01' });
    expect(parseDayClosingStreak('{"count":-3}')).toEqual({ count: 0, lastDateKey: null });
  });
});
