import type { PlanMinutesChoice, PersonalPlanId } from './personal_plan_catalog';
import {
  applyPlanDayRuntimeLoopAnswer,
  type ApplyPlanDayRuntimeLoopAnswerResult,
  type PlanDayRuntimeLoop,
} from './personal_plan_day_runtime_loop_coordinator';
import {
  hydratePlanDayRuntime,
  persistPlanDayRuntimeLoop,
  type HydratePlanDayRuntimeResult,
} from './personal_plan_day_runtime_hydration_adapter';
import type { BuildPlanDayRuntimePersistedStateOptions } from './personal_plan_day_runtime_persistence_contract';
import {
  buildPlanDayRuntimeScreenModel,
  validatePlanDayRuntimeScreenModel,
  type PlanDayRuntimeScreenModel,
} from './personal_plan_day_runtime_screen_model';
import type { PlanDayRuntimeStorageAdapter, PlanDayRuntimeStorageReadyResult } from './personal_plan_day_runtime_storage_adapter';
import type { PlanRuntimeBlockBundle } from './personal_plan_runtime_block_factory';

export type PlanDayRuntimeScreenControllerInput = {
  storage: PlanDayRuntimeStorageAdapter;
  bundles: PlanRuntimeBlockBundle[];
  minutesPerDay: PlanMinutesChoice;
  planInstanceId: string;
  planId: PersonalPlanId;
  dayIndex: number;
  sessionIdPrefix?: string;
};

export type PlanDayRuntimeScreenControllerHydrateResult = HydratePlanDayRuntimeResult;

export type PlanDayRuntimeScreenControllerAnswerInput = {
  selectedAnswer?: string | null;
  occurredAt?: string;
};

export type PlanDayRuntimeScreenControllerAnswerResult =
  | {
    status: 'ready';
    answer: Extract<ApplyPlanDayRuntimeLoopAnswerResult, { status: 'ready' }>['answer'];
    loop: PlanDayRuntimeLoop;
    screenModel: PlanDayRuntimeScreenModel;
  }
  | {
    status: 'blocked';
    issues: string[];
  };

export type PlanDayRuntimeScreenController = {
  hydrate(): Promise<PlanDayRuntimeScreenControllerHydrateResult>;
  answer(
    loop: PlanDayRuntimeLoop,
    input: PlanDayRuntimeScreenControllerAnswerInput,
  ): Promise<PlanDayRuntimeScreenControllerAnswerResult>;
  persist(
    loop: PlanDayRuntimeLoop,
    options?: BuildPlanDayRuntimePersistedStateOptions,
  ): Promise<PlanDayRuntimeStorageReadyResult | {
    status: 'blocked';
    issues: string[];
  }>;
  reset(): Promise<PlanDayRuntimeStorageReadyResult>;
};

function buildValidatedScreenModel(loop: PlanDayRuntimeLoop): {
  status: 'ready';
  screenModel: PlanDayRuntimeScreenModel;
} | {
  status: 'blocked';
  issues: string[];
} {
  const screenModel = buildPlanDayRuntimeScreenModel(loop);
  const issues = validatePlanDayRuntimeScreenModel(screenModel);
  if (issues.length > 0) {
    return {
      status: 'blocked',
      issues: ['screen_model_invalid', ...issues],
    };
  }

  return {
    status: 'ready',
    screenModel,
  };
}

export function createPlanDayRuntimeScreenController(
  input: PlanDayRuntimeScreenControllerInput,
): PlanDayRuntimeScreenController {
  return {
    hydrate() {
      return hydratePlanDayRuntime({
        storage: input.storage,
        bundles: input.bundles,
        minutesPerDay: input.minutesPerDay,
        planInstanceId: input.planInstanceId,
        planId: input.planId,
        dayIndex: input.dayIndex,
        sessionIdPrefix: input.sessionIdPrefix,
      });
    },

    async answer(loop, answerInput) {
      const answered = applyPlanDayRuntimeLoopAnswer(loop, answerInput);
      if (answered.status !== 'ready') {
        return {
          status: 'blocked',
          issues: answered.issues,
        };
      }

      const screen = buildValidatedScreenModel(answered.loop);
      if (screen.status !== 'ready') return screen;

      return {
        status: 'ready',
        answer: answered.answer,
        loop: answered.loop,
        screenModel: screen.screenModel,
      };
    },

    persist(loop, options = {}) {
      return persistPlanDayRuntimeLoop(input.storage, loop, options);
    },

    reset() {
      return input.storage.reset({
        planInstanceId: input.planInstanceId,
        planId: input.planId,
        dayIndex: input.dayIndex,
      });
    },
  };
}
