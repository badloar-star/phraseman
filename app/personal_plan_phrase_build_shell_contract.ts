import type { PlanExerciseBlock } from './personal_plan_engine_contracts';

export type PlanPhraseBuildShellParamsIssue =
  | 'wrong_exercise_type'
  | 'missing_content_units'
  | 'missing_plan_instance_id';

export type PlanPhraseBuildShellParams = {
  source: 'personal_plan';
  lessonShellMode: 'plan_phrase_build';
  planPracticeMode: 'build';
  planInstanceId: string;
  planId: PlanExerciseBlock['planId'];
  dayIndex: number;
  blockId: string;
  contentUnitIds: string[];
  requiredContentUnitCount: number;
  allowCorrectWordHighlighting: false;
  recoveryEnabled: boolean;
  recallEnabled: boolean;
};

export type BuildPlanPhraseBuildShellParamsResult = {
  params?: PlanPhraseBuildShellParams;
  issues: PlanPhraseBuildShellParamsIssue[];
};

export function buildPlanPhraseBuildShellParams(
  block: PlanExerciseBlock,
  planInstanceId: string,
): BuildPlanPhraseBuildShellParamsResult {
  const issues: PlanPhraseBuildShellParamsIssue[] = [];
  const cleanPlanInstanceId = planInstanceId.trim();

  if (block.type !== 'plan_phrase_build') {
    issues.push('wrong_exercise_type');
  }
  if (block.contentUnitIds.length === 0) {
    issues.push('missing_content_units');
  }
  if (!cleanPlanInstanceId) {
    issues.push('missing_plan_instance_id');
  }

  if (issues.length > 0) return { issues };

  return {
    issues: [],
    params: {
      source: 'personal_plan',
      lessonShellMode: 'plan_phrase_build',
      planPracticeMode: 'build',
      planInstanceId: cleanPlanInstanceId,
      planId: block.planId,
      dayIndex: block.dayIndex,
      blockId: block.id,
      contentUnitIds: block.contentUnitIds,
      requiredContentUnitCount: block.contentUnitIds.length,
      allowCorrectWordHighlighting: false,
      recoveryEnabled: block.recoveryPolicy !== 'none',
      recallEnabled: block.recoveryPolicy === 'return_wrong_to_recall' ||
        block.recoveryPolicy === 'return_wrong_to_recall_and_trainer',
    },
  };
}
