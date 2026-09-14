import {
  aggregateAdminFeedback,
  collectFilteredFeedbackPage,
  parseAdminFeedbackFilters,
  parseAdminFeedbackPeriod,
} from './feedback_admin_logic';
import fs from 'node:fs';
import path from 'node:path';

describe('parseAdminFeedbackFilters', () => {
  it('accepts supported comment and rating filters', () => {
    expect(parseAdminFeedbackFilters({ commentMode: 'with', rating: 5 }))
      .toEqual({ commentMode: 'with', rating: 5 });
    expect(parseAdminFeedbackFilters({ commentMode: 'all' }))
      .toEqual({ commentMode: 'all', rating: null });
  });

  it.each([
    { commentMode: 'sometimes' },
    { rating: 7 },
    { rating: '5' },
  ])('rejects malformed filters: %p', (input) => {
    expect(() => parseAdminFeedbackFilters(input)).toThrow('feedback_filter_invalid');
  });
});

describe('parseAdminFeedbackPeriod', () => {
  it.each([0, 7, 30, 90])('accepts supported period %s', (periodDays) => {
    expect(parseAdminFeedbackPeriod(periodDays)).toBe(periodDays);
  });

  it.each([undefined, 1, 3650, '7'])('rejects unsupported period %p', (periodDays) => {
    expect(() => parseAdminFeedbackPeriod(periodDays)).toThrow('feedback_period_invalid');
  });
});

describe('collectFilteredFeedbackPage', () => {
  it('scans past nonmatching rows and uses the last returned row as cursor', async () => {
    const source = [
      { id: 'a', rating: 5, message: '' },
      { id: 'b', rating: 4, message: 'useful' },
      { id: 'c', rating: 3, message: '' },
      { id: 'd', rating: 2, message: 'clear' },
      { id: 'e', rating: 1, message: 'extra' },
    ];
    const loadBatch = jest.fn(async (cursor: string | null) => {
      const start = cursor ? source.findIndex((row) => row.id === cursor) + 1 : 0;
      const rows = source.slice(start, start + 2);
      return { rows, exhausted: start + rows.length >= source.length };
    });

    const page = await collectFilteredFeedbackPage(loadBatch, { commentMode: 'with', rating: null }, 2, null);
    expect(page.items.map((row) => row.id)).toEqual(['b', 'd']);
    expect(page.nextCursor).toBe('d');
  });

  it('continues after the prior returned cursor without duplicates', async () => {
    const source = [
      { id: 'a', rating: 5, message: 'one' },
      { id: 'b', rating: 4, message: '' },
      { id: 'c', rating: 3, message: 'two' },
      { id: 'd', rating: 2, message: 'three' },
    ];
    const loadBatch = async (cursor: string | null) => {
      const start = cursor ? source.findIndex((row) => row.id === cursor) + 1 : 0;
      const rows = source.slice(start, start + 2);
      return { rows, exhausted: start + rows.length >= source.length };
    };
    const filters = { commentMode: 'with' as const, rating: null };
    const first = await collectFilteredFeedbackPage(loadBatch, filters, 2, null);
    const second = await collectFilteredFeedbackPage(loadBatch, filters, 2, first.nextCursor);
    expect(first.items.map((row) => row.id)).toEqual(['a', 'c']);
    expect(second.items.map((row) => row.id)).toEqual(['d']);
  });
});

describe('aggregateAdminFeedback', () => {
  it('returns exact distribution without returning source text', () => {
    const result = aggregateAdminFeedback([
      { rating: 5, message: 'private one' },
      { rating: 5, message: '' },
      { rating: 3, message: 'private two' },
      { rating: 0, message: 'text only' },
    ], 'all');
    expect(result).toEqual({
      total: 4,
      ratedTotal: 3,
      withComments: 3,
      unrated: 1,
      average: 4.33,
      distribution: { 1: 0, 2: 0, 3: 1, 4: 0, 5: 2 },
    });
    expect(JSON.stringify(result)).not.toMatch(/private/);
  });

  it('applies comment modes before calculating totals', () => {
    const rows = [
      { rating: 5, message: 'comment' },
      { rating: 1, message: '' },
    ];
    expect(aggregateAdminFeedback(rows, 'with').total).toBe(1);
    expect(aggregateAdminFeedback(rows, 'without').total).toBe(1);
    expect(aggregateAdminFeedback(rows, 'without').withComments).toBe(0);
  });
});

describe('admin feedback list callable wiring', () => {
  it.each(['feedback_entries.ts', 'max_voice_feedback.ts'])(
    '%s applies validated filters before returning a page',
    (filename) => {
      const source = fs.readFileSync(path.join(__dirname, filename), 'utf8');
      expect(source).toContain('parseAdminFeedbackFilters');
      expect(source).toContain('parseAdminFeedbackPeriod');
      expect(source).toContain('collectFilteredFeedbackPage');
      expect(source).toContain("new HttpsError('invalid-argument', 'feedback_filter_invalid')");
      expect(source).toContain("new HttpsError('invalid-argument', 'feedback_period_invalid')");
      expect(source).toContain("where('createdAtMs', '>=', sinceMs)");
      expect(source).toContain('nextCursor: page.nextCursor');
    },
  );
});
