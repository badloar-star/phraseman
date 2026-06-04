import {
  buildPersonalPlanDayExerciseViewModel,
} from '../app/personal_plan_day_exercise_view_model';
import {
  createPlanAttemptEvent,
  planExerciseBlocksForDay,
} from '../app/personal_plan_engine_contracts';
import { PERSONAL_PLAN_CATALOG } from '../app/personal_plan_catalog';

const gavan = PERSONAL_PLAN_CATALOG.find((plan) => plan.id === 'gavan')!;
const day1 = gavan.days[0];

describe('personal plan day exercise view model adapter', () => {
  it('maps existing catalog day tasks into exercise day view model blocks', () => {
    const blocks = planExerciseBlocksForDay(gavan, day1);
    const viewModel = buildPersonalPlanDayExerciseViewModel(gavan, day1, []);

    expect(viewModel.planId).toBe('gavan');
    expect(viewModel.dayIndex).toBe(day1.dayIndex);
    expect(viewModel.blockCount).toBe(blocks.length);
    expect(viewModel.blockIds).toEqual(blocks.map((block) => block.id));
    expect(viewModel.dayViewModel.totalBlocks).toBe(blocks.length);
  });

  it('produces not_started state without attempts', () => {
    const viewModel = buildPersonalPlanDayExerciseViewModel(gavan, day1, []);

    expect(viewModel.dayViewModel.primaryState).toBe('not_started');
    expect(viewModel.dayViewModel.percent).toBe(0);
    expect(viewModel.dayViewModel.completedBlocks).toBe(0);
  });

  it('produces progress from attempts that match mapped block ids', () => {
    const blocks = planExerciseBlocksForDay(gavan, day1);
    const block = blocks.find((item) => item.contentUnitIds.length > 0)!;
    const attempt = createPlanAttemptEvent(block, {
      id: 'attempt_progress',
      planInstanceId: 'instance_1',
      result: 'correct',
      contentUnitId: block.contentUnitIds[0],
    });

    const viewModel = buildPersonalPlanDayExerciseViewModel(gavan, day1, [attempt]);

    expect(viewModel.dayViewModel.percent).toBeGreaterThan(0);
    expect(viewModel.dayViewModel.progress.completedUnits).toBe(1);
    expect(viewModel.dayViewModel.progress.blockProgress.some((progress) => (
      progress.blockId === block.id && progress.completedCount === 1
    ))).toBe(true);
  });

  it('keeps certified Gavan day 1 passport ready for runtime view models', () => {
    const viewModel = buildPersonalPlanDayExerciseViewModel(gavan, day1, []);

    expect(viewModel.passportReady).toBe(true);
    expect(viewModel.passport.issues).toEqual([]);
  });

  it('keeps generated scaffold days blocked by passport readiness', () => {
    const scaffoldDay = gavan.days[1];
    const viewModel = buildPersonalPlanDayExerciseViewModel(gavan, scaffoldDay, []);

    expect(scaffoldDay.status).toBe('scaffold');
    expect(viewModel.passportReady).toBe(false);
    expect(viewModel.passport.issues.map((issue) => issue.code)).toContain('scaffold_day');
  });
});
