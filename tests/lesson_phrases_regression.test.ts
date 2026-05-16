/**
 * Guards against accidental wipe of lesson phrases or localized titles.
 * If you intentionally add/remove phrases, update EXPECTED_PHRASE_COUNTS and re-run tests.
 */
import { ALL_LESSONS, LESSON_DATA } from '../app/lesson_data_all';
import { LESSON_NAMES_ES } from '../constants/lessons';

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

  it('ALL_LESSONS titleES matches LESSON_NAMES_ES for each row id', () => {
    expect(ALL_LESSONS).toHaveLength(32);
    for (const row of ALL_LESSONS) {
      expect(row.titleES).toBe(LESSON_NAMES_ES[row.id - 1]);
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

  it('reported phrase translations stay aligned with English answers', () => {
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

    const lesson11Phrase22 = LESSON_DATA[11].phrases.find((phrase) => phrase.id === 'lesson11_phrase_22');
    expect(lesson11Phrase22).toMatchObject({
      english: 'She closed apps yesterday',
      russian: 'Она закрыла приложения вчера',
      ukrainian: 'Вона закрила застосунки вчора',
    });

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
  });
});
