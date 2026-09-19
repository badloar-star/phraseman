import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const mode = readFileSync(
  "modules/learning-v2/modes/scripted_repeat_compare_mode_v1.tsx",
  "utf8",
);
const player = readFileSync(
  "app/learning_v2_direct_session_player_v1.tsx",
  "utf8",
);

assert.match(mode, /testID="learning-v2-repeat-reference-play"/u);
assert.match(mode, /<Svg[\s\S]*?<Circle[\s\S]*?<Pressable/u,
  "Repeat & Compare needs the same premium ringed audio affordance as audio modes");
assert.match(mode, /playWrap:\s*\{\s*width:\s*116,\s*height:\s*116/u);
assert.match(mode, /targetPhrase:[\s\S]{0,160}textAlign:\s*"center"/u,
  "the model phrase needs its own centered typographic layer");
assert.doesNotMatch(mode, /capture:|WaveformBarsV1/u,
  "Repeat & Compare must not duplicate the shared Oral capture surface");
assert.doesNotMatch(
  mode,
  /backgroundColor:\s*["']currentColor["']/u,
  "animated React Native waveform bars must use a concrete theme color",
);
assert.match(player, /<SpeakingPanel[\s\S]{0,500}presentation="inline"/u,
  "Repeat & Compare must show the canonical Oral inline surface");
assert.match(player, /<SpeakingInlineResultStars/u,
  "Repeat & Compare must reuse the canonical Oral stars");
assert.match(player, /testID="learning-v2-inline-hold-to-talk"/u,
  "Repeat & Compare must keep its primary microphone on the task screen");
assert.match(player, /reportDock:\s*\{[\s\S]{0,100}right:\s*16/u);
assert.ok(!/reportDock:\s*\{[\s\S]{0,100}left:\s*16/u.test(player));

process.stdout.write("LEARNING V2 REPEAT COMPARE PREMIUM UI 2026-08-26 GATE: PASS\n");
