import {
  __resetLocallyHiddenMistakesForTests,
  markMistakeHiddenLocally,
  unmarkMistakeHiddenLocally,
  withoutLocallyHiddenMistakes,
} from '../app/mistake_local_hidden';

// зачем (аудит Optimistic UI п.2): скрытая ошибка не возвращается в список, пока запись журнала не дошла.
describe('mistake local hidden registry', () => {
  beforeEach(() => __resetLocallyHiddenMistakesForTests());
  const rows = [{ mistakeId: 'a' }, { mistakeId: 'b' }, { mistakeId: 'c' }];

  it('returns the same array when nothing is hidden', () => {
    expect(withoutLocallyHiddenMistakes(rows)).toBe(rows);
  });

  it('excludes a locally hidden mistake immediately', () => {
    markMistakeHiddenLocally('b');
    expect(withoutLocallyHiddenMistakes(rows).map((row) => row.mistakeId)).toEqual(['a', 'c']);
  });

  it('brings it back when the write failed (unmark)', () => {
    markMistakeHiddenLocally('b');
    unmarkMistakeHiddenLocally('b');
    expect(withoutLocallyHiddenMistakes(rows)).toBe(rows);
  });
});
