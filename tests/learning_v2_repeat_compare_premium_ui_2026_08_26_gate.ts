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
// зачем (владелец 22.10, колонка «Предлагаем» learning-v2-tasks-review.html): прежняя большая кнопка с кольцом (решение 26.08) заменена динамиком внутри карточки «фраза + перевод» —
// повтор образца по-прежнему нажимается всегда, а фраза живёт в отдельной карточке с переводом.
assert.match(mode, /<LearningV2SayCard[\s\S]*?<LearningV2AudioReplayPressableV1/u,
  "Repeat & Compare keeps the replay speaker inside the phrase + translation card");
assert.match(mode, /<LearningV2TaskLead[^>]*parts=\{visibleParts\}/u);
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
