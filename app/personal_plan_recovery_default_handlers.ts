import { captureCurrentAccountObjectiveAttempt } from './mistake_practice_capture';
import { normalizeMistakeStudyTarget } from '../modules/mistake-practice/contracts';
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
  // зачем (22.09): подмена писала ошибки испанского и немецкого в АНГЛИЙСКИЙ
  // журнал — чужие данные смешивались, а свои не появлялись.
  const studyTarget = normalizeMistakeStudyTarget(options.studyTarget);
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
