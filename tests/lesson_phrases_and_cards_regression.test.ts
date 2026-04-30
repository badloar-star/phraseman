/**
 * Guards against accidental wipe of lesson phrases or flashcard copy.
 * If you intentionally add/remove phrases, update EXPECTED_PHRASE_COUNTS and re-run tests.
 */
import { ALL_LESSONS, LESSON_DATA } from '../app/lesson_data_all';
import { lessonCards } from '../app/lesson_cards_data';
import { LESSON_NAMES_ES } from '../constants/lessons';

/** Phrase count per lesson id (from LESSON_DATA). Update when curriculum changes. */
const EXPECTED_PHRASE_COUNTS: Record<number, number> = {
  1: 50, 2: 50, 3: 50, 4: 50, 5: 50, 6: 50, 7: 50, 8: 50,
  9: 50, 10: 50, 11: 50, 12: 50, 13: 50, 14: 50, 15: 50, 16: 50,
  17: 50, 18: 50, 19: 50, 20: 50, 21: 50, 22: 50, 23: 50, 24: 50,
  25: 50, 26: 50, 27: 50, 28: 50, 29: 50, 30: 50, 31: 50, 32: 50,
};

function countCardsForLesson(lessonId: number): number {
  const m = lessonCards[lessonId];
  if (!m) return 0;
  return Object.keys(m).length;
}

describe('lesson phrases & cards regression', () => {
  it('LESSON_DATA has exactly 32 lessons with expected phrase counts', () => {
    expect(Object.keys(LESSON_DATA).map(Number).sort((a, b) => a - b)).toEqual(
      Array.from({ length: 32 }, (_, i) => i + 1),
    );
    for (let id = 1; id <= 32; id++) {
      const n = LESSON_DATA[id]?.phrases?.length;
      expect(n).toBe(EXPECTED_PHRASE_COUNTS[id]);
    }
  });

  it('lessonCards has one card per phrase index for each lesson', () => {
    for (let id = 1; id <= 32; id++) {
      const expected = EXPECTED_PHRASE_COUNTS[id];
      const map = lessonCards[id];
      expect(map).toBeDefined();
      const keys = Object.keys(map!)
        .map(Number)
        .sort((a, b) => a - b);
      expect(keys.length).toBe(expected);
      for (let k = 1; k <= expected; k++) {
        expect(map![k]).toBeDefined();
      }
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
});
