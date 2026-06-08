import {
  startPlanExerciseSession,
  submitPlanExerciseAnswer,
} from '../app/personal_plan_exercise_session';
import type { PlanExerciseBlock } from '../app/personal_plan_engine_contracts';

function block(overrides: Partial<PlanExerciseBlock> = {}): PlanExerciseBlock {
  return {
    id: 'block_1',
    planId: 'gavan',
    dayIndex: 1,
    type: 'plan_phrase_build',
    title: 'Build the useful phrase',
    contentUnitIds: ['unit_1'],
    estimatedMinutes: 3,
    requiredFor: [5, 10, 15, 20],
    prerequisiteLessonIds: [1],
    progressPolicy: 'correct_only',
    recoveryPolicy: 'return_wrong_to_recall_and_trainer',
    ...overrides,
  };
}

function startedSession(overrides: Partial<PlanExerciseBlock> = {}) {
  const result = startPlanExerciseSession(block(overrides), {
    planInstanceId: 'instance_1',
    startedAt: '2026-06-01T00:00:00.000Z',
    sessionId: 'session_1',
  });
  if (!result.session) throw new Error(`Session did not start: ${result.issues.join(', ')}`);
  return result.session;
}

describe('personal plan exercise session contracts', () => {
  it('starts valid sessions for the first renderer types', () => {
    expect(startPlanExerciseSession(block({ type: 'plan_phrase_build' }), {
      planInstanceId: 'instance_1',
    }).issues).toEqual([]);
    expect(startPlanExerciseSession(block({ type: 'plan_missing_word' }), {
      planInstanceId: 'instance_1',
    }).issues).toEqual([]);
    expect(startPlanExerciseSession(block({ type: 'plan_choose_natural_phrase' }), {
      planInstanceId: 'instance_1',
    }).issues).toEqual([]);
  });

  it('blocks unsupported renderer types before any attempt event is created', () => {
    const result = startPlanExerciseSession(block({
      type: 'plan_quiz',
    }), {
      planInstanceId: 'instance_1',
    });

    expect(result.session).toBeUndefined();
    expect(result.issues).toEqual(['missing_renderer_contract']);
  });

  it('creates a progress-eligible attempt for a correct answer', () => {
    const result = submitPlanExerciseAnswer(startedSession(), {
      result: 'correct',
      contentUnitId: 'unit_1',
      expectedAnswer: "I'm here.",
      selectedAnswer: "I'm here.",
      grammarTags: ['to-be'],
      vocabularyTags: ['arrival'],
      occurredAt: '2026-06-01T00:01:00.000Z',
    });

    expect(result.progressEligible).toBe(true);
    expect(result.explanationTrigger).toBe('correct');
    expect(result.recoveryActions).toEqual([]);
    expect(result.attempt).toEqual(expect.objectContaining({
      planInstanceId: 'instance_1',
      result: 'correct',
      selectedAnswerKnown: true,
    }));
  });

  it('creates recovery actions and no progress for a wrong answer', () => {
    const result = submitPlanExerciseAnswer(startedSession(), {
      result: 'wrong',
      contentUnitId: 'unit_1',
      expectedAnswer: "I'm here.",
      selectedAnswer: 'I here',
      grammarTags: ['to-be'],
      vocabularyTags: ['arrival'],
      mistakeTags: ['missing-verb'],
    });

    expect(result.progressEligible).toBe(false);
    expect(result.explanationTrigger).toBe('wrong');
    expect(result.recoveryActions.map((action) => action.target)).toEqual([
      'recall',
      'trainer',
      'mistake_analytics',
    ]);
  });

  it('keeps selectedAnswerKnown false when no real selected answer exists', () => {
    const result = submitPlanExerciseAnswer(startedSession(), {
      result: 'wrong',
      contentUnitId: 'unit_1',
      expectedAnswer: "I'm here.",
      selectedAnswer: ' ',
    });

    expect(result.attempt.selectedAnswerKnown).toBe(false);
    expect(result.attempt.selectedAnswer).toBeUndefined();
    expect(result.recoveryActions.every((action) => action.selectedAnswerKnown === false)).toBe(true);
  });

  it('stores safe pronunciation recording metadata through the attempt event', () => {
    const result = submitPlanExerciseAnswer(startedSession({
      type: 'plan_pronunciation_repeat',
      progressPolicy: 'completion_only',
      recoveryPolicy: 'none',
    }), {
      result: 'completed',
      contentUnitId: 'unit_1',
      expectedAnswer: "I'm here.",
      selectedAnswer: null,
      grammarTags: ['to-be'],
      vocabularyTags: ['presence'],
      payload: {
        recordingUri: 'file:///tmp/phrase.m4a',
        durationMs: 1800,
        userPlayedRecording: false,
        scoringAvailable: true,
        transcript: "I'm here",
        score: 96,
        passed: true,
        threshold: 90,
      },
    });

    expect(result.progressEligible).toBe(true);
    expect(result.attempt.sanitizedPayload).toEqual({
      recordingUri: 'file:///tmp/phrase.m4a',
      durationMs: 1800,
      userPlayedRecording: false,
      scoringAvailable: true,
      transcript: "I'm here",
      score: 96,
      passed: true,
      threshold: 90,
    });
  });
});
