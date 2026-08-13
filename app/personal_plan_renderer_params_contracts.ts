import {
  planExerciseRendererContractForType,
  type PlanExerciseAnswerKind,
} from './personal_plan_exercise_renderer_contracts';
import {
  buildPlanPhraseBuildShellParams,
  type PlanPhraseBuildShellParams,
  type PlanPhraseBuildShellParamsIssue,
} from './personal_plan_phrase_build_shell_contract';
import type {
  PlanExerciseBlock,
  PlanExerciseType,
} from './personal_plan_engine_contracts';

export type PlanRendererParamsIssue =
  | 'wrong_exercise_type'
  | 'missing_content_units'
  | 'missing_plan_instance_id'
  | 'missing_renderer_contract';

export type PlanRendererParams = {
  source: 'personal_plan';
  rendererType: PlanExerciseType;
  planInstanceId: string;
  planId: PlanExerciseBlock['planId'];
  dayIndex: number;
  blockId: string;
  contentUnitIds: string[];
  answerKind: PlanExerciseAnswerKind;
  requiredContentUnitCount: number;
  explanationRequired: true;
  recoveryEnabled: boolean;
  allowCorrectWordHighlighting: false;
};

export type BuildPlanRendererParamsResult = {
  params?: PlanRendererParams;
  issues: PlanRendererParamsIssue[];
};

export type PlanExerciseRendererParams = PlanPhraseBuildShellParams | PlanRendererParams;

export type BuildPlanExerciseRendererParamsIssue =
  | PlanPhraseBuildShellParamsIssue
  | PlanRendererParamsIssue
  | 'missing_renderer_contract';

export type BuildPlanExerciseRendererParamsResult = {
  params?: PlanExerciseRendererParams;
  issues: BuildPlanExerciseRendererParamsIssue[];
};

function buildParamsForType(
  block: PlanExerciseBlock,
  planInstanceId: string,
  expectedType: PlanExerciseType,
): BuildPlanRendererParamsResult {
  const issues: PlanRendererParamsIssue[] = [];
  const cleanPlanInstanceId = planInstanceId.trim();
  const contract = planExerciseRendererContractForType(expectedType);

  if (block.type !== expectedType) {
    issues.push('wrong_exercise_type');
  }
  if (block.contentUnitIds.length === 0) {
    issues.push('missing_content_units');
  }
  if (!cleanPlanInstanceId) {
    issues.push('missing_plan_instance_id');
  }
  if (!contract) {
    issues.push('missing_renderer_contract');
  }

  if (issues.length > 0 || !contract) return { issues };

  return {
    issues: [],
    params: {
      source: 'personal_plan',
      rendererType: expectedType,
      planInstanceId: cleanPlanInstanceId,
      planId: block.planId,
      dayIndex: block.dayIndex,
      blockId: block.id,
      contentUnitIds: block.contentUnitIds,
      answerKind: contract.answerKind,
      requiredContentUnitCount: block.contentUnitIds.length,
      explanationRequired: true,
      recoveryEnabled: block.recoveryPolicy !== 'none',
      allowCorrectWordHighlighting: false,
    },
  };
}

export function buildPlanMissingWordRendererParams(
  block: PlanExerciseBlock,
  planInstanceId: string,
): BuildPlanRendererParamsResult {
  return buildParamsForType(block, planInstanceId, 'plan_missing_word');
}

export function buildPlanChooseNaturalPhraseRendererParams(
  block: PlanExerciseBlock,
  planInstanceId: string,
): BuildPlanRendererParamsResult {
  return buildParamsForType(block, planInstanceId, 'plan_choose_natural_phrase');
}

export function buildPlanListenChooseRendererParams(
  block: PlanExerciseBlock,
  planInstanceId: string,
): BuildPlanRendererParamsResult {
  return buildParamsForType(block, planInstanceId, 'plan_listen_choose');
}

export function buildPlanListenBuildRendererParams(
  block: PlanExerciseBlock,
  planInstanceId: string,
): BuildPlanRendererParamsResult {
  return buildParamsForType(block, planInstanceId, 'plan_listen_build');
}

export function buildPlanPronunciationRepeatRendererParams(
  block: PlanExerciseBlock,
  planInstanceId: string,
): BuildPlanRendererParamsResult {
  return buildParamsForType(block, planInstanceId, 'plan_pronunciation_repeat');
}

export function buildPlanPhraseRecallRendererParams(
  block: PlanExerciseBlock,
  planInstanceId: string,
): BuildPlanRendererParamsResult {
  return buildParamsForType(block, planInstanceId, 'plan_phrase_recall');
}

export function buildPlanExerciseRendererParams(
  block: PlanExerciseBlock,
  planInstanceId: string,
): BuildPlanExerciseRendererParamsResult {
  if (block.type === 'plan_phrase_build') {
    return buildPlanPhraseBuildShellParams(block, planInstanceId);
  }
  if (block.type === 'plan_missing_word') {
    return buildPlanMissingWordRendererParams(block, planInstanceId);
  }
  if (block.type === 'plan_choose_natural_phrase') {
    return buildPlanChooseNaturalPhraseRendererParams(block, planInstanceId);
  }
  if (block.type === 'plan_listen_choose') {
    return buildPlanListenChooseRendererParams(block, planInstanceId);
  }
  if (block.type === 'plan_listen_build') {
    return buildPlanListenBuildRendererParams(block, planInstanceId);
  }
  if (block.type === 'plan_pronunciation_repeat') {
    return buildPlanPronunciationRepeatRendererParams(block, planInstanceId);
  }
  if (block.type === 'plan_phrase_recall') {
    return buildPlanPhraseRecallRendererParams(block, planInstanceId);
  }

  return {
    issues: ['missing_renderer_contract'],
  };
}
