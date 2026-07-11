import {
  initialSurveySubmissionState,
  reduceSurveySubmission,
  surveyRewardForDisplay,
} from '../app/survey_submission_state';

describe('survey submission state', () => {
  test('moves from editing to optimistic reward', () => {
    expect(
      reduceSurveySubmission(initialSurveySubmissionState, {
        type: 'submit_started',
        attemptId: 1,
        expectedReward: 3,
      }),
    ).toEqual({
      phase: 'optimistic-reward',
      attemptId: 1,
      expectedReward: 3,
      confirmedReward: 0,
      messageKey: null,
    });
  });

  test('reconciles the matching optimistic attempt', () => {
    const started = reduceSurveySubmission(initialSurveySubmissionState, {
      type: 'submit_started', attemptId: 1, expectedReward: 3,
    });

    expect(reduceSurveySubmission(started, {
      type: 'submit_succeeded', attemptId: 1, reward: 2,
    })).toEqual({
      phase: 'reconciled',
      attemptId: 1,
      expectedReward: 3,
      confirmedReward: 2,
      messageKey: null,
    });
  });

  test('turns a matching failure into a retryable error and clears rewards', () => {
    const started = reduceSurveySubmission(initialSurveySubmissionState, {
      type: 'submit_started', attemptId: 1, expectedReward: 3,
    });

    expect(reduceSurveySubmission(started, {
      type: 'submit_failed', attemptId: 1, messageKey: 'network',
    })).toEqual({
      phase: 'retryable-error',
      attemptId: 1,
      expectedReward: 0,
      confirmedReward: 0,
      messageKey: 'network',
    });
  });

  test('retry starts a new monotonic attempt', () => {
    const failed = {
      phase: 'retryable-error' as const,
      attemptId: 4,
      expectedReward: 0 as const,
      confirmedReward: 0 as const,
      messageKey: 'network' as const,
    };

    expect(reduceSurveySubmission(failed, {
      type: 'retry', expectedReward: 3,
    })).toEqual({
      phase: 'optimistic-reward',
      attemptId: 5,
      expectedReward: 3,
      confirmedReward: 0,
      messageKey: null,
    });
  });

  test.each(['submit_succeeded', 'submit_failed'] as const)(
    'returns the identical state object for stale %s',
    (type) => {
      const retried = {
        phase: 'optimistic-reward' as const,
        attemptId: 2,
        expectedReward: 3,
        confirmedReward: 0 as const,
        messageKey: null,
      };
      const action = type === 'submit_succeeded'
        ? { type, attemptId: 1, reward: 3 } as const
        : { type, attemptId: 1, messageKey: 'network' } as const;

      expect(reduceSurveySubmission(retried, action)).toBe(retried);
    },
  );

  test('selects expected reward before reconciliation and confirmed reward after it', () => {
    const optimistic = reduceSurveySubmission(initialSurveySubmissionState, {
      type: 'submit_started', attemptId: 1, expectedReward: 3,
    });
    const reconciled = reduceSurveySubmission(optimistic, {
      type: 'submit_succeeded', attemptId: 1, reward: 0,
    });

    expect(surveyRewardForDisplay(initialSurveySubmissionState)).toBe(0);
    expect(surveyRewardForDisplay(optimistic)).toBe(3);
    expect(surveyRewardForDisplay(reconciled)).toBe(0);
  });
});
