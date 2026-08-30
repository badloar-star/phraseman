/**
 * Exact contract for the replacement English Learning V2 curriculum blueprint.
 *
 * The contract rejects incomplete planning data. It does not generate grammar,
 * learner copy, options, localization or audio.
 */

export const LEARNING_V2_INTERFACE_LOCALES_V2 = Object.freeze([
  "ru",
  "uk",
  "es",
  "pt-BR",
  "vi",
  "id",
  "tr",
  "pl",
] as const);

export type LearningV2InterfaceLocaleV2 =
  (typeof LEARNING_V2_INTERFACE_LOCALES_V2)[number];

export type LearningV2LocaleTextV2 = Readonly<
  Record<LearningV2InterfaceLocaleV2, string>
>;

export const LEARNING_V2_ACTIVE_MODE_FAMILIES_V2 = Object.freeze([
  "phrase_builder",
  "listen_choose",
  "listen_build_dictation",
  "context_gap_grammar",
  "speed_match",
  "scripted_repeat_compare",
] as const);

export type LearningV2ModeFamilyV2 =
  (typeof LEARNING_V2_ACTIVE_MODE_FAMILIES_V2)[number];

export type LearningV2SessionRoleV2 =
  | "introduce_grammar"
  | "introduce_or_guided_extension"
  | "introduce_or_diagnostic_contrast"
  | "guided_application"
  | "diagnostic_repair"
  | "listening_retrieval"
  | "spoken_production"
  | "checkpoint";

export type LearningV2IntroPurposeV2 =
  | "meaning"
  | "form"
  | "diagnostic_trap"
  | "recenter";

export type LearningV2SupportV2 =
  | "maximum"
  | "high"
  | "medium"
  | "low"
  | "minimal"
  | "none";

export type LearningV2BlueprintApprovalV2 = "PENDING" | "APPROVED";

export type LearningV2AudioContractV2 = Readonly<{
  audioAssetId: string;
  preloadBeforeSession: true;
  replayEnabled: true;
  autoplayOnEntry: boolean;
}>;

export type LearningV2SpeechContractV2 = Readonly<{
  interaction: "hold_press_release";
  releaseEndsCapture: true;
  ownerPreviewSkipEnabled: true;
  accessibilityEquivalentEnabled: true;
  singleMeasurementIsSoleGate: false;
}>;

export type LearningV2MotionContractV2 = Readonly<{
  blocksInteraction: false;
  reducedMotionPreservesMeaning: true;
}>;

export type LearningV2ChoiceOptionV2 = Readonly<{
  optionId: string;
  text: string;
  isCorrect: boolean;
  diagnosticErrorId: string | null;
  feedbackByLocale: LearningV2LocaleTextV2 | null;
}>;

export type LearningV2BuilderTileV2 = Readonly<{
  tileId: string;
  text: string;
  kind: "word" | "chunk";
  correctOrdinal: number | null;
}>;

export type LearningV2PhraseBuilderPayloadV2 = Readonly<{
  family: "phrase_builder";
  targetPhrase: string;
  meaningByLocale: LearningV2LocaleTextV2;
  tiles: readonly LearningV2BuilderTileV2[];
}>;

export type LearningV2ListenChoosePayloadV2 = Readonly<{
  family: "listen_choose";
  audio: LearningV2AudioContractV2;
  targetTextHiddenUntilAttempt: true;
  options: readonly LearningV2ChoiceOptionV2[];
}>;

export type LearningV2ListenBuildDictationPayloadV2 = Readonly<{
  family: "listen_build_dictation";
  audio: LearningV2AudioContractV2;
  targetPhrase: string;
  targetHiddenUntilAttempt: true;
  tiles: readonly LearningV2BuilderTileV2[];
}>;

export type LearningV2ContextGapGrammarPayloadV2 = Readonly<{
  family: "context_gap_grammar";
  sceneByLocale: LearningV2LocaleTextV2;
  phraseWithGap: string;
  options: readonly LearningV2ChoiceOptionV2[];
}>;

export type LearningV2SpeedMatchPairV2 = Readonly<{
  pairId: string;
  targetSenseId: string;
  targetText: string;
  meaningByLocale: LearningV2LocaleTextV2;
}>;

export type LearningV2SpeedMatchPayloadV2 = Readonly<{
  family: "speed_match";
  pairs: readonly LearningV2SpeedMatchPairV2[];
}>;

export type LearningV2ScriptedRepeatComparePayloadV2 = Readonly<{
  family: "scripted_repeat_compare";
  audio: LearningV2AudioContractV2;
  targetPhrase: string;
  speech: LearningV2SpeechContractV2;
}>;

export type LearningV2ModePayloadV2 =
  | LearningV2PhraseBuilderPayloadV2
  | LearningV2ListenChoosePayloadV2
  | LearningV2ListenBuildDictationPayloadV2
  | LearningV2ContextGapGrammarPayloadV2
  | LearningV2SpeedMatchPayloadV2
  | LearningV2ScriptedRepeatComparePayloadV2;

export type LearningV2IntroInteractionV2 = Readonly<{
  slot: 1 | 2 | 3;
  purpose: LearningV2IntroPurposeV2;
  operationIds: readonly string[];
  checkActivityId: string;
  testedDimension: string;
  testLanguage: "target";
}>;

export type LearningV2PracticeInteractionV2 = Readonly<{
  activityId: string;
  slot: number;
  modeFamily: LearningV2ModeFamilyV2;
  targetSignature: string;
  targetOperationIds: readonly string[];
  targetLexicalSenseIds: readonly string[];
  support: LearningV2SupportV2;
  independentEvidence: boolean;
  scored: boolean;
  motion: LearningV2MotionContractV2;
  modePayload: LearningV2ModePayloadV2;
}>;

export type LearningV2CurriculumSessionPacketV2 = Readonly<{
  sessionId: string;
  lessonOrdinal: number;
  chapterOrdinal: number;
  sessionOrdinal: number;
  role: LearningV2SessionRoleV2;
  grammarOperationIds: readonly string[];
  reviewOperationIds: readonly string[];
  primaryCanDoStep: string;
  prerequisiteSessionIds: readonly string[];
  newLexicalSenseIds: readonly string[];
  retrievalLexicalSenseIds: readonly string[];
  introInteractions: readonly LearningV2IntroInteractionV2[];
  practiceInteractions: readonly LearningV2PracticeInteractionV2[];
  sourceEvidenceRefs: readonly string[];
}>;

const ACTIVE_MODES = new Set<string>(LEARNING_V2_ACTIVE_MODE_FAMILIES_V2);
const INTRO_PURPOSES = new Set<string>([
  "meaning",
  "form",
  "diagnostic_trap",
  "recenter",
]);
const SUPPORT_LEVELS = new Set<string>([
  "maximum",
  "high",
  "medium",
  "low",
  "minimal",
  "none",
]);

function fail(code: string): never {
  throw new Error(code);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every(isNonEmptyString);
}

function hasExactLocaleText(value: unknown): value is LearningV2LocaleTextV2 {
  if (!isRecord(value)) return false;
  const actual = Object.keys(value).sort();
  const expected = [...LEARNING_V2_INTERFACE_LOCALES_V2].sort();
  return (
    actual.length === expected.length &&
    actual.every((locale, index) => locale === expected[index]) &&
    expected.every((locale) => isNonEmptyString(value[locale]))
  );
}

function assertAudioContract(value: unknown): void {
  if (!isRecord(value) || !isNonEmptyString(value.audioAssetId)) {
    fail("learning_v2_v2_audio_asset_required");
  }
  if (value.preloadBeforeSession !== true) {
    fail("learning_v2_v2_audio_preload_required");
  }
  if (value.replayEnabled !== true) {
    fail("learning_v2_v2_audio_replay_required");
  }
  if (typeof value.autoplayOnEntry !== "boolean") {
    fail("learning_v2_v2_audio_autoplay_policy_required");
  }
}

function assertChoiceOptions(value: unknown): void {
  if (!Array.isArray(value) || value.length !== 4) {
    fail("learning_v2_v2_choice_option_count_invalid");
  }
  const options = value as readonly unknown[];
  const ids = new Set<string>();
  const texts = new Set<string>();
  let correctCount = 0;
  for (const option of options) {
    if (!isRecord(option) || !isNonEmptyString(option.optionId) || !isNonEmptyString(option.text)) {
      fail("learning_v2_v2_choice_option_invalid");
    }
    if (ids.has(option.optionId) || texts.has(option.text.trim().toLocaleLowerCase())) {
      fail("learning_v2_v2_choice_option_duplicate");
    }
    ids.add(option.optionId);
    texts.add(option.text.trim().toLocaleLowerCase());
    if (option.text.includes("/")) {
      fail("learning_v2_v2_choice_option_non_atomic");
    }
    if (option.isCorrect === true) {
      correctCount += 1;
      if (option.diagnosticErrorId !== null || option.feedbackByLocale !== null) {
        fail("learning_v2_v2_correct_option_feedback_forbidden");
      }
    } else {
      if (!isNonEmptyString(option.diagnosticErrorId)) {
        fail("learning_v2_v2_diagnostic_error_required");
      }
      if (!hasExactLocaleText(option.feedbackByLocale)) {
        fail("learning_v2_v2_choice_feedback_locales_invalid");
      }
    }
  }
  if (correctCount !== 1) {
    fail("learning_v2_v2_choice_correct_count_invalid");
  }
}

function assertTiles(value: unknown): void {
  if (!Array.isArray(value) || value.length === 0) {
    fail("learning_v2_v2_builder_tiles_required");
  }
  for (const tile of value) {
    if (
      !isRecord(tile) ||
      !isNonEmptyString(tile.tileId) ||
      !isNonEmptyString(tile.text) ||
      (tile.kind !== "word" && tile.kind !== "chunk") ||
      !(
        tile.correctOrdinal === null ||
        (Number.isSafeInteger(tile.correctOrdinal) && Number(tile.correctOrdinal) >= 0)
      )
    ) {
      fail("learning_v2_v2_builder_tile_invalid");
    }
    const normalized = tile.text.trim();
    if (normalized.length === 1 && !["I", "a", "A"].includes(normalized)) {
      fail("learning_v2_v2_builder_letter_tile_forbidden");
    }
  }
}

function assertModePayload(interaction: Record<string, unknown>): void {
  const payload = interaction.modePayload;
  if (!isRecord(payload) || payload.family !== interaction.modeFamily) {
    fail("learning_v2_v2_mode_payload_family_mismatch");
  }

  switch (payload.family) {
    case "phrase_builder":
      if (!isNonEmptyString(payload.targetPhrase) || !hasExactLocaleText(payload.meaningByLocale)) {
        fail("learning_v2_v2_phrase_builder_payload_invalid");
      }
      assertTiles(payload.tiles);
      return;
    case "listen_choose":
      assertAudioContract(payload.audio);
      if (payload.targetTextHiddenUntilAttempt !== true) {
        fail("learning_v2_v2_listen_choose_target_leak");
      }
      assertChoiceOptions(payload.options);
      return;
    case "listen_build_dictation":
      assertAudioContract(payload.audio);
      if (!isNonEmptyString(payload.targetPhrase) || payload.targetHiddenUntilAttempt !== true) {
        fail("learning_v2_v2_dictation_payload_invalid");
      }
      assertTiles(payload.tiles);
      return;
    case "context_gap_grammar":
      if (!hasExactLocaleText(payload.sceneByLocale) || !isNonEmptyString(payload.phraseWithGap)) {
        fail("learning_v2_v2_context_gap_payload_invalid");
      }
      assertChoiceOptions(payload.options);
      return;
    case "speed_match": {
      if (!Array.isArray(payload.pairs) || payload.pairs.length !== 4) {
        fail("learning_v2_v2_speed_match_pair_count_invalid");
      }
      const pairIds = new Set<string>();
      const targetTexts = new Set<string>();
      for (const pair of payload.pairs) {
        if (
          !isRecord(pair) ||
          !isNonEmptyString(pair.pairId) ||
          !isNonEmptyString(pair.targetSenseId) ||
          !isNonEmptyString(pair.targetText) ||
          !hasExactLocaleText(pair.meaningByLocale)
        ) {
          fail("learning_v2_v2_speed_match_pair_invalid");
        }
        pairIds.add(pair.pairId);
        targetTexts.add(pair.targetText.trim().toLocaleLowerCase());
      }
      if (pairIds.size !== 4 || targetTexts.size !== 4) {
        fail("learning_v2_v2_speed_match_pair_duplicate");
      }
      return;
    }
    case "scripted_repeat_compare": {
      assertAudioContract(payload.audio);
      if (!isNonEmptyString(payload.targetPhrase) || !isRecord(payload.speech)) {
        fail("learning_v2_v2_speech_payload_invalid");
      }
      const speech = payload.speech;
      if (
        speech.interaction !== "hold_press_release" ||
        speech.releaseEndsCapture !== true ||
        speech.ownerPreviewSkipEnabled !== true ||
        speech.accessibilityEquivalentEnabled !== true ||
        speech.singleMeasurementIsSoleGate !== false
      ) {
        fail("learning_v2_v2_speech_contract_invalid");
      }
      return;
    }
    default:
      fail("learning_v2_v2_mode_payload_family_invalid");
  }
}

export function assertLearningV2CurriculumSessionPacketV2(
  input: unknown,
): asserts input is LearningV2CurriculumSessionPacketV2 {
  if (!isRecord(input)) fail("learning_v2_v2_packet_invalid");
  if (
    !isNonEmptyString(input.sessionId) ||
    !Number.isSafeInteger(input.lessonOrdinal) ||
    !Number.isSafeInteger(input.chapterOrdinal) ||
    !Number.isSafeInteger(input.sessionOrdinal) ||
    !isNonEmptyString(input.role) ||
    !isNonEmptyString(input.primaryCanDoStep) ||
    !isStringArray(input.prerequisiteSessionIds) ||
    !isStringArray(input.newLexicalSenseIds) ||
    !isStringArray(input.retrievalLexicalSenseIds) ||
    !isStringArray(input.sourceEvidenceRefs) ||
    input.sourceEvidenceRefs.length === 0
  ) {
    fail("learning_v2_v2_packet_fields_invalid");
  }
  if (!isStringArray(input.grammarOperationIds) || !isStringArray(input.reviewOperationIds)) {
    fail("learning_v2_v2_grammar_review_invalid");
  }
  if (input.grammarOperationIds.length === 0 && input.reviewOperationIds.length === 0) {
    fail("learning_v2_v2_grammar_or_review_required");
  }
  if (input.grammarOperationIds.length > 0 && input.reviewOperationIds.length > 0) {
    fail("learning_v2_v2_grammar_and_review_conflict");
  }

  if (!Array.isArray(input.introInteractions) || input.introInteractions.length !== 3) {
    fail("learning_v2_v2_intro_count_invalid");
  }
  for (let index = 0; index < input.introInteractions.length; index += 1) {
    const intro = input.introInteractions[index];
    if (
      !isRecord(intro) ||
      intro.slot !== index + 1 ||
      !INTRO_PURPOSES.has(String(intro.purpose)) ||
      !isStringArray(intro.operationIds) ||
      intro.operationIds.length === 0 ||
      !isNonEmptyString(intro.checkActivityId) ||
      !isNonEmptyString(intro.testedDimension)
    ) {
      fail("learning_v2_v2_intro_invalid");
    }
    if (intro.testLanguage !== "target") {
      fail("learning_v2_v2_intro_interface_language_test_forbidden");
    }
  }

  if (!Array.isArray(input.practiceInteractions) || input.practiceInteractions.length !== 17) {
    fail("learning_v2_v2_practice_count_invalid");
  }
  const seenActivityIds = new Set<string>();
  const seenTargetFamilies = new Set<string>();
  const usedModes = new Set<string>();
  for (let index = 0; index < input.practiceInteractions.length; index += 1) {
    const interaction = input.practiceInteractions[index];
    if (
      !isRecord(interaction) ||
      interaction.slot !== index + 4 ||
      !isNonEmptyString(interaction.activityId) ||
      !isNonEmptyString(interaction.targetSignature) ||
      !ACTIVE_MODES.has(String(interaction.modeFamily)) ||
      !isStringArray(interaction.targetOperationIds) ||
      interaction.targetOperationIds.length === 0 ||
      !isStringArray(interaction.targetLexicalSenseIds) ||
      !SUPPORT_LEVELS.has(String(interaction.support)) ||
      typeof interaction.independentEvidence !== "boolean" ||
      typeof interaction.scored !== "boolean" ||
      !isRecord(interaction.motion)
    ) {
      fail("learning_v2_v2_practice_invalid");
    }
    if (
      interaction.motion.blocksInteraction !== false ||
      interaction.motion.reducedMotionPreservesMeaning !== true
    ) {
      fail("learning_v2_v2_motion_contract_invalid");
    }
    if (seenActivityIds.has(interaction.activityId)) {
      fail("learning_v2_v2_activity_id_duplicate");
    }
    seenActivityIds.add(interaction.activityId);
    const targetFamilyKey = `${interaction.modeFamily}\u0000${interaction.targetSignature}`;
    if (seenTargetFamilies.has(targetFamilyKey)) {
      fail("learning_v2_v2_target_family_duplicate");
    }
    seenTargetFamilies.add(targetFamilyKey);
    if (
      index > 0 &&
      input.practiceInteractions[index - 1]?.modeFamily === interaction.modeFamily
    ) {
      fail("learning_v2_v2_adjacent_mode_duplicate");
    }
    usedModes.add(String(interaction.modeFamily));
    assertModePayload(interaction);
  }
  if (usedModes.size !== LEARNING_V2_ACTIVE_MODE_FAMILIES_V2.length) {
    fail("learning_v2_v2_active_mode_coverage_invalid");
  }
}
