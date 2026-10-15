import {
  LEARNING_V2_ACTIVE_MODE_FAMILIES_V2,
  LEARNING_V2_INTERFACE_LOCALES_V2,
  type LearningV2BuilderTileV2,
  type LearningV2ChoiceOptionV2,
  type LearningV2CurriculumSessionPacketV2,
  type LearningV2PhraseBuilderPayloadV2,
  type LearningV2PracticeInteractionV2,
  type LearningV2SpeedMatchPayloadV2,
} from "../contracts/course_blueprint_v2";
import type { LearningV2EnglishExactSessionPacketV2 } from "../en/exact_session_packets_en_v2";
import type { LearningV2EnglishGrammarOperationV2 } from "../en/grammar_operations_en_v2";

export type LearningV2CurriculumFindingV2 = Readonly<{
  severity: "blocker";
  code: string;
  path: string;
  message: string;
}>;

export type LearningV2ChoiceActivityV2 =
  | readonly LearningV2ChoiceOptionV2[]
  | Readonly<{ options: readonly LearningV2ChoiceOptionV2[] }>;

export type LearningV2SpeedMatchActivityV2 = LearningV2SpeedMatchPayloadV2;

export type LearningV2BuilderActivityV2 =
  | LearningV2PhraseBuilderPayloadV2
  | Readonly<{ tiles: readonly LearningV2BuilderTileV2[] }>;

const ACTIVE_MODES = new Set<string>(LEARNING_V2_ACTIVE_MODE_FAMILIES_V2);

function finding(code: string, path: string, message: string): LearningV2CurriculumFindingV2 {
  return Object.freeze({ severity: "blocker", code, path, message });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalized(value: unknown): string {
  return typeof value === "string" ? value.trim().toLocaleLowerCase("en") : "";
}

function hasExactFeedbackLocales(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const keys = Object.keys(value).sort();
  const locales = [...LEARNING_V2_INTERFACE_LOCALES_V2].sort();
  return (
    keys.length === locales.length &&
    keys.every((key, index) => key === locales[index]) &&
    locales.every((locale) => typeof value[locale] === "string" && String(value[locale]).trim().length > 0)
  );
}

function choiceOptions(activity: LearningV2ChoiceActivityV2 | unknown): readonly unknown[] {
  if (Array.isArray(activity)) return activity;
  if (isRecord(activity) && Array.isArray(activity.options)) return activity.options;
  return [];
}

export function validateLearningV2ChoiceActivityV2(
  activity: LearningV2ChoiceActivityV2,
): readonly LearningV2CurriculumFindingV2[] {
  const findings: LearningV2CurriculumFindingV2[] = [];
  const options = choiceOptions(activity);
  if (options.length !== 4) {
    findings.push(finding(
      "choice_option_count_invalid",
      "options",
      `Single-choice activity must have exactly four options; received ${options.length}.`,
    ));
  }

  const seenTexts = new Set<string>();
  let correctCount = 0;
  for (const [index, option] of options.entries()) {
    const path = `options[${index}]`;
    if (!isRecord(option)) {
      findings.push(finding("choice_option_invalid", path, "Choice option must be an object."));
      continue;
    }
    const text = normalized(option.text);
    if (text && seenTexts.has(text)) {
      findings.push(finding(
        "choice_duplicate_distractor",
        `${path}.text`,
        `Option text “${String(option.text)}” is duplicated after normalization.`,
      ));
    }
    if (text) seenTexts.add(text);
    if (typeof option.text === "string" && option.text.includes("/")) {
      findings.push(finding(
        "choice_non_atomic_option",
        `${path}.text`,
        "An answer option must contain one atomic answer, not slash-separated alternatives.",
      ));
    }
    if (option.isCorrect === true) {
      correctCount += 1;
      continue;
    }
    if (
      typeof option.diagnosticErrorId !== "string" ||
      option.diagnosticErrorId.trim().length === 0 ||
      !hasExactFeedbackLocales(option.feedbackByLocale)
    ) {
      findings.push(finding(
        "choice_feedback_missing",
        path,
        "Every wrong option needs its own diagnostic ID and complete eight-locale feedback.",
      ));
    }
  }
  if (correctCount !== 1) {
    findings.push(finding(
      "choice_correct_count_invalid",
      "options",
      `Exactly one option must be correct; received ${correctCount}.`,
    ));
  }
  return Object.freeze(findings);
}

export function validateLearningV2SpeedMatchV2(
  activity: LearningV2SpeedMatchActivityV2,
  knownSenseIds: ReadonlySet<string>,
): readonly LearningV2CurriculumFindingV2[] {
  const findings: LearningV2CurriculumFindingV2[] = [];
  const pairs = isRecord(activity) && Array.isArray(activity.pairs) ? activity.pairs : [];
  if (pairs.length !== 4) {
    findings.push(finding(
      "speed_match_pair_count_invalid",
      "pairs",
      `Speed Match must contain exactly four word-to-meaning pairs; received ${pairs.length}.`,
    ));
  }
  const seenSenseIds = new Set<string>();
  for (const [index, pair] of pairs.entries()) {
    if (!isRecord(pair) || typeof pair.targetSenseId !== "string") continue;
    const senseId = pair.targetSenseId;
    if (!knownSenseIds.has(senseId)) {
      findings.push(finding(
        "speed_match_unfamiliar_target",
        `pairs[${index}].targetSenseId`,
        `Speed Match may use only already unlocked target senses; “${senseId}” is unfamiliar.`,
      ));
    }
    if (seenSenseIds.has(senseId)) {
      findings.push(finding(
        "speed_match_duplicate_target",
        `pairs[${index}].targetSenseId`,
        `Target sense “${senseId}” appears more than once.`,
      ));
    }
    seenSenseIds.add(senseId);
  }
  return Object.freeze(findings);
}

export function validateLearningV2BuilderV2(
  activity: LearningV2BuilderActivityV2,
): readonly LearningV2CurriculumFindingV2[] {
  const findings: LearningV2CurriculumFindingV2[] = [];
  const tiles = isRecord(activity) && Array.isArray(activity.tiles) ? activity.tiles : [];
  for (const [index, tile] of tiles.entries()) {
    if (!isRecord(tile)) continue;
    const text = typeof tile.text === "string" ? tile.text.trim() : "";
    const isForbiddenKind = tile.kind !== "word" && tile.kind !== "chunk";
    const isSingleLetterFragment = /^\p{L}$/u.test(text) && !["I", "a", "A"].includes(text);
    if (isForbiddenKind || isSingleLetterFragment) {
      findings.push(finding(
        "builder_letter_tile_forbidden",
        `tiles[${index}]`,
        "Phrase builders use whole words or meaningful chunks; isolated letter assembly is forbidden.",
      ));
    }
  }
  return Object.freeze(findings);
}

function payloadAudio(payload: Record<string, unknown>): Record<string, unknown> | null {
  return isRecord(payload.audio) ? payload.audio : null;
}

export function validateLearningV2AudioSpeechMotionV2(
  activity: LearningV2PracticeInteractionV2,
): readonly LearningV2CurriculumFindingV2[] {
  const findings: LearningV2CurriculumFindingV2[] = [];
  const raw = activity as unknown;
  if (!isRecord(raw)) return Object.freeze(findings);

  const motion = isRecord(raw.motion) ? raw.motion : null;
  if (!motion || motion.blocksInteraction !== false) {
    findings.push(finding(
      "motion_must_not_block_interaction",
      "motion.blocksInteraction",
      "Motion may decorate state changes but must never delay taps or navigation.",
    ));
  }

  const payload = isRecord(raw.modePayload) ? raw.modePayload : null;
  if (!payload) return Object.freeze(findings);
  if (payload.family === "listen_choose" && payload.targetTextHiddenUntilAttempt !== true) {
    findings.push(finding(
      "listen_choose_target_text_leak",
      "modePayload.targetTextHiddenUntilAttempt",
      "Listen-and-choose must not reveal the target text before the learner attempts the audio task.",
    ));
  }

  const requiresAudio = [
    "listen_choose",
    "listen_build_dictation",
    "scripted_repeat_compare",
  ].includes(String(payload.family));
  if (requiresAudio) {
    const audio = payloadAudio(payload);
    if (!audio || audio.preloadBeforeSession !== true) {
      findings.push(finding(
        "audio_preload_required",
        "modePayload.audio.preloadBeforeSession",
        "Session audio must be ready before the activity becomes active.",
      ));
    }
    if (!audio || audio.replayEnabled !== true) {
      findings.push(finding(
        "audio_replay_required",
        "modePayload.audio.replayEnabled",
        "Every audio control must remain replayable after the first playback.",
      ));
    }
  }

  if (payload.family === "scripted_repeat_compare") {
    const speech = isRecord(payload.speech) ? payload.speech : null;
    if (
      !speech ||
      speech.interaction !== "hold_press_release" ||
      speech.releaseEndsCapture !== true
    ) {
      findings.push(finding(
        "speech_hold_release_required",
        "modePayload.speech.interaction",
        "Speech capture must start on hold and end only on release.",
      ));
    }
    if (!speech || speech.ownerPreviewSkipEnabled !== true) {
      findings.push(finding(
        "speech_owner_preview_skip_required",
        "modePayload.speech.ownerPreviewSkipEnabled",
        "Owner preview must allow the speaking step to be skipped with Continue.",
      ));
    }
    if (!speech || speech.accessibilityEquivalentEnabled !== true) {
      findings.push(finding(
        "speech_accessibility_equivalent_required",
        "modePayload.speech.accessibilityEquivalentEnabled",
        "A non-speech accessibility-equivalent path is required.",
      ));
    }
  }
  return Object.freeze(findings);
}

function correctOptionIndex(interaction: unknown): number | null {
  if (!isRecord(interaction) || !isRecord(interaction.modePayload)) return null;
  const options = choiceOptions(interaction.modePayload);
  const indices = options.flatMap((option, index) =>
    isRecord(option) && option.isCorrect === true ? [index] : [],
  );
  return indices.length === 1 ? indices[0] : null;
}

export function validateLearningV2SessionActivitySequenceV2(
  packet: LearningV2CurriculumSessionPacketV2,
): readonly LearningV2CurriculumFindingV2[] {
  const findings: LearningV2CurriculumFindingV2[] = [];
  const raw = packet as unknown;
  if (!isRecord(raw)) return Object.freeze(findings);

  const intros = Array.isArray(raw.introInteractions) ? raw.introInteractions : [];
  for (const [index, intro] of intros.entries()) {
    if (!isRecord(intro) || intro.testLanguage !== "target") {
      findings.push(finding(
        "intro_interface_language_test_forbidden",
        `introInteractions[${index}].testLanguage`,
        "Intro checks must test the target language, never Russian or another interface language.",
      ));
    }
  }

  const practices = Array.isArray(raw.practiceInteractions) ? raw.practiceInteractions : [];
  const positions: number[] = [];
  for (const [index, practice] of practices.entries()) {
    if (!isRecord(practice) || !ACTIVE_MODES.has(String(practice.modeFamily))) {
      findings.push(finding(
        "mode_family_forbidden",
        `practiceInteractions[${index}].modeFamily`,
        `Mode family “${isRecord(practice) ? String(practice.modeFamily) : "invalid"}” is not an approved Learning V2 activity family.`,
      ));
      continue;
    }
    const position = correctOptionIndex(practice);
    if (position !== null) positions.push(position);
  }

  if (positions.length >= 3) {
    const distinctPositions = new Set(positions);
    const firstPositionCount = positions.filter((position) => position === 0).length;
    if (distinctPositions.size < 3 || firstPositionCount > positions.length / 2) {
      findings.push(finding(
        "choice_correct_position_distribution_invalid",
        "practiceInteractions",
        "Correct answers must occupy at least three positions and position 0 may not hold more than half of them.",
      ));
    }
  }
  return Object.freeze(findings);
}

export type LearningV2CourseBlueprintValidationInputV2 = Readonly<{
  grammarOperations: readonly LearningV2EnglishGrammarOperationV2[];
  lexicalSenses: readonly Readonly<{ id: string }>[];
  sessionPackets: readonly LearningV2EnglishExactSessionPacketV2[];
}>;

export function validateLearningV2CourseBlueprintV2(
  input: LearningV2CourseBlueprintValidationInputV2,
): readonly LearningV2CurriculumFindingV2[] {
  const findings: LearningV2CurriculumFindingV2[] = [];
  const operationById = new Map(input.grammarOperations.map((operation) => [operation.id, operation]));
  const lexicalSenseIds = new Set(input.lexicalSenses.map((sense) => sense.id));
  const exampleOwners = new Map<string, LearningV2EnglishGrammarOperationV2[]>();
  for (const operation of input.grammarOperations) {
    for (const example of operation.canonicalLexicalExamples) {
      const owners = exampleOwners.get(example) ?? [];
      owners.push(operation);
      exampleOwners.set(example, owners);
    }
  }

  for (const packet of input.sessionPackets) {
    const focusOperationIds = new Set([
      ...packet.grammarOperationIds,
      ...packet.reviewOperationIds,
    ]);

    for (const [index, intro] of packet.introPlan.entries()) {
      for (const operationId of intro.operationIds) {
        if (!focusOperationIds.has(operationId)) {
          findings.push(finding(
            "intro_operation_outside_packet",
            `${packet.sessionId}.introPlan[${index}].operationIds`,
            `Intro references “${operationId}”, which is outside the packet grammar/review focus.`,
          ));
        }
      }
    }

    for (const [index, activity] of packet.activityPlan.entries()) {
      for (const operationId of activity.operationIds) {
        if (!focusOperationIds.has(operationId)) {
          findings.push(finding(
            "practice_operation_outside_intro_or_review",
            `${packet.sessionId}.activityPlan[${index}].operationIds`,
            `Practice references “${operationId}”, which was not introduced or declared for review.`,
          ));
        }
      }
    }

    for (const [index, example] of packet.canonicalExamples.entries()) {
      const owners = exampleOwners.get(example) ?? [];
      const hasFocusOwner = owners.some((owner) => focusOperationIds.has(owner.id));
      const futureOwner = owners.find((owner) => owner.lessonOrdinal > packet.lessonOrdinal);
      if (!hasFocusOwner && futureOwner) {
        findings.push(finding(
          "canonical_example_future_grammar",
          `${packet.sessionId}.canonicalExamples[${index}]`,
          `Canonical example belongs to future operation “${futureOwner.id}”.`,
        ));
      }
      if (!hasFocusOwner) {
        findings.push(finding(
          "canonical_example_missing_operation_form",
          `${packet.sessionId}.canonicalExamples[${index}]`,
          "Canonical example does not instantiate an operation owned by this packet.",
        ));
      }
    }

    for (const operationId of focusOperationIds) {
      const operation = operationById.get(operationId);
      if (operation && operation.lessonOrdinal > packet.lessonOrdinal) {
        findings.push(finding(
          "packet_future_grammar_forbidden",
          `${packet.sessionId}.grammarFocus`,
          `Operation “${operationId}” belongs to future lesson ${operation.lessonOrdinal}.`,
        ));
      }
    }

    for (const senseId of packet.newLexicalSenseIds) {
      const groundedContactsBeforeScoring = packet.activityPlan.filter(
        (activity) => !activity.scored && activity.targetLexicalSenseIds.includes(senseId),
      ).length;
      if (!lexicalSenseIds.has(senseId) || groundedContactsBeforeScoring < 3) {
        findings.push(finding(
          "new_lexeme_absent_from_grounded_contacts",
          `${packet.sessionId}.newLexicalSenseIds`,
          `New sense “${senseId}” needs at least three meaning-bearing contacts before its first scored use.`,
        ));
      }
    }

    if (packet.role === "checkpoint" && packet.grammarOperationIds.length > 0) {
      findings.push(finding(
        "checkpoint_new_grammar_forbidden",
        `${packet.sessionId}.grammarOperationIds`,
        "Checkpoint sessions may retrieve and integrate only already introduced grammar.",
      ));
    }

    if (
      packet.independentProbe.changedContextRequired !== true ||
      packet.independentProbe.trainingPromptSignature === packet.independentProbe.probePromptSignature
    ) {
      findings.push(finding(
        "independent_probe_not_changed_context",
        `${packet.sessionId}.independentProbe`,
        "The independent probe must use a changed context and a different prompt signature.",
      ));
    }
  }

  return Object.freeze(findings);
}
