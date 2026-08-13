import {
  buildPlanPhraseBuildShellParams,
} from '../app/personal_plan_phrase_build_shell_contract';
import type { PlanExerciseBlock } from '../app/personal_plan_engine_contracts';
import { readFileSync } from 'fs';
import path from 'path';

function block(overrides: Partial<PlanExerciseBlock> = {}): PlanExerciseBlock {
  return {
    id: 'block_1',
    planId: 'gavan',
    dayIndex: 1,
    type: 'plan_phrase_build',
    title: 'Build the useful phrase',
    contentUnitIds: ['unit_1', 'unit_2'],
    estimatedMinutes: 3,
    requiredFor: [5, 10, 15, 20],
    prerequisiteLessonIds: [1],
    progressPolicy: 'correct_only',
    recoveryPolicy: 'return_wrong_to_recall_and_trainer',
    ...overrides,
  };
}

describe('personal plan phrase build shell contract', () => {
  it('builds stable shell params for plan phrase build blocks', () => {
    expect(buildPlanPhraseBuildShellParams(block(), ' instance_1 ')).toEqual({
      issues: [],
      params: {
        source: 'personal_plan',
        lessonShellMode: 'plan_phrase_build',
        planPracticeMode: 'build',
        planInstanceId: 'instance_1',
        planId: 'gavan',
        dayIndex: 1,
        blockId: 'block_1',
        contentUnitIds: ['unit_1', 'unit_2'],
        requiredContentUnitCount: 2,
        allowCorrectWordHighlighting: false,
        recoveryEnabled: true,
        recallEnabled: true,
      },
    });
  });

  it('rejects unsupported exercise types instead of pretending they can use the shell', () => {
    expect(buildPlanPhraseBuildShellParams(block({
      type: 'plan_missing_word',
    }), 'instance_1')).toEqual({
      issues: ['wrong_exercise_type'],
    });
  });

  it('requires content units and plan instance id', () => {
    expect(buildPlanPhraseBuildShellParams(block({
      contentUnitIds: [],
    }), ' ')).toEqual({
      issues: ['missing_content_units', 'missing_plan_instance_id'],
    });
  });

  it('turns recovery and recall off only when the block explicitly has no recovery policy', () => {
    expect(buildPlanPhraseBuildShellParams(block({
      recoveryPolicy: 'none',
    }), 'instance_1').params).toEqual(expect.objectContaining({
      recoveryEnabled: false,
      recallEnabled: false,
    }));
  });

  it('keeps correct-word highlighting disabled for plan practice', () => {
    const result = buildPlanPhraseBuildShellParams(block(), 'instance_1');

    expect(result.params?.allowCorrectWordHighlighting).toBe(false);
  });

  it('wires plan phrase build into the lesson shell without lesson hints or dev fallback copy', () => {
    const navigationSource = readFileSync(
      path.join(__dirname, '../app/personal_plan_navigation.ts'),
      'utf8',
    );
    const lessonSource = readFileSync(
      path.join(__dirname, '../app/lesson1.tsx'),
      'utf8',
    );

    expect(navigationSource).toContain("lessonShellMode: 'plan_phrase_build'");
    expect(navigationSource).toContain("planPracticeMode: 'build'");
    expect(navigationSource).toContain("allowCorrectWordHighlighting: '0'");
    expect(lessonSource).toContain('allowCorrectWordHighlighting: allowCorrectWordHighlightingParam');
    expect(lessonSource).toContain("const isPlanPhraseBuildTask = isPlanPhraseLessonTask && lessonShellMode === 'plan_phrase_build' && planPracticeMode === 'build'");
    expect(lessonSource).toContain("const planAllowsCorrectWordHighlighting = allowCorrectWordHighlighting === '1'");
    expect(lessonSource).toContain('const shouldDisablePlanPhraseHints = isPlanPhraseBuildTask && !planAllowsCorrectWordHighlighting');
    expect(lessonSource).toContain('!isPlanLessonTask && !shouldDisablePlanPhraseHints');
    expect(lessonSource).not.toContain('route_not_wired');
  });
});
