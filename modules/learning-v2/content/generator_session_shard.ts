import type { V2ActivityFamily } from '../contracts/activity';
import type { LearningSupportLevel } from '../contracts/episode';
import type { V2SessionLearningFunction } from '../contracts/session';
import { hashCanonicalBody, canonicalJsonV1, utf8ByteLengthV1 } from '../policies/decision_registry';
import { validateV2ContentItem, type V2ContentItem } from './content_item';
import {
  LEARNING_V2_INTERFACE_LOCALES,
  LEARNING_V2_REQUIRED_CONTENT_KINDS,
  assertLearningV2LocalizedEnvelope,
  type LearningV2Localized,
} from './generator_course_contract';
import {
  validateLearningV2GeneratedSessionIntro,
  type LearningV2GeneratedSessionIntro,
} from './generator_session_contract';
import { REQUIRED_SESSION_POLICY_V1 } from './session_compiler';

export const LEARNING_V2_SESSION_CARD_PURPOSES = Object.freeze([
  'intro_check', 'intro_check', 'intro_check',
  'supported_practice', 'supported_practice',
  'guided_practice', 'guided_practice',
  'retrieval_practice', 'near_transfer',
  'independent_check', 'delayed_review', 'independent_check',
] as const);

export type LearningV2SessionCardPurpose = (typeof LEARNING_V2_SESSION_CARD_PURPOSES)[number];

export type LearningV2GeneratedSessionAudioScript = Readonly<{
  contentItemId: string;
  language: string;
  inputText: string;
  characterId: string | null;
  instructions: string;
}>;

export type LearningV2GeneratedSessionCardV1 = Readonly<{
  cardId: string;
  taskSlot: number;
  purpose: LearningV2SessionCardPurpose;
  activityId: string;
  family: V2ActivityFamily;
  learningFunction: V2SessionLearningFunction;
  support: LearningSupportLevel;
  promptNovelty: 'trained' | 'varied' | 'novel';
  promptId: string;
  introQuestionId: string | null;
  contentItem: V2ContentItem;
  instructionByLocale: LearningV2Localized<string>;
  hintByLocale: LearningV2Localized<string>;
  successMessageByLocale: LearningV2Localized<string>;
  retryMessageByLocale: LearningV2Localized<string>;
  errorExplanationByLocale: LearningV2Localized<string>;
  accessibilityLabelByLocale: LearningV2Localized<string>;
  audioScript: LearningV2GeneratedSessionAudioScript | null;
}>;

export type LearningV2GeneratedSessionShardV1 = Readonly<{
  schemaVersion: 'learning-v2-generated-session-shard.v1';
  packageId: string;
  targetLanguage: string;
  episodeOrdinal: number;
  requiredSessionOrdinal: number;
  episodeId: string;
  sessionId: string;
  sessionTemplateId: string;
  canDoOutcomeId: string;
  zone: 'understand' | 'use' | 'master';
  support: LearningSupportLevel;
  generationInputFingerprint: string;
  interfaceLocales: typeof LEARNING_V2_INTERFACE_LOCALES;
  contentKinds: typeof LEARNING_V2_REQUIRED_CONTENT_KINDS;
  intro: LearningV2GeneratedSessionIntro;
  cards: readonly LearningV2GeneratedSessionCardV1[];
}>;

export type LearningV2GeneratedSessionShardExpected = Readonly<{
  packageId: string;
  targetLanguage: string;
  episodeOrdinal: number;
  requiredSessionOrdinal: number;
  generationInputFingerprint: string;
}>;

const TOP_KEYS = Object.freeze([
  'schemaVersion', 'packageId', 'targetLanguage', 'episodeOrdinal',
  'requiredSessionOrdinal', 'episodeId', 'sessionId', 'sessionTemplateId',
  'canDoOutcomeId', 'zone', 'support', 'generationInputFingerprint',
  'interfaceLocales', 'contentKinds', 'intro', 'cards',
] as const);
const CARD_KEYS = Object.freeze([
  'cardId', 'taskSlot', 'purpose', 'activityId', 'family', 'learningFunction',
  'support', 'promptNovelty', 'promptId', 'introQuestionId', 'contentItem',
  'instructionByLocale', 'hintByLocale', 'successMessageByLocale',
  'retryMessageByLocale', 'errorExplanationByLocale',
  'accessibilityLabelByLocale', 'audioScript',
] as const);
const AUDIO_KEYS = Object.freeze(['contentItemId', 'language', 'inputText', 'characterId', 'instructions'] as const);
const TOKEN_RE = /^[A-Za-z0-9._:-]{1,160}$/;
const LANGUAGE_RE = /^[a-z]{2,12}(?:-[A-Z]{2})?$/;
const HASH_RE = /^[a-f0-9]{64}$/;
const MAX_SESSION_SHARD_BYTES = 512 * 1024;
const AUDIO_FAMILIES = new Set<V2ActivityFamily>(['listen_choose', 'sound_contrast', 'listen_build_dictation', 'scripted_repeat_compare']);
const FAMILY_FUNCTION: Readonly<Record<V2ActivityFamily, V2SessionLearningFunction>> = Object.freeze({
  visual_discovery: 'notice', listen_choose: 'comprehend', sound_contrast: 'discriminate', sound_syllable_lab: 'discriminate',
  scripted_repeat_compare: 'pronounce', phrase_builder: 'assemble', listen_build_dictation: 'assemble', context_gap_grammar: 'retrieve',
  quick_spoken_response: 'respond', shadowing_prosody: 'pronounce', describe_scene: 'notice', microstory_radio: 'comprehend',
  branching_scene: 'transfer', scripted_dialogue: 'transfer', personalized_review: 'review', speed_match: 'retrieve',
});

function exactKeys(value: Record<string, unknown>, expected: readonly string[], code: string): void {
  const keys = Object.keys(value);
  if (keys.length !== expected.length || keys.some((key) => !expected.includes(key))) throw new Error(code);
}

function exactTuple(value: unknown, expected: readonly string[], code: string): void {
  if (!Array.isArray(value) || value.length !== expected.length || value.some((item, index) => item !== expected[index])) throw new Error(code);
}

function clean(value: unknown, code: string, max = 320): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(code);
  return value.trim();
}

function pad(value: number): string { return String(value).padStart(2, '0'); }

function expectedZone(ordinal: number): 'understand' | 'use' | 'master' {
  if (ordinal <= 4) return 'understand';
  if (ordinal <= 8) return 'use';
  return 'master';
}

function expectedNovelty(zone: 'understand' | 'use' | 'master'): 'trained' | 'varied' | 'novel' {
  if (zone === 'understand') return 'trained';
  if (zone === 'use') return 'varied';
  return 'novel';
}

function assertExpected(expected: LearningV2GeneratedSessionShardExpected): void {
  if (!TOKEN_RE.test(expected.packageId) || !LANGUAGE_RE.test(expected.targetLanguage) || !Number.isSafeInteger(expected.episodeOrdinal) ||
      expected.episodeOrdinal < 1 || expected.episodeOrdinal > 32 || !Number.isSafeInteger(expected.requiredSessionOrdinal) ||
      expected.requiredSessionOrdinal < 1 || expected.requiredSessionOrdinal > 12 || !HASH_RE.test(expected.generationInputFingerprint)) {
    throw new Error('learning_v2_session_shard_expected_invalid');
  }
}

export function learningV2GeneratedMeaningSourceHash(input: Readonly<{
  contentItemId: string;
  targetLanguage: string;
  targetText: string;
  locale: string;
  meaning: string;
  generationInputFingerprint: string;
}>): string {
  return hashCanonicalBody(Object.freeze({ schemaVersion: 'learning-v2-generated-meaning-source.v1', ...input }));
}

function validateLocalizedCopy(value: unknown, field: string): void {
  assertLearningV2LocalizedEnvelope<string>(value, field);
  for (const locale of LEARNING_V2_INTERFACE_LOCALES) clean(value[locale], `learning_v2_session_shard_${field}_invalid`, 1_000);
}

function validateAudioScript(value: unknown, card: V2ContentItem, family: V2ActivityFamily, targetLanguage: string): void {
  if (!AUDIO_FAMILIES.has(family)) {
    if (value !== null) throw new Error('learning_v2_session_shard_audio_unexpected');
    return;
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('learning_v2_session_shard_audio_required');
  const input = value as Record<string, unknown>;
  exactKeys(input, AUDIO_KEYS, 'learning_v2_session_shard_audio_invalid');
  if (input.contentItemId !== card.contentItemId || input.language !== targetLanguage || input.inputText !== card.target.text ||
      (input.characterId !== null && (typeof input.characterId !== 'string' || !TOKEN_RE.test(input.characterId)))) {
    throw new Error('learning_v2_session_shard_audio_invalid');
  }
  clean(input.instructions, 'learning_v2_session_shard_audio_invalid', 800);
}

export function validateLearningV2GeneratedSessionShardV1(
  value: unknown,
  expected: LearningV2GeneratedSessionShardExpected,
): LearningV2GeneratedSessionShardV1 {
  assertExpected(expected);
  let canonical: string;
  try { canonical = canonicalJsonV1(value); } catch { throw new Error('learning_v2_session_shard_json_invalid'); }
  // ASCII length is a constant-memory first fence. The exact UTF-8 count runs
  // only after that, so a corrupt stored/provider value cannot allocate a huge
  // byte array before the 512 KiB limit is enforced.
  if (canonical.length > MAX_SESSION_SHARD_BYTES || utf8ByteLengthV1(canonical) > MAX_SESSION_SHARD_BYTES) {
    throw new Error('learning_v2_session_shard_size_invalid');
  }
  let input: Record<string, unknown>;
  try { input = JSON.parse(JSON.stringify(value)) as Record<string, unknown>; } catch { throw new Error('learning_v2_session_shard_json_invalid'); }
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('learning_v2_session_shard_invalid');
  exactKeys(input, TOP_KEYS, 'learning_v2_session_shard_fields_invalid');
  const episodeId = `episode-${pad(expected.episodeOrdinal)}`;
  const sessionId = `session-${episodeId}-${pad(expected.requiredSessionOrdinal)}`;
  const sessionTemplateId = `${episodeId}:session-${pad(expected.requiredSessionOrdinal)}`;
  const policy = REQUIRED_SESSION_POLICY_V1[expected.requiredSessionOrdinal - 1];
  const zone = expectedZone(expected.requiredSessionOrdinal);
  if (input.schemaVersion !== 'learning-v2-generated-session-shard.v1' || input.packageId !== expected.packageId ||
      input.targetLanguage !== expected.targetLanguage || input.episodeOrdinal !== expected.episodeOrdinal ||
      input.requiredSessionOrdinal !== expected.requiredSessionOrdinal || input.episodeId !== episodeId || input.sessionId !== sessionId ||
      input.sessionTemplateId !== sessionTemplateId || typeof input.canDoOutcomeId !== 'string' || !TOKEN_RE.test(input.canDoOutcomeId) ||
      input.zone !== zone || input.support !== policy.support || input.generationInputFingerprint !== expected.generationInputFingerprint) {
    throw new Error('learning_v2_session_shard_identity_invalid');
  }
  exactTuple(input.interfaceLocales, LEARNING_V2_INTERFACE_LOCALES, 'learning_v2_session_shard_locales_invalid');
  exactTuple(input.contentKinds, LEARNING_V2_REQUIRED_CONTENT_KINDS, 'learning_v2_session_shard_content_kinds_invalid');
  const intro = validateLearningV2GeneratedSessionIntro(input.intro as LearningV2GeneratedSessionIntro);
  if (intro.sessionTemplateId !== sessionTemplateId) throw new Error('learning_v2_session_shard_intro_identity_invalid');
  if (!Array.isArray(input.cards) || input.cards.length !== 12) throw new Error('learning_v2_session_shard_cards_invalid');
  const cards: LearningV2GeneratedSessionCardV1[] = [];
  const contentIds = new Set<string>();
  for (let index = 0; index < input.cards.length; index += 1) {
    const raw = input.cards[index];
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('learning_v2_session_shard_card_invalid');
    const card = raw as Record<string, unknown>;
    exactKeys(card, CARD_KEYS, 'learning_v2_session_shard_card_fields_invalid');
    const slot = index + 1;
    const family = policy.families[index % policy.families.length];
    const contentItemId = `content-${episodeId}-s${pad(expected.requiredSessionOrdinal)}-${pad(slot)}`;
    const activityId = `activity-${episodeId}-s${pad(expected.requiredSessionOrdinal)}-${pad(slot)}-${family}`;
    if (card.cardId !== `card-${episodeId}-s${pad(expected.requiredSessionOrdinal)}-${pad(slot)}` || card.taskSlot !== slot ||
        card.purpose !== LEARNING_V2_SESSION_CARD_PURPOSES[index] || card.activityId !== activityId || card.family !== family ||
        card.learningFunction !== FAMILY_FUNCTION[family] || card.support !== policy.support || card.promptNovelty !== expectedNovelty(zone) ||
        card.promptId !== `prompt-${episodeId}-${pad(expected.requiredSessionOrdinal)}-${pad(slot)}`) {
      throw new Error('learning_v2_session_shard_card_identity_invalid');
    }
    const introQuestionId = slot <= 3 ? intro.checkQuestions[slot - 1].questionId : null;
    if (card.introQuestionId !== introQuestionId) throw new Error('learning_v2_session_shard_intro_binding_invalid');
    const validated = validateV2ContentItem(card.contentItem);
    if (!validated.ok) throw new Error(`learning_v2_session_shard_content_item_invalid:${validated.issues.join(',')}`);
    const item = validated.value;
    if (item.contentItemId !== contentItemId || item.episodeId !== episodeId || item.target.locale !== expected.targetLanguage ||
        !item.objectiveIds.includes(input.canDoOutcomeId as string) || !item.compatibleFamilies.includes(family) || contentIds.has(item.contentItemId)) {
      throw new Error('learning_v2_session_shard_content_item_identity_invalid');
    }
    const previousContentIds = new Set(cards.map((previous) => previous.contentItem.contentItemId));
    if (item.prerequisiteContentItemIds.some((id) => !previousContentIds.has(id))) throw new Error('learning_v2_session_shard_prerequisite_invalid');
    if (item.learnerMeanings.length !== LEARNING_V2_INTERFACE_LOCALES.length || item.learnerMeanings.some((meaning, localeIndex) => {
      const locale = LEARNING_V2_INTERFACE_LOCALES[localeIndex];
      return meaning.locale !== locale || meaning.sourceHash !== learningV2GeneratedMeaningSourceHash({
        contentItemId: item.contentItemId,
        targetLanguage: expected.targetLanguage,
        targetText: item.target.text,
        locale,
        meaning: meaning.value,
        generationInputFingerprint: expected.generationInputFingerprint,
      });
    })) throw new Error('learning_v2_session_shard_meanings_invalid');
    for (const field of ['instructionByLocale', 'hintByLocale', 'successMessageByLocale', 'retryMessageByLocale', 'errorExplanationByLocale', 'accessibilityLabelByLocale'] as const) {
      validateLocalizedCopy(card[field], field);
    }
    validateAudioScript(card.audioScript, item, family, expected.targetLanguage);
    contentIds.add(item.contentItemId);
    cards.push(Object.freeze({ ...(card as unknown as LearningV2GeneratedSessionCardV1), contentItem: item }));
  }
  return Object.freeze({
    ...(input as unknown as LearningV2GeneratedSessionShardV1),
    interfaceLocales: LEARNING_V2_INTERFACE_LOCALES,
    contentKinds: LEARNING_V2_REQUIRED_CONTENT_KINDS,
    intro,
    cards: Object.freeze(cards),
  });
}

export function learningV2GeneratedSessionShardFingerprint(
  value: unknown,
  expected: LearningV2GeneratedSessionShardExpected,
): string {
  return hashCanonicalBody(validateLearningV2GeneratedSessionShardV1(value, expected));
}
