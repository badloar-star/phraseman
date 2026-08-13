import type { PlanRecoveryAction } from './personal_plan_recovery_actions';
import type {
  PlanRecoveryWriteHandler,
  PlanRecoveryWriteHandlers,
} from './personal_plan_recovery_write_adapter';
import { shouldSkipPlanGrammarAnalytics } from './personal_plan_mistake_context';

export type PlanRecoveryLegacyPayload = {
  actionId: string;
  planInstanceId: string;
  planId: string;
  dayIndex: number;
  blockId: string;
  contentUnitId?: string;
  phrase: string;
  expectedAnswer?: string;
  selectedAnswer?: string;
  selectedAnswerKnown: boolean;
  category?: string;
  grammarTags: string[];
  vocabularyTags: string[];
  mistakeTags: string[];
  reason: 'wrong_attempt' | 'skipped_attempt';
  planContext: PlanRecoveryAction['planContext'];
};

export type PlanRecoveryLegacyWriters = {
  recall?: (payload: PlanRecoveryLegacyPayload) => Promise<void> | void;
  trainer?: (payload: PlanRecoveryLegacyPayload) => Promise<void> | void;
  mistakeAnalytics?: (payload: PlanRecoveryLegacyPayload) => Promise<void> | void;
};

function firstAnalyticsCategory(action: PlanRecoveryAction): string | undefined {
  return action.grammarTags.find((tag) => !shouldSkipPlanGrammarAnalytics(tag));
}

function phraseForAction(action: PlanRecoveryAction): string {
  return action.expectedAnswer || action.contentUnitId || action.id;
}

function payloadForAction(action: PlanRecoveryAction): PlanRecoveryLegacyPayload {
  return {
    actionId: action.id,
    planInstanceId: action.planInstanceId,
    planId: action.planId,
    dayIndex: action.dayIndex,
    blockId: action.blockId,
    contentUnitId: action.contentUnitId,
    phrase: phraseForAction(action),
    expectedAnswer: action.expectedAnswer,
    selectedAnswer: action.selectedAnswerKnown ? action.selectedAnswer : undefined,
    selectedAnswerKnown: action.selectedAnswerKnown,
    category: firstAnalyticsCategory(action),
    grammarTags: action.grammarTags,
    vocabularyTags: action.vocabularyTags,
    mistakeTags: action.mistakeTags,
    reason: action.reason,
    planContext: action.planContext,
  };
}

function handlerForAction(
  writer: NonNullable<PlanRecoveryLegacyWriters[keyof PlanRecoveryLegacyWriters]>,
): PlanRecoveryWriteHandler {
  return async (action) => {
    await writer(payloadForAction(action));
  };
}

export function createPlanRecoveryLegacyHandlers(
  writers: PlanRecoveryLegacyWriters,
): PlanRecoveryWriteHandlers {
  const handlers: PlanRecoveryWriteHandlers = {};

  if (writers.recall) {
    handlers.recall = handlerForAction(writers.recall);
  }
  if (writers.trainer) {
    handlers.trainer = handlerForAction(writers.trainer);
  }
  if (writers.mistakeAnalytics) {
    handlers.mistake_analytics = handlerForAction(writers.mistakeAnalytics);
  }

  return handlers;
}
