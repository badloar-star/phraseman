import {
  TOURNAMENT_TASK_FEEDBACK_MS,
  TOURNAMENT_TASK_READING_MS,
  TOURNAMENT_TASK_SUBMISSION_GRACE_MS,
  tournamentRoundTaskSchedule,
} from './tournament_core';

describe('speed_match authoritative answer window', () => {
  it('reserves exactly 30 seconds for the full cycle and 25.5 seconds for answers', () => {
    const startedAtMs = 1_000_000;
    const timing = tournamentRoundTaskSchedule([
      { taskId: 'speed-pairs', mode: 'speed_match' },
    ], startedAtMs)[0];

    expect(timing.feedbackEndsAtMs! - timing.startsAtMs).toBe(30_000);
    expect(timing.readingEndsAtMs! - timing.startsAtMs).toBe(TOURNAMENT_TASK_READING_MS);
    expect(timing.answerDeadlineAtMs! - timing.readingEndsAtMs!).toBe(25_500);
    expect(timing.feedbackStartsAtMs! - timing.answerDeadlineAtMs!)
      .toBe(TOURNAMENT_TASK_SUBMISSION_GRACE_MS);
    expect(timing.feedbackEndsAtMs! - timing.feedbackStartsAtMs!)
      .toBe(TOURNAMENT_TASK_FEEDBACK_MS);
  });
});
