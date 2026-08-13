import {
  buildPracticePronunciationAttempt,
  buildScoredPronunciationAttempt,
  validatePlanPronunciationAttempt,
  validatePlanPronunciationClaim,
  type PlanPronunciationAttempt,
} from '../app/personal_plan_pronunciation_attempt';

const baseAttemptInput = {
  id: 'pronunciation_attempt_1',
  planInstanceId: 'plan_instance_1',
  planId: 'gavan' as const,
  dayIndex: 2,
  blockId: 'gavan-week1-day2:block-pronunciation',
  contentUnitId: 'gavan-w1-d2-p1',
  targetText: 'Could you repeat that?',
  occurredAt: '2026-06-01T10:00:00.000Z',
};

describe('personal plan pronunciation attempt contract', () => {
  it('stores practice pronunciation recording metadata without requiring a score', () => {
    const attempt = buildPracticePronunciationAttempt({
      ...baseAttemptInput,
      recordingId: 'recording_1',
      recordingUri: 'local://recording_1.m4a',
      recordingDurationMs: 1800,
    });

    const result = validatePlanPronunciationAttempt(attempt);

    expect(attempt).toEqual(expect.objectContaining({
      mode: 'practice',
      status: 'recorded',
      progressEligible: true,
      progressPenaltyAllowed: false,
    }));
    expect(attempt.score).toBeUndefined();
    expect(result.validForPractice).toBe(true);
    expect(result.validForScoring).toBe(false);
    expect(result.issues).toEqual([]);
  });

  it('requires scoring engine version confidence and score for scored pronunciation attempts', () => {
    const missingScoring: PlanPronunciationAttempt = {
      ...buildPracticePronunciationAttempt({
        ...baseAttemptInput,
        recordingId: 'recording_2',
        recordingUri: 'local://recording_2.m4a',
        recordingDurationMs: 1900,
      }),
      mode: 'scored',
    };

    expect(validatePlanPronunciationAttempt(missingScoring).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'scored_mode_missing_engine' }),
      expect.objectContaining({ code: 'scored_mode_missing_version' }),
      expect.objectContaining({ code: 'scored_mode_missing_confidence' }),
      expect.objectContaining({ code: 'scored_mode_missing_score' }),
    ]));

    const scored = buildScoredPronunciationAttempt({
      ...baseAttemptInput,
      id: 'pronunciation_attempt_scored',
      recordingId: 'recording_3',
      recordingUri: 'local://recording_3.m4a',
      recordingDurationMs: 2100,
      recognitionProvider: 'openai',
      recognitionConfidence: 0.91,
      scoringProvider: 'openai',
      scoringVersion: 'pronunciation-v1',
      score: 84,
    });

    const result = validatePlanPronunciationAttempt(scored);

    expect(scored).toEqual(expect.objectContaining({
      mode: 'scored',
      status: 'scored',
      progressEligible: true,
      progressPenaltyAllowed: true,
    }));
    expect(result.validForScoring).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('does not allow low recognition confidence to penalize progress', () => {
    const lowConfidence = buildScoredPronunciationAttempt({
      ...baseAttemptInput,
      id: 'pronunciation_attempt_low_confidence',
      recordingId: 'recording_4',
      recordingUri: 'local://recording_4.m4a',
      recordingDurationMs: 1600,
      recognitionProvider: 'openai',
      recognitionConfidence: 0.42,
      scoringProvider: 'openai',
      scoringVersion: 'pronunciation-v1',
      score: 23,
      progressPenaltyAllowed: true,
    });

    expect(lowConfidence.progressEligible).toBe(false);
    expect(lowConfidence.progressPenaltyAllowed).toBe(false);
    expect(validatePlanPronunciationAttempt({
      ...lowConfidence,
      progressPenaltyAllowed: true,
    }).issues).toContainEqual(expect.objectContaining({
      code: 'low_confidence_progress_penalty',
    }));
  });

  it('blocks exact pronunciation score promises when scoring is not available', () => {
    expect(validatePlanPronunciationClaim({
      id: 'claim_safe',
      text: 'Запиши фразу и сравни с образцом.',
      requiresScoring: false,
    }, { scoringAvailable: false }).issues).toEqual([]);

    expect(validatePlanPronunciationClaim({
      id: 'claim_safe_no_score_yet',
      text: 'Здесь пока нет автоматической оценки, поэтому просто послушай запись сам.',
      requiresScoring: false,
    }, { scoringAvailable: false }).issues).toEqual([]);

    expect(validatePlanPronunciationClaim({
      id: 'claim_fake',
      text: 'Получишь точную оценку произношения в процентах.',
      requiresScoring: true,
    }, { scoringAvailable: false }).issues).toContainEqual(expect.objectContaining({
      code: 'fake_exact_scoring_claim',
    }));
  });

  it('blocks real Russian exact scoring promises, not only explicit requiresScoring flag', () => {
    expect(validatePlanPronunciationClaim({
      id: 'claim_safe_ru',
      text: 'Повтори фразу и сравни звучание с примером.',
      requiresScoring: false,
    }, { scoringAvailable: false }).issues).toEqual([]);

    expect(validatePlanPronunciationClaim({
      id: 'claim_fake_ru',
      text: 'Покажем идеальную оценку произношения в баллах.',
      requiresScoring: false,
    }, { scoringAvailable: false }).issues).toContainEqual(expect.objectContaining({
      code: 'fake_exact_scoring_claim',
    }));
  });

  it('requires an explicit reason for failed or empty recordings', () => {
    expect(validatePlanPronunciationAttempt(buildPracticePronunciationAttempt({
      ...baseAttemptInput,
      id: 'pronunciation_attempt_empty',
      recordingId: '',
      recordingUri: '',
      recordingDurationMs: 0,
    })).issues).toContainEqual(expect.objectContaining({
      code: 'empty_recording_without_reason',
    }));

    expect(validatePlanPronunciationAttempt({
      ...buildPracticePronunciationAttempt({
        ...baseAttemptInput,
        id: 'pronunciation_attempt_failed',
        recordingId: 'recording_failed',
        recordingUri: 'local://recording_failed.m4a',
        recordingDurationMs: 1000,
      }),
      status: 'failed',
    }).issues).toContainEqual(expect.objectContaining({
      code: 'failed_attempt_without_reason',
    }));
  });

  it('removes sensitive text from stored pronunciation payloads', () => {
    const attempt = buildPracticePronunciationAttempt({
      ...baseAttemptInput,
      recordingId: 'recording_private',
      recordingUri: 'local://recording_private.m4a',
      recordingDurationMs: 1700,
      payload: {
        hint: 'quiet room',
        email: 'alex@example.com',
        phone: '+353 123456789',
        detail: 'card number 123456789',
      },
    });

    expect(JSON.stringify(attempt)).not.toContain('alex@example.com');
    expect(JSON.stringify(attempt)).not.toContain('123456789');
    expect(attempt.sanitizedPayload).toEqual({ hint: 'quiet room' });
    expect(validatePlanPronunciationAttempt(attempt).issues).toEqual([]);
  });
});
