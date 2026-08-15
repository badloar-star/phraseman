import { hashCanonicalBody } from '../policies/decision_registry';
import {
  assertLearningV2LocalizedEnvelope,
  type LearningV2Localized,
} from './generator_course_contract';

/** The only voices the Learning V2 content generator may assign. */
export const LEARNING_V2_OPENAI_TTS_VOICES = Object.freeze([
  'ash',
  'onyx',
  'nova',
  'coral',
] as const);

export type LearningV2OpenAiTtsVoice =
  (typeof LEARNING_V2_OPENAI_TTS_VOICES)[number];

export type LearningV2IntroCheckQuestion = Readonly<{
  questionId: string;
  /** Intro checks occupy the first three ordinary star-bearing task slots. */
  requiredTaskSlot: 1 | 2 | 3;
  promptByLocale: LearningV2Localized<string>;
  choicesByLocale: LearningV2Localized<readonly [string, string, string]>;
  correctChoiceIndex: 0 | 1 | 2;
  explanationByLocale: LearningV2Localized<string>;
}>;

export type LearningV2GeneratedSessionIntroPage = Readonly<{
  pageOrdinal: 1 | 2 | 3;
  pageId: string;
  kind: 'concept' | 'formula' | 'example' | 'trap' | 'tip';
  titleByLocale: LearningV2Localized<string>;
  bodyByLocale: LearningV2Localized<string>;
  /** The canonical slot question rendered at the bottom of this same page. */
  question: LearningV2IntroCheckQuestion;
}>;

export type LearningV2GeneratedSessionIntro = Readonly<{
  schemaVersion: 'learning-v2-generated-session-intro.v3';
  sessionTemplateId: string;
  titleByLocale: LearningV2Localized<string>;
  summaryByLocale: LearningV2Localized<string>;
  learningGoalByLocale: LearningV2Localized<string>;
  /** Three pages; each explains one part and embeds its own slot question. */
  pages: readonly [
    LearningV2GeneratedSessionIntroPage,
    LearningV2GeneratedSessionIntroPage,
    LearningV2GeneratedSessionIntroPage,
  ];
  practiceStartSlot: 4;
  slotPresentationPolicy: 'slots_1_2_3_embedded_in_intro_pages_not_repeated';
}>;

export type LearningV2IntroQuestionTaskBinding = Readonly<{
  taskCardId: string;
  question: LearningV2IntroCheckQuestion;
}>;

export type LearningV2AudioGenerationInput = Readonly<{
  schemaVersion: 'learning-v2-openai-tts-input.v1';
  contentItemId: string;
  language: string;
  inputText: string;
  characterId: string | null;
  episodeOrdinal: number;
  slotOrdinal: number;
  provider: 'openai';
  endpoint: '/v1/audio/speech';
  model: 'gpt-4o-mini-tts';
  voice: LearningV2OpenAiTtsVoice;
  variantOrdinal: 1 | 2 | 3 | 4;
  instructions: string;
  speed: number;
  format: 'mp3';
  pipelineVersion: 1;
}>;

export type LearningV2GeneratedAudioReceipt = Readonly<{
  dependencyFingerprint: string;
  assetSha256: string;
  assetBytes: number;
  reviewStatus: 'machine_verified_pending_human' | 'human_approved';
}>;

const clean = (value: string, field: string, max: number): string => {
  const normalized = value.trim();
  if (!normalized || normalized.length > max)
    throw new Error(`learning_v2_generator_${field}_invalid`);
  return normalized;
};

export function learningV2VoiceForSlot(
  input: Readonly<{
    episodeOrdinal: number;
    slotOrdinal: number;
    characterId?: string | null;
  }>,
): LearningV2OpenAiTtsVoice {
  if (
    !Number.isSafeInteger(input.episodeOrdinal) ||
    input.episodeOrdinal < 1 ||
    input.episodeOrdinal > 32 ||
    !Number.isSafeInteger(input.slotOrdinal) ||
    input.slotOrdinal < 1 ||
    input.slotOrdinal > 10_000
  ) {
    throw new Error('learning_v2_generator_voice_slot_invalid');
  }
  const characterId =
    input.characterId == null
      ? null
      : clean(input.characterId, 'character_id', 96);
  // A named character keeps one voice across every scene. Narration/non-dialogue
  // rotates predictably, so rerunning the generator never changes voices at random.
  if (!characterId) {
    return LEARNING_V2_OPENAI_TTS_VOICES[
      (input.episodeOrdinal + input.slotOrdinal - 2) %
        LEARNING_V2_OPENAI_TTS_VOICES.length
    ];
  }
  const seed = hashCanonicalBody({
    schemaVersion: 'learning-v2-character-voice-seed.v1',
    characterId,
  });
  return LEARNING_V2_OPENAI_TTS_VOICES[
    Number.parseInt(seed.slice(0, 8), 16) % LEARNING_V2_OPENAI_TTS_VOICES.length
  ];
}

export function materializeLearningV2AudioGenerationInput(
  input: Readonly<{
    contentItemId: string;
    language: string;
    inputText: string;
    characterId?: string | null;
    episodeOrdinal: number;
    slotOrdinal: number;
    instructions: string;
    speed?: number;
  }>,
): LearningV2AudioGenerationInput {
  const voice = learningV2VoiceForSlot(input);
  const variantOrdinal = (LEARNING_V2_OPENAI_TTS_VOICES.indexOf(voice) + 1) as
    | 1
    | 2
    | 3
    | 4;
  const speed = input.speed ?? 1;
  if (!Number.isFinite(speed) || speed < 0.7 || speed > 1.2)
    throw new Error('learning_v2_generator_audio_speed_invalid');
  return Object.freeze({
    schemaVersion: 'learning-v2-openai-tts-input.v1',
    contentItemId: clean(input.contentItemId, 'content_item_id', 128),
    language: clean(input.language, 'audio_language', 24),
    inputText: clean(input.inputText, 'audio_text', 1_000),
    characterId:
      input.characterId == null
        ? null
        : clean(input.characterId, 'character_id', 96),
    episodeOrdinal: input.episodeOrdinal,
    slotOrdinal: input.slotOrdinal,
    provider: 'openai',
    endpoint: '/v1/audio/speech',
    model: 'gpt-4o-mini-tts',
    voice,
    variantOrdinal,
    instructions: clean(input.instructions, 'audio_instructions', 800),
    speed,
    format: 'mp3',
    pipelineVersion: 1,
  });
}

export function materializeLearningV2AudioGenerationVariants(
  input: Parameters<typeof materializeLearningV2AudioGenerationInput>[0],
): readonly [
  LearningV2AudioGenerationInput,
  LearningV2AudioGenerationInput,
  LearningV2AudioGenerationInput,
  LearningV2AudioGenerationInput,
] {
  const base = materializeLearningV2AudioGenerationInput(input);
  return Object.freeze(
    LEARNING_V2_OPENAI_TTS_VOICES.map((voice, index) =>
      Object.freeze({
        ...base,
        voice,
        variantOrdinal: (index + 1) as 1 | 2 | 3 | 4,
      }),
    ) as unknown as [
      LearningV2AudioGenerationInput,
      LearningV2AudioGenerationInput,
      LearningV2AudioGenerationInput,
      LearningV2AudioGenerationInput,
    ],
  );
}

/** Pure round-robin selector; callers own the bounded per-player play ordinal. */
export function learningV2VoiceForPlayback(
  playbackOrdinal: number,
): LearningV2OpenAiTtsVoice {
  if (!Number.isSafeInteger(playbackOrdinal) || playbackOrdinal < 0)
    throw new Error('learning_v2_audio_playback_ordinal_invalid');
  return LEARNING_V2_OPENAI_TTS_VOICES[
    playbackOrdinal % LEARNING_V2_OPENAI_TTS_VOICES.length
  ];
}

export function learningV2AudioDependencyFingerprint(
  input: LearningV2AudioGenerationInput,
): string {
  return hashCanonicalBody(input);
}

export function learningV2AudioNeedsRegeneration(
  expected: LearningV2AudioGenerationInput,
  receipt: LearningV2GeneratedAudioReceipt | null,
): boolean {
  if (!receipt) return true;
  return (
    receipt.dependencyFingerprint !==
      learningV2AudioDependencyFingerprint(expected) ||
    !/^[a-f0-9]{64}$/.test(receipt.assetSha256) ||
    !Number.isSafeInteger(receipt.assetBytes) ||
    receipt.assetBytes < 1
  );
}

export function validateLearningV2GeneratedSessionIntro(
  input: LearningV2GeneratedSessionIntro,
): LearningV2GeneratedSessionIntro {
  clean(input.sessionTemplateId, 'session_template_id', 128);
  assertLearningV2LocalizedEnvelope<string>(input.titleByLocale, 'intro_title');
  assertLearningV2LocalizedEnvelope<string>(
    input.summaryByLocale,
    'intro_summary',
  );
  assertLearningV2LocalizedEnvelope<string>(
    input.learningGoalByLocale,
    'intro_goal',
  );
  if (
    input.schemaVersion !== 'learning-v2-generated-session-intro.v3' ||
    input.pages.length !== 3 ||
    input.practiceStartSlot !== 4 ||
    input.slotPresentationPolicy !==
      'slots_1_2_3_embedded_in_intro_pages_not_repeated'
  ) {
    throw new Error('learning_v2_generator_intro_invalid');
  }
  const pageIds = new Set<string>();
  const ids = new Set<string>();
  const slots = new Set<number>();
  for (let index = 0; index < input.pages.length; index += 1) {
    const page = input.pages[index];
    if (page.pageOrdinal !== index + 1)
      throw new Error('learning_v2_generator_intro_page_order_invalid');
    const pageId = clean(page.pageId, 'intro_page_id', 128);
    if (pageIds.has(pageId))
      throw new Error('learning_v2_generator_intro_page_duplicate');
    pageIds.add(pageId);
    assertLearningV2LocalizedEnvelope<string>(
      page.titleByLocale,
      'intro_page_title',
    );
    assertLearningV2LocalizedEnvelope<string>(
      page.bodyByLocale,
      'intro_page_body',
    );
    const question = page.question;
    const id = clean(question.questionId, 'intro_question_id', 128);
    if (ids.has(id))
      throw new Error('learning_v2_generator_intro_question_duplicate');
    ids.add(id);
    if (
      question.requiredTaskSlot !== index + 1 ||
      slots.has(question.requiredTaskSlot)
    )
      throw new Error('learning_v2_generator_intro_star_slot_invalid');
    slots.add(question.requiredTaskSlot);
    assertLearningV2LocalizedEnvelope<string>(
      question.promptByLocale,
      'intro_question_prompt',
    );
    assertLearningV2LocalizedEnvelope<readonly [string, string, string]>(
      question.choicesByLocale,
      'intro_question_choices',
    );
    if (
      Object.values(question.choicesByLocale).some(
        (choices) =>
          choices.length !== 3 ||
          choices.some((choice) => !choice.trim()) ||
          new Set(choices).size !== 3,
      )
    ) {
      throw new Error('learning_v2_generator_intro_choices_invalid');
    }
    if (![0, 1, 2].includes(question.correctChoiceIndex))
      throw new Error('learning_v2_generator_intro_answer_invalid');
    assertLearningV2LocalizedEnvelope<string>(
      question.explanationByLocale,
      'intro_question_explanation',
    );
  }
  if (slots.size !== 3)
    throw new Error('learning_v2_generator_intro_star_slot_invalid');
  return input;
}
