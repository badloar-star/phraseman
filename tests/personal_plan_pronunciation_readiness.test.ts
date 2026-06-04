import {
  buildBlockedPlanPronunciationScoringRequirement,
  validatePlanPronunciationScoringRequirement,
  type PlanPronunciationScoringRequirement,
} from '../app/personal_plan_pronunciation_readiness';

function readyRequirement(
  overrides: Partial<PlanPronunciationScoringRequirement> = {},
): PlanPronunciationScoringRequirement {
  return {
    id: 'pronunciation:gavan-day1:ready',
    exerciseId: 'gavan-day1-pronunciation',
    blockId: 'gavan-day1:block-pronunciation',
    contentUnitIds: ['gavan-day1-final-p1'],
    targetText: 'Hi, I am here.',
    status: 'ready',
    scorerId: 'pronunciation-scorer-openai-v1',
    scoringProvider: 'openai',
    scoringVersion: 'pronunciation-v1',
    resultFields: ['score', 'pronunciationScore', 'fluencyScore'],
    minimumConfidence: 0.75,
    finalScoringReady: true,
    ...overrides,
  };
}

describe('personal plan pronunciation scoring readiness', () => {
  it('allows blocked pronunciation requirements for authoring but keeps them out of production', () => {
    const requirement = buildBlockedPlanPronunciationScoringRequirement({
      exerciseId: 'gavan-day1-pronunciation',
      blockId: 'gavan-day1:block-pronunciation',
      contentUnitIds: ['gavan-day1-final-p1'],
      targetText: 'Hi, I am here.',
    });
    const result = validatePlanPronunciationScoringRequirement(requirement);

    expect(result.validForAuthoring).toBe(true);
    expect(result.productionReady).toBe(false);
    expect(result.issues).toEqual([]);
  });

  it('marks ready pronunciation scoring as production-ready only with concrete scorer metadata', () => {
    const result = validatePlanPronunciationScoringRequirement(readyRequirement());

    expect(result.validForAuthoring).toBe(true);
    expect(result.productionReady).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('fails ready pronunciation scoring without required final metadata', () => {
    const result = validatePlanPronunciationScoringRequirement(readyRequirement({
      scorerId: '',
      scoringProvider: 'unknown',
      scoringVersion: '',
      resultFields: [],
      minimumConfidence: 1.4,
      finalScoringReady: false,
    }));

    expect(result.productionReady).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'missing_pronunciation_scorer_id' }),
      expect.objectContaining({ code: 'missing_pronunciation_scoring_provider' }),
      expect.objectContaining({ code: 'missing_pronunciation_scoring_version' }),
      expect.objectContaining({ code: 'missing_pronunciation_result_fields' }),
      expect.objectContaining({ code: 'invalid_pronunciation_minimum_confidence' }),
      expect.objectContaining({ code: 'ready_pronunciation_not_marked_final' }),
    ]));
  });

  it('fails fake final scoring claims on blocked requirements', () => {
    const requirement = buildBlockedPlanPronunciationScoringRequirement({
      exerciseId: 'gavan-day1-pronunciation',
      blockId: 'gavan-day1:block-pronunciation',
      contentUnitIds: ['gavan-day1-final-p1'],
      targetText: 'Hi, I am here.',
    });

    expect(validatePlanPronunciationScoringRequirement({
      ...requirement,
      finalScoringReady: true,
    }).issues).toContainEqual(expect.objectContaining({
      code: 'fake_final_pronunciation_claim',
    }));
  });
});
