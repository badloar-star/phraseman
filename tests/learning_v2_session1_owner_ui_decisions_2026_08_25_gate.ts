import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { EPISODE_01_SESSION_01_MODE_NATIVE_PRACTICE_V1 } from "../modules/learning-v2/content/source/episode_01_session_01_mode_native_v1";
import { EPISODE_01_SESSION_01_VOCABULARY_V1 } from "../modules/learning-v2/content/source/episode_01_session_01_vocabulary_v1";
import { buildLearningV2AuthoringDevicePreviewV1 } from "../modules/learning-v2/preview/authoring_device_preview_v1";
import { evaluateLearningV2CourseSessionInteractionV1 } from "../modules/learning-v2/runtime/course_session_evaluator_capsule_child_v1";
import { stableShuffleLearningV2OptionsV1 } from "../modules/learning-v2/runtime/stable_option_shuffle_v1";

const root = resolve(__dirname, "..");
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");

const activeFamilies = new Set(
  EPISODE_01_SESSION_01_MODE_NATIVE_PRACTICE_V1.map((entry) => entry.family),
);

const sourceOrderedOptions = Object.freeze([
  { responseId: "correct" },
  { responseId: "trap-a" },
  { responseId: "trap-b" },
  { responseId: "trap-c" },
]);
const firstShuffle = stableShuffleLearningV2OptionsV1(
  "s1-0",
  sourceOrderedOptions,
);
const retryShuffle = stableShuffleLearningV2OptionsV1(
  "s1-0",
  sourceOrderedOptions,
);
assert.deepEqual(firstShuffle, retryShuffle, "answer order must stay stable during a retry");
assert.notEqual(
  firstShuffle[0]?.responseId,
  "correct",
  "a source-authored first correct answer must never remain the first visible option",
);

const realSessionPreview = buildLearningV2AuthoringDevicePreviewV1(1, "ru");
for (const interaction of realSessionPreview.learnerChild.interactions) {
  if (interaction.inputMode !== "single_choice") continue;
  const accepted = interaction.responseOptions.filter(
    (option) =>
      evaluateLearningV2CourseSessionInteractionV1(
        realSessionPreview.evaluatorCapsuleChild,
        interaction.interactionId,
        { kind: "choice_token", value: option.responseId },
      ).resultCode === "provisional_correct",
  );
  assert.equal(
    accepted.length,
    1,
    `${interaction.interactionId} must have exactly one accepted visible option`,
  );
  const firstDisplay = stableShuffleLearningV2OptionsV1(
    interaction.interactionId,
    interaction.responseOptions,
  )[0];
  assert.notEqual(
    firstDisplay?.responseId,
    accepted[0]?.responseId,
    `${interaction.interactionId} must not display its correct answer first`,
  );
}

const speedMatchEntries = EPISODE_01_SESSION_01_MODE_NATIVE_PRACTICE_V1.filter(
  (entry) => entry.modePayload.family === "speed_match",
);
assert.equal(speedMatchEntries.length, 1, "session 1 must contain one authored pairs board");
const speedMatchPayload = speedMatchEntries[0]!.modePayload;
assert.equal(speedMatchPayload.family, "speed_match");
assert.equal(
  speedMatchPayload.pairGrid.length,
  4,
  "the first course session must use exactly four already introduced pairs",
);
assert.ok(
  speedMatchPayload.pairGrid.every((pair) => !/\s/u.test(pair.target.trim())),
  "pairs mode is vocabulary-only: a target may be one word, never a phrase",
);
const introducedVocabulary = new Set(
  EPISODE_01_SESSION_01_VOCABULARY_V1.map((entry) => entry.target),
);
assert.ok(
  speedMatchPayload.pairGrid.every((pair) => introducedVocabulary.has(pair.target)),
  "pairs mode may retrieve only vocabulary already introduced word-first in this session",
);
assert.equal(new Set(speedMatchPayload.leftColumn).size, 4, "left pair order must contain four unique ids");
assert.equal(new Set(speedMatchPayload.rightColumn).size, 4, "right pair order must contain four unique ids");
assert.notDeepEqual(
  speedMatchPayload.rightColumn,
  speedMatchPayload.leftColumn,
  "the two pair columns must be independently shuffled",
);
assert.deepEqual(
  [...activeFamilies].sort(),
  [
    "context_gap_grammar",
    "listen_build_dictation",
    "listen_choose",
    "phrase_builder",
    "scripted_repeat_compare",
    "speed_match",
  ],
  "session 1 must use the six owner-approved modes and must not schedule sound_contrast",
);
assert.ok(
  EPISODE_01_SESSION_01_MODE_NATIVE_PRACTICE_V1.every(
    (entry) =>
      entry.modePayload.family !== "context_gap_grammar" ||
      entry.target.kind === "phrase",
  ),
  "context_gap_grammar must test a meaningful phrase slot, never an isolated word",
);

const contextGap = read(
  "modules/learning-v2/modes/context_gap_grammar_mode_v1.tsx",
);
assert.ok(
  contextGap.includes("singleLine"),
  "answer labels must use the shared single-line answer-tile primitive",
);
assert.ok(
  contextGap.includes('flexWrap: "wrap"') &&
    contextGap.includes('justifyContent: "center"'),
  "whole answer tiles must wrap into centered rows",
);
assert.ok(
  !contextGap.includes('variantWrap: { flex: 1 }'),
  "answer tiles must size to their label instead of being squeezed equally",
);

const player = read("app/learning_v2_direct_session_player_v1.tsx");
assert.ok(
  !player.includes("<SaveToCardsButton"),
  "practice screens must not expose a global save button",
);

const introAdapter = read("app/learning_v2_direct_session_intro_adapter_v1.ts");
assert.ok(
  introAdapter.includes("stableShuffleLearningV2OptionsV1") &&
    introAdapter.includes("choiceOrder"),
  "all three embedded intro questions must use the same stable option shuffler",
);
assert.ok(
  !introAdapter.includes("correctChoiceIndex: 0 as const"),
  "intro rendering must not keep the correct answer hard-coded in the first position",
);
assert.ok(
  player.includes(
    'const showVoiceFooter = practice.family === "scripted_repeat_compare";',
  ),
  "the microphone footer must be explicitly scoped to the voice mode",
);
assert.ok(
  player.includes("referenceAudioState={referenceAudioState}"),
  "mode audio animation must receive real player state",
);
assert.ok(
  player.includes("stableShuffleLearningV2OptionsV1") &&
    player.includes("options={displayedResponseOptions}"),
  "every answer family must receive a stable shuffled option order",
);
assert.ok(
  player.includes("LearningV2RuneFlight") &&
    player.includes('testID="learning-v2-session-runes"'),
  "the session must show its rune score in the top-right HUD and animate earned runes into it",
);

const speedMatch = read("modules/learning-v2/modes/speed_match_mode_v1.tsx");
assert.ok(
  speedMatch.includes("useArenaSound") &&
    speedMatch.includes("pairMatch") &&
    speedMatch.includes("pairMiss"),
  "pairs mode must reuse the tournament match/miss feedback vocabulary",
);
assert.ok(
  speedMatch.includes("MOTION.mismatchTintMs") &&
    speedMatch.includes("setWrongPairIds(new Set())"),
  "a wrong pair must clear after the same bounded mismatch tint used by the owner motion contract",
);

for (const path of [
  "modules/learning-v2/modes/context_gap_grammar_mode_v1.tsx",
  "modules/learning-v2/modes/listen_choose_mode_v1.tsx",
  "modules/learning-v2/modes/phrase_builder_mode_v1.tsx",
] as const) {
  const source = read(path);
  assert.ok(
    source.includes("targetText") || source.includes("targetLanguageText"),
    `${path} must give target-language material its own semantic text style`,
  );
  assert.ok(
    source.includes('fontWeight: "900"'),
    `${path} must make target-language material visibly heavier than instructions`,
  );
}

for (const path of [
  "modules/learning-v2/modes/listen_choose_mode_v1.tsx",
  "modules/learning-v2/modes/listen_build_dictation_mode_v1.tsx",
] as const) {
  const source = read(path);
  assert.ok(
    source.includes("referenceAudioState"),
    `${path} must render from actual audio state`,
  );
  assert.ok(
    !source.includes("playTimerRef") && !source.includes("setTimeout(() =>"),
    `${path} must not fake playback with a timer`,
  );
}

const overlay = read(
  "components/learning-v2/LearningV2NewWordEncounterOverlay.tsx",
);
assert.ok(
  overlay.includes('pointerEvents="auto"'),
  "new-word card controls must accept taps immediately while motion continues",
);
assert.ok(
  overlay.includes("exactMeaningByLocale"),
  "the reverse of the new-word card must use the exact short translation",
);

process.stdout.write(
  "LEARNING V2 SESSION 1 OWNER UI DECISIONS 2026-08-25 GATE: PASS\n",
);
