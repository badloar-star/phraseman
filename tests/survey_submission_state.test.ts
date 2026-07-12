import {
  initialSurveySubmissionState,
  reduceSurveySubmission,
  surveyRewardForDisplay,
} from '../app/survey_submission_state';

describe('survey submission state', () => {
  test.each(['account_changed', 'rate_limited', 'unknown_survey', 'unavailable', 'auth', 'network', 'server', 'unknown'] as const)(
    'preserves the distinct %s error family for localized retry guidance',
    (messageKey) => {
      const started = reduceSurveySubmission(initialSurveySubmissionState, {
        type: 'submit_started', attemptId: 1, expectedReward: 3,
      });
      expect(reduceSurveySubmission(started, {
        type: 'submit_failed', attemptId: 1, messageKey,
      })).toMatchObject({ phase: 'retryable-error', messageKey });
    },
  );
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

  test('ignores success unless a matching attempt is optimistic', () => {
    const editing = initialSurveySubmissionState;
    const optimistic = reduceSurveySubmission(editing, {
      type: 'submit_started', attemptId: 1, expectedReward: 3,
    });
    const reconciled = reduceSurveySubmission(optimistic, {
      type: 'submit_succeeded', attemptId: 1, reward: 3,
    });

    expect(reduceSurveySubmission(editing, {
      type: 'submit_succeeded', attemptId: 0, reward: 3,
    })).toBe(editing);
    expect(reduceSurveySubmission(reconciled, {
      type: 'submit_succeeded', attemptId: 1, reward: 3,
    })).toBe(reconciled);
    expect(reduceSurveySubmission(reconciled, {
      type: 'submit_failed', attemptId: 1, messageKey: 'network',
    })).toBe(reconciled);
  });

  test.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, 1.5])(
    'ignores a non-increasing or unsafe submit attempt id %s',
    (attemptId) => {
      expect(reduceSurveySubmission(initialSurveySubmissionState, {
        type: 'submit_started', attemptId, expectedReward: 3,
      })).toBe(initialSurveySubmissionState);
    },
  );

  test('ignores submit attempts that do not increase the current attempt id', () => {
    const optimistic = reduceSurveySubmission(initialSurveySubmissionState, {
      type: 'submit_started', attemptId: 2, expectedReward: 3,
    });

    expect(reduceSurveySubmission(optimistic, {
      type: 'submit_started', attemptId: 2, expectedReward: 3,
    })).toBe(optimistic);
    expect(reduceSurveySubmission(optimistic, {
      type: 'submit_started', attemptId: 1, expectedReward: 3,
    })).toBe(optimistic);
  });

  test.each([-1, Number.NaN, Number.POSITIVE_INFINITY, 1.5])(
    'ignores invalid expected reward %s',
    (expectedReward) => {
      expect(reduceSurveySubmission(initialSurveySubmissionState, {
        type: 'submit_started', attemptId: 1, expectedReward,
      })).toBe(initialSurveySubmissionState);
    },
  );

  test.each([-1, Number.NaN, Number.POSITIVE_INFINITY, 1.5])(
    'ignores invalid confirmed reward %s',
    (reward) => {
      const optimistic = reduceSurveySubmission(initialSurveySubmissionState, {
        type: 'submit_started', attemptId: 1, expectedReward: 3,
      });

      expect(reduceSurveySubmission(optimistic, {
        type: 'submit_succeeded', attemptId: 1, reward,
      })).toBe(optimistic);
    },
  );

  test('keeps the retryable error when no safe next attempt id exists', () => {
    const exhausted = {
      phase: 'retryable-error' as const,
      attemptId: Number.MAX_SAFE_INTEGER,
      expectedReward: 0 as const,
      confirmedReward: 0 as const,
      messageKey: 'network' as const,
    };

    expect(reduceSurveySubmission(exhausted, {
      type: 'retry', expectedReward: 3,
    })).toBe(exhausted);
  });
});
