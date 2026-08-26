import assert from "node:assert/strict";

import { createLearningV2PreviewSpeechGenerationGuardV1 } from "../app/learning_v2_preview_speech_watchdog_v1";

const guard = createLearningV2PreviewSpeechGenerationGuardV1();
const requestA = guard.begin("A");
const requestB = guard.begin("B");

assert.equal(guard.clear(requestA), false, "stale callback A must not clear active request B");
assert.equal(guard.currentKey(), "B");
assert.equal(guard.clear(requestB), true, "active callback B must clear itself");
assert.equal(guard.currentKey(), null);

process.stdout.write("LEARNING V2 PREVIEW SPEECH GENERATION GATE: PASS\n");
