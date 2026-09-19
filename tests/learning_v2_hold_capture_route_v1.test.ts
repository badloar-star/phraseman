import assert from "node:assert/strict";

import {
  resolveLearningV2HoldCaptureRouteV1,
  resolveLearningV2SystemRestartStatusV1,
  resolveLearningV2SystemHoldTerminalActionV1,
} from "../modules/learning-v2/runtime/hold_capture_route_v1";

assert.equal(
  resolveLearningV2HoldCaptureRouteV1({
    platform: "android",
    pcmRecorderSupported: true,
    neuralModelReady: false,
  }),
  "system",
  "Learning V2 must use the same live system recognizer as working speaking lessons until the PCM model is actually ready",
);

assert.equal(
  resolveLearningV2HoldCaptureRouteV1({
    platform: "android",
    pcmRecorderSupported: false,
    neuralModelReady: true,
  }),
  "system",
);

assert.equal(
  resolveLearningV2HoldCaptureRouteV1({
    platform: "android",
    pcmRecorderSupported: true,
    neuralModelReady: true,
  }),
  "pcm",
);

assert.equal(
  resolveLearningV2HoldCaptureRouteV1({
    platform: "ios",
    pcmRecorderSupported: true,
    neuralModelReady: true,
  }),
  "system",
);

assert.equal(
  resolveLearningV2SystemHoldTerminalActionV1({ holdActive: true }),
  "restart",
  "an OEM recognizer end event must not end a physical hold",
);

assert.equal(
  resolveLearningV2SystemHoldTerminalActionV1({ holdActive: false }),
  "finish",
  "release is the only normal terminal event for hold-to-talk",
);

assert.equal(
  resolveLearningV2SystemRestartStatusV1({ hasListened: true }),
  "listening",
  "an OEM restart must not visually reset an active physical hold",
);
assert.equal(
  resolveLearningV2SystemRestartStatusV1({ hasListened: false }),
  "requesting",
);

process.stdout.write("LEARNING V2 HOLD CAPTURE ROUTE V1: PASS\n");
