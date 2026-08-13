import {
  PlanExerciseBlock,
} from './personal_plan_engine_contracts';
import {
  buildPlanLinkedLessonSliceShellParams,
  PlanLinkedLessonSliceShellParams,
  PlanLinkedLessonSliceShellParamsIssue,
} from './personal_plan_linked_lesson_slice_shell_contract';
import {
  buildPlanPhraseBuildShellParams,
  PlanPhraseBuildShellParams,
  PlanPhraseBuildShellParamsIssue,
} from './personal_plan_phrase_build_shell_contract';
import {
  buildPlanChooseNaturalPhraseRendererParams,
  buildPlanListenBuildRendererParams,
  buildPlanListenChooseRendererParams,
  buildPlanMissingWordRendererParams,
  buildPlanPhraseRecallRendererParams,
  buildPlanPronunciationRepeatRendererParams,
  PlanRendererParams,
  PlanRendererParamsIssue,
} from './personal_plan_renderer_params_contracts';

export type PlanExerciseRendererUnifiedParams =
  | PlanLinkedLessonSliceShellParams
  | PlanPhraseBuildShellParams
  | PlanRendererParams;

export type PlanExerciseRendererParamsIssue =
  | PlanLinkedLessonSliceShellParamsIssue
  | PlanPhraseBuildShellParamsIssue
  | PlanRendererParamsIssue
  | 'missing_renderer_contract';

export type BuildPlanExerciseRendererParamsResult = {
  params?: PlanExerciseRendererUnifiedParams;
  issues: PlanExerciseRendererParamsIssue[];
};

export function buildPlanExerciseRendererParams(
  block: PlanExerciseBlock,
  planInstanceId: string,
): BuildPlanExerciseRendererParamsResult {
  if (block.type === 'linked_lesson_slice') {
    return buildPlanLinkedLessonSliceShellParams(block, planInstanceId);
  }

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
