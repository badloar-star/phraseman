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

  it('does not fill missing verb fallback choices with forms of one unrelated verb', () => {
    const options = buildTrainerFillGapOptions({
      correctWord: 'help',
      phrase: 'Could you help me please',
      category: 'verb',
      shuffle: false,
    });

    expect(options).toHaveLength(4);
    expect(options).toContain('help');
    expect(options).not.toEqual(['help', 'work', 'works', 'worked']);
  });

  it('does not use alternative verbs that also fit the missing-word phrase', () => {
    const options = buildTrainerFillGapOptions({
      correctWord: 'help',
      phrase: 'Could you help me please',
      category: 'verb',
      shuffle: false,
    });

    expect(options).toContain('help');
    for (const plausibleAlternative of [
      'support',
      'explain',
      'show',
      'ask',
      'tell',
      'teach',
      'do',
    ]) {
      expect(options).not.toContain(plausibleAlternative);
    }
  });

  it('filters same-lemma source distractors in My Practice fill-gap options', () => {
    const options = buildTrainerFillGapOptions({
      correctWord: 'work',
      phrase: 'I work here',
      category: 'verb',
      sourceDistractors: ['works', 'worked', 'working', 'go', 'come'],
      shuffle: false,
    });

    expect(options).toContain('work');
    for (const sameLemmaOption of ['works', 'worked', 'working']) {
      expect(options).not.toContain(sameLemmaOption);
    }
    expect(options).toEqual(expect.arrayContaining(['go', 'come']));
  });

  it('removes source verb distractors that can also take the same object pronoun', () => {
    const options = buildTrainerFillGapOptions({
      correctWord: 'call',
      phrase: 'We will call you tomorrow',
      category: 'verb',
      sourceDistractors: ['contact', 'message', 'email', 'work', 'go'],
      shuffle: false,
    });

    expect(options).toContain('call');
    for (const plausibleAlternative of ['contact', 'message', 'email']) {
      expect(options).not.toContain(plausibleAlternative);
    }
    expect(options).toEqual(expect.arrayContaining(['work', 'go']));
  });

  it('removes source place nouns that also fit an in-the-place gap', () => {
    const options = buildTrainerFillGapOptions({
      correctWord: 'kitchen',
      phrase: 'He is in the kitchen',
      category: 'noun',
      sourceDistractors: ['room', 'office', 'school', 'teacher', 'ticket'],
      shuffle: false,
    });

    expect(options).toContain('kitchen');
    for (const plausiblePlace of ['room', 'office', 'school']) {
      expect(options).not.toContain(plausiblePlace);
    }
    expect(options).toEqual(expect.arrayContaining(['teacher', 'ticket']));
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
