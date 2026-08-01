import type { Lang } from '../constants/i18n';
import { FRENCH_CONTENT_SOURCE_GATE } from './french_content_source_gate';
import { storageStudyTarget, type RuntimeStudyTarget } from './target_storage_keys';

export type TrainerSourceGatedSurface =
  | 'srs_review'
  | 'trainer_sessions'
  | 'trainer_smart'
  | 'trainer_dev_preview';

export type TrainerSourceGate = {
  enabled: boolean;
  studyTarget: 'en' | 'fr';
  surface: TrainerSourceGatedSurface;
  reason?: 'french_srs_trainer_source_gate' | 'french_trainer_local_mistakes_available';
  blockedRoutes: readonly string[];
  requiredEvidence: readonly string[];
};

export const FRENCH_TRAINER_REQUIRED_EVIDENCE = Object.freeze([
  'french_srs_review_packet',
  'french_trainer_phrase_queue_review',
  'french_trainer_word_queue_review',
  'french_trainer_distractor_review',
  'french_personal_practice_mistake_taxonomy_review',
  'french_pos_workout_profile_review',
  'ru_uk_personal_practice_prompt_review',
]);

const TRAINER_BLOCKED_ROUTES = Object.freeze([
  '/review',
  '/trainer',
  '/trainer_words_session',
  '/trainer_phrases_session',
]);

export function trainerSourceGateForTarget(
  studyTarget: RuntimeStudyTarget | undefined,
  surface: TrainerSourceGatedSurface = 'trainer_sessions',
): TrainerSourceGate {
  const target = storageStudyTarget(studyTarget);
  if (target !== 'fr') {
    return {
      enabled: true,
      studyTarget: 'en',
      surface,
      blockedRoutes: [],
      requiredEvidence: [],
    };
  }

  return {
    enabled: true,
    studyTarget: 'fr',
    surface,
    reason: 'french_trainer_local_mistakes_available',
    blockedRoutes: [],
    requiredEvidence: FRENCH_TRAINER_REQUIRED_EVIDENCE,
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

export function frenchTrainerGateCopy(lang: Lang): { title: string; body: string; action: string } {
  const uk = lang === 'uk';
  return uk
    ? {
        title: 'French тренування ще на source gate',
        body: 'Англійські SRS/Trainer картки приховано в режимі French. Тренування відкриються тільки після окремого French trainer packet: черги фраз/слів, дистрактори, таксономія помилок і RU/UK підказки.',
        action: 'До уроків',
      }
    : {
        title: 'French тренировки ещё на source gate',
        body: 'Английские SRS/Trainer карточки скрыты в режиме French. Тренировки откроются только после отдельного French trainer packet: очереди фраз/слов, дистракторы, таксономия ошибок и RU/UK подсказки.',
        action: 'К урокам',
      };
}

export const FRENCH_TRAINER_SOURCE_GATE_REQUIRED_EVIDENCE = Object.freeze([
  ...FRENCH_TRAINER_REQUIRED_EVIDENCE,
  ...FRENCH_CONTENT_SOURCE_GATE.requiredEvidenceBeforeActivation,
]);

export default function __TrainerTargetGateRouteShim() {
  return null;
}
