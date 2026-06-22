import { quizHashFor, normalizeQuizOption } from './quiz_explain_cache';

describe('quiz_explain_cache — hashing', () => {
  it('is stable for the same inputs', () => {
    const a = quizHashFor('Knife', ['Knife', 'Cup', 'Bowl', 'Chair'], 'ru');
    const b = quizHashFor('Knife', ['Knife', 'Cup', 'Bowl', 'Chair'], 'ru');
    expect(a).toBe(b);
    expect(a).toHaveLength(40);
  });

  it('is independent of option ORDER (thematic choices shuffle at runtime)', () => {
    const a = quizHashFor('Knife', ['Knife', 'Cup', 'Bowl', 'Chair'], 'ru');
    const b = quizHashFor('Knife', ['Chair', 'Knife', 'Bowl', 'Cup'], 'ru');
    expect(a).toBe(b);
  });

  it('differs for a different option SET', () => {
    const a = quizHashFor('Knife', ['Knife', 'Cup', 'Bowl'], 'ru');
    const b = quizHashFor('Knife', ['Knife', 'Cup', 'Plate'], 'ru');
    expect(a).not.toBe(b);
  });

  it('differs by language', () => {
    const ru = quizHashFor('Knife', ['Knife', 'Cup'], 'ru');
    const en = quizHashFor('Knife', ['Knife', 'Cup'], 'en');
    expect(ru).not.toBe(en);
  });

  it('normalizes the correct phrase (case/punctuation/space)', () => {
    const a = quizHashFor('  KNIFE! ', ['Knife', 'Cup'], 'ru');
    const b = quizHashFor('knife', ['Knife', 'Cup'], 'ru');
    expect(a).toBe(b);
  });

  it('de-dupes the option set so a repeated option does not fork the cache', () => {
    const a = quizHashFor('Knife', ['Knife', 'Cup', 'Bowl'], 'ru');
    const b = quizHashFor('Knife', ['Knife', 'Cup', 'Bowl', 'Cup'], 'ru');
    expect(a).toBe(b);
  });

  it('normalizeQuizOption lowercases and trims', () => {
    expect(normalizeQuizOption('  Knife! ')).toBe('knife');
  });
});
