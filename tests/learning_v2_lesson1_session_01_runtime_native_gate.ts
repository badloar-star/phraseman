import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { EPISODE_01_SESSION_01_MODE_NATIVE_PRACTICE_V1 } from "../modules/learning-v2/content/source/episode_01_session_01_mode_native_v1";

const root = resolve(__dirname, "..");
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const findings: string[] = [];
const expectText = (path: string, needle: string, label: string): void => {
  if (!read(path).includes(needle)) findings.push(`${label}:${path}:${needle}`);
};
const rejectText = (path: string, needle: string, label: string): void => {
  if (read(path).includes(needle)) findings.push(`${label}:${path}:${needle}`);
};

expectText(
  "modules/learning-v2/modes/mode_contract_v1.ts",
  "readonly modePayload: LearningV2ModeNativePayloadV1 | null;",
  "mode_payload_not_required_by_renderer",
);
expectText(
  "modules/learning-v2/modes/speed_match_mode_v1.tsx",
  "payload.pairGrid",
  "speed_match_not_pair_grid",
);
expectText(
  "modules/learning-v2/modes/phrase_builder_mode_v1.tsx",
  "onRemoveTokenAt(index)",
  "phrase_builder_cannot_remove_any_chip",
);
expectText(
  "modules/learning-v2/modes/speed_match_mode_v1.tsx",
  'onModeNativeComplete("all_pairs_matched")',
  "speed_match_no_real_completion",
);
expectText(
  "modules/learning-v2/modes/mode_copy_v1.ts",
  "Удерживай микрофон внизу",
  "repeat_compare_no_hold_instruction",
);
expectText(
  "modules/learning-v2/modes/listen_choose_mode_v1.tsx",
  "disabled={!onPlayFullPhraseAudio || loading}",
  "listen_choose_dead_audio_button_not_disabled",
);
rejectText(
  "modules/learning-v2/modes/listen_choose_mode_v1.tsx",
  'disabled={resolved || !hasPlayedOnce || phase === "processing"}',
  "listen_choose_options_blocked_until_audio_finishes",
);
rejectText(
  "modules/learning-v2/modes/listen_build_dictation_mode_v1.tsx",
  'disabled={resolved || phase === "processing" || !hasPlayedOnce}',
  "listen_build_tokens_blocked_until_audio_finishes",
);
rejectText(
  "modules/learning-v2/modes/listen_build_dictation_mode_v1.tsx",
  'disabled={!hasPlayedOnce || !canSubmit || resolved || phase === "processing"}',
  "listen_build_submit_blocked_until_audio_finishes",
);
expectText(
  "modules/learning-v2/modes/listen_build_dictation_mode_v1.tsx",
  "disabled={!onPlayFullPhraseAudio || loading}",
  "listen_build_dead_audio_button_not_disabled",
);
expectText(
  "modules/learning-v2/modes/listen_build_dictation_mode_v1.tsx",
  "hapticLightImpact, hapticSuccess",
  "listen_build_play_handler_references_missing_haptic_import",
);
rejectText(
  "modules/learning-v2/modes/scripted_repeat_compare_mode_v1.tsx",
  "onPress={onToggleRecording}",
  "repeat_compare_still_owns_tap_record_button",
);
expectText(
  "app/learning_v2_direct_session_player_v1.tsx",
  "modePayload={practice.modePayload}",
  "player_drops_mode_payload",
);
expectText(
  "app/learning_v2_direct_session_player_v1.tsx",
  "playPracticeSlowReferenceAudio",
  "player_missing_slow_reference_playback",
);
rejectText(
  "app/learning_v2_direct_session_player_v1.tsx",
  "onPlaySlowPhraseAudio={null}",
  "player_exposes_dead_slow_audio_control",
);
expectText(
  "app/learning_v2_direct_session_player_v1.tsx",
  'practice.inputMode === "tap_record_compare"',
  "player_missing_tap_record_compare",
);
expectText(
  "app/learning_v2_direct_session_player_v1.tsx",
  'testID="learning-v2-footer-hold-to-talk"',
  "player_missing_footer_hold_to_talk",
);
expectText(
  "app/learning_v2_direct_session_player_v1.tsx",
  "onPressIn={startVoiceHold}",
  "player_missing_hold_start",
);
expectText(
  "app/learning_v2_direct_session_player_v1.tsx",
  "onPressOut={localVoice.stop}",
  "player_missing_hold_release",
);
expectText(
  "app/learning_v2_direct_session_player_v1.tsx",
  "useLearningV2LocalHoldToTalkV1({",
  "player_missing_lifecycle_owned_hold_to_talk",
);
expectText(
  "app/learning_v2_direct_session_player_v1.tsx",
  "<VoiceEqualizer",
  "player_missing_canonical_voice_equalizer",
);
expectText(
  "app/learning_v2_direct_session_player_v1.tsx",
  "onFinalTranscript: (heard) =>",
  "player_missing_final_transcript_evaluation",
);
expectText(
  "components/PressableScale.tsx",
  "onPressIn?.(event)",
  "animated_pressable_swallows_hold_start",
);
expectText(
  "components/PressableScale.tsx",
  "onPressOut?.(event)",
  "animated_pressable_swallows_hold_release",
);
expectText(
  "app/learning_v2_direct_session_player_v1.tsx",
  'practice.inputMode === "pair_grid"',
  "player_missing_pair_grid",
);
expectText(
  "app/learning_v2_session_intro.tsx",
  'readerParagraph: { fontSize: 15, lineHeight: 22',
  "intro_copy_not_compacted",
);
expectText(
  "app/learning_v2_session_intro.tsx",
  'answerList: { marginTop: 10, marginHorizontal: -14, gap: 8 }',
  "intro_choices_not_widened_to_panel_edges",
);
expectText(
  "modules/learning-v2/content/source/session_shard_from_source_v1.ts",
  "Сопоставьте выражения с их значениями.",
  "speed_match_prompt_does_not_describe_actual_pairing_action",
);
rejectText(
  "modules/learning-v2/content/source/session_shard_from_source_v1.ts",
  "Быстро подберите правильное слово.",
  "mechanical_speed_match_prompt_returned",
);

const vocabularyPracticeTargets =
  EPISODE_01_SESSION_01_MODE_NATIVE_PRACTICE_V1.flatMap((entry) =>
    entry.target.kind === "vocabulary" ? [entry.target.sourceIndex] : [],
  );
const vocabularyStageCounts = new Map<string, number>();
const vocabularyStageKeys = new Set<string>();
const vocabularyFamiliesByTarget = new Map<number, Set<string>>();
for (const entry of EPISODE_01_SESSION_01_MODE_NATIVE_PRACTICE_V1) {
  if (entry.target.kind === "vocabulary") {
    const key = `${entry.target.sourceIndex}:${entry.learningStage}`;
    vocabularyStageKeys.add(key);
    vocabularyStageCounts.set(
      entry.learningStage,
      (vocabularyStageCounts.get(entry.learningStage) ?? 0) + 1,
    );
    const families = vocabularyFamiliesByTarget.get(entry.target.sourceIndex) ?? new Set<string>();
    families.add(entry.family);
    vocabularyFamiliesByTarget.set(entry.target.sourceIndex, families);
  }
}
if (vocabularyPracticeTargets.length !== 12 || vocabularyStageKeys.size !== 12) {
  findings.push(
    `word_first_standalone_contacts_invalid:targets=${vocabularyPracticeTargets.length}:unique=${vocabularyStageKeys.size}`,
  );
}
for (const stage of ["recognize", "retrieve_meaning", "build_form"] as const) {
  if (vocabularyStageCounts.get(stage) !== 4) {
    findings.push(
      `word_first_stage_count_invalid:${stage}:${vocabularyStageCounts.get(stage) ?? 0}`,
    );
  }
}
for (const [sourceIndex, families] of vocabularyFamiliesByTarget) {
  if (families.size !== 3) {
    findings.push(
      `word_first_target_family_repeated:sourceIndex=${sourceIndex}:families=${[...families].join(",")}`,
    );
  }
}
const phrasePracticeCount = EPISODE_01_SESSION_01_MODE_NATIVE_PRACTICE_V1.filter(
  (entry) => entry.target.kind === "phrase",
).length;
if (phrasePracticeCount !== 4) {
  findings.push(`phrase_application_count_invalid:${phrasePracticeCount}`);
}
for (let index = 1; index < vocabularyPracticeTargets.length; index += 1) {
  if (vocabularyPracticeTargets[index] === vocabularyPracticeTargets[index - 1]) {
    findings.push(
      `same_new_word_repeated_in_consecutive_tasks:sourceIndex=${vocabularyPracticeTargets[index]}:positions=${index - 1},${index}`,
    );
  }
}
if (vocabularyPracticeTargets.slice(0, 4).join(",") !== "0,1,2,3") {
  findings.push(
    `new_word_first_contacts_not_interleaved:${vocabularyPracticeTargets.slice(0, 4).join(",")}`,
  );
}

const usedFamilies = new Set(
  EPISODE_01_SESSION_01_MODE_NATIVE_PRACTICE_V1.map((entry) => entry.family),
);
const requiredFamilies = [
  "phrase_builder",
  "listen_choose",
  "listen_build_dictation",
  "context_gap_grammar",
  "speed_match",
  "scripted_repeat_compare",
] as const;
for (const family of requiredFamilies) {
  if (!usedFamilies.has(family)) findings.push(`session01_family_missing:${family}`);
}
for (
  let index = 1;
  index < EPISODE_01_SESSION_01_MODE_NATIVE_PRACTICE_V1.length;
  index += 1
) {
  const previous = EPISODE_01_SESSION_01_MODE_NATIVE_PRACTICE_V1[index - 1]!;
  const current = EPISODE_01_SESSION_01_MODE_NATIVE_PRACTICE_V1[index]!;
  if (previous.family === current.family) {
    findings.push(`adjacent_family_repeat:index=${index}:${current.family}`);
  }
}

const vocabularyFamilies = new Set(
  EPISODE_01_SESSION_01_MODE_NATIVE_PRACTICE_V1.flatMap((entry) =>
    entry.target.kind === "vocabulary" || entry.target.kind === "vocabulary_grid"
      ? [entry.family]
      : [],
  ),
);
if (vocabularyFamilies.size < 4) {
  findings.push(`vocabulary_mode_variety_too_low:${[...vocabularyFamilies].join(",")}`);
}

for (const [index, entry] of EPISODE_01_SESSION_01_MODE_NATIVE_PRACTICE_V1.entries()) {
  const payload = entry.modePayload;
  if (payload.family === "listen_choose") {
    for (const locale of ["ru", "uk", "es", "pt-BR", "vi", "id", "tr", "pl"] as const) {
      const visibleChoices = payload.localizedMeaningChoices.map(
        (choice) => choice.meaningByLocale?.[locale] ?? choice.targetText ?? "",
      );
      if (new Set(visibleChoices).size !== visibleChoices.length) {
        findings.push(`listen_choose_visible_choices_repeat:index=${index}:locale=${locale}`);
      }
    }
  }
  const optionCount =
    payload.family === "listen_choose"
      ? payload.localizedMeaningChoices.length
      : payload.family === "context_gap_grammar"
        ? payload.gapOptions.length
        : payload.family === "phrase_builder" ||
            payload.family === "listen_build_dictation"
          ? payload.orderedTokens.length + payload.authoredDistractorTokens.length
          : null;
  if (optionCount !== null && optionCount < 4) {
    findings.push(`insufficient_authored_options:index=${index}:${entry.family}:${optionCount}`);
  }
  const feedbackRows =
    payload.family === "listen_choose"
      ? payload.choiceFeedback
      : payload.family === "context_gap_grammar"
        ? payload.choiceFeedback
        : payload.family === "phrase_builder" ||
            payload.family === "listen_build_dictation"
          ? payload.slotFeedback
          : [];
  const wrongDimensions = feedbackRows
    .filter((row) => !row.correct)
    .map((row) => row.testedDimension.trim());
  if (wrongDimensions.some((dimension) => dimension.length === 0)) {
    findings.push(`distractor_dimension_missing:index=${index}:${entry.family}`);
  }
  if (new Set(wrongDimensions).size !== wrongDimensions.length) {
    findings.push(`distractor_dimensions_repeated:index=${index}:${entry.family}`);
  }
}

if (findings.length) {
  throw new Error([
    "LESSON 1 SESSION 01 RUNTIME-NATIVE GATE: HOLD",
    `total_findings=${findings.length}`,
    ...findings,
  ].join("\n"));
}

process.stdout.write("LESSON 1 SESSION 01 RUNTIME-NATIVE GATE: PASS\n");
