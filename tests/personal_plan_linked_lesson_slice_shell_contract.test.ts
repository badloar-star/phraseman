import {
  buildPlanLinkedLessonSliceShellParams,
} from '../app/personal_plan_linked_lesson_slice_shell_contract';
import type { PlanExerciseBlock } from '../app/personal_plan_engine_contracts';
import { readFileSync } from 'fs';
import path from 'path';

function block(overrides: Partial<PlanExerciseBlock> = {}): PlanExerciseBlock {
  return {
    id: 'gavan-day1-lesson-slice',
    planId: 'gavan',
    dayIndex: 1,
    type: 'linked_lesson_slice',
    title: 'Warm up in lesson 1',
    contentUnitIds: ['lesson1_phrase_1', 'lesson1_phrase_2'],
    estimatedMinutes: 5,
    requiredFor: [5, 10, 15, 20],
    prerequisiteLessonIds: [1],
    progressPolicy: 'correct_only',
    recoveryPolicy: 'return_wrong_to_recall_and_trainer',
    destination: {
      type: 'lesson',
      lessonId: 1,
      requiredPhrases: 2,
      requiredPhraseIds: ['lesson1_phrase_1', 'lesson1_phrase_2'],
    },
    ...overrides,
  };
}

describe('personal plan linked lesson slice shell contract', () => {
  it('builds stable params for opening a normal lesson slice from a plan', () => {
    expect(buildPlanLinkedLessonSliceShellParams(block(), ' instance-1 ')).toEqual({
      issues: [],
      params: {
        source: 'personal_plan',
        lessonShellMode: 'linked_lesson_slice',
        planPracticeMode: 'linked_lesson',
        planInstanceId: 'instance-1',
        planId: 'gavan',
        dayIndex: 1,
        blockId: 'gavan-day1-lesson-slice',
        lessonId: 1,
        requiredPhrases: 2,
        requiredPhraseIds: ['lesson1_phrase_1', 'lesson1_phrase_2'],
        progressPolicy: 'correct_only',
        completionMode: 'required_correct_phrases',
        recoveryEnabled: true,
        recallEnabled: true,
      },
    });
  });

  it('rejects unsupported exercise types instead of opening the wrong shell', () => {
    expect(buildPlanLinkedLessonSliceShellParams(block({
      type: 'plan_phrase_build',
    }), 'instance-1')).toEqual({
      issues: ['wrong_exercise_type'],
    });
  });

  it('requires a lesson target, required phrase count, and plan instance id', () => {
    expect(buildPlanLinkedLessonSliceShellParams(block({
      contentUnitIds: [],
      prerequisiteLessonIds: [],
      destination: {
        type: 'lesson',
        lessonId: null,
        requiredPhrases: 0,
        requiredPhraseIds: [],
      },
    }), ' ')).toEqual({
      issues: [
        'missing_lesson_id',
        'invalid_required_phrases',
        'missing_required_phrase_ids',
        'missing_plan_instance_id',
      ],
    });
  });

  it('keeps recovery flags honest', () => {
    expect(buildPlanLinkedLessonSliceShellParams(block({
      recoveryPolicy: 'none',
    }), 'instance-1').params).toEqual(expect.objectContaining({
      recoveryEnabled: false,
      recallEnabled: false,
    }));
  });

  it('wires the normal lesson route with linked lesson mode params end to end', () => {
    const navigationSource = readFileSync(
      path.join(__dirname, '../app/personal_plan_navigation.ts'),
      'utf8',
    );
    const lessonMenuSource = readFileSync(
      path.join(__dirname, '../app/lesson_menu.tsx'),
      'utf8',
    );
    const lessonSource = readFileSync(
      path.join(__dirname, '../app/lesson1.tsx'),
      'utf8',
    );

    expect(navigationSource).toContain("lessonShellMode: 'linked_lesson_slice'");
    expect(navigationSource).toContain("planPracticeMode: 'linked_lesson'");
    expect(lessonMenuSource).toContain('lessonShellMode: lessonShellModeParam');
    expect(lessonMenuSource).toContain('planPracticeMode: planPracticeModeParam');
    expect(lessonMenuSource).toContain('...(lessonShellMode ? { lessonShellMode } : {})');
    expect(lessonMenuSource).toContain('...(planPracticeMode ? { planPracticeMode } : {})');
    expect(lessonSource).toContain('lessonShellMode: lessonShellModeParam');
    expect(lessonSource).toContain('planPracticeMode: planPracticeModeParam');
    expect(lessonSource).toContain("const isLinkedLessonSliceTask = isPlanLessonTask && lessonShellMode === 'linked_lesson_slice' && planPracticeMode === 'linked_lesson'");
  });

  it('keeps linked lesson progress honest: correct answer, plan task, and exact phrase ids only', () => {
    const lessonSource = readFileSync(
      path.join(__dirname, '../app/lesson1.tsx'),
      'utf8',
    );

    expect(lessonSource).toContain("if (isPlanLessonTask && planRequiredPhraseIdSet.size > 0 && !planRequiredPhraseIdSet.has(String(p.id))) return false");
    expect(lessonSource).toContain("const currentPhraseCountsForPlan = planRequiredPhraseIdSet.size === 0 || planRequiredPhraseIdSet.has(String(phrase?.id ?? ''))");
    expect(lessonSource).toContain('if (isRight && isPlanLessonTask && planRequiredPhrases > 0 && currentPhraseCountsForPlan)');
    expect(lessonSource).toContain('Math.min(planRequiredPhrases, prev + 1)');
    expect(lessonSource).toContain('markPersonalPlanTaskCompleted({');
  });

  it('keeps the lesson-shell completion modal clean, centered, and routed back to the real plan', () => {
    const lessonSource = readFileSync(
      path.join(__dirname, '../app/lesson1.tsx'),
      'utf8',
    );
    const modalStart = lessonSource.indexOf('visible={planLessonDoneVisible}');
    expect(modalStart).toBeGreaterThan(0);
    const modalSource = lessonSource.slice(modalStart, modalStart + 2600);

    expect(modalSource).not.toMatch(/[\u00d0\u00d1\u00c2]/);
    expect(modalSource).toContain("justifyContent: 'center'");
    expect(modalSource).toContain("backgroundColor: 'rgba(0,0,0,0.68)'");
    expect(modalSource).toContain('maxWidth: 520');
    expect(modalSource).toContain('minHeight: 64');
    expect(modalSource).toContain("router.push('/personal_plan' as any)");
    expect(modalSource).toContain('Часть урока готова');
    expect(modalSource).toContain('Фразы дня готовы');
    expect(modalSource).toContain('accessibilityLabel="Вернуться к плану"');
  });
});
