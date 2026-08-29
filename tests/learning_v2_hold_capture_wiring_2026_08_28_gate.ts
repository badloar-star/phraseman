import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const hook = readFileSync(
  "hooks/use_learning_v2_local_hold_to_talk_v1.ts",
  "utf8",
);

assert.match(hook, /resolveLearningV2HoldCaptureRouteV1/u);
assert.match(
  hook,
  /const pcmRecorderSupported = useMemo\([\s\S]*?isHoldRecordingSupported\(\)[\s\S]*?\[\],\s*\);/u,
);
assert.doesNotMatch(
  hook,
  /isHoldRecordingSupported\(\)\s*&&\s*isNeuralJudgeSupported\(\)/u,
  "PCM capture must not depend on neural-model availability",
);
assert.match(hook, /const captureRoute = resolveLearningV2HoldCaptureRouteV1/u);
assert.match(hook, /captureRoute === "pcm" \? startPcm\(\) : startSystem\(\)/u);
assert.match(hook, /buildControlRecognitionOptions/u);
assert.match(hook, /transcribePcmWithSystem/u);
assert.match(hook, /resolveLearningV2SystemHoldTerminalActionV1/u);
assert.match(
  hook,
  /const endSub = speechModule\.addListener\("end", \(\) => \{\s*if \(current\(\)\) scheduleSystemRestart\(\);/u,
);
assert.doesNotMatch(
  hook,
  /const endSub = speechModule\.addListener\("end", \(\) => \{\s*if \(current\(\)\) finishCapture\(\);/u,
  "a native end event must not finish while the physical hold is active",
);

process.stdout.write("LEARNING V2 HOLD CAPTURE WIRING 2026-08-28 GATE: PASS\n");
