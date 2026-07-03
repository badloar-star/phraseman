import { storageStudyTarget, type RuntimeStudyTarget } from './target_storage_keys';

export type ExamContentGate = {
  enabled: boolean;
  studyTarget: 'en' | 'fr';
  reason: 'english_exam_bank_available' | 'french_quiz_pack_exam_available';
  blockedRoutes: readonly string[];
  requiredEvidence: readonly string[];
};

export type FrenchExamGateKind = 'level' | 'final';

const FRENCH_EXAM_REQUIRED_EVIDENCE = Object.freeze([
  'french_quiz_remote_server_pack',
  'french_exam_from_remote_quiz_runtime',
  'target_scoped_exam_progress',
  'no_english_exam_bank_fallback',
]);

export function examContentGateForTarget(studyTarget?: RuntimeStudyTarget): ExamContentGate {
  const target = storageStudyTarget(studyTarget);
  if (target === 'fr') {
    return {
      enabled: true,
      studyTarget: 'fr',
      reason: 'french_quiz_pack_exam_available',
      blockedRoutes: [],
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
