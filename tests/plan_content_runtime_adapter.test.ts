import {
  explanationToTeachingNote,
  contentPhraseToLessonPhrase,
  contentDayToLessonPhrases,
  contentDayToLessonIntroScreens,
  contentVocabularyToRuntimeCards,
} from '../app/plan_content_runtime_adapter';
import type { PlanContentDay, PlanContentPhrase } from '../app/plan_content_schema';

const phrase: PlanContentPhrase = {
  id: 'voyazh_d1_p1',
  english: "I'm here.",
  meaning: {
    ru: 'Я здесь.',
    uk: 'Я тут.',
    es: 'Estoy aquí.',
    'pt-BR': 'Estou aqui.',
    vi: 'Tôi ở đây.',
    id: 'Saya di sini.',
    tr: 'Buradayım.',
    pl: 'Jestem tutaj.',
  },
  constructions: ['to-be'],
  explanation: {
    title: { ru: "Маленький глагол I'm", uk: "Маленьке дієслово I'm", 'pt-BR': "O pequeno verbo I'm" },
    rule: { ru: "После I нужна форма am.", 'pt-BR': 'Depois de I, você precisa de am.' },
    why: { ru: 'Без связки фраза звучит недособранной.', 'pt-BR': 'Sem o verbo de ligação, a frase fica incompleta.' },
    commonMistake: { ru: 'Часто роняют am: I here.', 'pt-BR': 'Muitas vezes omitem am: I here.' },
  },
  words: [
    { text: "I'm", partOfSpeech: 'to-be', distractors: ["You're", "He's", "We're", 'zz4', 'zz5'] },
    { text: 'here', partOfSpeech: 'adverb', distractors: ['there', 'near', 'home', 'zz4', 'zz5'] },
  ],
};

const day: PlanContentDay = {
  planId: 'voyazh',
  dayIndex: 1,
  topic: { ru: 'Аэропорт' },
  outcome: { ru: 'Сможешь попросить помощь.' },
  level: 'A1',
  prerequisiteLessons: [1],
  intro: [{
    kind: 'why',
    title: { ru: 't', 'pt-BR': 'pt title' },
    body: { ru: 'b', 'pt-BR': 'pt body' },
    examples: [{ en: "I'm here.", gloss: { ru: 'Я здесь.', 'pt-BR': 'Estou aqui.' } }],
  }],
  phrases: [phrase],
  vocabulary: [
    {
      word: 'here',
      partOfSpeech: 'adverb',
      translation: {
        ru: 'здесь',
        uk: 'тут',
        es: 'aqui',
        'pt-BR': 'aqui pt',
        vi: 'aqui vi',
        id: 'aqui id',
        tr: 'aqui tr',
        pl: 'aqui pl',
      },
      example: "I'm here.",
    },
  ],
};

describe('plan content runtime adapter', () => {
  it('collapses a full explanation into a runtime teaching note', () => {
    const note = explanationToTeachingNote('n1', phrase.explanation);
    expect(note.id).toBe('n1');
    expect(note.titleRu).toBe("Маленький глагол I'm");
    expect(note.titleUk).toBe("Маленьке дієслово I'm");
    expect(note.titlePtBr).toBe("O pequeno verbo I'm");
    // rule + why merge into the "correct" side
    expect(note.correctRu).toContain('После I нужна форма am.');
    expect(note.correctRu).toContain('Без связки фраза звучит недособранной.');
    expect(note.correctPtBr).toContain('Depois de I, você precisa de am.');
    // common mistake becomes the "wrong" side
    expect(note.wrongRu).toBe('Часто роняют am: I here.');
    expect(note.wrongPtBr).toBe('Muitas vezes omitem am: I here.');
  });

  it('maps a content phrase to a runtime LessonPhrase with localized meanings', () => {
    const lp = contentPhraseToLessonPhrase(phrase);
    expect(lp.id).toBe('voyazh_d1_p1');
    expect(lp.english).toBe("I'm here.");
    expect(lp.russian).toBe('Я здесь.');
    expect(lp.ukrainian).toBe('Я тут.');
    expect(lp.spanish).toBe('Estoy aquí.');
    expect(lp.sourceLocales?.['pt-BR']).toBe('Estou aqui.');
    expect(lp.sourceLocales?.vi).toBe('Tôi ở đây.');
    expect(lp.sourceLocales?.id).toBe('Saya di sini.');
    expect(lp.sourceLocales?.tr).toBe('Buradayım.');
    expect(lp.sourceLocales?.pl).toBe('Jestem tutaj.');
    expect(lp.words.length).toBeGreaterThan(0);
  });

  it('falls back ukrainian to russian when no uk meaning, omits spanish when absent', () => {
    const lp = contentPhraseToLessonPhrase({
      ...phrase,
      meaning: { ru: 'Я здесь.' },
    });
    expect(lp.ukrainian).toBe('Я здесь.');
    expect(lp.spanish).toBeUndefined();
  });

  it('attaches the teaching note to the first word only', () => {
    const lp = contentPhraseToLessonPhrase(phrase);
    expect(lp.words[0].teachingNote).toBeDefined();
    expect(lp.words.slice(1).every((w) => w.teachingNote === undefined)).toBe(true);
  });

  it('assigns a real WordCategory to each word', () => {
    const lp = contentPhraseToLessonPhrase(phrase);
    // "here" should resolve to adverb via the POS taxonomy
    const here = lp.words.find((w) => w.text.toLowerCase() === 'here');
    expect(here?.category).toBe('adverb');
  });

  it('maps a whole day to runtime phrases', () => {
    expect(contentDayToLessonPhrases(day)).toHaveLength(1);
  });

  it('restores canonical tokens omitted by a legacy authored words array', () => {
    const runtime = contentPhraseToLessonPhrase({
      ...phrase,
      english: 'If I had more time, I would travel more.',
      words: [
        { text: 'If', partOfSpeech: 'conjunction', distractors: ['unless', 'when', 'because', 'although', 'while'] },
        { text: 'had', partOfSpeech: 'verb', distractors: ['have', 'has', 'would', 'could', 'were'] },
        { text: 'more', partOfSpeech: 'adverb', distractors: ['less', 'most', 'much', 'many', 'very'] },
        { text: 'time', partOfSpeech: 'noun', distractors: ['day', 'week', 'hour', 'year', 'moment'] },
        { text: 'would', partOfSpeech: 'modal', distractors: ['could', 'should', 'will', 'might', 'can'] },
        { text: 'travel', partOfSpeech: 'verb', distractors: ['work', 'stay', 'move', 'visit', 'live'] },
      ],
    });

    expect(runtime.words.map((word) => word.correct)).toEqual([
      'If', 'I', 'had', 'more', 'time', 'I', 'would', 'travel', 'more',
    ]);
    expect(runtime.words[1]).toMatchObject({ category: 'pronoun' });
    expect(runtime.words[1].distractors).toHaveLength(5);
  });

  it('maps planned locale intro text and examples to lesson intro fields', () => {
    const screens = contentDayToLessonIntroScreens(day);
    expect(screens[0]).toMatchObject({
      titlePtBr: 'pt title',
      textPtBr: 'pt body',
      examples: [{ trPtBr: 'Estou aqui.' }],
    });
  });

  it('builds runtime vocabulary cards with normalized POS', () => {
    const cards = contentVocabularyToRuntimeCards(day);
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      word: 'here',
      partOfSpeech: 'adverb',
      translationRu: 'здесь',
      translationUk: 'тут',
      translationEs: 'aqui',
      sourceLocales: {
        'pt-BR': 'aqui pt',
        vi: 'aqui vi',
        id: 'aqui id',
        tr: 'aqui tr',
        pl: 'aqui pl',
      },
      example: "I'm here.",
    });
  });
});
