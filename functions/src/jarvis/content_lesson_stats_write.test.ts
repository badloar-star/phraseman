import { lessonStatsDocId, shouldRecordLessonScore, extractLessonScoreSample } from './content_lesson_stats_write';

describe('Jarvis content lesson stats write — decides when a lesson_complete event feeds the aggregate', () => {
  test('lesson_complete with a finite score in range should be recorded', () => {
    expect(shouldRecordLessonScore({ type: 'lesson_complete', payload: { lessonId: 3, score: 4.2 } })).toBe(true);
  });

  test('other event types never touch the aggregate', () => {
    expect(shouldRecordLessonScore({ type: 'quiz_answer', payload: { lessonId: 3, score: 4.2 } })).toBe(false);
  });

  test('missing or invalid lessonId is rejected', () => {
    expect(shouldRecordLessonScore({ type: 'lesson_complete', payload: { lessonId: 0, score: 4.2 } })).toBe(false);
    expect(shouldRecordLessonScore({ type: 'lesson_complete', payload: { score: 4.2 } })).toBe(false);
  });

  test('missing or out-of-range score is rejected — never fabricate a sample', () => {
    expect(shouldRecordLessonScore({ type: 'lesson_complete', payload: { lessonId: 3 } })).toBe(false);
    expect(shouldRecordLessonScore({ type: 'lesson_complete', payload: { lessonId: 3, score: -1 } })).toBe(false);
    expect(shouldRecordLessonScore({ type: 'lesson_complete', payload: { lessonId: 3, score: 6 } })).toBe(false);
  });

  test('extractLessonScoreSample pulls lessonId/target/score together', () => {
    expect(extractLessonScoreSample({ type: 'lesson_complete', payload: { lessonId: 7, score: 3.5, studyTarget: 'fr' } }))
      .toEqual({ lessonId: 7, target: 'fr', score: 3.5 });
  });

  test('extractLessonScoreSample defaults studyTarget to en', () => {
    expect(extractLessonScoreSample({ type: 'lesson_complete', payload: { lessonId: 7, score: 3.5 } }).target).toBe('en');
  });
});

describe('Jarvis content lesson stats write — doc id is stable and scoped by target', () => {
  test('same lesson, different target, different doc id', () => {
    expect(lessonStatsDocId(7, 'en')).not.toBe(lessonStatsDocId(7, 'fr'));
  });

  test('deterministic for the same input', () => {
    expect(lessonStatsDocId(7, 'en')).toBe(lessonStatsDocId(7, 'en'));
  });
});
