import {
  LEARNING_V2_SESSION_CARD_PURPOSES,
  learningV2GeneratedMeaningSourceHash,
  learningV2GeneratedSessionShardFingerprint,
  validateLearningV2GeneratedSessionShardV1,
} from '../modules/learning-v2/content/generator_session_shard';
import {
  LEARNING_V2_INTERFACE_LOCALES,
  LEARNING_V2_REQUIRED_CONTENT_KINDS,
  type LearningV2Localized,
} from '../modules/learning-v2/content/generator_course_contract';
import { REQUIRED_SESSION_POLICY_V1 } from '../modules/learning-v2/content/session_compiler';
import type { V2ActivityFamily } from '../modules/learning-v2/contracts/activity';
import type { V2SessionLearningFunction } from '../modules/learning-v2/contracts/session';

const expected = Object.freeze({
  packageId: 'learning-v2-en-v1',
  targetLanguage: 'en',
  episodeOrdinal: 1,
  requiredSessionOrdinal: 1,
  generationInputFingerprint: 'a'.repeat(64),
});

const localized = <T>(factory: (locale: (typeof LEARNING_V2_INTERFACE_LOCALES)[number]) => T): LearningV2Localized<T> =>
  Object.fromEntries(LEARNING_V2_INTERFACE_LOCALES.map((locale) => [locale, factory(locale)])) as LearningV2Localized<T>;

const FAMILY_FUNCTION: Readonly<Record<V2ActivityFamily, V2SessionLearningFunction>> = Object.freeze({
  visual_discovery: 'notice',
  listen_choose: 'comprehend',
  sound_contrast: 'discriminate',
  sound_syllable_lab: 'discriminate',
  scripted_repeat_compare: 'pronounce',
  phrase_builder: 'assemble',
  listen_build_dictation: 'assemble',
  context_gap_grammar: 'retrieve',
  quick_spoken_response: 'respond',
  shadowing_prosody: 'pronounce',
  describe_scene: 'notice',
  microstory_radio: 'comprehend',
  branching_scene: 'transfer',
  scripted_dialogue: 'transfer',
  personalized_review: 'review',
  speed_match: 'retrieve',
});

const introQuestion = (ordinal: 1 | 2 | 3) => ({
  questionId: `intro-q-${ordinal}`,
  requiredTaskSlot: ordinal,
  promptByLocale: localized((locale) => `Question ${ordinal} ${locale}`),
  choicesByLocale: localized((locale) => [`Choice A ${locale}`, `Choice B ${locale}`, `Choice C ${locale}`] as const),
  correctChoiceIndex: 0 as const,
  explanationByLocale: localized((locale) => `Explanation ${ordinal} ${locale}`),
});

function makeSessionShard() {
  const episodeId = 'episode-01';
  const sessionTemplateId = 'episode-01:session-01';
  const policy = REQUIRED_SESSION_POLICY_V1[0];
  const intro = {
    schemaVersion: 'learning-v2-generated-session-intro.v2' as const,
    sessionTemplateId,
    titleByLocale: localized((locale) => `Meet English ${locale}`),
    summaryByLocale: localized((locale) => `Absolute-zero lesson summary ${locale}`),
    learningGoalByLocale: localized((locale) => `Say who you are ${locale}`),
    blocks: ([1, 2, 3] as const).map((ordinal) => ({
      blockId: `concept-${ordinal}`,
      kind: ordinal === 2 ? 'example' as const : 'concept' as const,
      titleByLocale: localized((locale) => `Concept ${ordinal} ${locale}`),
      bodyByLocale: localized((locale) => `Full explanation ${ordinal} ${locale}`),
    })),
    checkQuestions: [introQuestion(1), introQuestion(2), introQuestion(3)] as const,
  };
  const cards = Array.from({ length: 12 }, (_, index) => {
    const slot = index + 1;
    const paddedSlot = String(slot).padStart(2, '0');
    const family = policy.families[index % policy.families.length];
    const contentItemId = `content-${episodeId}-s01-${paddedSlot}`;
    const targetText = `Hello phrase ${slot}`;
    const contentItem = {
      schemaVersion: 'v2-content-item.v1' as const,
      contentItemId,
      episodeId,
      intentId: `intent-${slot}`,
      target: { locale: 'en', text: targetText, register: 'neutral', region: 'global' },
      learnerMeanings: LEARNING_V2_INTERFACE_LOCALES.map((locale) => {
        const meaning = `Meaning ${slot} ${locale}`;
        return {
          locale,
          value: meaning,
          sourceHash: learningV2GeneratedMeaningSourceHash({
            contentItemId,
            targetLanguage: 'en',
            targetText,
            locale,
            meaning,
            generationInputFingerprint: expected.generationInputFingerprint,
          }),
        };
      }),
      acceptedAnswers: [targetText],
      rejectedAnswers: [{ value: `Wrong phrase ${slot}`, reasonCode: 'meaning_mismatch' }],
      linguisticFeatures: ['absolute_zero_greeting'],
      pronunciationTargets: [],
      prerequisiteContentItemIds: [],
      objectiveIds: ['objective-e01'],
      compatibleFamilies: [family],
    };
    const needsAudio = ['listen_choose', 'sound_contrast', 'listen_build_dictation', 'scripted_repeat_compare'].includes(family);
    return {
      cardId: `card-${episodeId}-s01-${paddedSlot}`,
      taskSlot: slot,
      purpose: LEARNING_V2_SESSION_CARD_PURPOSES[index],
      activityId: `activity-${episodeId}-s01-${paddedSlot}-${family}`,
      family,
      learningFunction: FAMILY_FUNCTION[family],
      support: policy.support,
      promptNovelty: 'trained' as const,
      promptId: `prompt-${episodeId}-01-${paddedSlot}`,
      introQuestionId: slot <= 3 ? intro.checkQuestions[slot - 1].questionId : null,
      contentItem,
      instructionByLocale: localized((locale) => `Instruction ${slot} ${locale}`),
      hintByLocale: localized((locale) => `Hint ${slot} ${locale}`),
      successMessageByLocale: localized((locale) => `Success ${slot} ${locale}`),
      retryMessageByLocale: localized((locale) => `Retry ${slot} ${locale}`),
      errorExplanationByLocale: localized((locale) => `Why this answer is wrong ${slot} ${locale}`),
      accessibilityLabelByLocale: localized((locale) => `Accessible task ${slot} ${locale}`),
      audioScript: needsAudio ? {
        contentItemId,
        language: 'en',
        inputText: targetText,
        characterId: null,
        instructions: 'Natural, clear, friendly absolute-beginner English.',
      } : null,
    };
  });
  return {
    schemaVersion: 'learning-v2-generated-session-shard.v1' as const,
    packageId: expected.packageId,
    targetLanguage: expected.targetLanguage,
    episodeOrdinal: expected.episodeOrdinal,
    requiredSessionOrdinal: expected.requiredSessionOrdinal,
    episodeId,
    sessionId: 'session-episode-01-01',
    sessionTemplateId,
    canDoOutcomeId: 'objective-e01',
    zone: 'understand' as const,
    support: policy.support,
    generationInputFingerprint: expected.generationInputFingerprint,
    interfaceLocales: LEARNING_V2_INTERFACE_LOCALES,
    contentKinds: LEARNING_V2_REQUIRED_CONTENT_KINDS,
    intro,
    cards,
  };
}

describe('Learning V2 all-locale generated session shard', () => {
  test('accepts exactly one complete 12-card session across all eight interface locales', () => {
    const shard = makeSessionShard();
    const validated = validateLearningV2GeneratedSessionShardV1(shard, expected);
    expect(validated.cards).toHaveLength(12);
    expect(validated.intro.checkQuestions.map((question) => question.requiredTaskSlot)).toEqual([1, 2, 3]);
    expect(learningV2GeneratedSessionShardFingerprint(shard, expected)).toMatch(/^[a-f0-9]{64}$/);
  });

  test('rejects the historical 7-9 card demo shape', () => {
    const shard = makeSessionShard();
    expect(() => validateLearningV2GeneratedSessionShardV1({ ...shard, cards: shard.cards.slice(0, 9) }, expected))
      .toThrow('learning_v2_session_shard_cards_invalid');
  });

  test('rejects a missing interface language and an intro question detached from its star slot', () => {
    const shard = makeSessionShard();
    const { pl: _missing, ...missingPolish } = shard.cards[0].hintByLocale;
    const brokenLocale = {
      ...shard,
      cards: [{ ...shard.cards[0], hintByLocale: missingPolish }, ...shard.cards.slice(1)],
    };
    expect(() => validateLearningV2GeneratedSessionShardV1(brokenLocale, expected))
      .toThrow('learning_v2_generator_hintByLocale_locales_invalid');
    const detachedIntro = {
      ...shard,
      cards: [{ ...shard.cards[0], introQuestionId: 'intro-q-2' }, ...shard.cards.slice(1)],
    };
    expect(() => validateLearningV2GeneratedSessionShardV1(detachedIntro, expected))
      .toThrow('learning_v2_session_shard_intro_binding_invalid');
  });

  test('rejects a wrong canonical family and a forged localized meaning', () => {
    const shard = makeSessionShard();
    const wrongFamily = {
      ...shard,
      cards: [{ ...shard.cards[0], family: 'phrase_builder' }, ...shard.cards.slice(1)],
    };
    expect(() => validateLearningV2GeneratedSessionShardV1(wrongFamily, expected))
      .toThrow('learning_v2_session_shard_card_identity_invalid');
    const forgedMeaning = {
      ...shard,
      cards: [{
        ...shard.cards[0],
        contentItem: {
          ...shard.cards[0].contentItem,
          learnerMeanings: [{ ...shard.cards[0].contentItem.learnerMeanings[0], value: 'Forged meaning' }, ...shard.cards[0].contentItem.learnerMeanings.slice(1)],
        },
      }, ...shard.cards.slice(1)],
    };
    expect(() => validateLearningV2GeneratedSessionShardV1(forgedMeaning, expected))
      .toThrow('learning_v2_session_shard_meanings_invalid');
  });

  test('requires an exact audio script only for listening and speaking families', () => {
    const shard = makeSessionShard();
    const audioIndex = shard.cards.findIndex((card) => card.audioScript !== null);
    const missingAudio = {
      ...shard,
      cards: shard.cards.map((card, index) => index === audioIndex ? { ...card, audioScript: null } : card),
    };
    expect(() => validateLearningV2GeneratedSessionShardV1(missingAudio, expected))
      .toThrow('learning_v2_session_shard_audio_required');
    const silentIndex = shard.cards.findIndex((card) => card.audioScript === null);
    const unexpectedAudio = {
      ...shard,
      cards: shard.cards.map((card, index) => index === silentIndex ? { ...card, audioScript: {
        contentItemId: card.contentItem.contentItemId,
        language: 'en',
        inputText: card.contentItem.target.text,
        characterId: null,
        instructions: 'Unexpected audio.',
      } } : card),
    };
    expect(() => validateLearningV2GeneratedSessionShardV1(unexpectedAudio, expected))
      .toThrow('learning_v2_session_shard_audio_unexpected');
  });
});
