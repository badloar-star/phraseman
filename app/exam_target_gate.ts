import { storageStudyTarget, type RuntimeStudyTarget } from './target_storage_keys';

export type ExamContentGate = {
  enabled: boolean;
  studyTarget: 'en' | 'fr';
  reason: 'english_exam_bank_available' | 'french_exam_source_gate';
  blockedRoutes: readonly string[];
  requiredEvidence: readonly string[];
};

export type FrenchExamGateKind = 'level' | 'final';

const FRENCH_EXAM_REQUIRED_EVIDENCE = Object.freeze([
  'french_exam_question_bank',
  'french_cefr_level_exam_review',
  'ru_uk_exam_prompt_review',
  'mistake_taxonomy_mapping_review',
]);

export function examContentGateForTarget(studyTarget?: RuntimeStudyTarget): ExamContentGate {
  const target = storageStudyTarget(studyTarget);
  if (target === 'fr') {
    return {
      enabled: false,
      studyTarget: 'fr',
      reason: 'french_exam_source_gate',
      blockedRoutes: ['/exam', '/level_exam'],
      requiredEvidence: FRENCH_EXAM_REQUIRED_EVIDENCE,
    };
  }

  return {
    enabled: true,
    studyTarget: 'en',
    reason: 'english_exam_bank_available',
    blockedRoutes: [],
    requiredEvidence: [],
  };
}

export function examContentAvailableForTarget(studyTarget?: RuntimeStudyTarget): boolean {
  return examContentGateForTarget(studyTarget).enabled;
}

export function frenchExamGateCopy(kind: FrenchExamGateKind, sourceLocale?: string) {
  const uk = sourceLocale === 'uk';
  if (kind === 'level') {
    return {
      title: uk ? 'Французький залік ще готується' : 'Французский зачёт ещё готовится',
      body: uk
        ? 'Англійський банк запитань не використовується для French. Заліки відкриються тільки після окремого французького банку, перевіреного за джерелами й рівнями.'
        : 'Английский банк вопросов не используется для French. Зачёты откроются только после отдельного французского банка, проверенного по источникам и уровням.',
      cta: uk ? 'До уроків' : 'К урокам',
    };
  }

  return {
    title: uk ? 'Французький фінальний тест ще готується' : 'Французский итоговый тест ещё готовится',
    body: uk
      ? 'Фінальний англійський тест приховано в режимі French. Його не можна запускати, доки не буде створено й перевірено окремий французький екзаменаційний банк.'
      : 'Финальный английский тест скрыт в режиме French. Его нельзя запускать, пока не будет создан и проверен отдельный французский экзаменационный банк.',
    cta: uk ? 'До уроків' : 'К урокам',
  };
}

export default function __ExamTargetGateRouteShim() {
  return null;
}
