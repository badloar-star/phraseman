import assert from "node:assert/strict";

import { createLearningV2PreviewSpeechGenerationGuardV1 } from "../app/learning_v2_preview_speech_watchdog_v1";

const guard = createLearningV2PreviewSpeechGenerationGuardV1();
const requestA = guard.begin("A");
const requestB = guard.begin("B");

assert.equal(guard.isCurrent(requestA), false, "stale callback A must not start visible playback");
assert.equal(guard.isCurrent(requestB), true, "active callback B may start visible playback");
assert.equal(guard.clear(requestA), false, "stale callback A must not clear active request B");
assert.equal(guard.currentKey(), "B");
assert.equal(guard.clear(requestB), true, "active callback B must clear itself");
assert.equal(guard.currentKey(), null);
assert.equal(guard.isCurrent(requestB), false, "completed request B is no longer current");

const requestC = guard.begin("C");
guard.cancelCurrent();
assert.equal(guard.isCurrent(requestC), false, "stop must invalidate a late native onStart");
assert.equal(guard.clear(requestC), false, "stopped request cannot clear a newer UI state");
assert.equal(guard.currentKey(), null);

process.stdout.write("LEARNING V2 PREVIEW SPEECH GENERATION GATE: PASS\n");
