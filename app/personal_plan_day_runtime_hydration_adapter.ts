import type { PlanMinutesChoice, PersonalPlanId } from './personal_plan_catalog';
import {
  buildPlanDayRuntimePersistedState,
  type BuildPlanDayRuntimePersistedStateOptions,
} from './personal_plan_day_runtime_persistence_contract';
import {
  buildPlanDayRuntimeScreenModel,
  validatePlanDayRuntimeScreenModel,
  type PlanDayRuntimeScreenModel,
} from './personal_plan_day_runtime_screen_model';
import {
  startPlanDayRuntimeLoop,
  type PlanDayRuntimeLoop,
} from './personal_plan_day_runtime_loop_coordinator';
import type {
  PlanDayRuntimeStorageAdapter,
  PlanDayRuntimeStorageReadyResult,
} from './personal_plan_day_runtime_storage_adapter';
import type { PlanRuntimeBlockBundle } from './personal_plan_runtime_block_factory';

export type HydratePlanDayRuntimeInput = {
  storage: PlanDayRuntimeStorageAdapter;
  bundles: PlanRuntimeBlockBundle[];
  minutesPerDay: PlanMinutesChoice;
  planInstanceId: string;
  planId: PersonalPlanId;
  dayIndex: number;
  sessionIdPrefix?: string;
};

export type HydratePlanDayRuntimeResult =
  | {
    status: 'ready';
    source: 'fresh' | 'persisted';
    loop: PlanDayRuntimeLoop;
    screenModel: PlanDayRuntimeScreenModel;
  }
  | {
    status: 'blocked';
    issues: string[];
  };

function screenModelForLoop(loop: PlanDayRuntimeLoop): HydratePlanDayRuntimeResult {
  const screenModel = buildPlanDayRuntimeScreenModel(loop);
  const screenIssues = validatePlanDayRuntimeScreenModel(screenModel);
  if (screenIssues.length > 0) {
    return {
      status: 'blocked',
      issues: ['screen_model_invalid', ...screenIssues],
    };
  }

  return {
    status: 'ready',
    source: 'fresh',
    loop,
    screenModel,
  };
}

function startLoopForHydration(
  input: HydratePlanDayRuntimeInput,
  restored?: {
    completedBlockIds: string[];
    carryoverPhraseIds: string[];
    minutesPerDay: PlanMinutesChoice;
  },
): HydratePlanDayRuntimeResult {
  const started = startPlanDayRuntimeLoop({
    bundles: input.bundles,
    minutesPerDay: restored?.minutesPerDay ?? input.minutesPerDay,
    planInstanceId: input.planInstanceId,
    completedBlockIds: restored?.completedBlockIds,
    carryoverPhraseIds: restored?.carryoverPhraseIds,
    sessionIdPrefix: input.sessionIdPrefix,
  });

  if (started.status !== 'ready') {
    return {
      status: 'blocked',
      issues: started.issues,
    };
  }

  const result = screenModelForLoop(started.loop);
  if (result.status !== 'ready') return result;

  return {
    ...result,
    source: restored ? 'persisted' : 'fresh',
  };
}

export async function hydratePlanDayRuntime(
  input: HydratePlanDayRuntimeInput,
): Promise<HydratePlanDayRuntimeResult> {
  const loaded = await input.storage.load({
    planInstanceId: input.planInstanceId,
    planId: input.planId,
    dayIndex: input.dayIndex,
  });

  if (loaded.status === 'blocked') {
    return {
      status: 'blocked',
      issues: loaded.issues,
    };
  }
  if (loaded.status === 'empty') {
    return startLoopForHydration(input);
  }

  return startLoopForHydration(input, {
    completedBlockIds: loaded.state.completedBlockIds,
    carryoverPhraseIds: loaded.state.carryoverPhraseIds,
    minutesPerDay: loaded.state.minutesPerDay,
  });
}

export async function persistPlanDayRuntimeLoop(
  storage: PlanDayRuntimeStorageAdapter,
  loop: PlanDayRuntimeLoop,
  options: BuildPlanDayRuntimePersistedStateOptions = {},
): Promise<PlanDayRuntimeStorageReadyResult | {
  status: 'blocked';
  issues: string[];
}> {
  const state = buildPlanDayRuntimePersistedState(loop, options);
  return storage.save(state);
}
