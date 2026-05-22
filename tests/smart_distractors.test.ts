import {
  buildSmartPhraseOptions,
  buildSmartVocabularyOptions,
  rankSmartDistractors,
  type SmartDistractorCandidate,
} from '../app/smart_distractors';
import { buildLessonWordOptions } from '../app/lesson_word_options';
import * as fs from 'fs';
import * as path from 'path';

const words: SmartDistractorCandidate[] = [
  { value: 'remember', pos: 'verbs', source: 'lesson' },
  { value: 'happen', pos: 'verbs', source: 'lesson' },
  { value: 'teach', pos: 'verbs', source: 'lesson' },
  { value: 'understand', pos: 'verbs', source: 'lesson' },
  { value: 'have', pos: 'verbs', source: 'lesson' },
  { value: 'order', pos: 'verbs', source: 'lesson' },
  { value: 'forget', pos: 'verbs', source: 'crossLesson' },
  { value: 'know', pos: 'verbs', source: 'crossLesson' },
  { value: 'learn', pos: 'verbs', source: 'crossLesson' },
  { value: 'notice', pos: 'verbs', source: 'crossLesson' },
  { value: 'recognize', pos: 'verbs', source: 'crossLesson' },
  { value: 'phone', pos: 'nouns', source: 'crossLesson' },
  { value: 'busy', pos: 'adjectives', source: 'crossLesson' },
];

describe('smart distractor ranking', () => {
  it('uses cognitive near-misses for vocabulary remember instead of same-POS random verbs', () => {
    const ranked = rankSmartDistractors('remember', words, { pos: 'verbs', mode: 'vocabulary' });
    const topFive = ranked.slice(0, 5).map((candidate) => candidate.value);

    expect(topFive).toEqual(expect.arrayContaining(['forget', 'know', 'learn']));
    expect(topFive).toEqual(expect.arrayContaining(['understand']));
    expect(topFive).not.toEqual(expect.arrayContaining(['happen', 'order', 'have']));
  });

  it('builds six vocabulary choices without generic or unrelated verbs for remember', () => {
    const options = buildSmartVocabularyOptions(words[0], words, { optionCount: 6 });

    expect(options).toContain('remember');
    expect(options).toHaveLength(6);
    expect(options).not.toEqual(expect.arrayContaining(['happen', 'order', 'have']));
    expect(options.filter((value) => ['forget', 'know', 'learn', 'understand', 'notice', 'recognize'].includes(value)).length)
      .toBeGreaterThanOrEqual(4);
  });

  it('uses the smart ranking in the real lesson dictionary option builder', () => {
    const lessonWords = [
      { en: 'remember', pos: 'verbs' },
      { en: 'happen', pos: 'verbs' },
      { en: 'teach', pos: 'verbs' },
      { en: 'understand', pos: 'verbs' },
      { en: 'have', pos: 'verbs' },
      { en: 'order', pos: 'verbs' },
    ];
    const allWords = [
      ...lessonWords,
      { en: 'forget', pos: 'verbs' },
      { en: 'know', pos: 'verbs' },
      { en: 'learn', pos: 'verbs' },
      { en: 'notice', pos: 'verbs' },
      { en: 'recognize', pos: 'verbs' },
      { en: 'phone', pos: 'nouns' },
    ];

    const options = buildLessonWordOptions(lessonWords[0], lessonWords, allWords);

    expect(options).toContain('remember');
    expect(options).toHaveLength(6);
    expect(options).not.toEqual(expect.arrayContaining(['happen', 'order', 'have']));
    expect(options.filter((value) => ['forget', 'know', 'learn', 'understand', 'notice', 'recognize'].includes(value)).length)
      .toBeGreaterThanOrEqual(3);
  });

  it('re-ranks phrase distractors by pedagogy before filling from broad pools', () => {
    const options = buildSmartPhraseOptions('remember', [
      'happen',
      'teach',
      'remembered',
      'forget',
      'know',
      'learn',
      'understand',
      'notice',
      'order',
      'have',
    ], { category: 'verbs', optionCount: 6 });

    expect(options).toContain('remember');
    expect(options).toHaveLength(6);
    expect(options).not.toEqual(expect.arrayContaining(['happen', 'order', 'have']));
  });

  it('keeps closed-class grammar traps for to-be phrase slots', () => {
    const options = buildSmartPhraseOptions('is', [
      'am',
      'are',
      'was',
      'were',
      'be',
      'done',
      'phone',
      'busy',
    ], { category: 'verbs', optionCount: 6 });

    expect(options).toEqual(expect.arrayContaining(['is', 'am', 'are', 'was', 'were']));
    expect(options).not.toEqual(expect.arrayContaining(['phone']));
  });

  it('prefers punctuation candidates over sentence words for punctuation slots', () => {
    const options = buildSmartPhraseOptions('?', [
      { value: 'ella', source: 'manual' },
      { value: 'ayuda', source: 'manual' },
      { value: ',', category: 'puntuacion', source: 'category' },
      { value: '!', category: 'puntuacion', source: 'category' },
      { value: ';', category: 'puntuacion', source: 'category' },
      { value: ':', category: 'puntuacion', source: 'category' },
      { value: '.', category: 'puntuacion', source: 'category' },
    ], { category: 'puntuacion', optionCount: 6 });

    expect(options).toContain('?');
    expect(options).toEqual(expect.arrayContaining([',', '!', ';', ':']));
    expect(options).not.toEqual(expect.arrayContaining(['ella', 'ayuda']));
  });

  it('keeps lesson 1 smart option source free of legacy locale runtime markers', () => {
    const source = fs.readFileSync(path.join(__dirname, '../app/lesson1_smart_options.ts'), 'utf8');
    const legacyRuntimePattern = /\b(lang === 'ru'|lang === 'uk'|lang === 'es'|return\s+[^;\n]*(?:RU|UK|ES)\b|\?\?\s*[^;\n]*(?:RU|UK|ES)\b|fallback)\b/u;

    expect(source).not.toMatch(legacyRuntimePattern);
  });
});
