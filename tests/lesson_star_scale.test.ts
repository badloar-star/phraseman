import {
  LESSON_UNLOCK_SCORE,
  LEGACY_LESSON_UNLOCK_SCORE,
  allLessonScoresMeetPercent,
  lessonScoreMeetsPercent,
  lessonStarCountFromPercent,
  lessonScoreToPercent,
  previousLessonScoreOpensNext,
  LEVEL_EXAM_UNLOCK_LESSON_PERCENT,
  LINGMAN_EXAM_UNLOCK_LESSON_PERCENT,
  LEVEL_EXAM_PASS_PERCENT,
} from '../app/lesson_star_scale';
import { BRONZE_UNLOCK_SCORE } from '../app/monetization_policy';

// D121 (владелец 2026-09-30): 2★ за урок = от 60% правильных; порог открытия = 2★.
describe('lesson_star_scale (D121 / PM-152)', () => {
  it('порог открытия урока — 60% = оценка 3 из 5', () => {
    expect(LESSON_UNLOCK_SCORE).toBe(3);
    expect(BRONZE_UNLOCK_SCORE).toBe(3);
    expect(LEGACY_LESSON_UNLOCK_SCORE).toBe(2);
  });

  it('2★ на экране начинается ровно там же, где открытие следующего урока', () => {
    for (const correct of [29, 30, 42, 43]) {
      const score = (correct / 50) * 5;
      // Проекция списка (LessonsListGlassKit) держит те же 60/85 — её сторожит
      // tests/lessons_list_liquid_glass_source_contract.test.mjs.
      const stars = lessonStarCountFromPercent(lessonScoreToPercent(score));
      expect(stars >= 2).toBe(previousLessonScoreOpensNext(score));
    }
    // Дроби не теряют порог: 27 из 45 — ровно 60%.
    expect(previousLessonScoreOpensNext((27 / 45) * 5)).toBe(true);
    expect(lessonStarCountFromPercent(lessonScoreToPercent((27 / 45) * 5))).toBe(2);
  });

  it('grandfathering: уже открытый урок держится от старых 40%, новый — нет', () => {
    expect(previousLessonScoreOpensNext(2.5)).toBe(false);
    expect(previousLessonScoreOpensNext(2.5, true)).toBe(true);
    expect(previousLessonScoreOpensNext(2, true)).toBe(true);
    expect(previousLessonScoreOpensNext(1.9, true)).toBe(false);
  });

  it('экзамены на той же процентной шкале, значения прежние', () => {
    expect(LEVEL_EXAM_UNLOCK_LESSON_PERCENT).toBe(90);
    expect(LINGMAN_EXAM_UNLOCK_LESSON_PERCENT).toBe(100);
    expect(LEVEL_EXAM_PASS_PERCENT).toBe(70);
    expect(allLessonScoresMeetPercent([4.5, 5, 4.6], LEVEL_EXAM_UNLOCK_LESSON_PERCENT)).toBe(true);
    expect(allLessonScoresMeetPercent([4.5, 4.4], LEVEL_EXAM_UNLOCK_LESSON_PERCENT)).toBe(false);
    expect(lessonScoreMeetsPercent(5, LINGMAN_EXAM_UNLOCK_LESSON_PERCENT)).toBe(true);
    expect(lessonScoreMeetsPercent(4.9, LINGMAN_EXAM_UNLOCK_LESSON_PERCENT)).toBe(false);
  });
});
