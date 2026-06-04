import {
  applyPlanDayRuntimeAnswer,
} from '../app/personal_plan_day_runtime_answer_controller';
import {
  assemblePlanDayRuntime,
  type PlanDayRuntimeAssembly,
} from '../app/personal_plan_day_runtime_assembler';
import { buildPlanRuntimeExerciseViewModel } from '../app/personal_plan_exercise_runtime_view_model';
import { buildGavanDay1ContentCandidate } from '../app/personal_plan_gavan_day1_content_candidate';
import { buildGavanDay1RuntimeBlockBundles } from '../app/personal_plan_runtime_block_factory';

const content = buildGavanDay1ContentCandidate();
const bundlesResult = buildGavanDay1RuntimeBlockBundles(content);

function bundles() {
  expect(bundlesResult.status).toBe('ready');
  if (bundlesResult.status !== 'ready') {
    throw new Error(`Expected ready bundles: ${bundlesResult.issues.join(', ')}`);
  }
  return bundlesResult.bundles;
}

function assembly(minutesPerDay: 5 | 10 | 15 | 20 = 15): PlanDayRuntimeAssembly {
  const result = assemblePlanDayRuntime({
    bundles: bundles(),
    minutesPerDay,
    planInstanceId: `instance_answer_${minutesPerDay}`,
    sessionIdPrefix: 'answer-loop',
  });

  expect(result.status).toBe('ready');
  if (result.status !== 'ready') throw new Error(`Expected ready assembly: ${result.issues.join(', ')}`);
  return result.assembly;
}

describe('personal plan day runtime answer controller', () => {
  it('counts only correct answers and returns an updated view model', () => {
    const result = applyPlanDayRuntimeAnswer(assembly(), {
      selectedAnswer: "I'm here.",
      occurredAt: '2026-06-03T13:00:00.000Z',
    });

    expect(result.status).toBe('ready');
    if (result.status !== 'ready') throw new Error(`Expected ready answer: ${result.issues.join(', ')}`);

    expect(result.submission.isCorrect).toBe(true);
    expect(result.submission.event.progressEligible).toBe(true);
    expect(result.updatedSession.progress).toEqual({
      completed: 1,
      total: 5,
      wrong: 0,
      percent: 20,
      completedAll: false,
    });
    expect(result.updatedViewModel.progress.label).toBe('1 из 5');
    expect(result.blockCompleted).toBe(false);
    expect(result.shouldReassembleDay).toBe(false);
    expect(result.completedBlockIds).toEqual([]);
    expect(result.carryoverPhraseIds).toEqual([]);
  });

  it('does not count wrong answers and returns the missed phrase for carryover/recovery', () => {
    const result = applyPlanDayRuntimeAnswer(assembly(), {
      selectedAnswer: 'I here.',
      occurredAt: '2026-06-03T13:01:00.000Z',
    });

    expect(result.status).toBe('ready');
    if (result.status !== 'ready') throw new Error(`Expected ready answer: ${result.issues.join(', ')}`);

    expect(result.submission.isCorrect).toBe(false);
    expect(result.submission.event.progressEligible).toBe(false);
    expect(result.updatedSession.progress.completed).toBe(0);
    expect(result.updatedSession.openMissedPhraseIds).toEqual([content.phrases[0].id]);
    expect(result.carryoverPhraseIds).toEqual([content.phrases[0].id]);
    expect(result.updatedViewModel.feedback?.title).toBe('Фраза вернётся ещё раз');
    expect(result.completedBlockIds).toEqual([]);
  });

  it('marks the active block completed only after all runtime items are correct', () => {
    let current = assembly(5);
    let lastResult: ReturnType<typeof applyPlanDayRuntimeAnswer> | undefined;

    while (current.activeSession?.currentItem) {
      lastResult = applyPlanDayRuntimeAnswer(current, {
        selectedAnswer: current.activeSession.currentItem.correctAnswer,
      });

      expect(lastResult.status).toBe('ready');
      if (lastResult.status !== 'ready') throw new Error(`Expected ready answer: ${lastResult.issues.join(', ')}`);

      current = {
        ...current,
        activeSession: lastResult.updatedSession,
        activeViewModel: buildPlanRuntimeExerciseViewModel(lastResult.updatedSession),
      };
    }

    expect(lastResult?.status).toBe('ready');
    if (!lastResult || lastResult.status !== 'ready') throw new Error('Expected final ready answer.');

    expect(lastResult.blockCompleted).toBe(true);
    expect(lastResult.shouldReassembleDay).toBe(true);
    expect(lastResult.completedBlockIds).toEqual(['gavan-week1-day1:choose-natural']);
    expect(lastResult.updatedViewModel.completed).toBe(true);
    expect(lastResult.updatedViewModel.completion?.title).toBe('Готово на сегодня');
  });

  it('blocks empty answers before they enter the runtime session', () => {
    const result = applyPlanDayRuntimeAnswer(assembly(), {
      selectedAnswer: '   ',
    });

    expect(result).toEqual({
      status: 'blocked',
      issues: ['missing_selected_answer'],
    });
  });

  it('blocks completed day assemblies that no longer have an active session', () => {
    const done = assemblePlanDayRuntime({
      bundles: bundles(),
      minutesPerDay: 5,
      planInstanceId: 'instance_answer_done',
      completedBlockIds: ['gavan-week1-day1:choose-natural'],
    });

    expect(done.status).toBe('ready');
    if (done.status !== 'ready') throw new Error(`Expected ready completed day: ${done.issues.join(', ')}`);

    expect(applyPlanDayRuntimeAnswer(done.assembly, {
      selectedAnswer: "I'm here.",
    })).toEqual({
      status: 'blocked',
      issues: ['no_active_session'],
    });
  });
});
