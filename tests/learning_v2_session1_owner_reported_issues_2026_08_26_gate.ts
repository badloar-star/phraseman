import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { EPISODE_01_SESSION_01_WORD_FIRST_INTRO } from "../modules/learning-v2/content/source/episode_01_session_01_intro_word_first_v1";
import { buildLearningV2AuthoringDevicePreviewV1 } from "../modules/learning-v2/preview/authoring_device_preview_v1";

const root = resolve(__dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const locales = ["ru", "uk", "es", "pt-BR", "vi", "id", "tr", "pl"] as const;

const firstIntro = EPISODE_01_SESSION_01_WORD_FIRST_INTRO[0];
for (const locale of locales) {
  const choices = firstIntro.question.choices.map((choice) => choice[locale]);
  assert.equal(new Set(choices).size, 3, `${locale}: intro choices must be distinct`);
  assert.ok(
    !choices.every((choice) => /^[Iil|]+$/u.test(choice)),
    `${locale}: the first lesson must not test three visually confusable glyphs`,
  );
  assert.match(
    firstIntro.question.prompt[locale],
    /(говор|мов|habla|fala|nói|berbicara|konuş|mówi)/iu,
    `${locale}: the concept check must test who the speaker is, not typography trivia`,
  );
}

const flow = read("app/learning_v2_interleaved_new_word_flow_v1.ts");
assert.ok(
  flow.includes('"play_practice_audio_after_continue"'),
  "closing a word card must request fresh autoplay for the revealed audio task",
);
assert.match(
  flow,
  /\["stop_current_audio",\s*"play_practice_audio_after_continue"\]/u,
);

const player = read("app/learning_v2_direct_session_player_v1.tsx");
assert.ok(player.includes('effect === "play_practice_audio_after_continue"'));
assert.ok(player.includes("practiceAudioAutoplayToken"));

const overlay = read("components/learning-v2/LearningV2NewWordEncounterOverlay.tsx");
assert.ok(overlay.includes("ugcCardChrome"));
assert.ok(overlay.includes("UGC_CARD_THEME_IDS"));
assert.ok(!overlay.includes('bgCard: "#211C36"'));
assert.ok(!overlay.includes('backgroundColor: "rgba(16, 13, 29, 0.86)"'));
assert.ok(!/cardBookmark:\s*\{[\s\S]{0,220}borderWidth:/u.test(overlay));

const listenChoose = read("modules/learning-v2/modes/listen_choose_mode_v1.tsx");
assert.ok(!listenChoose.includes('name="speedometer-outline"'));
assert.ok(!listenChoose.includes("styles.slowButton"));

const speedMatch = read("modules/learning-v2/modes/speed_match_mode_v1.tsx");
assert.ok(speedMatch.includes('matchedPairIds.has(pair.pairId) ? "ok"'));
assert.ok(speedMatch.includes('disabled={disabled || verdict === "ok"}'));
assert.ok(!speedMatch.includes('matchedPairIds.has(pair.pairId) ? "void"'));

assert.ok(player.includes("useLearningV2LocalHoldToTalkV1({"));
assert.ok(player.includes("onPressOut={stopVoiceCapture}"));
assert.ok(player.includes("onFinalTranscript: (heard) =>"));
assert.ok(player.includes("<VoiceEqualizer"));
assert.ok(!player.includes("<SpeakingPanel"));
assert.ok(player.includes('require("../assets/images/level-spin-rewards/stars_10.webp")'));
assert.ok(player.includes("stableShuffleLearningV2OptionsV1("));

const productionAudio = read("app/learning_v2_session1_production_audio_v1.ts");
assert.equal(
  (productionAudio.match(/require\([^\n]+\.mp3["']\)/gu) ?? []).length,
  24,
  "session 1 must bind all 24 production clips statically",
);
const audioPreload = read("app/learning_v2_course_session_audio_preload_v1.ts");
assert.ok(audioPreload.includes("await asset.downloadAsync()"));

const preview = buildLearningV2AuthoringDevicePreviewV1(1, "ru");
const practice = preview.learnerChild.interactions;
assert.equal(practice.length, 17);
assert.equal(
  practice.filter((entry) => entry.family === "sound_contrast").length,
  0,
  "removed Sound Contrast must not return to session 1",
);
const families = new Set(practice.map((entry) => entry.family));
for (const family of [
  "phrase_builder",
  "listen_choose",
  "listen_build_dictation",
  "context_gap_grammar",
  "speed_match",
  "scripted_repeat_compare",
]) {
  assert.ok(families.has(family), `active mode missing: ${family}`);
}
for (let index = 1; index < practice.length; index += 1) {
  assert.notEqual(
    practice[index - 1]?.family,
    practice[index]?.family,
    `adjacent mode repeated at practice index ${index}`,
  );
}
const pairInteraction = practice.find((entry) => entry.family === "speed_match");
assert.ok(pairInteraction?.modePayload?.family === "speed_match");
assert.equal(pairInteraction.modePayload.pairGrid.length, 4);
assert.equal(
  new Set(pairInteraction.modePayload.pairGrid.map((pair) => pair.pairId)).size,
  4,
  "the first board must contain four real pairs / eight visible tiles",
);
for (const interaction of practice) {
  if (interaction.inputMode === "single_choice") {
    assert.ok(
      interaction.responseOptions.length >= 4,
      `${interaction.interactionId}: one answer plus three authored traps required`,
    );
  }
}

process.stdout.write("LEARNING V2 SESSION 1 OWNER-REPORTED ISSUES GATE: PASS\n");
