import {
  explanationToTeachingNote,
  contentPhraseToLessonPhrase,
  contentDayToLessonPhrases,
  contentVocabularyToRuntimeCards,
} from '../app/plan_content_runtime_adapter';
import type { PlanContentDay, PlanContentPhrase } from '../app/plan_content_schema';

const phrase: PlanContentPhrase = {
  id: 'voyazh_d1_p1',
  english: "I'm here.",
  meaning: { ru: 'Я здесь.', uk: 'Я тут.', es: 'Estoy aquí.' },
  constructions: ['to-be'],
  explanation: {
    title: { ru: "Маленький глагол I'm", uk: "Маленьке дієслово I'm" },
    rule: { ru: "После I нужна форма am." },
    why: { ru: 'Без связки фраза звучит недособранной.' },
    commonMistake: { ru: 'Часто роняют am: I here.' },
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
  intro: [{ kind: 'why', title: { ru: 't' }, body: { ru: 'b' } }],
  phrases: [phrase],
  vocabulary: [
    { word: 'here', partOfSpeech: 'adverb', translation: { ru: 'здесь', uk: 'тут' }, example: "I'm here." },
  ],
};

describe('plan content runtime adapter', () => {
  it('collapses a full explanation into a runtime teaching note', () => {
    const note = explanationToTeachingNote('n1', phrase.explanation);
    expect(note.id).toBe('n1');
    expect(note.titleRu).toBe("Маленький глагол I'm");
    expect(note.titleUk).toBe("Маленьке дієслово I'm");
    // rule + why merge into the "correct" side
    expect(note.correctRu).toContain('После I нужна форма am.');
    expect(note.correctRu).toContain('Без связки фраза звучит недособранной.');
    // common mistake becomes the "wrong" side
    expect(note.wrongRu).toBe('Часто роняют am: I here.');
  });

  it('maps a content phrase to a runtime LessonPhrase with localized meanings', () => {
    const lp = contentPhraseToLessonPhrase(phrase);
    expect(lp.id).toBe('voyazh_d1_p1');
    expect(lp.english).toBe("I'm here.");
    expect(lp.russian).toBe('Я здесь.');
    expect(lp.ukrainian).toBe('Я тут.');
    expect(lp.spanish).toBe('Estoy aquí.');
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

  it('builds runtime vocabulary cards with normalized POS', () => {
    const cards = contentVocabularyToRuntimeCards(day);
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      word: 'here',
      partOfSpeech: 'adverb',
      translationRu: 'здесь',
      translationUk: 'тут',
      example: "I'm here.",
    });
  });
});
