import { captureCurrentAccountObjectiveAttempt } from './mistake_practice_capture';
import type { PlanRecoveryWriteHandlers } from './personal_plan_recovery_write_adapter';
import type { PlanRecoveryAction } from './personal_plan_recovery_actions';
import type { RuntimeStudyTarget } from './target_storage_keys';

export type PlanRecoveryDefaultHandlersOptions = {
  studyTarget?: RuntimeStudyTarget;
};

function facetFor(payload: PlanRecoveryAction) {
  if (payload.mistakeTags.includes('pronunciation')) return 'pronunciation' as const;
  if (payload.mistakeTags.includes('word_order') || payload.grammarTags.includes('word_order')) {
    return 'word_order' as const;
  }
  return 'form' as const;
}

export function createPlanRecoveryDefaultHandlers(
  options: PlanRecoveryDefaultHandlersOptions = {},
): PlanRecoveryWriteHandlers {
  const studyTarget = options.studyTarget === 'fr' ? 'fr' : 'en';
  const capture = async (payload: PlanRecoveryAction) => {
    await captureCurrentAccountObjectiveAttempt({
      attemptId: payload.id,
      studyTarget,
      verdict: 'wrong',
      objective: true,
      content: {
        sourceKind: 'personal_plan',
        sourceId: payload.contentUnitId ?? payload.blockId,
        canonicalTarget: payload.expectedAnswer || payload.contentUnitId || payload.blockId,
        lessonId: `personal-plan:${payload.planId}:${payload.dayIndex}`,
      },
      facet: {
        kind: facetFor(payload),
        expected: payload.expectedAnswer,
      },
    });
  };

  return { mistake_practice: capture };
}
