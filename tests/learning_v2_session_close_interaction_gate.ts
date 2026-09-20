import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "..");
const player = readFileSync(
  resolve(root, "app/learning_v2_direct_session_player_v1.tsx"),
  "utf8",
);

const closeIndex = player.indexOf('testID="learning-v2-session-close"');
const interactionGateIndex = player.indexOf(
  'testID="learning-v2-session-practice-interaction-gate"',
);

assert.ok(closeIndex >= 0, "the session close button needs a stable test target");
assert.ok(
  interactionGateIndex >= 0,
  "only the practice area may be disabled while the session is preparing",
);
assert.ok(
  closeIndex < interactionGateIndex,
  "the close button must remain outside the temporarily disabled practice area",
);
assert.match(
  player,
  /testID="learning-v2-session-close"[\s\S]{0,500}onPress=\{exitLearningV2Session\}/u,
  "the close button must use the idempotent session exit handler",
);
assert.match(
  player,
  /const exitLearningV2Session = useCallback\([\s\S]{0,500}if \(sessionExitRequestedRef\.current\) return[\s\S]{0,500}router\.replace\(exitRoute\)/u,
  "the close control must replace the session with the course map, not pop to history",
);

process.stdout.write("LEARNING V2 SESSION CLOSE INTERACTION GATE: PASS\n");
