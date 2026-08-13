import {
  planExerciseBlocksForDay,
  type PlanDayPassport,
} from './personal_plan_engine_contracts';
import type {
  PersonalPlanDefinition,
  PlanDay,
} from './personal_plan_catalog';
import { buildPersonalPlanDayPassport } from './personal_plan_quality';
import {
  buildPlanExerciseDayViewModel,
  type PlanExerciseDayViewModel,
} from './personal_plan_exercise_day_view_model';
import type { PlanExerciseBlockProgressInput } from './personal_plan_exercise_block_progress';

export type PersonalPlanDayExerciseViewModel = {
  planId: PersonalPlanDefinition['id'];
  dayIndex: number;
  blockCount: number;
  blockIds: string[];
  dayViewModel: PlanExerciseDayViewModel;
  passportReady: boolean;
  passport: PlanDayPassport;
};

export function buildPersonalPlanDayExerciseViewModel(
  plan: PersonalPlanDefinition,
  day: PlanDay,
  inputs: PlanExerciseBlockProgressInput[],
): PersonalPlanDayExerciseViewModel {
  const blocks = planExerciseBlocksForDay(plan, day);
  const passport = buildPersonalPlanDayPassport(plan, day);

  return {
    planId: plan.id,
    dayIndex: day.dayIndex,
    blockCount: blocks.length,
    blockIds: blocks.map((block) => block.id),
    dayViewModel: buildPlanExerciseDayViewModel(blocks, inputs),
    passportReady: passport.ready,
    passport,
  };
}
