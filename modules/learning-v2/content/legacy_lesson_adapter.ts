// зачем: первый V2-срез обязан брать настоящий урок, а не 10 строк demo fixture.
// Адаптер не меняет исходные фразы: он только делает их трассируемыми V2-item,
// сохраняя английский текст, перевод и word-level distractors старого урока.
import type { LessonPhrase } from '../../../app/lesson_data_types';
import type { V2ActivityFamily } from '../contracts/activity';
import { hashCanonicalBody } from '../policies/decision_registry';
import type { V2ContentItem, V2RejectedAnswer } from './content_item';

export interface AdaptLegacyLessonPhrasesInput {
  readonly episodeId: string;
  readonly objectiveId: string;
  readonly targetLanguage: 'en';
  readonly sourceLocale: 'ru' | 'uk' | 'es';
  readonly phrases: readonly LessonPhrase[];
}

const REQUIRED_SESSION_FAMILIES: readonly V2ActivityFamily[] = Object.freeze([
  'phrase_builder',
  'listen_choose',
  'sound_contrast',
  'listen_build_dictation',
  'context_gap_grammar',
  'speed_match',
  'scripted_repeat_compare',
]);

function sourceMeaning(phrase: LessonPhrase, locale: AdaptLegacyLessonPhrasesInput['sourceLocale']): string {
  if (locale === 'ru') return phrase.russian;
  if (locale === 'uk') return phrase.ukrainian;
  if (!phrase.spanish) throw new Error(`legacy_lesson_source_locale_missing:${phrase.id}:es`);
  return phrase.spanish;
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase('en');
}

function rejectedAnswers(phrase: LessonPhrase): readonly V2RejectedAnswer[] {
  const accepted = new Set([phrase.english, ...(phrase.alternatives ?? [])].map(normalize));
  const rejected = new Map<string, V2RejectedAnswer>();
  const sourceTokens = phrase.words.map((word) => word.text);

  phrase.words.forEach((word, index) => {
    for (const distractor of word.distractors) {
      const candidate = sourceTokens.map((token, tokenIndex) => tokenIndex === index ? distractor : token).join(' ');
      const key = normalize(candidate);
      if (!accepted.has(key) && !rejected.has(key)) {
        rejected.set(key, { value: candidate, reasonCode: `legacy_word_distractor:${word.category ?? 'token'}` });
      }
    }
  });

  if (rejected.size === 0) throw new Error(`legacy_lesson_distractors_missing:${phrase.id}`);
  return Object.freeze([...rejected.values()]);
}

/** Adapts legacy phrase data without generating, paraphrasing or deleting content. */
export function adaptLegacyLessonPhrasesToV2Content(
  input: AdaptLegacyLessonPhrasesInput,
): readonly V2ContentItem[] {
  if (!input.episodeId.trim() || !input.objectiveId.trim()) throw new Error('legacy_lesson_identity_required');
  if (input.phrases.length === 0) throw new Error('legacy_lesson_phrases_required');

  const seenIds = new Set<string>();
  return Object.freeze(input.phrases.map((phrase) => {
    const legacyId = String(phrase.id);
    if (seenIds.has(legacyId)) throw new Error(`legacy_lesson_phrase_duplicate:${legacyId}`);
    seenIds.add(legacyId);
    const meaning = sourceMeaning(phrase, input.sourceLocale);
    const acceptedAnswers = Object.freeze([phrase.english, ...(phrase.alternatives ?? [])]);
    return Object.freeze({
      schemaVersion: 'v2-content-item.v1' as const,
      contentItemId: `legacy-${legacyId}`,
      episodeId: input.episodeId,
      intentId: `legacy-lesson-phrase:${legacyId}`,
      target: Object.freeze({ locale: input.targetLanguage, text: phrase.english, register: 'neutral', region: 'general' }),
      learnerMeanings: Object.freeze([Object.freeze({
        locale: input.sourceLocale,
        value: meaning,
        sourceHash: hashCanonicalBody({ legacyPhraseId: legacyId, locale: input.sourceLocale, value: meaning }),
      })]),
      acceptedAnswers,
      rejectedAnswers: rejectedAnswers(phrase),
      linguisticFeatures: Object.freeze([...new Set(phrase.words.map((word) => `legacy:${word.category ?? 'token'}`))]),
      pronunciationTargets: Object.freeze(phrase.words.map((word) => word.text)),
      prerequisiteContentItemIds: Object.freeze([]),
      objectiveIds: Object.freeze([input.objectiveId]),
      compatibleFamilies: REQUIRED_SESSION_FAMILIES,
    } satisfies V2ContentItem);
  }));
}
