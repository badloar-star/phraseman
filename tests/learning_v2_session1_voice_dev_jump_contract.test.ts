import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  resolveLearningV2Session1VoiceDevJumpV1,
  runLearningV2Session1VoiceDevJumpV1,
} from "../app/learning_v2_session1_voice_dev_jump_v1";

const player = readFileSync(
  "app/learning_v2_direct_session_player_v1.tsx",
  "utf8",
);
const sessionOne = JSON.parse(
  readFileSync(
    "modules/learning-v2/content/factory_native/generated_release/en/l01/s01/learner.json",
    "utf8",
  ),
) as {
  readonly interactions: readonly { readonly family: string }[];
};

assert.ok(
  sessionOne.interactions.findIndex(
    (interaction) => interaction.family === "scripted_repeat_compare",
  ) >= 0,
  "the admitted session 1 release must contain a real oral task to jump to",
);

const devJump = resolveLearningV2Session1VoiceDevJumpV1({
  isDev: true,
  lessonOrdinal: 1,
  sessionOrdinal: 1,
  interactions: sessionOne.interactions,
});
assert.notEqual(devJump, null);
assert.equal(
  sessionOne.interactions[devJump!]?.family,
  "scripted_repeat_compare",
);
assert.equal(
  resolveLearningV2Session1VoiceDevJumpV1({
    isDev: false,
    lessonOrdinal: 1,
    sessionOrdinal: 1,
    interactions: sessionOne.interactions,
  }),
  null,
  "production must never expose the temporary jump",
);
assert.equal(
  resolveLearningV2Session1VoiceDevJumpV1({
    isDev: true,
    lessonOrdinal: 1,
    sessionOrdinal: 2,
    interactions: sessionOne.interactions,
  }),
  null,
  "the temporary jump must not exist in another session",
);

const effects: string[] = [];
assert.equal(
  runLearningV2Session1VoiceDevJumpV1(devJump, {
    settleSkippedPrefix: (index) => effects.push(`settle:${index}`),
    enterPractice: () => effects.push("enter-practice"),
    showPracticeIndex: (index) => effects.push(`show:${index}`),
  }),
  true,
);
assert.deepEqual(effects, [
  `settle:${devJump}`,
  "enter-practice",
  `show:${devJump}`,
]);

assert.match(
  player,
  /resolveLearningV2Session1VoiceDevJumpV1\(\{[\s\S]{0,300}isDev: __DEV__,[\s\S]{0,300}interactions: material\?\.learnerChild\.interactions \?\? \[\]/,
  "the player must resolve the guarded jump from the actual loaded session",
);
assert.match(
  player,
  /runLearningV2Session1VoiceDevJumpV1\(firstVoicePracticeIndex,[\s\S]{0,900}settleSkippedPrefix:[\s\S]{0,650}disposition: "skipped"[\s\S]{0,500}setIntroDone\(true\);[\s\S]{0,200}showPracticeIndex/,
  "the button must use the tested transient-only jump controller",
);
assert.match(
  player,
  /const devJumpToVoiceButton = canDevJumpToFirstVoicePractice \? \([\s\S]{0,700}testID="learning-v2-dev-jump-to-voice"/,
  "the DEV button must be rendered behind the same strict session guard",
);
assert.equal(
  player.match(/\{devJumpToVoiceButton\}/gu)?.length,
  2,
  "the button must be available both during the intro and during practice",
);
assert.match(player, /accessibilityRole="button"/);
assert.match(player, /accessibilityLabel="DEV: перейти к первому заданию Устно"/);
assert.match(player, /accessibilityHint="Пропускает интро и предыдущие задания только в этой тестовой сессии"/);

console.log("LEARNING V2 SESSION 1 VOICE DEV JUMP CONTRACT: PASS");
