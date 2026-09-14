import {
  applySuperSundayRuneMultiplier,
  isSuperSundayUtc,
  superSundayEndsAtUtcMs,
} from '../modules/economy/super_sunday_runes';

describe('Super Sunday rune policy', () => {
  it.each([
    ['2026-09-06T00:00:00.000Z', true],
    ['2026-09-06T23:59:59.999Z', true],
    ['2026-09-05T23:59:59.999Z', false],
    ['2026-09-07T00:00:00.000Z', false],
  ])('classifies %s inside the Sunday UTC window: %s', (iso, expected) => {
    expect(isSuperSundayUtc(Date.parse(iso))).toBe(expected);
  });

  it('doubles earned runes only inside the Sunday UTC window', () => {
    expect(applySuperSundayRuneMultiplier(17, Date.parse('2026-09-06T12:00:00.000Z'))).toBe(34);
    expect(applySuperSundayRuneMultiplier(17, Date.parse('2026-09-07T00:00:00.000Z'))).toBe(17);
  });

  it('rejects invalid amounts and overflow', () => {
    const sunday = Date.parse('2026-09-06T12:00:00.000Z');

    expect(() => applySuperSundayRuneMultiplier(-1, sunday)).toThrow('invalid rune amount');
    expect(() => applySuperSundayRuneMultiplier(1.5, sunday)).toThrow('invalid rune amount');
    expect(() => applySuperSundayRuneMultiplier(Number.MAX_SAFE_INTEGER, sunday)).toThrow('rune amount overflow');
  });

  it('returns the following Monday midnight UTC as the event end', () => {
    expect(new Date(superSundayEndsAtUtcMs(Date.parse('2026-09-06T12:00:00.000Z'))).toISOString())
      .toBe('2026-09-07T00:00:00.000Z');
  });
});

describe('video optimistic pending batch follows the server claim-time model', () => {
  const basePendingRunes = 17;

  it('revalues the whole pending batch at the Saturday-to-Sunday boundary', () => {
    expect(applySuperSundayRuneMultiplier(
      basePendingRunes,
      Date.parse('2026-09-05T23:59:59.999Z'),
    )).toBe(17);
    expect(applySuperSundayRuneMultiplier(
      basePendingRunes,
      Date.parse('2026-09-06T00:00:00.000Z'),
    )).toBe(34);
  });

  it('revalues the whole pending batch at the Sunday-to-Monday boundary', () => {
    expect(applySuperSundayRuneMultiplier(
      basePendingRunes,
      Date.parse('2026-09-06T23:59:59.999Z'),
    )).toBe(34);
    expect(applySuperSundayRuneMultiplier(
      basePendingRunes,
      Date.parse('2026-09-07T00:00:00.000Z'),
    )).toBe(17);
  });
});
