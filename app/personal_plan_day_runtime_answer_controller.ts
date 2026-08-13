import type { PlanAttemptEvent } from './personal_plan_engine_contracts';
import {
  submitPlanRuntimeSessionAnswer,
  type PlanRuntimeExerciseSession,
} from './personal_plan_exercise_runtime_session';
import {
  buildPlanRuntimeExerciseViewModel,
  validatePlanRuntimeExerciseViewModel,
  type PlanRuntimeExerciseViewModel,
} from './personal_plan_exercise_runtime_view_model';
import type { PlanDayRuntimeAssembly } from './personal_plan_day_runtime_assembler';

export type ApplyPlanDayRuntimeAnswerInput = {
  selectedAnswer?: string | null;
  occurredAt?: string;
};

export type ApplyPlanDayRuntimeAnswerReadyResult = {
  status: 'ready';
  submission: {
    isCorrect: boolean;
    event: PlanAttemptEvent;
  };
  updatedSession: PlanRuntimeExerciseSession;
  updatedViewModel: PlanRuntimeExerciseViewModel;
  blockCompleted: boolean;
  shouldReassembleDay: boolean;
  completedBlockIds: string[];
  carryoverPhraseIds: string[];
};

export type ApplyPlanDayRuntimeAnswerResult =
  | ApplyPlanDayRuntimeAnswerReadyResult
  | {
    status: 'blocked';
    issues: string[];
  };

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function selectedAnswer(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function applyPlanDayRuntimeAnswer(
  assembly: PlanDayRuntimeAssembly,
  input: ApplyPlanDayRuntimeAnswerInput,
): ApplyPlanDayRuntimeAnswerResult {
  if (!assembly.activeSession || !assembly.activeBlockId) {
    return {
      status: 'blocked',
      issues: ['no_active_session'],
    };
  }

  const answer = selectedAnswer(input.selectedAnswer);
  if (!answer) {
    return {
      status: 'blocked',
      issues: ['missing_selected_answer'],
    };
  }

  const result = submitPlanRuntimeSessionAnswer(assembly.activeSession, {
    selectedAnswer: answer,
    occurredAt: input.occurredAt,
  });

  if (result.status !== 'ready') {
    return {
      status: 'blocked',
      issues: ['runtime_submission_blocked', result.issue.code],
    };
  }

  const updatedViewModel = buildPlanRuntimeExerciseViewModel(result.session);
  const viewIssues = validatePlanRuntimeExerciseViewModel(updatedViewModel);
  if (viewIssues.length > 0) {
    return {
      status: 'blocked',
      issues: ['updated_view_model_invalid', ...viewIssues],
    };
  }

  const blockCompleted = result.session.progress.completedAll;
  const completedBlockIds = blockCompleted
    ? unique([...assembly.completedBlockIds, assembly.activeBlockId])
    : [...assembly.completedBlockIds];
  const carryoverPhraseIds = unique([
    ...assembly.carryover.phraseIds,
    ...result.session.openMissedPhraseIds,
  ]);

  return {
    status: 'ready',
    submission: {
      isCorrect: result.submission.isCorrect,
      event: result.submission.event,
    },
    updatedSession: result.session,
    updatedViewModel,
    blockCompleted,
    shouldReassembleDay: blockCompleted,
    completedBlockIds,
    carryoverPhraseIds,
  };
}
