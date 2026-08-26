import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  createLearningV2SpeedMatchRoundStateV1,
  learningV2SpeedMatchCanPickV1,
} from "../modules/learning-v2/modes/speed_match_runtime_v1";

let state = createLearningV2SpeedMatchRoundStateV1();
assert.equal(learningV2SpeedMatchCanPickV1(state), true);
state = state.expire();
assert.equal(learningV2SpeedMatchCanPickV1(state), false);
assert.equal(state.phase, "finish_timeout");
state = state.restart({ timerEnabled: false });
assert.equal(state.phase, "active");
assert.equal(state.timerEnabled, false);
assert.equal(learningV2SpeedMatchCanPickV1(state), true, "no-timer restart must be playable");

const modeSource = readFileSync(
  resolve(__dirname, "../modules/learning-v2/modes/speed_match_mode_v1.tsx"),
  "utf8",
);
assert.match(
  modeSource,
  /round\.timerEnabled\s*\?\s*<View/,
  "the no-timer restart must not keep showing a fake 60-second counter",
);

process.stdout.write("LEARNING V2 SPEED MATCH TIMEOUT GATE: PASS\n");
