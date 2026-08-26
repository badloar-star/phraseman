import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { learningV2PreviewSpeechWatchdogMsV1 } from "../app/learning_v2_preview_speech_watchdog_v1";

assert.equal(learningV2PreviewSpeechWatchdogMsV1("am"), 2_700);
assert.equal(learningV2PreviewSpeechWatchdogMsV1("I am ready"), 4_500);
assert.equal(learningV2PreviewSpeechWatchdogMsV1("one two three four five six seven eight nine ten"), 9_000);

const root = resolve(__dirname, "..");
const player = readFileSync(
  resolve(root, "app/learning_v2_direct_session_player_v1.tsx"),
  "utf8",
);
assert.match(player, /previewSpeechWatchdogRef/);
assert.match(player, /learningV2PreviewSpeechWatchdogMsV1/);
assert.match(player, /clearTimeout\(previewSpeechWatchdogRef\.current\)/);

const listenChoose = readFileSync(
  resolve(root, "modules/learning-v2/modes/listen_choose_mode_v1.tsx"),
  "utf8",
);
assert.ok(!listenChoose.includes("0,75×"), "the slow replay control must not show a numeric rate");

process.stdout.write("LEARNING V2 PREVIEW AUDIO RECOVERY 2026-08-26 GATE: PASS\n");
