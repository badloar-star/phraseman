import {
  createLessonAnalyticsAttempt,
  lessonAttemptElapsedMs,
  markLessonAttemptStarted,
  markLessonAttemptTerminal,
} from '../app/lesson_analytics_attempt';

describe('lesson analytics attempt', () => {
  it('keeps one random identity and accepts start/terminal only once', () => {
    const attempt = createLessonAnalyticsAttempt(() => 'attempt-1', () => 1000);
    expect(attempt.id).toBe('attempt-1');
    expect(attempt.startedAtMs).toBe(1000);
    expect(markLessonAttemptStarted(attempt)).toBe(true);
    expect(markLessonAttemptStarted(attempt)).toBe(false);
    expect(markLessonAttemptTerminal(attempt, 'complete')).toBe(true);
    expect(markLessonAttemptTerminal(attempt, 'abandon')).toBe(false);
    expect(lessonAttemptElapsedMs(attempt, () => 1450)).toBe(450);
  });

  it('rejects an empty generated identity', () => {
    expect(() => createLessonAnalyticsAttempt(() => '  ', () => 1000)).toThrow('lesson_attempt_id');
  });
});
