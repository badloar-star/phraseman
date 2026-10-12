import type { RuntimeStudyTarget } from './target_storage_keys';
import { hasBundledDailyPhrasePack } from './daily_phrase_bundled_packs';

type DailyPhrasePlannedTarget = 'es' | 'de' | 'it';

function isDailyPhrasePlannedTarget(value: RuntimeStudyTarget): value is DailyPhrasePlannedTarget {
  return value === 'es' || value === 'de' || value === 'it';
}

export type DailyPhraseContentGate = {
  enabled: boolean;
  studyTarget: string;
  reason:
    | 'english_daily_phrase_bank_available'
    | 'french_flashcard_system_daily_phrase_available'
    | 'french_daily_phrase_source_gate'
    | 'target_daily_phrase_dev_server_pack'
    | 'target_daily_phrase_bundled_pack'
    | 'native_daily_phrase_pack_not_available'
    | 'unsupported_daily_phrase_target';
  blockedSurfaces: readonly string[];
  requiredEvidence: readonly string[];
};

const FRENCH_DAILY_PHRASE_REQUIRED_EVIDENCE = Object.freeze([
  'french_daily_phrase_bank',
  'ru_uk_daily_phrase_prompt_review',
  'french_flashcard_system_bank',
  'ru_uk_flashcard_prompt_review',
]);

// зачем (владелец 12.10, D163, «сперва логи»): одна строка на смену решения по цели — без шума на каждый рендер карточки.
const lastLoggedGate = new Map<string, string>();
function logGateDecision(gate: DailyPhraseContentGate): DailyPhraseContentGate {
  const signature = `${gate.enabled}:${gate.reason}`;
  if (lastLoggedGate.get(gate.studyTarget) !== signature) {
    lastLoggedGate.set(gate.studyTarget, signature);
    console.log('[DAILY-PHRASE-GATE] decision', JSON.stringify({ // guard-ok: решение гейта с причиной и источником
      studyTarget: gate.studyTarget,
      enabled: gate.enabled,
      reason: gate.reason,
      packSource: gate.reason === 'target_daily_phrase_bundled_pack' ? 'bundled'
        : gate.reason === 'english_daily_phrase_bank_available' ? 'bundled_idiom_bank'
          : gate.reason === 'french_flashcard_system_daily_phrase_available' ? 'remote_flashcards' : 'none',
    }));
  }
  return gate;
}

export function dailyPhraseContentGateForTarget(studyTarget?: RuntimeStudyTarget): DailyPhraseContentGate {
  return logGateDecision(resolveDailyPhraseContentGate(studyTarget));
}

function resolveDailyPhraseContentGate(studyTarget?: RuntimeStudyTarget): DailyPhraseContentGate {
  const target = studyTarget == null ? 'en' : studyTarget;
  if (isDailyPhrasePlannedTarget(target)) {
    // зачем (владелец 12.10 через координатора: «Фразы дня должны быть подключены для ВСЕХ языков… ВКЛЮЧАЙ», D163): принятые
    // пакеты 2026.10.04.editorial-accepted-dev-v1 теперь в сборке (app/daily_phrase_bundled_packs.ts) — dev-сервер не нужен.
    if (hasBundledDailyPhrasePack(target)) {
      return {
        enabled: true,
        studyTarget: target,
        reason: 'target_daily_phrase_bundled_pack',
        blockedSurfaces: [],
        requiredEvidence: [
          `${target}_daily_phrase_editorial_accepted_pack`,
          'bundled_pack_sha256_checked_at_generation',
          'no_english_idiom_bank_fallback',
        ],
      };
    }
    return {
      enabled: false,
      studyTarget: target,
      reason: 'native_daily_phrase_pack_not_available',
      blockedSurfaces: ['home_daily_phrase', 'daily_phrase_quest', 'daily_phrase_save'],
      requiredEvidence: [
        `${target}_daily_phrase_bank`,
        `${target}_daily_phrase_source_evidence`,
        `${target}_daily_phrase_runtime_pack`,
        'no_english_idiom_bank_fallback',
      ],
    };
  }
  if (target === 'fr') {
    return {
      enabled: true,
      studyTarget: 'fr',
      reason: 'french_flashcard_system_daily_phrase_available',
      blockedSurfaces: [],
      requiredEvidence: [
        'french_flashcard_system_bank',
        'french_daily_phrase_from_remote_flashcards_runtime',
        'target_scoped_daily_phrase_cache',
        'no_english_idiom_bank_fallback',
      ],
    };
  }

  if (target !== 'en') {
    return {
      enabled: false,
      studyTarget: String(target),
      reason: 'unsupported_daily_phrase_target',
      blockedSurfaces: ['home_daily_phrase', 'daily_phrase_quest', 'daily_phrase_save'],
      requiredEvidence: ['supported_study_target', 'no_english_idiom_bank_fallback'],
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

export function dailyPhraseGateCopyForTarget(
  studyTarget?: RuntimeStudyTarget,
  sourceLocale?: string,
) {
  if (studyTarget === 'fr') return frenchDailyPhraseGateCopy(sourceLocale);

  const uk = sourceLocale === 'uk';
  const targetLabel = studyTarget === 'es'
    ? 'Spanish'
    : studyTarget === 'de'
      ? 'German'
      : studyTarget === 'it'
        ? 'Italian'
      : uk
        ? 'обраної мови'
        : 'выбранного языка';
  return {
    title: uk
      ? `Фраза дня для ${targetLabel} ще готується`
      : `Фраза дня для ${targetLabel} ещё готовится`,
    body: uk
      ? 'Контент для обраної мови поки недоступний. Англійська фраза не буде показана замість нього.'
      : 'Контент для выбранного языка пока недоступен. Английская фраза не будет показана вместо него.',
  };
}

export default function __DailyPhraseTargetGateRouteShim() {
  return null;
}
