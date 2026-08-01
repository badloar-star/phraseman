/**
 * Guards against accidental wipe of lesson phrases or localized titles.
 * If you intentionally add/remove phrases, update EXPECTED_PHRASE_COUNTS and re-run tests.
 */
import { ALL_LESSONS, LESSON_DATA, getLessonData } from '../app/lesson_data_all';
import { phraseAnswerAlternatives, phraseCanonicalAnswer } from '../app/phrase_target_utils';
import { isCorrectAnswer } from '../constants/contractions';
import {
  LESSON_NAMES_ES,
  LESSON_NAMES_ID,
  LESSON_NAMES_PL,
  LESSON_NAMES_PT_BR,
  LESSON_NAMES_TR,
  LESSON_NAMES_VI,
} from '../constants/lessons';

/** Phrase count per lesson id (from LESSON_DATA). Update when curriculum changes. */
const EXPECTED_PHRASE_COUNTS: Record<number, number> = {
  1: 50, 2: 50, 3: 50, 4: 50, 5: 50, 6: 50, 7: 50, 8: 50,
  9: 50, 10: 50, 11: 50, 12: 50, 13: 50, 14: 50, 15: 50, 16: 50,
  17: 50, 18: 50, 19: 50, 20: 50, 21: 50, 22: 50, 23: 50, 24: 50,
  25: 50, 26: 50, 27: 50, 28: 50, 29: 50, 30: 50, 31: 50, 32: 50,
};

describe('lesson phrases regression', () => {
  it('LESSON_DATA has exactly 32 lessons with expected phrase counts', () => {
    expect(Object.keys(LESSON_DATA).map(Number).sort((a, b) => a - b)).toEqual(
      Array.from({ length: 32 }, (_, i) => i + 1),
    );
    for (let id = 1; id <= 32; id++) {
      const n = LESSON_DATA[id]?.phrases?.length;
      expect(n).toBe(EXPECTED_PHRASE_COUNTS[id]);
    }
  });

  it('titleES on each lesson matches LESSON_NAMES_ES[id - 1]', () => {
    for (let id = 1; id <= 32; id++) {
      expect(LESSON_DATA[id]?.titleES).toBe(LESSON_NAMES_ES[id - 1]);
    }
  });

  it('lesson play mode has 50 word-backed phrases, including lesson 13', () => {
    for (let id = 1; id <= 32; id++) {
      const playable = getLessonData(id).filter((phrase) => phrase.words && phrase.words.length > 0);
      expect(playable).toHaveLength(EXPECTED_PHRASE_COUNTS[id]);
    }
  });

  it('ALL_LESSONS titleES matches LESSON_NAMES_ES for each row id', () => {
    expect(ALL_LESSONS).toHaveLength(32);
    for (const row of ALL_LESSONS) {
      expect(row.titleES).toBe(LESSON_NAMES_ES[row.id - 1]);
    }
  });

  it('lesson rows expose planned locale titles without Russian fallback', () => {
    for (let id = 1; id <= 32; id++) {
      expect(LESSON_DATA[id]?.titlePtBr).toBe(LESSON_NAMES_PT_BR[id - 1]);
      expect(LESSON_DATA[id]?.titleVi).toBe(LESSON_NAMES_VI[id - 1]);
      expect(LESSON_DATA[id]?.titleId).toBe(LESSON_NAMES_ID[id - 1]);
      expect(LESSON_DATA[id]?.titleTr).toBe(LESSON_NAMES_TR[id - 1]);
      expect(LESSON_DATA[id]?.titlePl).toBe(LESSON_NAMES_PL[id - 1]);
    }
  });

  it('lessons 25–32 phrases have non-empty spanish for locale es', () => {
    for (let lessonId = 25; lessonId <= 32; lessonId++) {
      const phrases = LESSON_DATA[lessonId]?.phrases ?? [];
      expect(phrases).toHaveLength(EXPECTED_PHRASE_COUNTS[lessonId]);
      for (const phrase of phrases) {
        expect(typeof phrase.spanish).toBe('string');
        expect(phrase.spanish!.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('keeps English cafe lesson text ASCII-only in learner-facing answers', () => {
    const phrase = LESSON_DATA[6].phrases.find((row) => row.id === 'lesson6_phrase_50');
    expect(phrase).toMatchObject({
      english: 'When do they close the cafe?',
      russian: 'Когда они закрывают кафе?',
      ukrainian: 'Коли вони зачиняють кафе?',
      spanish: '¿Cuándo cierran el café?',
    });
    expect(phrase?.english).not.toContain('é');
    expect(phrase?.wordsEn?.map((word) => word.correct)).toEqual(['When', 'do', 'they', 'close', 'the', 'cafe']);
  });

  it('uses an explicit problem/problems contrast across lesson 9 locales', () => {
    const singular = LESSON_DATA[9].phrases.find((phrase) => phrase.id === 'lesson9_phrase_3');
    const plural = LESSON_DATA[9].phrases.find((phrase) => phrase.id === 'lesson9_phrase_4');

    expect(singular).toMatchObject({
      english: 'Is there a problem?',
      russian: 'Есть проблема?',
      ukrainian: 'Є проблема?',
      spanish: '¿Hay un problema?',
    });
    expect(plural).toMatchObject({
      english: 'Are there problems?',
      russian: 'Есть проблемы?',
      ukrainian: 'Є проблеми?',
      spanish: '¿Hay problemas?',
    });
    expect(singular).not.toHaveProperty('targetGrammarNumber');
    expect(plural).not.toHaveProperty('targetGrammarNumber');
    expect(singular?.words.map((word) => word.correct)).toEqual(['¿', 'Hay', 'un', 'problema', '?']);
    expect(plural?.words.map((word) => word.correct)).toEqual(['¿', 'Hay', 'problemas', '?']);
    expect(singular?.wordsEn?.map((word) => word.correct)).toEqual(['Is', 'there', 'a', 'problem']);
    expect(plural?.wordsEn?.map((word) => word.correct)).toEqual(['Are', 'there', 'problems']);
  });

  it('reported phrase translations stay aligned with English answers', () => {
    const lesson1Phrase29 = LESSON_DATA[1].phrases.find((phrase) => phrase.id === 'lesson1_phrase_29');
    expect(lesson1Phrase29).toMatchObject({
      english: 'You are okay',
      russian: 'Ты в порядке',
      ukrainian: 'Ти в порядку',
      alternatives: ['You are fine'],
    });
    expect(lesson1Phrase29?.wordsEn?.map((word) => word.correct)).toEqual(['You', 'are', 'okay']);
    expect(
      isCorrectAnswer(
        'You are fine',
        phraseCanonicalAnswer(lesson1Phrase29!, 'en'),
        phraseAnswerAlternatives(lesson1Phrase29!, 'en'),
      ),
    ).toBe(true);

    const lesson5Phrase20 = LESSON_DATA[5].phrases.find((phrase) => phrase.id === 'lesson5_phrase_20');
    expect(lesson5Phrase20).toMatchObject({
      english: 'Does he call often?',
      russian: 'Он часто звонит?',
      ukrainian: 'Він часто телефонує?',
    });
    expect(lesson5Phrase20?.wordsEn?.map((word) => word.correct)).toEqual([
      'Does',
      'he',
      'call',
      'often',
    ]);
    expect(phraseCanonicalAnswer(lesson5Phrase20!, 'en')).toBe('Does he call often');
    expect(
      isCorrectAnswer(
        'Does he call often',
        phraseCanonicalAnswer(lesson5Phrase20!, 'en'),
        phraseAnswerAlternatives(lesson5Phrase20!, 'en'),
      ),
    ).toBe(true);

    const lesson5Phrase23 = LESSON_DATA[5].phrases.find((phrase) => phrase.id === 'lesson5_phrase_23');
    expect(lesson5Phrase23).toMatchObject({
      english: 'Does she believe you?',
      russian: 'Она верит тебе?',
      ukrainian: 'Вона вірить тобі?',
    });
    expect(lesson5Phrase23?.wordsEn?.map((word) => word.correct)).toEqual([
      'Does',
      'she',
      'believe',
      'you',
    ]);
    expect(phraseCanonicalAnswer(lesson5Phrase23!, 'en')).toBe('Does she believe you');
    expect(
      isCorrectAnswer(
        'Does she believe you',
        phraseCanonicalAnswer(lesson5Phrase23!, 'en'),
        phraseAnswerAlternatives(lesson5Phrase23!, 'en'),
      ),
    ).toBe(true);

    const lesson5Phrase26 = LESSON_DATA[5].phrases.find((phrase) => phrase.id === 'lesson5_phrase_26');
    expect(lesson5Phrase26).toMatchObject({
      english: 'Does he drive cars?',
      russian: 'Он водит машины?',
      ukrainian: 'Він водить машини?',
    });
    expect(lesson5Phrase26?.wordsEn?.map((word) => word.correct)).toEqual([
      'Does',
      'he',
      'drive',
      'cars',
    ]);
    expect(phraseCanonicalAnswer(lesson5Phrase26!, 'en')).toBe('Does he drive cars');
    expect(
      isCorrectAnswer(
        'Does he drive cars',
        phraseCanonicalAnswer(lesson5Phrase26!, 'en'),
        phraseAnswerAlternatives(lesson5Phrase26!, 'en'),
      ),
    ).toBe(true);

    const lesson6Phrase27 = LESSON_DATA[6].phrases.find((phrase) => phrase.id === 'lesson6_phrase_27');
    expect(lesson6Phrase27).toMatchObject({
      english: 'Where does he keep keys?',
      russian: 'Где он хранит ключи?',
      ukrainian: 'Де він зберігає ключі?',
    });
    expect(lesson6Phrase27?.wordsEn?.map((word) => word.correct)).toEqual([
      'Where',
      'does',
      'he',
      'keep',
      'keys',
    ]);

    const lesson6Phrase38 = LESSON_DATA[6].phrases.find((phrase) => phrase.id === 'lesson6_phrase_38');
    expect(lesson6Phrase38).toMatchObject({
      english: 'How do we book it?',
      russian: 'Как нам это забронировать?',
      ukrainian: 'Як нам це забронювати?',
    });
    expect(lesson6Phrase38?.wordsEn?.map((word) => word.correct)).toEqual([
      'How',
      'do',
      'we',
      'book',
      'it',
    ]);
    expect(phraseCanonicalAnswer(lesson6Phrase38!, 'en')).toBe('How do we book it');

    const lesson11Phrase22 = LESSON_DATA[11].phrases.find((phrase) => phrase.id === 'lesson11_phrase_22');
    expect(lesson11Phrase22).toMatchObject({
      english: 'She closed apps yesterday',
      russian: 'Она закрыла приложения вчера',
      ukrainian: 'Вона закрила застосунки вчора',
    });

    const lesson11Phrase7 = LESSON_DATA[11].phrases.find((phrase) => phrase.id === 'lesson11_phrase_7');
    expect(lesson11Phrase7).toMatchObject({
      english: 'I washed the dishes this morning',
      russian: 'Я помыл посуду сегодня утром',
      ukrainian: 'Я помив посуд сьогодні вранці',
    });
    expect(lesson11Phrase7?.wordsEn?.map((word) => word.correct)).toEqual([
      'I',
      'washed',
      'the',
      'dishes',
      'this',
      'morning',
    ]);

    const lesson11Phrase49 = LESSON_DATA[11].phrases.find((phrase) => phrase.id === 'lesson11_phrase_49');
    expect(lesson11Phrase49).toMatchObject({
      english: 'She brushed her hair this morning',
      russian: 'Она расчесала волосы сегодня утром',
      ukrainian: 'Вона розчесала волосся сьогодні вранці',
    });

    const lesson13Phrase1 = LESSON_DATA[13].phrases.find((phrase) => phrase.id === 'lesson13_phrase_1');
    expect(lesson13Phrase1).toMatchObject({
      english: 'I will call you tomorrow',
      russian: 'Я позвоню тебе завтра',
      ukrainian: 'Я зателефоную тобі завтра',
    });
    expect(lesson13Phrase1?.wordsEn?.map((word) => word.correct)).toEqual([
      'I',
      'will',
      'call',
      'you',
      'tomorrow',
    ]);

    const lesson3Phrase39 = LESSON_DATA[3].phrases.find((phrase) => phrase.id === 'lesson3_phrase_39');
    expect(lesson3Phrase39).toMatchObject({
      english: 'We trust you',
      russian: 'Мы доверяем тебе',
      ukrainian: 'Ми довіряємо тобі',
      spanish: 'Confiamos en ti.',
    });
    expect(lesson3Phrase39?.words?.map((word) => word.correct)).toEqual([
      'Confiamos',
      'en',
      'ti',
      '.',
    ]);
    expect(lesson3Phrase39?.wordsEn?.map((word) => word.correct)).toEqual([
      'We',
      'trust',
      'you',
    ]);

    const lesson8Phrase26 = LESSON_DATA[8].phrases.find((phrase) => phrase.id === 'lesson8_phrase_26');
    expect(lesson8Phrase26).toMatchObject({
      english: 'We have class on Tuesdays',
      alternatives: ['We have classes on Tuesdays'],
    });
    expect(
      isCorrectAnswer(
        'We have classes on Tuesdays',
        phraseCanonicalAnswer(lesson8Phrase26!, 'en'),
        phraseAnswerAlternatives(lesson8Phrase26!, 'en'),
      ),
    ).toBe(true);
    expect(
      isCorrectAnswer(
        'We have class on Tuesday',
        phraseCanonicalAnswer(lesson8Phrase26!, 'en'),
        phraseAnswerAlternatives(lesson8Phrase26!, 'en'),
      ),
    ).toBe(false);

    const lesson9Phrase45 = LESSON_DATA[9].phrases.find((phrase) => phrase.id === 'lesson9_phrase_45');
    expect(lesson9Phrase45).toMatchObject({
      english: 'Is there much time?',
      russian: 'Есть много времени?',
      ukrainian: 'Є багато часу?',
      spanish: '¿Hay mucho tiempo?',
    });
    expect(lesson9Phrase45?.wordsEn?.map((word) => word.correct)).toEqual([
      'Is',
      'there',
      'much',
      'time',
    ]);
  });
});
