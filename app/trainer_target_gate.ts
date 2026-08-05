import type { RuntimeStudyTarget } from './target_storage_keys';

export type TrainerSourceGatedSurface =
  | 'srs_review'
  | 'trainer_sessions'
  | 'trainer_smart'
  | 'trainer_dev_preview';

export type TrainerSourceGate = {
  enabled: true;
  studyTarget: 'en';
  surface: TrainerSourceGatedSurface;
  blockedRoutes: readonly string[];
  requiredEvidence: readonly string[];
};

export function trainerSourceGateForTarget(
  _studyTarget: RuntimeStudyTarget | undefined,
  surface: TrainerSourceGatedSurface = 'trainer_sessions',
): TrainerSourceGate {
  return {
    enabled: true,
    studyTarget: 'en',
    surface,
    blockedRoutes: [],
    requiredEvidence: [],
  };
}

export function trainerSourceContentAvailableForTarget(
  studyTarget?: RuntimeStudyTarget,
  surface: TrainerSourceGatedSurface = 'trainer_sessions',
): boolean {
  return trainerSourceGateForTarget(studyTarget, surface).enabled;
}

export function srsReviewContentAvailableForTarget(studyTarget?: RuntimeStudyTarget): boolean {
  return trainerSourceContentAvailableForTarget(studyTarget, 'srs_review');
}

export function trainerSessionContentAvailableForTarget(studyTarget?: RuntimeStudyTarget): boolean {
  return trainerSourceContentAvailableForTarget(studyTarget, 'trainer_sessions');
}

export default function __TrainerTargetGateRouteShim() {
  return null;
}
