import { buildTrainerFillGapOptions } from '../app/trainer_fill_gap_options';

describe('buildTrainerFillGapOptions', () => {
  it('does not use other words from the current phrase as distractors', () => {
    const options = buildTrainerFillGapOptions({
      correctWord: 'help',
      phrase: 'Could you help me please',
      category: 'verb',
      shuffle: false,
    });

    expect(options).toHaveLength(4);
    expect(options).toContain('help');

    const phraseWords = new Set(['could', 'you', 'me', 'please']);
    const distractors = options.filter((option) => option.toLowerCase() !== 'help');

    expect(distractors).toHaveLength(3);
    expect(distractors.some((option) => phraseWords.has(option.toLowerCase()))).toBe(false);
  });

  it('keeps modal distractors grammatical without borrowing neighboring words', () => {
    const options = buildTrainerFillGapOptions({
      correctWord: 'Could',
      phrase: 'Could you help me please',
      category: 'modal',
      shuffle: false,
    });

    expect(options).toEqual(['Could', 'can', 'will', 'would']);
  });
});
