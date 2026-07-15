import {
  buildLearningReviewAnswerPayload,
  classifyActualDelay,
  classifyDueStatus,
  deriveMasteryTransition,
  utcMondayWeekStartIso,
} from '../app/learning_review_analytics';

const DAY = 24 * 60 * 60 * 1000;

describe('learning review analytics semantics', () => {
  it.each([
    [DAY - 1, 'under_24h'],
    [DAY, 'd1_to_d6'],
    [7 * DAY - 1, 'd1_to_d6'],
    [7 * DAY, 'd7_to_d29'],
    [30 * DAY - 1, 'd7_to_d29'],
    [30 * DAY, 'd30_plus'],
  ])('classifies an actual delay of %i ms as %s', (delayMs, expected) => {
    expect(classifyActualDelay(delayMs)).toBe(expected);
  });

  it('marks corrupt or backwards timestamps as unknown', () => {
    expect(classifyActualDelay(-1)).toBe('unknown');
    expect(classifyActualDelay(Number.NaN)).toBe('unknown');
  });

  it.each([
    [-1, 'early'],
    [0, 'on_time'],
    [DAY - 1, 'overdue_under_1d'],
    [DAY, 'overdue_d1_to_d6'],
    [7 * DAY - 1, 'overdue_d1_to_d6'],
    [7 * DAY, 'overdue_d7_plus'],
  ])('classifies due offset %i ms as %s', (offsetMs, expected) => {
    expect(classifyDueStatus(offsetMs)).toBe(expected);
  });

  it('does not infer mastery from repetitions or a future interval', () => {
    expect(deriveMasteryTransition({
      previousState: undefined,
      correct: true,
      actualDelayBucket: 'd1_to_d6',
    })).toEqual({ previousState: 'learning', nextState: 'strengthening', transition: 'strengthened' });
  });

  it('requires observed delayed success for mastery and durable mastery', () => {
    expect(deriveMasteryTransition({
      previousState: 'strengthening',
      correct: true,
      actualDelayBucket: 'd7_to_d29',
    })).toEqual({ previousState: 'strengthening', nextState: 'mastered', transition: 'mastered' });
    expect(deriveMasteryTransition({
      previousState: 'mastered',
      correct: true,
      actualDelayBucket: 'd30_plus',
    })).toEqual({ previousState: 'mastered', nextState: 'durable_mastered', transition: 'durable_mastered' });
  });

  it('records a lapse but returns the stored state to learning', () => {
    expect(deriveMasteryTransition({
      previousState: 'durable_mastered',
      correct: false,
      actualDelayBucket: 'd30_plus',
    })).toEqual({ previousState: 'durable_mastered', nextState: 'learning', transition: 'lapsed' });
  });

  it('builds an explicit privacy-safe payload and ignores raw content', () => {
    const payload = buildLearningReviewAnswerPayload({
      eventId: 'attempt-1',
      reviewSessionId: 'session-1',
      reviewAttemptId: 'attempt-1',
      analyticsItemId: 'item-1',
      lessonId: 3,
      studyTarget: 'en',
      source: 'lesson',
      reviewMode: 'recall_type',
      contentVersion: undefined,
      correct: true,
      responseTimeMs: 999_999,
      actualDelayBucket: 'd7_to_d29',
      dueStatus: 'overdue_d1_to_d6',
      previousRepetitions: 2,
      nextRepetitions: 3,
      previousIntervalDays: 3,
      nextIntervalDays: 8,
      previousMasteryState: 'strengthening',
      nextMasteryState: 'mastered',
      masteryTransition: 'mastered',
      phrase: 'must never leave the device',
      rawAnswer: 'also forbidden',
    } as never);

    expect(payload).toEqual({
      schema_version: 1,
      event_id: 'attempt-1',
      review_session_id: 'session-1',
      review_attempt_id: 'attempt-1',
      analytics_item_id: 'item-1',
      lesson_id: 3,
      study_target: 'en',
      source: 'lesson',
      review_mode: 'recall_type',
      content_version: 'legacy_unknown',
      correct: 1,
      response_time_ms: 120_000,
      actual_delay_bucket: 'd7_to_d29',
      due_status: 'overdue_d1_to_d6',
      previous_repetitions: 2,
      next_repetitions: 3,
      previous_interval_days: 3,
      next_interval_days: 8,
      previous_mastery_state: 'strengthening',
      next_mastery_state: 'mastered',
      mastery_transition: 'mastered',
    });
    expect(JSON.stringify(payload)).not.toContain('phrase');
    expect(JSON.stringify(payload)).not.toContain('answer');
  });

  it('keeps the UTC Monday week stable across the December/January boundary', () => {
    expect(utcMondayWeekStartIso(Date.UTC(2025, 11, 31, 23, 59))).toBe('2025-12-29');
    expect(utcMondayWeekStartIso(Date.UTC(2026, 0, 1, 0, 1))).toBe('2025-12-29');
    expect(utcMondayWeekStartIso(Date.UTC(2026, 0, 5, 12))).toBe('2026-01-05');
  });
});
