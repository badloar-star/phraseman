import {
  countCompletedTheoryDrills,
  parseTheorySeenProgress,
  serializeTheorySeenProgress,
  theoryOverallProgressPct,
  theorySeenProgressPct,
} from '../app/theory_progress';

describe('theory progress helpers', () => {
  it('parses stored section progress and filters invalid section ids', () => {
    const raw = JSON.stringify({
      seen: ['01', '02', '02', '', 3, '99'],
      total: 7,
    });

    expect(parseTheorySeenProgress(raw, ['01', '02', '03'])).toEqual({
      seen: ['01', '02'],
      open: [],
      total: 3,
      drills: {},
      drillTotal: 0,
    });
  });

  it('keeps legacy array progress readable', () => {
    expect(parseTheorySeenProgress(JSON.stringify(['01', '03']), ['01', '02', '03'])).toEqual({
      seen: ['01', '03'],
      open: [],
      total: 3,
      drills: {},
      drillTotal: 0,
    });
  });

  it('serializes unique seen and open sections with a bounded total', () => {
    const parsed = JSON.parse(serializeTheorySeenProgress(['02', '02', '01'], 7, ['03', '03', '01'], {
      '02-1': { type: 'choice', status: 'solved', picked: 'is' },
      '03-2': { type: 'word_bank', status: 'idle', slots: [{ word: 'I', bankId: 'I-0' }, null] },
    }, 4));

    expect(parsed.seen).toEqual(['02', '01']);
    expect(parsed.open).toEqual(['03', '01']);
    expect(parsed.total).toBe(7);
    expect(parsed.drills['02-1']).toEqual({ type: 'choice', status: 'solved', picked: 'is' });
    expect(parsed.drills['03-2'].slots).toEqual([{ word: 'I', bankId: 'I-0' }, null]);
    expect(parsed.drillTotal).toBe(4);
    expect(typeof parsed.updatedAt).toBe('number');
  });

  it('parses saved open sections and filters invalid ids', () => {
    const raw = JSON.stringify({
      seen: ['01', '02'],
      open: ['02', '03', '99'],
      total: 3,
    });

    expect(parseTheorySeenProgress(raw, ['01', '02', '03'])).toEqual({
      seen: ['01', '02'],
      open: ['02', '03'],
      total: 3,
      drills: {},
      drillTotal: 0,
    });
  });

  it('parses drill progress and filters invalid drill ids', () => {
    const raw = JSON.stringify({
      seen: ['01'],
      total: 3,
      drills: {
        '01-2': { type: 'choice', status: 'solved', picked: 'is', showWhy: true },
        '02-1': { type: 'binary', status: 'answered', answered: 'A' },
        '99-1': { type: 'choice', status: 'solved', picked: 'ghost' },
      },
      drillTotal: 5,
    });

    expect(parseTheorySeenProgress(raw, ['01', '02', '03'], ['01-2', '02-1'])).toEqual({
      seen: ['01'],
      open: [],
      total: 3,
      drills: {
        '01-2': { type: 'choice', status: 'solved', picked: 'is', showWhy: true },
        '02-1': { type: 'binary', status: 'answered', answered: 'A' },
      },
      drillTotal: 2,
    });
  });

  it('calculates a clamped integer percent', () => {
    expect(theorySeenProgressPct(2, 7)).toBe(29);
    expect(theorySeenProgressPct(9, 7)).toBe(100);
    expect(theorySeenProgressPct(1, 0)).toBe(0);
    expect(theorySeenProgressPct(Number.NaN, Number.NaN)).toBe(0);
  });

  it('counts completed drills and calculates overall theory progress', () => {
    const drills = {
      '01-1': { type: 'choice', status: 'solved' as const },
      '02-1': { type: 'binary', status: 'answered' as const },
      '03-1': { type: 'word_bank', status: 'wrong' as const },
    };

    expect(countCompletedTheoryDrills(drills, ['01-1', '02-1', '03-1'])).toBe(2);
    expect(theoryOverallProgressPct(2, 4, 2, 4)).toBe(50);
    expect(theoryOverallProgressPct(10, 4, 10, 4)).toBe(100);
    expect(theoryOverallProgressPct(1, 0, 1, 0)).toBe(0);
  });
});
