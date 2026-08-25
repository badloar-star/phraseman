import { cacheDocId, isSummaryKind } from './feedback_summary';

describe('isSummaryKind', () => {
  it('accepts every feedback section plus the legacy MAX-call section', () => {
    expect(isSummaryKind('lesson')).toBe(true);
    expect(isSummaryKind('vocab')).toBe(true);
    expect(isSummaryKind('dialogue')).toBe(true);
    expect(isSummaryKind('arena_blitz')).toBe(true);
    expect(isSummaryKind('arena_rating')).toBe(true);
    expect(isSummaryKind('max_call')).toBe(true);
  });

  it('rejects unknown or malformed input', () => {
    expect(isSummaryKind('arena')).toBe(false);
    expect(isSummaryKind('')).toBe(false);
    expect(isSummaryKind(null)).toBe(false);
    expect(isSummaryKind(undefined)).toBe(false);
    expect(isSummaryKind(42)).toBe(false);
  });
});

describe('cacheDocId', () => {
  it('is deterministic for the same kind+period — repeat clicks hit the same cache doc', () => {
    const a = cacheDocId('lesson', 7);
    const b = cacheDocId('lesson', 7);
    expect(a).toBe(b);
  });

  it('differs across periods for the same section', () => {
    const week = cacheDocId('lesson', 7);
    const month = cacheDocId('lesson', 30);
    expect(week).not.toBe(month);
  });

  it('differs across sections for the same period', () => {
    const lesson = cacheDocId('lesson', 7);
    const vocab = cacheDocId('vocab', 7);
    expect(lesson).not.toBe(vocab);
  });
});
