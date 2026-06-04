import { buildTrainerFillGapOptions } from '../app/trainer_fill_gap_options';
import fs from 'fs';
import path from 'path';

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

  it('does not offer visible words from a short phrase like He is in the blank', () => {
    const options = buildTrainerFillGapOptions({
      correctWord: 'kitchen',
      phrase: 'He is in the kitchen',
      category: 'noun',
      shuffle: false,
    });

    expect(options).toHaveLength(4);
    expect(options).toContain('kitchen');
    expect(options.map((option) => option.toLowerCase())).not.toEqual(expect.arrayContaining(['he', 'is', 'in', 'the']));
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

  it('prefers phrase-authored distractors over generic same-category fillers', () => {
    const options = buildTrainerFillGapOptions({
      correctWord: 'You',
      phrase: 'You sat here yesterday',
      category: 'pronoun',
      sourceDistractors: ['They', 'I', 'He', 'your', 'we'],
      shuffle: false,
    });

    expect(options).toEqual(['You', 'They', 'I', 'He']);
  });

  it('routes the phrases trainer fill-gap UI through the shared option builder', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'trainer_phrases_session.tsx'), 'utf8');

    expect(source).toContain('buildTrainerFillGapOptions');
    expect(source).not.toContain('function buildFillGapOptions');
  });
});
