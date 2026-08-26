import type { LearningV2Localized } from "../content/generator_course_contract";
import type { LearningV2ModeNativeFamilyV1 } from "./mode_native_authoring_contract_v1";

export type LearningV2ModeAudioReferenceV1 = Readonly<{
  audioTargetId: string;
  transcript: string;
}>;

export type LearningV2ModeChoiceFeedbackV1 = Readonly<{
  responseId: string;
  correct: boolean;
  testedDimension: string;
  feedbackByLocale: LearningV2Localized<string>;
}>;

export type LearningV2ModeNativePayloadV1 =
  | Readonly<{
      family: "phrase_builder";
      targetPhrase: string;
      localizedMeaning: LearningV2Localized<string>;
      orderedTokens: readonly string[];
      authoredDistractorTokens: readonly string[];
      slotFeedback: readonly LearningV2ModeChoiceFeedbackV1[];
    }>
  | Readonly<{
      family: "listen_choose";
      referenceAudio: LearningV2ModeAudioReferenceV1 | null;
      slowReferenceAudio: LearningV2ModeAudioReferenceV1 | null;
      localizedMeaningChoices: readonly Readonly<{
        responseId: string;
        targetText: string;
        meaningByLocale: LearningV2Localized<string> | null;
      }>[];
      transcriptRevealPolicy: "after_first_attempt";
      choiceFeedback: readonly LearningV2ModeChoiceFeedbackV1[];
    }>
  | Readonly<{
      family: "sound_contrast";
      contrastA: string;
      contrastB: string;
      ipaA: string;
      ipaB: string;
      audioA: LearningV2ModeAudioReferenceV1 | null;
      audioB: LearningV2ModeAudioReferenceV1 | null;
      testedPhoneticContrast: string;
      choiceFeedback: readonly LearningV2ModeChoiceFeedbackV1[];
    }>
  | Readonly<{
      family: "listen_build_dictation";
      referenceAudio: LearningV2ModeAudioReferenceV1 | null;
      slowReferenceAudio: LearningV2ModeAudioReferenceV1 | null;
      hiddenTargetPhrase: string;
      orderedTokens: readonly string[];
      authoredDistractorTokens: readonly string[];
      slotFeedback: readonly LearningV2ModeChoiceFeedbackV1[];
    }>
  | Readonly<{
      family: "context_gap_grammar";
      localizedScene: LearningV2Localized<string>;
      gappedTargetPhrase: string;
      gapOptions: readonly Readonly<{
        responseId: string;
        text: string;
      }>[];
      testedDimension: string;
      choiceFeedback: readonly LearningV2ModeChoiceFeedbackV1[];
    }>
  | Readonly<{
      family: "speed_match";
      pairGrid: readonly Readonly<{
        pairId: string;
        target: string;
        meaningByLocale: LearningV2Localized<string>;
      }>[];
      leftColumn: readonly string[];
      rightColumn: readonly string[];
      pairingKey: "pair_id";
      timerPolicy: Readonly<{
        enabledByDefault: true;
        learnerCanDisable: true;
        pausesOnInterruption: true;
      }>;
      finishStats: readonly ["speed", "accuracy", "personal_best"];
    }>
  | Readonly<{
      family: "scripted_repeat_compare";
      referenceAudio: LearningV2ModeAudioReferenceV1 | null;
      slowReferenceAudio: LearningV2ModeAudioReferenceV1 | null;
      targetPhrase: string;
      recordControlPolicy: "hold_press_release_with_accessible_toggle";
      modelPlayback: "reference_and_slow";
      learnerPlayback: "available_after_capture";
      honestOutcomeStates: readonly [
        "PASS_CONFIDENT",
        "NEEDS_WORK_CONFIDENT",
        "UNCERTAIN",
        "INVALID_AUDIO_OR_SYSTEM",
      ];
    }>;

const FAMILY_REQUIRED_FIELDS: Readonly<
  Record<LearningV2ModeNativePayloadV1["family"], readonly string[]>
> = Object.freeze({
  phrase_builder: [
    "targetPhrase",
    "localizedMeaning",
    "orderedTokens",
    "authoredDistractorTokens",
    "slotFeedback",
  ],
  listen_choose: [
    "referenceAudio",
    "slowReferenceAudio",
    "localizedMeaningChoices",
    "transcriptRevealPolicy",
    "choiceFeedback",
  ],
  sound_contrast: [
    "contrastA",
    "contrastB",
    "ipaA",
    "ipaB",
    "audioA",
    "audioB",
    "testedPhoneticContrast",
    "choiceFeedback",
  ],
  listen_build_dictation: [
    "referenceAudio",
    "slowReferenceAudio",
    "hiddenTargetPhrase",
    "orderedTokens",
    "authoredDistractorTokens",
    "slotFeedback",
  ],
  context_gap_grammar: [
    "localizedScene",
    "gappedTargetPhrase",
    "gapOptions",
    "testedDimension",
    "choiceFeedback",
  ],
  speed_match: [
    "pairGrid",
    "leftColumn",
    "rightColumn",
    "pairingKey",
    "timerPolicy",
    "finishStats",
  ],
  scripted_repeat_compare: [
    "referenceAudio",
    "slowReferenceAudio",
    "targetPhrase",
    "recordControlPolicy",
    "modelPlayback",
    "learnerPlayback",
    "honestOutcomeStates",
  ],
});

export function validateLearningV2ModeNativePayloadV1(
  value: unknown,
  expectedFamily?: LearningV2ModeNativePayloadV1["family"],
): LearningV2ModeNativePayloadV1 {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("learning_v2_mode_native_payload_invalid");
  }
  const payload = value as Record<string, unknown>;
  const family = payload.family as LearningV2ModeNativePayloadV1["family"];
  if (!(family in FAMILY_REQUIRED_FIELDS) || (expectedFamily && family !== expectedFamily)) {
    throw new Error("learning_v2_mode_native_payload_family_invalid");
  }
  for (const field of FAMILY_REQUIRED_FIELDS[family]) {
    if (!(field in payload)) {
      throw new Error(`learning_v2_mode_native_payload_field_missing:${family}:${field}`);
    }
  }
  return Object.freeze(payload) as unknown as LearningV2ModeNativePayloadV1;
}

export function learningV2ModeNativeAudioTargetIdsV1(
  payload: LearningV2ModeNativePayloadV1,
): readonly string[] {
  const refs =
    payload.family === "sound_contrast"
      ? [payload.audioA, payload.audioB]
      : payload.family === "listen_choose" ||
          payload.family === "listen_build_dictation" ||
          payload.family === "scripted_repeat_compare"
        ? [payload.referenceAudio, payload.slowReferenceAudio]
        : [];
  return Object.freeze([
    ...new Set(
      refs
        .filter((ref): ref is LearningV2ModeAudioReferenceV1 => ref !== null)
        .map((ref) => ref.audioTargetId),
    ),
  ]);
}
