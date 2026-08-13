import {
  applyPlanDayRuntimeAnswer,
  type ApplyPlanDayRuntimeAnswerInput,
  type ApplyPlanDayRuntimeAnswerReadyResult,
} from './personal_plan_day_runtime_answer_controller';
import {
  assemblePlanDayRuntime,
  type PlanDayRuntimeAssembly,
} from './personal_plan_day_runtime_assembler';
import type { PlanMinutesChoice } from './personal_plan_catalog';
import type { PlanRuntimeBlockBundle } from './personal_plan_runtime_block_factory';

export type PlanDayRuntimeLoop = {
  bundles: PlanRuntimeBlockBundle[];
  minutesPerDay: PlanMinutesChoice;
  planInstanceId: string;
  completedBlockIds: string[];
  carryoverPhraseIds: string[];
  sessionIdPrefix?: string;
  assembly: PlanDayRuntimeAssembly;
};

export type StartPlanDayRuntimeLoopInput = {
  bundles: PlanRuntimeBlockBundle[];
  minutesPerDay: PlanMinutesChoice;
  planInstanceId: string;
  completedBlockIds?: string[];
  carryoverPhraseIds?: string[];
  sessionIdPrefix?: string;
};

export type StartPlanDayRuntimeLoopResult =
  | {
    status: 'ready';
    loop: PlanDayRuntimeLoop;
  }
  | {
    status: 'blocked';
    issues: string[];
  };

export type ApplyPlanDayRuntimeLoopAnswerResult =
  | {
    status: 'ready';
    answer: ApplyPlanDayRuntimeAnswerReadyResult;
    loop: PlanDayRuntimeLoop;
  }
  | {
    status: 'blocked';
    issues: string[];
  };

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function carryoverLabel(count: number): string {
  if (count === 1) return '1 фраза вернётся на повтор';
  return `${count} фраз вернутся на повтор`;
}

function updateCarryover(
  assembly: PlanDayRuntimeAssembly,
  carryoverPhraseIds: string[],
): PlanDayRuntimeAssembly {
  const phraseIds = unique(carryoverPhraseIds);

  return {
    ...assembly,
    carryover: {
      hasCarryover: phraseIds.length > 0,
      phraseIds,
      label: carryoverLabel(phraseIds.length),
    },
  };
}

export function startPlanDayRuntimeLoop(
  input: StartPlanDayRuntimeLoopInput,
): StartPlanDayRuntimeLoopResult {
  const assembly = assemblePlanDayRuntime({
    bundles: input.bundles,
    minutesPerDay: input.minutesPerDay,
    planInstanceId: input.planInstanceId,
    completedBlockIds: input.completedBlockIds,
    carryoverPhraseIds: input.carryoverPhraseIds,
    sessionIdPrefix: input.sessionIdPrefix,
  });

  if (assembly.status !== 'ready') {
    return {
      status: 'blocked',
      issues: assembly.issues,
    };
  }

  return {
    status: 'ready',
    loop: {
      bundles: input.bundles,
      minutesPerDay: input.minutesPerDay,
      planInstanceId: assembly.assembly.planInstanceId,
      completedBlockIds: [...assembly.assembly.completedBlockIds],
      carryoverPhraseIds: [...assembly.assembly.carryover.phraseIds],
      sessionIdPrefix: input.sessionIdPrefix,
      assembly: assembly.assembly,
    },
  };
}

export function applyPlanDayRuntimeLoopAnswer(
  loop: PlanDayRuntimeLoop,
  input: ApplyPlanDayRuntimeAnswerInput,
): ApplyPlanDayRuntimeLoopAnswerResult {
  const answer = applyPlanDayRuntimeAnswer(loop.assembly, input);
  if (answer.status !== 'ready') {
    return {
      status: 'blocked',
      issues: answer.issues,
    };
  }

  if (answer.shouldReassembleDay) {
    const next = startPlanDayRuntimeLoop({
      bundles: loop.bundles,
      minutesPerDay: loop.minutesPerDay,
      planInstanceId: loop.planInstanceId,
      completedBlockIds: answer.completedBlockIds,
      carryoverPhraseIds: answer.carryoverPhraseIds,
      sessionIdPrefix: loop.sessionIdPrefix,
    });

    if (next.status !== 'ready') {
      return {
        status: 'blocked',
        issues: next.issues,
      };
    }

    return {
      status: 'ready',
      answer,
      loop: next.loop,
    };
  }

  const carryoverPhraseIds = unique(answer.carryoverPhraseIds);
  const assembly: PlanDayRuntimeAssembly = updateCarryover({
    ...loop.assembly,
    activeSession: answer.updatedSession,
    activeViewModel: answer.updatedViewModel,
  }, carryoverPhraseIds);

  return {
    status: 'ready',
    answer,
    loop: {
      ...loop,
      completedBlockIds: [...answer.completedBlockIds],
      carryoverPhraseIds,
      assembly,
    },
  };
}
