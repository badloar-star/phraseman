import assert from "node:assert/strict";

import {
  getRecentLearningV2SessionLaunchTracesV1,
  markLearningV2SessionLaunchStageV1,
  startLearningV2SessionLaunchTraceV1,
} from "../app/learning_v2_session_launch_trace_v1";

// зачем (координатор §47, 2026-10-01): файл был сценарием из голых assert без единого
// test() — jest помечал его «must contain at least one test» и НИ ОДНА проверка не
// исполнялась. Тело обёрнуто в один test; вне jest (npx tsx) оно запускается напрямую.
async function main(): Promise<void> {
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
}

if (typeof test === "function") {
  test("learning_v2_session_launch_trace_v1", main);
} else {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
