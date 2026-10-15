import type { LearningV2Localized } from "../content/generator_course_contract";

export type LearningV2ModeAudioReferenceV1 = Readonly<{
  audioTargetId: string;
  transcript: string;
}>;

export const LEARNING_V2_SCRIPTED_REPEAT_REVEAL_POLICY_SCHEMA_V1 =
  "learning-v2-scripted-repeat-reveal-policy.v1" as const;

export type LearningV2ScriptedRepeatRevealPolicyV1 = Readonly<{
  schemaVersion: typeof LEARNING_V2_SCRIPTED_REPEAT_REVEAL_POLICY_SCHEMA_V1;
  revealAfter: "first_submitted_attempt";
  answerExposedBeforeAttempt: false;
  targetPhraseVisibleBeforeAttempt: false;
  referenceAudioAvailableBeforeAttempt: false;
  modelPlaybackAvailableBeforeAttempt: false;
}>;

export const LEARNING_V2_SCRIPTED_REPEAT_AFTER_FIRST_ATTEMPT_REVEAL_POLICY_V1:
  LearningV2ScriptedRepeatRevealPolicyV1 = Object.freeze({
    schemaVersion: LEARNING_V2_SCRIPTED_REPEAT_REVEAL_POLICY_SCHEMA_V1,
    revealAfter: "first_submitted_attempt",
    answerExposedBeforeAttempt: false,
    targetPhraseVisibleBeforeAttempt: false,
    referenceAudioAvailableBeforeAttempt: false,
    modelPlaybackAvailableBeforeAttempt: false,
  });

const SCRIPTED_REPEAT_REVEAL_POLICY_KEYS_V1 = Object.freeze([
  "answerExposedBeforeAttempt",
  "modelPlaybackAvailableBeforeAttempt",
  "referenceAudioAvailableBeforeAttempt",
  "revealAfter",
  "schemaVersion",
  "targetPhraseVisibleBeforeAttempt",
] as const);

export function isLearningV2ScriptedRepeatRevealPolicyV1(
  value: unknown,
): value is LearningV2ScriptedRepeatRevealPolicyV1 {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const policy = value as Record<string, unknown>;
  const actualKeys = Object.keys(policy).sort();
  const expectedKeys = [...SCRIPTED_REPEAT_REVEAL_POLICY_KEYS_V1].sort();
  return (
    actualKeys.length === expectedKeys.length &&
    actualKeys.every((key, index) => key === expectedKeys[index]) &&
    policy.schemaVersion ===
      LEARNING_V2_SCRIPTED_REPEAT_REVEAL_POLICY_SCHEMA_V1 &&
    policy.revealAfter === "first_submitted_attempt" &&
    policy.answerExposedBeforeAttempt === false &&
    policy.targetPhraseVisibleBeforeAttempt === false &&
    policy.referenceAudioAvailableBeforeAttempt === false &&
    policy.modelPlaybackAvailableBeforeAttempt === false
  );
}

export function learningV2ScriptedRepeatAnswerBearingContentRevealedV1(
  revealPolicy: unknown,
  attemptSubmitted: boolean,
): boolean {
  if (revealPolicy === undefined) return true;
  return (
    isLearningV2ScriptedRepeatRevealPolicyV1(revealPolicy) &&
    attemptSubmitted === true
  );
}

export type LearningV2ModeChoiceFeedbackV1 = Readonly<{
  responseId: string;
  correct: boolean;
  // зачем: метаданные автора, которые рантайм не читает и не проверяет (validateLearningV2ModeNativePayloadV1
  // смотрит только верхний уровень). Контент уроков 2 и 3 пишется без него — сделали необязательным
  // вместо выдумывания значений в сотнях записей.
  testedDimension?: string;
  feedbackByLocale: LearningV2Localized<string>;
  analysisV1?: LearningV2ModeTextAnalysisV1;
  errorType?: string;
  whyTemptingByLocale?: LearningV2Localized<string>;
  whyWrongHereByLocale?: LearningV2Localized<string>;
  minimalContrastByLocale?: LearningV2Localized<string>;
  acceptabilityBoundaryByLocale?: LearningV2Localized<string>;
}>;

/**
 * Learner-wire feedback deliberately omits the authoring-time correctness
 * marker. The local evaluator capsule is the only runtime correctness
 * authority; the retained row is display copy selected after that evaluator
 * returns a verdict.
 */
export type LearningV2LearnerModeChoiceFeedbackV1 = Omit<
  LearningV2ModeChoiceFeedbackV1,
  "correct"
>;

export type LearningV2ModePhraseUnitExplanationV1 = Readonly<{
  text: string;
  start: number;
  end: number;
  lemma: string;
  partOfSpeech: string;
  partOfSpeechLabelByLocale: LearningV2Localized<string>;
  meaningByLocale: LearningV2Localized<string>;
  functionByLocale: LearningV2Localized<string>;
  sourceRefs: readonly string[];
}>;

export type LearningV2ModeTextAnalysisV1 = Readonly<{
  text: string;
  meaningByLocale: LearningV2Localized<string>;
  explanationByLocale: LearningV2Localized<string>;
  units: readonly LearningV2ModePhraseUnitExplanationV1[];
}>;

export type LearningV2ModeChoiceDiagnosticV1 = Readonly<{
  errorType: string;
  whyTemptingByLocale: LearningV2Localized<string>;
  whyWrongHereByLocale: LearningV2Localized<string>;
  minimalContrastByLocale: LearningV2Localized<string>;
  acceptabilityBoundaryByLocale: LearningV2Localized<string>;
}>;

export type LearningV2ModePhraseExplanationV1 = Readonly<{
  completionFeedbackByLocale: LearningV2Localized<string>;
  phrase: LearningV2ModeTextAnalysisV1;
}>;

export type LearningV2ModeSpeedPairAnalysisV1 = Readonly<{
  lemma: string;
  partOfSpeech: string;
  partOfSpeechLabelByLocale: LearningV2Localized<string>;
  meaningByLocale: LearningV2Localized<string>;
  functionByLocale: LearningV2Localized<string>;
  matchExplanationByLocale: LearningV2Localized<string>;
  sourceRefs: readonly string[];
  phrase?: LearningV2ModeTextAnalysisV1;
}>;

export type LearningV2ModeNativePayloadV1 =
  | Readonly<{
      family: "phrase_builder";
      targetPhrase: string;
      localizedMeaning: LearningV2Localized<string>;
      orderedTokens: readonly string[];
      authoredDistractorTokens: readonly string[];
      slotFeedback: readonly LearningV2ModeChoiceFeedbackV1[];
      completionFeedbackByLocale?: LearningV2Localized<string>;
      explanationV1?: LearningV2ModePhraseExplanationV1;
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
      completionFeedbackByLocale?: LearningV2Localized<string>;
      explanationV1?: LearningV2ModePhraseExplanationV1;
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
        analysisV1?: LearningV2ModeSpeedPairAnalysisV1;
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
      scriptedRepeatRevealPolicy?: LearningV2ScriptedRepeatRevealPolicyV1;
      honestOutcomeStates: readonly [
        "PASS_CONFIDENT",
        "NEEDS_WORK_CONFIDENT",
        "UNCERTAIN",
        "INVALID_AUDIO_OR_SYSTEM",
      ];
      explanationV1?: Readonly<{ phrase: LearningV2ModeTextAnalysisV1 }>;
    }>;

type LearningV2LearnerModePayloadProjectionV1<T> =
  T extends Readonly<{ choiceFeedback: readonly LearningV2ModeChoiceFeedbackV1[] }>
    ? Omit<T, "choiceFeedback"> & Readonly<{
        choiceFeedback: readonly LearningV2LearnerModeChoiceFeedbackV1[];
      }>
    : T extends Readonly<{ slotFeedback: readonly LearningV2ModeChoiceFeedbackV1[] }>
      ? Omit<T, "slotFeedback"> & Readonly<{
          slotFeedback: readonly LearningV2LearnerModeChoiceFeedbackV1[];
        }>
      : T;

export type LearningV2LearnerModeNativePayloadV1 =
  LearningV2LearnerModePayloadProjectionV1<LearningV2ModeNativePayloadV1>;

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
  if (
    "scriptedRepeatRevealPolicy" in payload &&
    (family !== "scripted_repeat_compare" ||
      !isLearningV2ScriptedRepeatRevealPolicyV1(
        payload.scriptedRepeatRevealPolicy,
      ))
  ) {
    throw new Error("learning_v2_scripted_repeat_reveal_policy_invalid");
  }
  validateOptionalAnalyses(payload, family);
  return Object.freeze(payload) as unknown as LearningV2ModeNativePayloadV1;
}

function stripLearnerCorrectnessMarkersV1(value: unknown): unknown {
  if (Array.isArray(value)) {
    return Object.freeze(value.map(stripLearnerCorrectnessMarkersV1));
  }
  if (value && typeof value === "object") {
    return Object.freeze(
      Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
          .filter(([key]) => key !== "correct")
          .map(([key, child]) => [
            key,
            stripLearnerCorrectnessMarkersV1(child),
          ]),
      ),
    );
  }
  return value;
}

function retainWrongSlotFeedbackRowsV1(
  payload: LearningV2ModeNativePayloadV1,
): LearningV2ModeNativePayloadV1 {
  if (!("slotFeedback" in payload)) return payload;
  const rows = payload.slotFeedback as readonly (LearningV2ModeChoiceFeedbackV1 | LearningV2LearnerModeChoiceFeedbackV1)[];
  const carriesCorrectnessMarkers = rows.some((row) =>
    Object.prototype.hasOwnProperty.call(row, "correct"),
  );
  if (!carriesCorrectnessMarkers) return payload;
  return Object.freeze({
    ...payload,
    // Ordered-token feedback is useful only for the distractor that caused a
    // wrong attempt. Correct rows would become indistinguishable after the
    // marker is stripped and could be shown as the explanation for an error.
    slotFeedback: Object.freeze(rows.filter((row) =>
      "correct" in row && row.correct === false,
    )),
  }) as LearningV2ModeNativePayloadV1;
}

/**
 * Exact learner-wire redaction. It retains the validated mode payload for
 * backward compatibility while removing every nested property named
 * `correct`. For ordered-token modes it retains only explicitly wrong rows
 * before stripping the marker, so a correct-row explanation cannot later be
 * mistaken for error feedback. Target phrases and audio transcripts remain
 * because current modes reveal/use them as instructional media after an
 * attempt. This is not a cryptographic secrecy boundary: the evaluator
 * capsule is intentionally device-inspectable.
 */
export function projectLearningV2ModeNativePayloadForLearnerV1(
  value: unknown,
  expectedFamily?: LearningV2ModeNativePayloadV1["family"],
): LearningV2LearnerModeNativePayloadV1 {
  const payload = validateLearningV2ModeNativePayloadV1(value, expectedFamily);
  return stripLearnerCorrectnessMarkersV1(
    retainWrongSlotFeedbackRowsV1(payload),
  ) as LearningV2LearnerModeNativePayloadV1;
}

function localizedTextPresent(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const localized = value as Record<string, unknown>;
  if (["ru", "uk"].some((locale) => typeof localized[locale] !== "string" || !(localized[locale] as string).trim())) return false;
  const entries = Object.values(localized);
  return entries.every((entry) => typeof entry === "string" && entry.trim().length > 0);
}

export function validateLearningV2ModeTextAnalysisV1(value: unknown, expectedText?: string): LearningV2ModeTextAnalysisV1 {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("learning_v2_mode_text_analysis_invalid");
  const analysis = value as Record<string, unknown>;
  if (typeof analysis.text !== "string" || !analysis.text.trim() || (expectedText !== undefined && analysis.text !== expectedText))
    throw new Error("learning_v2_mode_text_analysis_text_mismatch");
  if (!localizedTextPresent(analysis.meaningByLocale) || !localizedTextPresent(analysis.explanationByLocale))
    throw new Error("learning_v2_mode_text_analysis_localized_copy_missing");
  if (!Array.isArray(analysis.units) || analysis.units.length === 0)
    throw new Error("learning_v2_mode_text_analysis_units_missing");
  const covered = new Set<number>();
  let previousEnd = -1;
  for (const rawUnit of analysis.units) {
    if (!rawUnit || typeof rawUnit !== "object" || Array.isArray(rawUnit))
      throw new Error("learning_v2_mode_text_analysis_unit_invalid");
    const unit = rawUnit as Record<string, unknown>;
    if (!Number.isInteger(unit.start) || !Number.isInteger(unit.end) || (unit.start as number) < 0 || (unit.end as number) <= (unit.start as number) || (unit.start as number) < previousEnd)
      throw new Error("learning_v2_mode_text_analysis_unit_offsets");
    if (analysis.text.slice(unit.start as number, unit.end as number) !== unit.text)
      throw new Error("learning_v2_mode_text_analysis_unit_offsets");
    if (typeof unit.lemma !== "string" || !unit.lemma.trim() || typeof unit.partOfSpeech !== "string" || !unit.partOfSpeech.trim())
      throw new Error("learning_v2_mode_text_analysis_unit_grammar_missing");
    if (!localizedTextPresent(unit.partOfSpeechLabelByLocale) || !localizedTextPresent(unit.meaningByLocale) || !localizedTextPresent(unit.functionByLocale))
      throw new Error("learning_v2_mode_text_analysis_unit_localized_copy_missing");
    if (!Array.isArray(unit.sourceRefs) || unit.sourceRefs.length === 0 || unit.sourceRefs.some((ref) => typeof ref !== "string" || !ref.trim()))
      throw new Error("learning_v2_mode_text_analysis_unit_source_missing");
    for (let offset = unit.start as number; offset < (unit.end as number); offset += 1) covered.add(offset);
    previousEnd = unit.end as number;
  }
  for (let offset = 0; offset < analysis.text.length; offset += 1) {
    if (!/\s/u.test(analysis.text[offset]!) && !covered.has(offset))
      throw new Error("learning_v2_mode_text_analysis_unit_gap");
  }
  return Object.freeze(value as LearningV2ModeTextAnalysisV1);
}

function validateFeedbackAnalyses(rows: unknown, expectedTextById: ReadonlyMap<string, string>): void {
  if (!Array.isArray(rows)) return;
  for (const rawRow of rows) {
    if (!rawRow || typeof rawRow !== "object" || Array.isArray(rawRow)) continue;
    const row = rawRow as Record<string, unknown>;
    if (row.analysisV1 !== undefined) validateLearningV2ModeTextAnalysisV1(row.analysisV1, expectedTextById.get(String(row.responseId)));
    if (row.analysisV1 !== undefined && row.correct === false) {
      if (typeof row.errorType !== "string" || !row.errorType.trim() ||
        !localizedTextPresent(row.whyTemptingByLocale) || !localizedTextPresent(row.whyWrongHereByLocale) ||
        !localizedTextPresent(row.minimalContrastByLocale) || !localizedTextPresent(row.acceptabilityBoundaryByLocale))
        throw new Error("learning_v2_mode_choice_wrong_reason_missing");
    }
  }
}

function validateOptionalAnalyses(payload: Record<string, unknown>, family: LearningV2ModeNativePayloadV1["family"]): void {
  if (family === "context_gap_grammar") {
    const expected = new Map((payload.gapOptions as Array<Record<string, unknown>>).map((entry) => [String(entry.responseId), String(entry.text)]));
    validateFeedbackAnalyses(payload.choiceFeedback, expected);
  } else if (family === "listen_choose") {
    const expected = new Map((payload.localizedMeaningChoices as Array<Record<string, unknown>>).map((entry) => [String(entry.responseId), String(entry.targetText)]));
    validateFeedbackAnalyses(payload.choiceFeedback, expected);
  } else if (family === "phrase_builder" || family === "listen_build_dictation") {
    const distractors = (payload.authoredDistractorTokens as unknown[]).map(String);
    const expected = new Map((payload.slotFeedback as Array<Record<string, unknown>>).map((entry, index) => [String(entry.responseId), distractors[index] ?? ""]));
    validateFeedbackAnalyses(payload.slotFeedback, expected);
    const explanation = payload.explanationV1 as Record<string, unknown> | undefined;
    if (explanation?.phrase !== undefined) validateLearningV2ModeTextAnalysisV1(explanation.phrase, String(family === "phrase_builder" ? payload.targetPhrase : payload.hiddenTargetPhrase));
  } else if (family === "speed_match") {
    for (const rawPair of payload.pairGrid as Array<Record<string, unknown>>) {
      const analysis = rawPair.analysisV1 as Record<string, unknown> | undefined;
      if (analysis?.phrase !== undefined) validateLearningV2ModeTextAnalysisV1(analysis.phrase, String(rawPair.target));
    }
  } else if (family === "scripted_repeat_compare") {
    const explanation = payload.explanationV1 as Record<string, unknown> | undefined;
    if (explanation?.phrase !== undefined) validateLearningV2ModeTextAnalysisV1(explanation.phrase, String(payload.targetPhrase));
  }
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
