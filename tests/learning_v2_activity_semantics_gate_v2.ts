import assert from "node:assert/strict";

import {
  validateLearningV2AudioSpeechMotionV2,
  validateLearningV2BuilderV2,
  validateLearningV2ChoiceActivityV2,
  validateLearningV2SessionActivitySequenceV2,
  validateLearningV2SpeedMatchV2,
  type LearningV2CurriculumFindingV2,
} from "../modules/learning-v2/curriculum/validation/course_blueprint_validation_v2";
import type {
  LearningV2CurriculumSessionPacketV2,
  LearningV2PracticeInteractionV2,
} from "../modules/learning-v2/curriculum/contracts/course_blueprint_v2";

const localeText = (text: string) => Object.freeze({
  ru: text,
  uk: text,
  es: text,
  "pt-BR": text,
  vi: text,
  id: text,
  tr: text,
  pl: text,
});

const feedback = (option: string) => localeText(
  `${option} выглядит близко, но меняет проверяемую форму; здесь нужна форма am после I.`,
);

const validOptions = Object.freeze([
  Object.freeze({ optionId: "am", text: "am", isCorrect: true, diagnosticErrorId: null, feedbackByLocale: null }),
  Object.freeze({ optionId: "is", text: "is", isCorrect: false, diagnosticErrorId: "wrong_person_is", feedbackByLocale: feedback("is") }),
  Object.freeze({ optionId: "are", text: "are", isCorrect: false, diagnosticErrorId: "wrong_person_are", feedbackByLocale: feedback("are") }),
  Object.freeze({ optionId: "be", text: "be", isCorrect: false, diagnosticErrorId: "wrong_form_be", feedbackByLocale: feedback("be") }),
]);

const validSpeedMatch = Object.freeze({
  family: "speed_match" as const,
  pairs: Object.freeze(["ready", "here", "happy", "tired"].map((word) => Object.freeze({
    pairId: word,
    targetSenseId: `en.${word}.01`,
    targetText: word,
    meaningByLocale: localeText(`значение ${word}`),
  }))),
});

const validBuilder = Object.freeze({
  family: "phrase_builder" as const,
  targetPhrase: "I am ready.",
  meaningByLocale: localeText("Я готов."),
  tiles: Object.freeze([
    Object.freeze({ tileId: "i", text: "I", kind: "word" as const, correctOrdinal: 0 }),
    Object.freeze({ tileId: "am", text: "am", kind: "word" as const, correctOrdinal: 1 }),
    Object.freeze({ tileId: "ready", text: "ready", kind: "word" as const, correctOrdinal: 2 }),
  ]),
});

const audio = Object.freeze({
  audioAssetId: "audio.en.i_am_ready.v1",
  preloadBeforeSession: true as const,
  replayEnabled: true as const,
  autoplayOnEntry: false,
});

const speech = Object.freeze({
  interaction: "hold_press_release" as const,
  releaseEndsCapture: true as const,
  ownerPreviewSkipEnabled: true as const,
  accessibilityEquivalentEnabled: true as const,
  singleMeasurementIsSoleGate: false as const,
});

const motion = Object.freeze({
  blocksInteraction: false as const,
  reducedMotionPreservesMeaning: true as const,
});

function codes(findings: readonly LearningV2CurriculumFindingV2[]): readonly string[] {
  return findings.map((finding) => finding.code);
}

function expectCode(findings: readonly LearningV2CurriculumFindingV2[], code: string): void {
  assert.equal(codes(findings).includes(code), true, `${code}: ${codes(findings).join(", ")}`);
}

assert.deepEqual(validateLearningV2ChoiceActivityV2(validOptions), []);
expectCode(
  validateLearningV2ChoiceActivityV2(Object.freeze([
    validOptions[0], validOptions[1], validOptions[1], validOptions[3],
  ])),
  "choice_duplicate_distractor",
);
expectCode(
  validateLearningV2ChoiceActivityV2(Object.freeze([
    validOptions[0], { ...validOptions[1], isCorrect: true }, validOptions[2], validOptions[3],
  ])),
  "choice_correct_count_invalid",
);
expectCode(
  validateLearningV2ChoiceActivityV2(Object.freeze([
    validOptions[0], { ...validOptions[1], text: "is / are" }, validOptions[2], validOptions[3],
  ])),
  "choice_non_atomic_option",
);
expectCode(
  validateLearningV2ChoiceActivityV2(Object.freeze([
    validOptions[0], { ...validOptions[1], feedbackByLocale: null }, validOptions[2], validOptions[3],
  ])),
  "choice_feedback_missing",
);

const knownSenseIds = new Set(validSpeedMatch.pairs.map((pair) => pair.targetSenseId));
assert.deepEqual(validateLearningV2SpeedMatchV2(validSpeedMatch, knownSenseIds), []);
expectCode(
  validateLearningV2SpeedMatchV2(
    { ...validSpeedMatch, pairs: Object.freeze([...validSpeedMatch.pairs, { ...validSpeedMatch.pairs[0], pairId: "fine", targetSenseId: "en.fine.01", targetText: "fine" }]) },
    knownSenseIds,
  ),
  "speed_match_pair_count_invalid",
);
expectCode(
  validateLearningV2SpeedMatchV2(
    { ...validSpeedMatch, pairs: Object.freeze(validSpeedMatch.pairs.map((pair, index) => index === 0 ? { ...pair, targetSenseId: "en.unknown.01" } : pair)) },
    knownSenseIds,
  ),
  "speed_match_unfamiliar_target",
);

assert.deepEqual(validateLearningV2BuilderV2(validBuilder), []);
expectCode(
  validateLearningV2BuilderV2({
    ...validBuilder,
    tiles: Object.freeze([...validBuilder.tiles, { tileId: "letter-m", text: "m", kind: "word" as const, correctOrdinal: null }]),
  }),
  "builder_letter_tile_forbidden",
);

function interaction(
  slot: number,
  modeFamily: string,
  modePayload: unknown,
): LearningV2PracticeInteractionV2 {
  return {
    activityId: `activity-${slot}`,
    slot,
    modeFamily,
    targetSignature: `target-${slot}`,
    targetOperationIds: ["en.be.present.i_am"],
    targetLexicalSenseIds: [],
    support: "medium",
    independentEvidence: false,
    scored: true,
    motion,
    modePayload,
  } as unknown as LearningV2PracticeInteractionV2;
}

const listenChoose = interaction(4, "listen_choose", {
  family: "listen_choose",
  audio,
  targetTextHiddenUntilAttempt: true,
  options: validOptions,
});

assert.deepEqual(validateLearningV2AudioSpeechMotionV2(listenChoose), []);
expectCode(
  validateLearningV2AudioSpeechMotionV2(interaction(4, "listen_choose", {
    family: "listen_choose", audio, targetTextHiddenUntilAttempt: false, options: validOptions,
  })),
  "listen_choose_target_text_leak",
);
expectCode(
  validateLearningV2AudioSpeechMotionV2(interaction(4, "listen_choose", {
    family: "listen_choose", audio: { ...audio, preloadBeforeSession: false }, targetTextHiddenUntilAttempt: true, options: validOptions,
  })),
  "audio_preload_required",
);
expectCode(
  validateLearningV2AudioSpeechMotionV2(interaction(4, "listen_choose", {
    family: "listen_choose", audio: { ...audio, replayEnabled: false }, targetTextHiddenUntilAttempt: true, options: validOptions,
  })),
  "audio_replay_required",
);
expectCode(
  validateLearningV2AudioSpeechMotionV2(interaction(4, "scripted_repeat_compare", {
    family: "scripted_repeat_compare", audio, targetPhrase: "I am ready.", speech: { ...speech, interaction: "tap_toggle" },
  })),
  "speech_hold_release_required",
);
expectCode(
  validateLearningV2AudioSpeechMotionV2(interaction(4, "scripted_repeat_compare", {
    family: "scripted_repeat_compare", audio, targetPhrase: "I am ready.", speech: { ...speech, ownerPreviewSkipEnabled: false },
  })),
  "speech_owner_preview_skip_required",
);
expectCode(
  validateLearningV2AudioSpeechMotionV2(interaction(4, "scripted_repeat_compare", {
    family: "scripted_repeat_compare", audio, targetPhrase: "I am ready.", speech: { ...speech, accessibilityEquivalentEnabled: false },
  })),
  "speech_accessibility_equivalent_required",
);
expectCode(
  validateLearningV2AudioSpeechMotionV2({ ...listenChoose, motion: { ...motion, blocksInteraction: true } } as unknown as LearningV2PracticeInteractionV2),
  "motion_must_not_block_interaction",
);

const sequencePacket = {
  sessionId: "lesson-01:session:01",
  introInteractions: [
    { testLanguage: "target" },
    { testLanguage: "target" },
    { testLanguage: "target" },
  ],
  practiceInteractions: [
    interaction(4, "context_gap_grammar", { family: "context_gap_grammar", options: validOptions }),
    interaction(5, "listen_choose", { family: "listen_choose", options: Object.freeze([validOptions[1], validOptions[0], validOptions[2], validOptions[3]]) }),
    interaction(6, "context_gap_grammar", { family: "context_gap_grammar", options: Object.freeze([validOptions[1], validOptions[2], validOptions[0], validOptions[3]]) }),
  ],
} as unknown as LearningV2CurriculumSessionPacketV2;

assert.deepEqual(validateLearningV2SessionActivitySequenceV2(sequencePacket), []);
expectCode(
  validateLearningV2SessionActivitySequenceV2({
    ...sequencePacket,
    practiceInteractions: [interaction(4, "sound_contrast", { family: "sound_contrast" })],
  }),
  "mode_family_forbidden",
);
expectCode(
  validateLearningV2SessionActivitySequenceV2({
    ...sequencePacket,
    introInteractions: [{ testLanguage: "interface" }, ...sequencePacket.introInteractions.slice(1)],
  } as unknown as LearningV2CurriculumSessionPacketV2),
  "intro_interface_language_test_forbidden",
);
expectCode(
  validateLearningV2SessionActivitySequenceV2({
    ...sequencePacket,
    practiceInteractions: [
      interaction(4, "context_gap_grammar", { family: "context_gap_grammar", options: validOptions }),
      interaction(5, "listen_choose", { family: "listen_choose", options: validOptions }),
      interaction(6, "context_gap_grammar", { family: "context_gap_grammar", options: validOptions }),
    ],
  }),
  "choice_correct_position_distribution_invalid",
);

process.stdout.write("LEARNING V2 ACTIVITY SEMANTICS GATE V2: PASS\n");
