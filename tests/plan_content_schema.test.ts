import {
  validatePlanContentWordAlignment,
  validatePlanContentDay,
  planContentDayIsReady,
  type PlanContentDay,
  type PlanContentPhrase,
  type PlanVocabularyWord,
} from '../app/plan_content_schema';

function phrase(over: Partial<PlanContentPhrase> = {}): PlanContentPhrase {
  return {
    id: 'p1',
    english: "I'm here.",
    meaning: { ru: 'Я здесь.' },
    constructions: ['to-be'],
    explanation: {
      title: { ru: "Маленький глагол I'm" },
      rule: { ru: "После I нужна форма am — это и есть I'm." },
      why: { ru: 'Без связки фраза звучит недособранной для англичанина.' },
      commonMistake: { ru: 'Часто роняют am и говорят просто I here.' },
    },
    words: [
      { text: "I'm", partOfSpeech: 'to-be', distractors: ["You're", "He's", "We're", 'zz4', 'zz5'] },
      { text: 'here', partOfSpeech: 'adverb', distractors: ['there', 'near', 'home', 'zz4', 'zz5'] },
    ],
    ...over,
  };
}

function vocab(over: Partial<PlanVocabularyWord> = {}): PlanVocabularyWord {
  return {
    word: 'here',
    partOfSpeech: 'adverb',
    translation: { ru: 'здесь' },
    example: "I'm here.",
    ...over,
  };
}

function makeDay(over: Partial<PlanContentDay> = {}): PlanContentDay {
  return {
    planId: 'voyazh',
    dayIndex: 1,
    topic: { ru: 'Аэропорт: попросить помощь' },
    outcome: { ru: 'Сможешь спокойно попросить помощь в аэропорту.' },
    level: 'A1',
    prerequisiteLessons: [1],
    intro: [{ kind: 'why', title: { ru: 't' }, body: { ru: 'b' } }],
    phrases: [
      phrase({ id: 'p1', english: "I'm here.", constructions: ['to-be'] }),
      phrase({
        id: 'p2', english: 'I need help.', constructions: ['present-simple'],
        words: [
          { text: 'I', partOfSpeech: 'pronoun', distractors: ['You', 'We', 'They', 'zz4', 'zz5'] },
          { text: 'need', partOfSpeech: 'verb', distractors: ['want', 'have', 'see', 'zz4', 'zz5'] },
          { text: 'help', partOfSpeech: 'noun', distractors: ['water', 'time', 'food', 'zz4', 'zz5'] },
        ],
      }),
      phrase({
        id: 'p3', english: 'Where is the exit?', constructions: ['to-be-questions'],
        words: [
          { text: 'Where', partOfSpeech: 'adverb', distractors: ['When', 'What', 'Who', 'zz4', 'zz5'] },
          { text: 'is', partOfSpeech: 'to-be', distractors: ['are', 'am', 'be', 'zz4', 'zz5'] },
          { text: 'the', partOfSpeech: 'article', distractors: ['a', 'an', 'this', 'zz4', 'zz5'] },
          { text: 'exit', partOfSpeech: 'noun', distractors: ['gate', 'door', 'desk', 'zz4', 'zz5'] },
        ],
      }),
      phrase({
        id: 'p4', english: 'I need the gate.', constructions: ['present-simple'],
        words: [
          { text: 'I', partOfSpeech: 'pronoun', distractors: ['You', 'We', 'They', 'zz4', 'zz5'] },
          { text: 'need', partOfSpeech: 'verb', distractors: ['want', 'have', 'see', 'zz4', 'zz5'] },
          { text: 'the', partOfSpeech: 'article', distractors: ['a', 'an', 'this', 'zz4', 'zz5'] },
          { text: 'gate', partOfSpeech: 'noun', distractors: ['exit', 'door', 'desk', 'zz4', 'zz5'] },
        ],
      }),
      phrase({
        id: 'p5', english: 'I am okay.', constructions: ['to-be'],
        words: [
          { text: 'I', partOfSpeech: 'pronoun', distractors: ['You', 'We', 'They', 'zz4', 'zz5'] },
          { text: 'am', partOfSpeech: 'to-be', distractors: ['is', 'are', 'be', 'zz4', 'zz5'] },
          { text: 'okay', partOfSpeech: 'adjective', distractors: ['fine', 'ready', 'late', 'zz4', 'zz5'] },
        ],
      }),
    ],
    vocabulary: [
      vocab({ word: 'here' }),
      vocab({ word: 'help', partOfSpeech: 'noun', translation: { ru: 'помощь' }, example: 'I need help.' }),
      vocab({ word: 'exit', partOfSpeech: 'noun', translation: { ru: 'выход' }, example: 'Where is the exit?' }),
      vocab({ word: 'okay', partOfSpeech: 'adjective', translation: { ru: 'нормально' }, example: 'I am okay.' }),
      vocab({ word: 'need', partOfSpeech: 'verb', translation: { ru: 'нужно' }, example: 'I need help.' }),
    ],
    ...over,
  };
}

describe('plan content schema', () => {
  it('accepts a well-formed day', () => {
    expect(validatePlanContentDay(makeDay())).toEqual([]);
    expect(planContentDayIsReady(makeDay())).toBe(true);
  });

  it('rejects too few phrases', () => {
    const day = makeDay({ phrases: [phrase()] });
    expect(validatePlanContentDay(day).map((i) => i.code)).toContain('too_few_phrases');
  });

  it('rejects a phrase without grammar constructions', () => {
    const day = makeDay();
    day.phrases[0] = phrase({ constructions: [] });
    expect(validatePlanContentDay(day).map((i) => i.code)).toContain('phrase_missing_constructions');
  });

  it('detects an authored words array that omits a canonical phrase token', () => {
    const day = makeDay();
    day.phrases[1] = phrase({
      id: 'p2',
      english: 'I need help.',
      words: [
        { text: 'need', partOfSpeech: 'verb', distractors: ['want', 'have', 'see', 'zz4', 'zz5'] },
        { text: 'help', partOfSpeech: 'noun', distractors: ['water', 'time', 'food', 'zz4', 'zz5'] },
      ],
    });

    expect(validatePlanContentWordAlignment(day)).toEqual([
      expect.objectContaining({ code: 'phrase_words_misaligned', phraseId: 'p2' }),
    ]);
  });

  it('rejects an incomplete explanation (missing the common mistake)', () => {
    const day = makeDay();
    day.phrases[0] = phrase({
      explanation: {
        title: { ru: 't' },
        rule: { ru: 'r' },
        why: { ru: 'w' },
        commonMistake: { ru: '' },
      },
    });
    expect(validatePlanContentDay(day).map((i) => i.code)).toContain('phrase_missing_explanation');
  });

  it('rejects an over-long explanation', () => {
    const longText = Array.from({ length: 30 }, () => 'слово').join(' ');
    const day = makeDay();
    day.phrases[0] = phrase({
      explanation: {
        title: { ru: 'ok' },
        rule: { ru: longText },
        why: { ru: 'ok' },
        commonMistake: { ru: 'ok' },
      },
    });
    expect(validatePlanContentDay(day).map((i) => i.code)).toContain('explanation_too_long');
  });

  it('requires 5-8 key vocabulary words', () => {
    const tooFew = makeDay({ vocabulary: [vocab(), vocab()] });
    expect(validatePlanContentDay(tooFew).map((i) => i.code)).toContain('too_few_vocabulary');

    const tooMany = makeDay({ vocabulary: Array.from({ length: 9 }, () => vocab()) });
    expect(validatePlanContentDay(tooMany).map((i) => i.code)).toContain('too_many_vocabulary');
  });

  it('requires vocabulary words to actually appear in the day phrases', () => {
    const day = makeDay();
    day.vocabulary[0] = vocab({ word: 'helicopter', example: 'n/a' });
    expect(validatePlanContentDay(day).map((i) => i.code)).toContain('vocab_not_in_phrases');
  });

  it('requires a part of speech on each key word', () => {
    const day = makeDay();
    day.vocabulary[0] = vocab({ partOfSpeech: '' });
    expect(validatePlanContentDay(day).map((i) => i.code)).toContain('vocab_missing_pos');
  });

  it('requires an outcome and prerequisites', () => {
    expect(validatePlanContentDay(makeDay({ outcome: { ru: '' } })).map((i) => i.code)).toContain('missing_outcome');
    expect(validatePlanContentDay(makeDay({ prerequisiteLessons: [] })).map((i) => i.code)).toContain('missing_prerequisites');
  });
});
