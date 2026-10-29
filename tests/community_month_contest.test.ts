import { contestMonth, contestPrize, rankContestEntries, type ContestEntry } from '../shared/community_month_contest';

const entry = (id: string, hearts: number, publishedAtMs = Date.UTC(2026, 9, 2)): ContestEntry => ({
  id, authorId: `author_${id}`, title: id, hearts, publishedAtMs, status: 'published',
});

describe('community month contest', () => {
  it('uses a half-open calendar month in UTC including year rollover', () => {
    expect(contestMonth(Date.UTC(2026, 11, 31))).toEqual({ id: '2026-12', startMs: Date.UTC(2026, 11, 1), endMs: Date.UTC(2027, 0, 1) });
  });
  it('allows older non-winning packs and ranks only the supplied monthly hearts', () => {
    const month = contestMonth(Date.UTC(2026, 9, 26));
    const rows = [entry('b', 10), entry('a', 10), entry('old', 500, month.startMs - 1), entry('next', 100, month.endMs), { ...entry('hidden', 200), status: 'admin_removed' }, entry('c', 2)];
    expect(rankContestEntries(rows, month).map(x => x.id)).toEqual(['old', 'a', 'b', 'c']);
    expect(rows[0].id).toBe('b');
  });
  it('does not award empty, self-only or malformed results', () => {
    const month = contestMonth(Date.UTC(2026, 9, 26));
    expect(rankContestEntries([entry('zero', 0), entry('nan', NaN), entry('negative', -1), { ...entry('missing', 10), authorId: '' }], month)).toEqual([]);
  });
  it('excludes every previous prize winner, even with more monthly hearts', () => {
    const month = contestMonth(Date.UTC(2026, 9, 26));
    expect(rankContestEntries([{ ...entry('winner', 100), hasWonPrize: true }, entry('eligible', 2)], month).map(row => row.id)).toEqual(['eligible']);
  });
  it('awards the owner-approved currency and amounts', () => {
    expect(contestPrize(1)).toEqual({ kind: 'plus', months: 3 });
    // перепин 29.10 (владелец ~07:55, коммит f1395a92a): места 1/2/3 = Plus на 3/2/1 месяца автоматически, монет за места больше нет
    expect(contestPrize(2)).toEqual({ kind: 'plus', months: 2 });
    expect(contestPrize(3)).toEqual({ kind: 'plus', months: 1 });
    expect(contestPrize(4)).toBeNull();
  });
});
