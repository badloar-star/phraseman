import { recordMistake as recordRecallMistake } from './active_recall';
import { logMistake, type MistakeTokenMeta } from './mistake_log';
import {
  createPlanRecoveryLegacyHandlers,
  type PlanRecoveryLegacyPayload,
} from './personal_plan_recovery_legacy_handlers';
import { recordPhraseMistake } from './trainer_store';
import type { RuntimeStudyTarget } from './target_storage_keys';

export type PlanRecoveryDefaultHandlersOptions = {
  studyTarget?: RuntimeStudyTarget;
};

function lessonIdForPlanPayload(payload: PlanRecoveryLegacyPayload): number {
  return Number.isFinite(payload.dayIndex) && payload.dayIndex > 0
    ? Math.floor(payload.dayIndex)
    : 1;
}

function fallbackTranslation(payload: PlanRecoveryLegacyPayload): string {
  return payload.expectedAnswer?.trim() || payload.phrase;
}

function mistakeMetaForPayload(payload: PlanRecoveryLegacyPayload): MistakeTokenMeta {
  return {
    tokenText: payload.expectedAnswer,
    expected: payload.expectedAnswer,
    picked: payload.selectedAnswerKnown ? payload.selectedAnswer : undefined,
    rawCategory: payload.category,
    grammarTag: payload.category,
    ...payload.planContext,
  };
}

export function createPlanRecoveryDefaultHandlers(
  options: PlanRecoveryDefaultHandlersOptions = {},
) {
  const { studyTarget } = options;

  return createPlanRecoveryLegacyHandlers({
    recall: async (payload) => {
      const fallback = fallbackTranslation(payload);
      await recordRecallMistake(
        payload.phrase,
        fallback,
        lessonIdForPlanPayload(payload),
        fallback,
        'lesson',
        undefined,
        mistakeMetaForPayload(payload),
        studyTarget,
      );
    },
    trainer: async (payload) => {
      const fallback = fallbackTranslation(payload);
      await recordPhraseMistake(
        payload.phrase,
        fallback,
        fallback,
        lessonIdForPlanPayload(payload),
        payload.expectedAnswer,
        payload.category,
        undefined,
        studyTarget,
        payload.planContext,
      );
    },
    mistakeAnalytics: (payload) => {
      logMistake(
        payload.phrase,
        lessonIdForPlanPayload(payload),
        'lesson',
        payload.reason === 'skipped_attempt' ? 'forgot' : 'wrong_pick',
        mistakeMetaForPayload(payload),
        studyTarget,
      );
    },
  });
}
