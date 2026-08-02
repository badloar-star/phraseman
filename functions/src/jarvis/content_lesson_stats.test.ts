import { applyLessonScoreSample, LESSON_STATS_WINDOW } from './content_lesson_stats';

describe('Jarvis content lesson stats — rolling average over a bounded window', () => {
  test('first sample seeds the window with itself', () => {
    const next = applyLessonScoreSample(null, 4.5);
    expect(next.sampleCount).toBe(1);
    expect(next.recentScores).toEqual([4.5]);
    expect(next.averageScore).toBe(4.5);
  });

  test('accumulates samples and recomputes the average', () => {
    let stats = applyLessonScoreSample(null, 4);
    stats = applyLessonScoreSample(stats, 2);
    expect(stats.sampleCount).toBe(2);
    expect(stats.averageScore).toBe(3);
  });

  test('window never exceeds LESSON_STATS_WINDOW — oldest sample drops off', () => {
    let stats: ReturnType<typeof applyLessonScoreSample> | null = null;
    for (let i = 0; i < LESSON_STATS_WINDOW + 5; i += 1) {
      stats = applyLessonScoreSample(stats, 3);
    }
    expect(stats!.recentScores).toHaveLength(LESSON_STATS_WINDOW);
    // зачем: sampleCount — счётчик ВСЕХ попыток за всё время (не усечённый),
    // recentScores — только скользящее окно для среднего. Разные назначения.
    expect(stats!.sampleCount).toBe(LESSON_STATS_WINDOW + 5);
  });

  test('a non-finite or out-of-range score is rejected, not silently coerced', () => {
    const stats = applyLessonScoreSample(null, 4);
    expect(() => applyLessonScoreSample(stats, NaN)).toThrow();
    expect(() => applyLessonScoreSample(stats, -1)).toThrow();
    expect(() => applyLessonScoreSample(stats, 6)).toThrow();
  });

  test.each([0, 5])('boundary scores %d are accepted', (score) => {
    expect(() => applyLessonScoreSample(null, score)).not.toThrow();
  });
});
