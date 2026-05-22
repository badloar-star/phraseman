import { storageStudyTarget, type RuntimeStudyTarget } from './target_storage_keys';

export type DailyPhraseContentGate = {
  enabled: boolean;
  studyTarget: 'en' | 'fr';
  reason: 'english_daily_phrase_bank_available' | 'french_daily_phrase_source_gate';
  blockedSurfaces: readonly string[];
  requiredEvidence: readonly string[];
};

const FRENCH_DAILY_PHRASE_REQUIRED_EVIDENCE = Object.freeze([
  'french_daily_phrase_bank',
  'ru_uk_daily_phrase_prompt_review',
  'french_flashcard_system_bank',
  'ru_uk_flashcard_prompt_review',
]);

export function dailyPhraseContentGateForTarget(studyTarget?: RuntimeStudyTarget): DailyPhraseContentGate {
  const target = storageStudyTarget(studyTarget);
  if (target === 'fr') {
    return {
      enabled: false,
      studyTarget: 'fr',
      reason: 'french_daily_phrase_source_gate',
      blockedSurfaces: ['home_daily_phrase_card', 'phrase_of_day_notification', 'daily_phrase_flashcard_save'],
      requiredEvidence: FRENCH_DAILY_PHRASE_REQUIRED_EVIDENCE,
    };
  }

  return {
    enabled: true,
    studyTarget: 'en',
    reason: 'english_daily_phrase_bank_available',
    blockedSurfaces: [],
    requiredEvidence: [],
  };
}

export function dailyPhraseContentAvailableForTarget(studyTarget?: RuntimeStudyTarget): boolean {
  return dailyPhraseContentGateForTarget(studyTarget).enabled;
}

export function frenchDailyPhraseGateCopy(sourceLocale?: string) {
  const uk = sourceLocale === 'uk';
  return {
    title: uk ? 'Фраза дня французькою ще готується' : 'Фраза дня для French ещё готовится',
    body: uk
      ? 'Англійську фразу дня приховано в режимі French. Вона відкриється тільки після окремого французького банку, перевіреного за джерелами й поясненнями українською/російською.'
      : 'Английская фраза дня скрыта в режиме French. Она откроется только после отдельного французского банка, проверенного по источникам и объяснениям на русском/украинском.',
  };
}

export default function __DailyPhraseTargetGateRouteShim() {
  return null;
}
