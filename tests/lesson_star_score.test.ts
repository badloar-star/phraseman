import { effectiveLessonStarScore } from '../app/lesson_star_score';

describe('effectiveLessonStarScore', () => {
  it('scores legacy progress arrays against the current 50-cell lesson cycle', () => {
    const progress = [
      ...new Array(50).fill('correct'),
      ...new Array(10).fill('empty'),
    ];

    expect(effectiveLessonStarScore(null, JSON.stringify(progress))).toEqual({
      score: 5,
      correctCount: 50,
    });
  });

  it('keeps best score when it is higher than progress-derived score', () => {
    const progress = [
      ...new Array(20).fill('correct'),
      ...new Array(30).fill('wrong'),
    ];

    expect(effectiveLessonStarScore('4.5', JSON.stringify(progress))).toEqual({
      score: 4.5,
      correctCount: 20,
    });
  });
});
