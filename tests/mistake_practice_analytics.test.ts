import {
  buildMistakePracticeAnalyticsPayload,
  MISTAKE_PRACTICE_ANALYTICS_SCHEMA_VERSION,
} from '../app/mistake_practice_analytics';

describe('mistake practice privacy-safe product analytics', () => {
  test('keeps bounded product dimensions without learning content', () => {
    const payload = buildMistakePracticeAnalyticsPayload({
      study_target: 'en',
      entry_source: 'cards',
      exercise_mode: 'lesson_typing',
      ready_count: 99_999,
      correct: true,
      phrase: 'private phrase',
      answer_text: 'private answer',
      transcript: 'private voice transcript',
      mistake_id: 'content-derived-id',
    });

    expect(payload.schema_version).toBe(MISTAKE_PRACTICE_ANALYTICS_SCHEMA_VERSION);
    expect(payload.event_id).toEqual(expect.any(String));
    expect(payload.ready_count).toBe(10_000);
    expect(payload).toMatchObject({
      study_target: 'en',
      entry_source: 'cards',
      exercise_mode: 'lesson_typing',
      correct: true,
    });
    expect(payload).not.toHaveProperty('phrase');
    expect(payload).not.toHaveProperty('answer_text');
    expect(payload).not.toHaveProperty('transcript');
    expect(payload).not.toHaveProperty('mistake_id');
  });
});
