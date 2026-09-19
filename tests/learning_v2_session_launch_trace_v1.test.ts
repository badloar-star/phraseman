import assert from "node:assert/strict";

import {
  getRecentLearningV2SessionLaunchTracesV1,
  markLearningV2SessionLaunchStageV1,
  startLearningV2SessionLaunchTraceV1,
} from "../app/learning_v2_session_launch_trace_v1";

const traceId = startLearningV2SessionLaunchTraceV1({
  courseSessionId: "lesson-01:session:01",
  tapAtMs: 100,
});

markLearningV2SessionLaunchStageV1({
  traceId,
  stage: "material_ready",
  atMs: 80,
});
markLearningV2SessionLaunchStageV1({
  traceId,
  stage: "audio_ready",
  atMs: 130,
});
const snapshot = markLearningV2SessionLaunchStageV1({
  traceId,
  stage: "modal_mounted",
  atMs: 105,
});

assert.ok(snapshot);
assert.equal(snapshot.tapToMaterialReadyMs, 0);
assert.equal(snapshot.tapToAudioReadyMs, 30);
assert.equal(snapshot.tapToModalMountedMs, 5);
assert.equal(snapshot.materialPrewarmed, true);
assert.equal(snapshot.audioPrewarmed, false);
assert.equal(
  getRecentLearningV2SessionLaunchTracesV1().at(-1)?.traceId,
  traceId,
);

console.log("LEARNING V2 SESSION LAUNCH TRACE: PASS");
