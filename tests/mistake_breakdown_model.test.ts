import {
  buildBreakdownSentence,
  coerceMistakeBreakdown,
  parseStoredMistakeBreakdown,
  serializeMistakeBreakdown,
  splitQuotedText,
  type MistakeBreakdown,
} from '../app/mistake_breakdown_model';

const base: MistakeBreakdown = {
  verdict: 'one',
  wrong: 'some',
  right: 'any',
  rule: 'Когда чего-то нет — "any"',
  why: 'Почти! "some" говорят, когда что-то есть.',
  youSaid: '',
  pair: ['I have some money', "I don't have any money"],
  also: [],
  simple: 'Нет денег — "any".',
};

describe('mistake breakdown: boundary validation', () => {
  it('accepts a well-formed breakdown and survives a cache round-trip', () => {
    expect(coerceMistakeBreakdown(base)).toEqual(base);
    expect(parseStoredMistakeBreakdown(serializeMistakeBreakdown(base))).toEqual(base);
  });

  it.each([
    ['null', null],
    ['a string', 'text'],
    ['an array', []],
    ['unknown verdict', { ...base, verdict: 'wrong' }],
    ['missing explanation', { ...base, why: '   ' }],
  ])('rejects %s', (_name, value) => {
    expect(coerceMistakeBreakdown(value)).toBeNull();
  });

  it('drops malformed optional parts instead of trusting them', () => {
    expect(coerceMistakeBreakdown({
      ...base,
      rule: 12,
      pair: ['only one'],
      also: [{ wrong: 'a', right: 3 }, { nope: true }, null],
    })).toMatchObject({ rule: '', pair: [], also: [{ wrong: 'a', right: '' }] });
  });

  it('treats a corrupt cache entry as "no fields" and says why', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(parseStoredMistakeBreakdown('{"verdict":')).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('breakdown:local_cache_corrupt'));
    expect(parseStoredMistakeBreakdown(null)).toBeNull();
    warn.mockRestore();
  });
});

describe('mistake breakdown: sentence with the slip highlighted', () => {
  it('puts the wrong word next to the right one inside the correct sentence', () => {
    expect(buildBreakdownSentence({
      userAnswer: "I don't have some money",
      targetAnswer: "I don't have any money.",
      breakdown: base,
    })).toEqual([
      { text: "I don't have ", tone: 'plain' },
      { text: 'some', tone: 'wrong' },
      { text: ' ', tone: 'plain' },
      { text: 'any', tone: 'right' },
      { text: ' money.', tone: 'plain' },
    ]);
  });

  it('matches whole words only, ignoring case and apostrophe shape', () => {
    const segments = buildBreakdownSentence({
      userAnswer: 'I has a reservation',
      targetAnswer: 'I have a reservation.',
      breakdown: { ...base, wrong: '', right: 'A' },
    });
    // «a» — отдельное слово, а не буква внутри «have».
    expect(segments).toEqual([
      { text: 'I have ', tone: 'plain' },
      { text: 'a', tone: 'right' },
      { text: ' reservation.', tone: 'plain' },
    ]);

    expect(buildBreakdownSentence({
      userAnswer: 'I do like it',
      targetAnswer: 'I don’t like it',
      breakdown: { ...base, wrong: 'do', right: "don't" },
    }).find((segment) => segment.tone === 'right')).toEqual({ text: 'don’t', tone: 'right' });
  });

  it('strikes an extra word in the learner sentence when nothing is missing', () => {
    expect(buildBreakdownSentence({
      userAnswer: 'I am agree with you',
      targetAnswer: 'I agree with you',
      breakdown: { ...base, wrong: 'am', right: '' },
    })).toEqual([
      { text: 'I ', tone: 'plain' },
      { text: 'am', tone: 'wrong' },
      { text: ' agree with you', tone: 'plain' },
    ]);
  });

  it.each([
    ['there is no mistake', { ...base, verdict: 'no_mistake' as const }],
    ['the server gave no pointers', { ...base, wrong: '', right: '' }],
    ['the pointed word is not in the sentence', { ...base, right: 'many' }],
  ])('returns nothing to highlight when %s', (_name, breakdown) => {
    expect(buildBreakdownSentence({
      userAnswer: "I don't have some money",
      targetAnswer: "I don't have any money.",
      breakdown,
    })).toEqual([]);
  });

  it('returns nothing without fields at all', () => {
    expect(buildBreakdownSentence({ userAnswer: 'a', targetAnswer: 'b', breakdown: null })).toEqual([]);
  });
});

describe('mistake breakdown: quoted target words', () => {
  it('splits text into plain and quoted parts for every quote style', () => {
    expect(splitQuotedText('Почти! "some" — когда есть, «any» — когда нет, “none” тут лишнее.')).toEqual([
      { text: 'Почти! ', quoted: false },
      { text: 'some', quoted: true },
      { text: ' — когда есть, ', quoted: false },
      { text: 'any', quoted: true },
      { text: ' — когда нет, ', quoted: false },
      { text: 'none', quoted: true },
      { text: ' тут лишнее.', quoted: false },
    ]);
  });

  it('keeps text without quotes whole and tolerates an unclosed quote', () => {
    expect(splitQuotedText('Всё верно')).toEqual([{ text: 'Всё верно', quoted: false }]);
    expect(splitQuotedText('Скажи "have')).toEqual([{ text: 'Скажи "have', quoted: false }]);
    expect(splitQuotedText('')).toEqual([]);
  });
});
