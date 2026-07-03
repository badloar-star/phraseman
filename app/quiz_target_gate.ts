import { storageStudyTarget, type RuntimeStudyTarget } from './target_storage_keys';

export type QuizContentGate = {
  enabled: boolean;
  studyTarget: 'en' | 'fr';
  reason: 'english_quiz_bank_available' | 'french_quiz_server_pack_available';
  blockedRoutes: readonly string[];
  requiredEvidence: readonly string[];
};

const FRENCH_QUIZ_REQUIRED_EVIDENCE = Object.freeze([
  'french_quiz_question_bank',
  'french_quiz_distractor_review',
  'french_thematic_quiz_source_packet',
  'french_thematic_quiz_distractor_review',
  'ru_uk_quiz_prompt_review',
  'quiz_mistake_taxonomy_mapping_review',
]);

export function quizContentGateForTarget(studyTarget?: RuntimeStudyTarget): QuizContentGate {
  const target = storageStudyTarget(studyTarget);
  if (target === 'fr') {
    return {
      enabled: true,
      studyTarget: 'fr',
      reason: 'french_quiz_server_pack_available',
      blockedRoutes: [],
      requiredEvidence: FRENCH_QUIZ_REQUIRED_EVIDENCE,
    };
  }

  return {
    enabled: true,
    studyTarget: 'en',
    reason: 'english_quiz_bank_available',
    blockedRoutes: [],
    requiredEvidence: [],
  };
}

export function quizContentAvailableForTarget(studyTarget?: RuntimeStudyTarget): boolean {
  return quizContentGateForTarget(studyTarget).enabled;
}

export function frenchQuizGateCopy(sourceLocale?: string) {
  const uk = sourceLocale === 'uk';
  return {
    title: uk ? 'Французькі виклики ще готуються' : 'Французские вызовы ещё готовятся',
    body: uk
      ? 'Англійський банк викликів приховано в режимі French. Виклики відкриються тільки після окремого французького банку завдань, перевірених за джерелами, дистракторами й підказками українською/російською.'
      : 'Английский банк вызовов скрыт в режиме French. Вызовы откроются только после отдельного французского банка заданий, проверенных по источникам, дистракторам и подсказкам на русском/украинском.',
    cta: uk ? 'До уроків' : 'К урокам',
  };
}

export default function __QuizTargetGateRouteShim() {
  return null;
}
