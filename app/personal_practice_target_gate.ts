import type { Lang } from '../constants/i18n';
import { storageStudyTarget, type RuntimeStudyTarget } from './target_storage_keys';

export const FRENCH_PERSONAL_PRACTICE_REQUIRED_EVIDENCE = Object.freeze([
  'french_personal_practice_training_bank',
  'french_personal_practice_mistake_taxonomy_review',
  'french_pos_workout_profile_review',
  'ru_uk_personal_practice_prompt_review',
]);

export type PersonalPracticeCoachGate = {
  enabled: boolean;
  studyTarget: 'en' | 'fr';
  reason: 'english_personal_training_available' | 'french_personal_training_source_gate';
  blockedRoutes: readonly string[];
  requiredEvidence: readonly string[];
};

export function personalPracticeCoachGateForTarget(
  studyTarget?: RuntimeStudyTarget,
): PersonalPracticeCoachGate {
  const target = storageStudyTarget(studyTarget);
  if (target === 'fr') {
    return {
      enabled: false,
      studyTarget: 'fr',
      reason: 'french_personal_training_source_gate',
      blockedRoutes: ['/problem_coach'],
      requiredEvidence: FRENCH_PERSONAL_PRACTICE_REQUIRED_EVIDENCE,
    };
  }
  return {
    enabled: true,
    studyTarget: 'en',
    reason: 'english_personal_training_available',
    blockedRoutes: [],
    requiredEvidence: [],
  };
}

export function personalPracticeCoachEnabledForTarget(studyTarget?: RuntimeStudyTarget): boolean {
  return personalPracticeCoachGateForTarget(studyTarget).enabled;
}

export type FrenchPersonalPracticeGateCopy = {
  title: string;
  body: string;
  toast: string;
};

export function frenchPersonalPracticeGateCopy(lang: Lang): FrenchPersonalPracticeGateCopy {
  if (lang === 'uk') {
    return {
      title: 'French personal practice на source gate',
      body: 'Англійські персональні тренування приховано: для French потрібні окремі перевірені тренування, таксономія помилок і RU/UK підказки.',
      toast: 'French personal practice заблоковано: потрібні source-gated матеріали.',
    };
  }
  return {
    title: 'French personal practice на source gate',
    body: 'Английские персональные тренировки скрыты: для French нужны отдельные проверенные тренировки, таксономия ошибок и RU/UK подсказки.',
    toast: 'French personal practice заблокирован: нужны source-gated материалы.',
  };
}

export default function __PersonalPracticeTargetGateRouteShim() {
  return null;
}
