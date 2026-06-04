import type {
  PlanExerciseBlock,
  PlanExerciseProgressPolicy,
  PlanExerciseRecoveryPolicy,
  PlanExerciseType,
} from './personal_plan_engine_contracts';

export type PlanExerciseAnswerKind =
  | 'word_bank'
  | 'single_missing_word'
  | 'single_choice'
  | 'audio_single_choice'
  | 'audio_word_bank'
  | 'spoken_repeat_self_check'
  | 'typed_phrase_recall';

export type PlanExerciseVisualRole =
  | 'lesson_shell'
  | 'precision_gap'
  | 'natural_choice'
  | 'audio_choice'
  | 'audio_builder'
  | 'voice_self_check'
  | 'active_recall';

export type PlanExerciseVisualShell = {
  role: PlanExerciseVisualRole;
  iconName: string;
  primaryActionSize: 'large';
  feedbackSurface: 'liquid_panel';
  usesThemeAccentOnly: true;
};

export type PlanExerciseRendererContract = {
  type: PlanExerciseType;
  answerKind: PlanExerciseAnswerKind;
  requiresContentUnits: boolean;
  requiredProgressPolicy: PlanExerciseProgressPolicy;
  allowedRecoveryPolicies: PlanExerciseRecoveryPolicy[];
  explanationRequired: boolean;
  usesLessonBuilderShell: boolean;
  highlightsCorrectWordsDuringPlanPractice: boolean;
  visualShell: PlanExerciseVisualShell;
};

export type PlanExerciseRendererContractIssue =
  | 'missing_renderer_contract'
  | 'missing_content_units'
  | 'wrong_progress_policy'
  | 'wrong_recovery_policy'
  | 'missing_explanation_requirement'
  | 'correct_word_highlighting_not_allowed';

export const PLAN_EXERCISE_RENDERER_CONTRACTS: PlanExerciseRendererContract[] = [
  {
    type: 'plan_phrase_build',
    answerKind: 'word_bank',
    requiresContentUnits: true,
    requiredProgressPolicy: 'correct_only',
    allowedRecoveryPolicies: ['return_wrong_to_recall', 'return_wrong_to_recall_and_trainer'],
    explanationRequired: true,
    usesLessonBuilderShell: true,
    highlightsCorrectWordsDuringPlanPractice: false,
    visualShell: {
      role: 'lesson_shell',
      iconName: 'book-outline',
      primaryActionSize: 'large',
      feedbackSurface: 'liquid_panel',
      usesThemeAccentOnly: true,
    },
  },
  {
    type: 'plan_missing_word',
    answerKind: 'single_missing_word',
    requiresContentUnits: true,
    requiredProgressPolicy: 'correct_only',
    allowedRecoveryPolicies: ['return_wrong_to_recall', 'return_wrong_to_recall_and_trainer'],
    explanationRequired: true,
    usesLessonBuilderShell: false,
    highlightsCorrectWordsDuringPlanPractice: false,
    visualShell: {
      role: 'precision_gap',
      iconName: 'create-outline',
      primaryActionSize: 'large',
      feedbackSurface: 'liquid_panel',
      usesThemeAccentOnly: true,
    },
  },
  {
    type: 'plan_choose_natural_phrase',
    answerKind: 'single_choice',
    requiresContentUnits: true,
    requiredProgressPolicy: 'correct_only',
    allowedRecoveryPolicies: ['return_wrong_to_recall', 'return_wrong_to_recall_and_trainer'],
    explanationRequired: true,
    usesLessonBuilderShell: false,
    highlightsCorrectWordsDuringPlanPractice: false,
    visualShell: {
      role: 'natural_choice',
      iconName: 'chatbubble-ellipses-outline',
      primaryActionSize: 'large',
      feedbackSurface: 'liquid_panel',
      usesThemeAccentOnly: true,
    },
  },
  {
    type: 'plan_listen_choose',
    answerKind: 'audio_single_choice',
    requiresContentUnits: true,
    requiredProgressPolicy: 'correct_only',
    allowedRecoveryPolicies: ['return_wrong_to_recall', 'return_wrong_to_recall_and_trainer'],
    explanationRequired: true,
    usesLessonBuilderShell: false,
    highlightsCorrectWordsDuringPlanPractice: false,
    visualShell: {
      role: 'audio_choice',
      iconName: 'volume-high-outline',
      primaryActionSize: 'large',
      feedbackSurface: 'liquid_panel',
      usesThemeAccentOnly: true,
    },
  },
  {
    type: 'plan_listen_build',
    answerKind: 'audio_word_bank',
    requiresContentUnits: true,
    requiredProgressPolicy: 'correct_only',
    allowedRecoveryPolicies: ['return_wrong_to_recall', 'return_wrong_to_recall_and_trainer'],
    explanationRequired: true,
    usesLessonBuilderShell: false,
    highlightsCorrectWordsDuringPlanPractice: false,
    visualShell: {
      role: 'audio_builder',
      iconName: 'musical-notes-outline',
      primaryActionSize: 'large',
      feedbackSurface: 'liquid_panel',
      usesThemeAccentOnly: true,
    },
  },
  {
    type: 'plan_pronunciation_repeat',
    answerKind: 'spoken_repeat_self_check',
    requiresContentUnits: true,
    requiredProgressPolicy: 'completion_only',
    allowedRecoveryPolicies: ['none'],
    explanationRequired: true,
    usesLessonBuilderShell: false,
    highlightsCorrectWordsDuringPlanPractice: false,
    visualShell: {
      role: 'voice_self_check',
      iconName: 'mic-outline',
      primaryActionSize: 'large',
      feedbackSurface: 'liquid_panel',
      usesThemeAccentOnly: true,
    },
  },
  {
    type: 'plan_phrase_recall',
    answerKind: 'typed_phrase_recall',
    requiresContentUnits: true,
    requiredProgressPolicy: 'correct_only',
    allowedRecoveryPolicies: ['return_wrong_to_recall', 'return_wrong_to_recall_and_trainer'],
    explanationRequired: true,
    usesLessonBuilderShell: false,
    highlightsCorrectWordsDuringPlanPractice: false,
    visualShell: {
      role: 'active_recall',
      iconName: 'refresh-outline',
      primaryActionSize: 'large',
      feedbackSurface: 'liquid_panel',
      usesThemeAccentOnly: true,
    },
  },
];

export function planExerciseRendererContractForType(
  type: PlanExerciseType,
): PlanExerciseRendererContract | undefined {
  return PLAN_EXERCISE_RENDERER_CONTRACTS.find((contract) => contract.type === type);
}

export function validatePlanExerciseRendererContract(
  block: PlanExerciseBlock,
): PlanExerciseRendererContractIssue[] {
  const contract = planExerciseRendererContractForType(block.type);
  if (!contract) return ['missing_renderer_contract'];

  const issues: PlanExerciseRendererContractIssue[] = [];
  if (contract.requiresContentUnits && block.contentUnitIds.length === 0) {
    issues.push('missing_content_units');
  }
  if (block.progressPolicy !== contract.requiredProgressPolicy) {
    issues.push('wrong_progress_policy');
  }
  if (!contract.allowedRecoveryPolicies.includes(block.recoveryPolicy)) {
    issues.push('wrong_recovery_policy');
  }
  if (!contract.explanationRequired) {
    issues.push('missing_explanation_requirement');
  }
  if (contract.highlightsCorrectWordsDuringPlanPractice) {
    issues.push('correct_word_highlighting_not_allowed');
  }

  return issues;
}
