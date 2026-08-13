import { getTrainerPlanWeakSpotDueCount, type TrainerPremiumMode } from './trainer_store';
import type { RuntimeStudyTarget } from './target_storage_keys';

export const PERSONAL_PLAN_TRAINER_WEAK_SPOT_MIN_ITEMS = 1;

export type PersonalPlanTrainerWeakSpotReadinessInput = {
  planWeakSpotDueCount: number;
  generalTrainerDueCount?: number;
  requiredCount?: number;
};

export type PersonalPlanTrainerWeakSpotReadiness =
  | {
      status: 'ready';
      reason: 'plan_weak_spots_due';
      dueCount: number;
      requiredCount: number;
    }
  | {
      status: 'blocked';
      reason: 'no_plan_weak_spots_due';
      dueCount: number;
      generalTrainerDueCount: number;
      requiredCount: number;
    };

function positiveCount(value: number | undefined): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value || 0));
}

export function resolvePersonalPlanTrainerWeakSpotReadiness(
  input: PersonalPlanTrainerWeakSpotReadinessInput,
): PersonalPlanTrainerWeakSpotReadiness {
  const dueCount = positiveCount(input.planWeakSpotDueCount);
  const generalTrainerDueCount = positiveCount(input.generalTrainerDueCount);
  const requiredCount = Math.max(
    1,
    positiveCount(input.requiredCount) || PERSONAL_PLAN_TRAINER_WEAK_SPOT_MIN_ITEMS,
  );

  if (dueCount >= requiredCount) {
    return {
      status: 'ready',
      reason: 'plan_weak_spots_due',
      dueCount,
      requiredCount,
    };
  }

  return {
    status: 'blocked',
    reason: 'no_plan_weak_spots_due',
    dueCount,
    generalTrainerDueCount,
    requiredCount,
  };
}

export async function resolvePersonalPlanTrainerWeakSpotDueCount(input: {
  planInstanceId?: string | null;
  mode?: TrainerPremiumMode;
  studyTarget?: RuntimeStudyTarget;
}): Promise<number> {
  const planInstanceId = input.planInstanceId?.trim();
  if (!planInstanceId) return 0;
  return getTrainerPlanWeakSpotDueCount(planInstanceId, input.mode ?? 'weak', input.studyTarget);
}
