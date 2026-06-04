import {
  PLAN_EXERCISE_RENDERER_CONTRACTS,
  planExerciseRendererContractForType,
  validatePlanExerciseRendererContract,
} from '../app/personal_plan_exercise_renderer_contracts';
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

describe('personal plan exercise renderer contracts', () => {
  it('defines the first seven renderer contracts before UI work starts', () => {
    expect(PLAN_EXERCISE_RENDERER_CONTRACTS.map((contract) => contract.type)).toEqual([
      'plan_phrase_build',
      'plan_missing_word',
      'plan_choose_natural_phrase',
      'plan_listen_choose',
      'plan_listen_build',
      'plan_pronunciation_repeat',
      'plan_phrase_recall',
    ]);
    expect(PLAN_EXERCISE_RENDERER_CONTRACTS.every((contract) => contract.explanationRequired)).toBe(true);
    expect(PLAN_EXERCISE_RENDERER_CONTRACTS.every((contract) => !contract.highlightsCorrectWordsDuringPlanPractice)).toBe(true);
  });

  it('requires a premium visual shell for every plan exercise renderer', () => {
    expect(PLAN_EXERCISE_RENDERER_CONTRACTS.map((contract) => contract.visualShell.role)).toEqual([
      'lesson_shell',
      'precision_gap',
      'natural_choice',
      'audio_choice',
      'audio_builder',
      'voice_self_check',
      'active_recall',
    ]);

    expect(PLAN_EXERCISE_RENDERER_CONTRACTS.every((contract) => (
      contract.visualShell.primaryActionSize === 'large'
      && contract.visualShell.feedbackSurface === 'liquid_panel'
      && contract.visualShell.usesThemeAccentOnly === true
      && contract.visualShell.iconName.length > 0
    ))).toBe(true);
  });

  it('keeps plan_phrase_build on the lesson builder shell but under plan rules', () => {
    const contract = planExerciseRendererContractForType('plan_phrase_build');

    expect(contract).toEqual(expect.objectContaining({
      answerKind: 'word_bank',
      usesLessonBuilderShell: true,
      requiredProgressPolicy: 'correct_only',
      highlightsCorrectWordsDuringPlanPractice: false,
    }));
  });

  it('accepts valid renderer blocks for the first seven exercise types', () => {
    expect(validatePlanExerciseRendererContract(block({ type: 'plan_phrase_build' }))).toEqual([]);
    expect(validatePlanExerciseRendererContract(block({ type: 'plan_missing_word' }))).toEqual([]);
    expect(validatePlanExerciseRendererContract(block({ type: 'plan_choose_natural_phrase' }))).toEqual([]);
    expect(validatePlanExerciseRendererContract(block({ type: 'plan_listen_choose' }))).toEqual([]);
    expect(validatePlanExerciseRendererContract(block({ type: 'plan_listen_build' }))).toEqual([]);
    expect(validatePlanExerciseRendererContract(block({
      type: 'plan_pronunciation_repeat',
      progressPolicy: 'completion_only',
      recoveryPolicy: 'none',
    }))).toEqual([]);
    expect(validatePlanExerciseRendererContract(block({
      type: 'plan_phrase_recall',
      recoveryPolicy: 'return_wrong_to_recall',
    }))).toEqual([]);
  });

  it('rejects renderer blocks without content units or honest recovery policy', () => {
    expect(validatePlanExerciseRendererContract(block({
      contentUnitIds: [],
      recoveryPolicy: 'none',
    }))).toEqual(expect.arrayContaining([
      'missing_content_units',
      'wrong_recovery_policy',
    ]));
  });

  it('rejects wrong progress policy for plan practice renderers', () => {
    expect(validatePlanExerciseRendererContract(block({
      progressPolicy: 'completion_only',
    }))).toContain('wrong_progress_policy');
  });

  it('does not pretend unsupported exercise types have renderers', () => {
    expect(validatePlanExerciseRendererContract(block({
      type: 'plan_quiz',
    }))).toEqual(['missing_renderer_contract']);
  });
});
