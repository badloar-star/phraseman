import { storageStudyTarget, type RuntimeStudyTarget } from './target_storage_keys';

export type DiagnosticContentGate = {
  enabled: boolean;
  studyTarget: 'en' | 'fr';
  reason: 'english_diagnostic_bank_available' | 'french_diagnostic_source_gate';
  blockedRoutes: readonly string[];
  requiredEvidence: readonly string[];
};

const FRENCH_DIAGNOSTIC_REQUIRED_EVIDENCE = Object.freeze([
  'french_diagnostic_question_bank',
  'french_cefr_placement_review',
  'ru_uk_diagnostic_prompt_review',
  'diagnostic_mistake_mapping_review',
]);

export function diagnosticContentGateForTarget(studyTarget?: RuntimeStudyTarget): DiagnosticContentGate {
  const target = storageStudyTarget(studyTarget);
  if (target === 'fr') {
    return {
      enabled: false,
      studyTarget: 'fr',
      reason: 'french_diagnostic_source_gate',
      blockedRoutes: ['/diagnostic_test'],
      requiredEvidence: FRENCH_DIAGNOSTIC_REQUIRED_EVIDENCE,
    };
  }

  return {
    enabled: true,
    studyTarget: 'en',
    reason: 'english_diagnostic_bank_available',
    blockedRoutes: [],
    requiredEvidence: [],
  };
}

export function diagnosticContentAvailableForTarget(studyTarget?: RuntimeStudyTarget): boolean {
  return diagnosticContentGateForTarget(studyTarget).enabled;
}

export function frenchDiagnosticGateCopy(sourceLocale?: string) {
  const uk = sourceLocale === 'uk';
  return {
    title: uk ? 'Французька діагностика ще готується' : 'Французская диагностика ещё готовится',
    body: uk
      ? 'Англійський діагностичний тест приховано в режимі French. Діагностика відкриється тільки після окремого французького банку, перевіреного за джерелами й рівнями.'
      : 'Английский диагностический тест скрыт в режиме French. Диагностика откроется только после отдельного французского банка, проверенного по источникам и уровням.',
    cta: uk ? 'До уроків' : 'К урокам',
  };
}

export default function __DiagnosticTargetGateRouteShim() {
  return null;
}
