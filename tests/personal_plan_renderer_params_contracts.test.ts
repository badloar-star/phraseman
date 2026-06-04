import {
  buildPlanChooseNaturalPhraseRendererParams,
  buildPlanMissingWordRendererParams,
} from '../app/personal_plan_renderer_params_contracts';
import type { PlanExerciseBlock } from '../app/personal_plan_engine_contracts';

function block(type: PlanExerciseBlock['type'], overrides: Partial<PlanExerciseBlock> = {}): PlanExerciseBlock {
  return {
    id: 'block_1',
    planId: 'gavan',
    dayIndex: 1,
    type,
    title: 'Useful phrase',
    contentUnitIds: ['unit_1', 'unit_2'],
    estimatedMinutes: 3,
    requiredFor: [5, 10, 15, 20],
    prerequisiteLessonIds: [1],
    progressPolicy: 'correct_only',
    recoveryPolicy: 'return_wrong_to_recall_and_trainer',
    ...overrides,
  };
}

describe('personal plan renderer params contracts', () => {
  it('builds params for missing-word renderer', () => {
    expect(buildPlanMissingWordRendererParams(block('plan_missing_word'), ' instance_1 ')).toEqual({
      issues: [],
      params: expect.objectContaining({
        source: 'personal_plan',
        rendererType: 'plan_missing_word',
        planInstanceId: 'instance_1',
        blockId: 'block_1',
        contentUnitIds: ['unit_1', 'unit_2'],
        answerKind: 'single_missing_word',
        requiredContentUnitCount: 2,
        explanationRequired: true,
        recoveryEnabled: true,
        allowCorrectWordHighlighting: false,
      }),
    });
  });

  it('builds params for choose-natural-phrase renderer', () => {
    expect(buildPlanChooseNaturalPhraseRendererParams(block('plan_choose_natural_phrase'), 'instance_1')).toEqual({
      issues: [],
      params: expect.objectContaining({
        rendererType: 'plan_choose_natural_phrase',
        answerKind: 'single_choice',
        explanationRequired: true,
        recoveryEnabled: true,
        allowCorrectWordHighlighting: false,
      }),
    });
  });

  it('rejects wrong exercise type for each renderer builder', () => {
    expect(buildPlanMissingWordRendererParams(block('plan_choose_natural_phrase'), 'instance_1')).toEqual({
      issues: ['wrong_exercise_type'],
    });
    expect(buildPlanChooseNaturalPhraseRendererParams(block('plan_missing_word'), 'instance_1')).toEqual({
      issues: ['wrong_exercise_type'],
    });
  });

  it('rejects missing content units and missing plan instance id', () => {
    expect(buildPlanMissingWordRendererParams(block('plan_missing_word', {
      contentUnitIds: [],
    }), ' ')).toEqual({
      issues: ['missing_content_units', 'missing_plan_instance_id'],
    });
  });

  it('turns recovery off only when policy is none', () => {
    expect(buildPlanChooseNaturalPhraseRendererParams(block('plan_choose_natural_phrase', {
      recoveryPolicy: 'none',
    }), 'instance_1').params).toEqual(expect.objectContaining({
      recoveryEnabled: false,
    }));
  });

  it('keeps correct-word highlighting disabled', () => {
    expect(buildPlanMissingWordRendererParams(block('plan_missing_word'), 'instance_1').params)
      .toEqual(expect.objectContaining({
        allowCorrectWordHighlighting: false,
      }));
  });
});
