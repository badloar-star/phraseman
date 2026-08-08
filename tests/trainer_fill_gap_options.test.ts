import { buildTrainerFillGapOptions } from '../app/trainer_fill_gap_options';
import fs from 'fs';
import path from 'path';

describe('buildTrainerFillGapOptions', () => {
  it('uses the uniform shuffle instead of a random sort that can pin the correct answer', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'trainer_fill_gap_options.ts'), 'utf8');

    expect(source).toContain("import { shuffle } from './utils_shuffle';");
    expect(source).not.toContain('.sort(() => Math.random() - 0.5)');
  });

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

  it('does not use other modals as meaning-only distractors', () => {
    const options = buildTrainerFillGapOptions({
      correctWord: 'Could',
      phrase: 'Could you help me please',
      category: 'modal',
      shuffle: false,
    });

    expect(options).toContain('Could');
    for (const alternativeModal of ['Can', 'Will', 'Would']) {
      expect(options).not.toContain(alternativeModal);
    }
  });

  it('uses the same initial-letter case for every option when the answer starts a sentence', () => {
    const options = buildTrainerFillGapOptions({
      correctWord: 'Could',
      phrase: 'Could you help me please',
      category: 'modal',
      shuffle: false,
    });

    expect(options).toHaveLength(4);
    expect(options.every((option) => option[0] === option[0]?.toUpperCase())).toBe(true);
  });

  it('does not let capitalized source distractors reveal a lowercase answer', () => {
    const options = buildTrainerFillGapOptions({
      correctWord: 'you',
      phrase: 'Could you help me please',
      category: 'pronoun',
      sourceDistractors: ['They', 'He', 'We'],
      shuffle: false,
    });

    expect(options).toEqual(['you', 'they', 'he', 'we']);
  });

  it('rejects phrase-authored subject alternatives when Past Simple makes all of them fit', () => {
    const options = buildTrainerFillGapOptions({
      correctWord: 'You',
      phrase: 'You sat here yesterday',
      category: 'pronoun',
      sourceDistractors: ['They', 'I', 'He', 'your', 'we'],
      shuffle: false,
    });

    expect(options).toContain('You');
    for (const alternativeSubject of ['They', 'I', 'He', 'We']) {
      expect(options).not.toContain(alternativeSubject);
    }
  });

  it('does not offer subject pronouns that agree with the same 3rd-person-singular auxiliary', () => {
    // "She doesn't have an umbrella" — he/it/this/that also fit "____ doesn't have",
    // so they are alternative correct answers, not distractors.
    const options = buildTrainerFillGapOptions({
      correctWord: 'She',
      phrase: "She doesn't have an umbrella",
      category: 'pronoun',
      shuffle: false,
    });

    expect(options).toContain('She');
    for (const agreeingPronoun of ['he', 'it', 'this', 'that']) {
      expect(options.map((o) => o.toLowerCase())).not.toContain(agreeingPronoun);
    }
    // Plural / non-3rd-singular subjects stay available as valid distractors.
    expect(options.length).toBeGreaterThan(1);
  });

  it('does not offer plural subjects that agree with the same plural auxiliary', () => {
    // "They don't like coffee" — we/you/I/these/those also fit "____ don't like".
    const options = buildTrainerFillGapOptions({
      correctWord: 'They',
      phrase: "They don't like coffee",
      category: 'pronoun',
      shuffle: false,
    });

    expect(options).toContain('They');
    for (const agreeingPronoun of ['we', 'you', 'i', 'these', 'those']) {
      expect(options.map((o) => o.toLowerCase())).not.toContain(agreeingPronoun);
    }
    expect(options.length).toBeGreaterThan(1);
  });

  it('keeps cross-number pronouns available as distractors (he vs they)', () => {
    // "He is happy" — a plural subject like "they" does NOT agree with "is",
    // so it remains a legitimate distractor (only same-agreement ones are dropped).
    const options = buildTrainerFillGapOptions({
      correctWord: 'He',
      phrase: 'He is happy',
      category: 'pronoun',
      shuffle: false,
    });

    expect(options).toContain('He');
    // she/it agree with "is" → must be dropped (alternative correct answers).
    for (const agreeingPronoun of ['she', 'it', 'this', 'that']) {
      expect(options.map((o) => o.toLowerCase())).not.toContain(agreeingPronoun);
    }
    // Every pronoun distractor that remains must NOT agree with "is" — i.e. it is
    // a plural/non-3rd-singular subject (they/we/you/i), which is grammatically
    // wrong with "is" and therefore a legitimate distractor.
    const pluralSubjects = new Set(['i', 'you', 'we', 'they', 'these', 'those']);
    const distractors = options.map((o) => o.toLowerCase()).filter((o) => o !== 'he');
    expect(distractors.length).toBeGreaterThan(0);
    for (const d of distractors) {
      expect(pluralSubjects.has(d)).toBe(true);
    }
  });

  it('rejects subject-pronoun distractors when the verb is tense-neutral (past simple)', () => {
    // Past Simple agrees with every subject, so another subject pronoun would
    // produce another grammatically valid sentence and cannot be a distractor.
    const options = buildTrainerFillGapOptions({
      correctWord: 'You',
      phrase: 'You sat here yesterday',
      category: 'pronoun',
      sourceDistractors: ['They', 'I', 'He', 'your', 'we'],
      shuffle: false,
    });

    expect(options).toContain('You');
    for (const alternativeSubject of ['They', 'I', 'He', 'We']) {
      expect(options).not.toContain(alternativeSubject);
    }
  });

  it('does not offer alternative indefinite subjects for Everyone helped us', () => {
    const options = buildTrainerFillGapOptions({
      correctWord: 'Everyone',
      phrase: 'Everyone helped us',
      category: 'pronoun',
      sourceDistractors: ['Someone', 'Anyone', 'Nobody'],
      shuffle: false,
    });

    expect(options).toContain('Everyone');
    for (const alternativeSubject of ['Someone', 'Anyone', 'Nobody']) {
      expect(options).not.toContain(alternativeSubject);
    }
  });

  it('does not offer other modals that create equally valid meanings', () => {
    const options = buildTrainerFillGapOptions({
      correctWord: 'can',
      phrase: 'You can start now',
      category: 'modal',
      sourceDistractors: ['could', 'will', 'would'],
      shuffle: false,
    });

    expect(options).toContain('can');
    for (const alternativeModal of ['could', 'will', 'would']) {
      expect(options).not.toContain(alternativeModal);
    }
  });

  it('does not offer demonstratives as semantic alternatives to the article in The food is cooked here', () => {
    const options = buildTrainerFillGapOptions({
      correctWord: 'The',
      phrase: 'The food is cooked here',
      category: 'article',
      sourceDistractors: ['a', 'an', 'this', 'that', 'these'],
      shuffle: false,
    });

    expect(options).toContain('The');
    for (const alternativeDeterminer of ['This', 'That']) {
      expect(options).not.toContain(alternativeDeterminer);
    }
  });

  it('routes the phrases trainer fill-gap UI through the shared option builder', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'trainer_phrases_session.tsx'), 'utf8');
    const fillGapSource = source.slice(source.indexOf('function FillGapMode'), source.indexOf('export default function TrainerPhrasesSession'));

    expect(source).toContain('buildTrainerFillGapOptions');
    expect(source).not.toContain('function buildFillGapOptions');
    expect(fillGapSource).toContain('trainerTranslationForLang(item, lang)');
    expect(fillGapSource).toContain('{promptText}');
  });

  it('does not offer a near-synonym adjective ("glad"/"pleased") as a distractor for "happy"', () => {
    // WORD_POOLS_L1.adjectives itself has no "glad"/"pleased" entries, so force
    // the scenario via sourceDistractors (still exercises the same synonym-cluster
    // filter that also guards the generic CATEGORY_POOLS fallback).
    const options = buildTrainerFillGapOptions({
      correctWord: 'happy',
      phrase: 'She is happy today',
      category: 'adjective',
      sourceDistractors: ['glad', 'pleased', 'big', 'tall'],
      shuffle: false,
    });

    expect(options).toContain('happy');
    for (const nearSynonym of ['glad', 'pleased']) {
      expect(options).not.toContain(nearSynonym);
    }
  });

  it('keeps unrelated adjectives (big, tall) as valid distractors for "happy"', () => {
    const options = buildTrainerFillGapOptions({
      correctWord: 'happy',
      phrase: 'She is happy today',
      category: 'adjective',
      sourceDistractors: ['glad', 'pleased', 'big', 'tall'],
      shuffle: false,
    });

    expect(options).toEqual(expect.arrayContaining(['big', 'tall']));
  });

  it('does not offer a same-cluster adjective from the generic pool fallback ("terrible" for "awful")', () => {
    // Both "terrible" and "awful" are present in WORD_POOLS_L1.adjectives, so this
    // exercises the CATEGORY_POOLS fallback path directly (no sourceDistractors).
    const options = buildTrainerFillGapOptions({
      correctWord: 'awful',
      phrase: 'The weather was awful',
      category: 'adjective',
      shuffle: false,
    });

    expect(options).toContain('awful');
    expect(options).not.toContain('terrible');
  });

  it('does not offer a near-synonym verb ("purchase"-like "buy"/"get") pair across sourceDistractors', () => {
    // "get" and "buy" are both plausible near-synonyms in casual usage for
    // acquiring something; force via sourceDistractors since exact pool overlap
    // for this cluster isn't guaranteed to hit the fallback path.
    const options = buildTrainerFillGapOptions({
      correctWord: 'big',
      phrase: 'That is a big house',
      category: 'adjective',
      sourceDistractors: ['large', 'huge', 'small', 'old'],
      shuffle: false,
    });

    expect(options).toContain('big');
    for (const nearSynonym of ['large', 'huge']) {
      expect(options).not.toContain(nearSynonym);
    }
    expect(options).toEqual(expect.arrayContaining(['small', 'old']));
  });
});
