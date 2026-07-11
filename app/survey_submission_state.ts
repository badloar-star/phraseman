export type SurveySubmitErrorKey = 'network' | 'auth' | 'server' | 'unknown';

export type SurveySubmissionState =
  | { phase: 'editing'; attemptId: number; expectedReward: 0; confirmedReward: 0; messageKey: null }
  | { phase: 'optimistic-reward'; attemptId: number; expectedReward: number; confirmedReward: 0; messageKey: null }
  | { phase: 'reconciled'; attemptId: number; expectedReward: number; confirmedReward: number; messageKey: null }
  | { phase: 'retryable-error'; attemptId: number; expectedReward: 0; confirmedReward: 0; messageKey: SurveySubmitErrorKey };

export type SurveySubmissionAction =
  | { type: 'submit_started'; attemptId: number; expectedReward: number }
  | { type: 'submit_succeeded'; attemptId: number; reward: number }
  | { type: 'submit_failed'; attemptId: number; messageKey: SurveySubmitErrorKey }
  | { type: 'retry'; expectedReward: number };

export const initialSurveySubmissionState: SurveySubmissionState = {
  phase: 'editing',
  attemptId: 0,
  expectedReward: 0,
  confirmedReward: 0,
  messageKey: null,
};

export function reduceSurveySubmission(
  state: SurveySubmissionState,
  action: SurveySubmissionAction,
): SurveySubmissionState {
  switch (action.type) {
    case 'submit_started':
      return {
        phase: 'optimistic-reward',
        attemptId: action.attemptId,
        expectedReward: action.expectedReward,
        confirmedReward: 0,
        messageKey: null,
      };
    case 'retry':
      return {
        phase: 'optimistic-reward',
        attemptId: state.attemptId + 1,
        expectedReward: action.expectedReward,
        confirmedReward: 0,
        messageKey: null,
      };
    case 'submit_succeeded':
      if (action.attemptId !== state.attemptId) return state;
      return {
        phase: 'reconciled',
        attemptId: state.attemptId,
        expectedReward: state.expectedReward,
        confirmedReward: action.reward,
        messageKey: null,
      };
    case 'submit_failed':
      if (action.attemptId !== state.attemptId) return state;
      return {
        phase: 'retryable-error',
        attemptId: state.attemptId,
        expectedReward: 0,
        confirmedReward: 0,
        messageKey: action.messageKey,
      };
  }
}

export function surveyRewardForDisplay(state: SurveySubmissionState): number {
  return state.phase === 'reconciled' ? state.confirmedReward : state.expectedReward;
}
