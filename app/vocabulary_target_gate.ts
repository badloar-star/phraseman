import type { Lang } from '../constants/i18n';
import { FRENCH_CONTENT_SOURCE_GATE } from './french_content_source_gate';
import type { RuntimeStudyTarget } from './target_storage_keys';

export type VocabularyGateSurface = 'lesson_words' | 'irregular_verbs' | 'preposition_drill';

export type VocabularyContentGate = {
  enabled: boolean;
  studyTarget: 'en' | 'fr';
  reason?: 'french_vocabulary_source_gate' | 'french_irregular_verbs_source_gate' | 'french_preposition_drill_source_gate';
  blockedRoutes: string[];
  requiredEvidence: string[];
};

const FRENCH_VOCABULARY_EVIDENCE = Object.freeze([
  'french_lesson_vocabulary_bank',
  'french_word_form_review',
  'ru_uk_vocabulary_prompt_review',
  'french_audio_pronunciation_review',
]);

const FRENCH_IRREGULAR_VERB_EVIDENCE = Object.freeze([
  'french_verb_conjugation_bank',
  'french_irregular_verb_model_review',
  'ru_uk_verb_prompt_review',
]);

const FRENCH_PREPOSITION_DRILL_EVIDENCE = Object.freeze([
  'french_preposition_drill_bank',
  'french_preposition_contrast_review',
  'ru_uk_preposition_prompt_review',
]);

export function vocabularyContentAvailableForTarget(
  studyTarget?: RuntimeStudyTarget,
  surface: VocabularyGateSurface = 'lesson_words',
): boolean {
  if (studyTarget !== 'fr') return true;
  void surface;
  return false;
}

export function vocabularyContentGateForTarget(
  studyTarget?: RuntimeStudyTarget,
  surface: VocabularyGateSurface = 'lesson_words',
): VocabularyContentGate {
  if (studyTarget !== 'fr') {
    return {
      enabled: true,
      studyTarget: 'en',
      blockedRoutes: [],
      requiredEvidence: [],
    };
  }

  return {
    enabled: false,
    studyTarget: 'fr',
    reason: surface === 'irregular_verbs'
      ? 'french_irregular_verbs_source_gate'
      : surface === 'preposition_drill'
        ? 'french_preposition_drill_source_gate'
        : 'french_vocabulary_source_gate',
    blockedRoutes: surface === 'irregular_verbs'
      ? ['/lesson_irregular_verbs']
      : surface === 'preposition_drill'
        ? ['/preposition_drill']
        : ['/lesson_words'],
    requiredEvidence: surface === 'irregular_verbs'
      ? [...FRENCH_IRREGULAR_VERB_EVIDENCE]
      : surface === 'preposition_drill'
        ? [...FRENCH_PREPOSITION_DRILL_EVIDENCE]
        : [...FRENCH_VOCABULARY_EVIDENCE],
  };
}

export function frenchVocabularyGateCopy(
  surface: VocabularyGateSurface,
  lang: Lang,
): { title: string; body: string; action: string } {
  const uk = lang === 'uk';

  if (surface === 'irregular_verbs') {
    return uk
      ? {
          title: 'Французькі дієслова ще на перевірці',
          body: 'Англійський розділ неправильних дієслів приховано в режимі French. Відкриємо цей екран тільки після окремого source gate для французьких дієслів і підказок українською/російською.',
          action: 'До уроку',
        }
      : {
          title: 'Французские глаголы ещё на проверке',
          body: 'Английский раздел неправильных глаголов скрыт в режиме French. Откроем этот экран только после отдельного source gate для французских глаголов и подсказок на русском/украинском.',
          action: 'К уроку',
        };
  }

  if (surface === 'preposition_drill') {
    return uk
      ? {
          title: 'Французькі прийменники ще на перевірці',
          body: 'Англійський тренажер прийменників приховано в режимі French. Відкриємо його тільки після окремого source gate для французьких прийменників, ключових контрастів і підказок українською/російською.',
          action: 'До уроку',
        }
      : {
          title: 'Французские предлоги ещё на проверке',
          body: 'Английский тренажер предлогов скрыт в режиме French. Откроем его только после отдельного source gate для французских предлогов, ключевых контрастов и подсказок на русском/украинском.',
          action: 'К уроку',
        };
  }

  return uk
    ? {
        title: 'Французький словник ще на перевірці',
        body: 'Англійський словник уроку приховано в режимі French, щоб слова, прогрес і помилки не змішувалися. Словник з’явиться після перевіреного French vocabulary source gate.',
        action: 'До уроку',
      }
    : {
        title: 'Французский словарь ещё на проверке',
        body: 'Английский словарь урока скрыт в режиме French, чтобы слова, прогресс и ошибки не смешивались. Словарь появится после проверенного French vocabulary source gate.',
        action: 'К уроку',
      };
}

export const FRENCH_VOCABULARY_SOURCE_GATE_REQUIRED_EVIDENCE = Object.freeze([
  ...FRENCH_VOCABULARY_EVIDENCE,
  ...FRENCH_IRREGULAR_VERB_EVIDENCE,
  ...FRENCH_PREPOSITION_DRILL_EVIDENCE,
  ...FRENCH_CONTENT_SOURCE_GATE.requiredEvidenceBeforeActivation,
]);

export default function __VocabularyTargetGateRouteShim() {
  return null;
}
