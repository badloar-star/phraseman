import { choiceHashFor, normalizeChoiceOption } from './choice_explain_cache';

describe('choice_explain_cache — hashing', () => {
  it('is stable for the same inputs', () => {
    const a = choiceHashFor("I'm fine, thanks.", ['We are all okay.', 'He is not here.'], 'ru');
    const b = choiceHashFor("I'm fine, thanks.", ['We are all okay.', 'He is not here.'], 'ru');
    expect(a).toBe(b);
    expect(a).toHaveLength(40);
  });

  it('is independent of distractor ORDER', () => {
    const a = choiceHashFor('Hi', ['a', 'b', 'c'], 'ru');
    const b = choiceHashFor('Hi', ['c', 'a', 'b'], 'ru');
    expect(a).toBe(b);
  });

  it('differs for a different distractor SET', () => {
    const a = choiceHashFor('Hi', ['a', 'b'], 'ru');
    const b = choiceHashFor('Hi', ['a', 'c'], 'ru');
    expect(a).not.toBe(b);
  });

  it('differs by language', () => {
    const ru = choiceHashFor('Hi', ['a'], 'ru');
    const en = choiceHashFor('Hi', ['a'], 'en');
    expect(ru).not.toBe(en);
  });

  it('normalizes the correct phrase (case/punctuation/space)', () => {
    const a = choiceHashFor('  HELLO! ', ['a'], 'ru');
    const b = choiceHashFor('hello', ['a'], 'ru');
    expect(a).toBe(b);
  });

  it('normalizeChoiceOption lowercases and trims', () => {
    expect(normalizeChoiceOption('  Hello! ')).toBe('hello');
  });
});
