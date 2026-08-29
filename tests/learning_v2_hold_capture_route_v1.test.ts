import assert from "node:assert/strict";

import {
  resolveLearningV2HoldCaptureRouteV1,
  resolveLearningV2SystemHoldTerminalActionV1,
} from "../modules/learning-v2/runtime/hold_capture_route_v1";

assert.equal(
  resolveLearningV2HoldCaptureRouteV1({
    platform: "android",
    pcmRecorderSupported: true,
  }),
  "pcm",
  "Android must keep app-owned capture even while a transcription model is unavailable",
);

assert.equal(
  resolveLearningV2HoldCaptureRouteV1({
    platform: "android",
    pcmRecorderSupported: false,
  }),
  "system",
);

assert.equal(
  resolveLearningV2HoldCaptureRouteV1({
    platform: "ios",
    pcmRecorderSupported: true,
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

process.stdout.write("LEARNING V2 HOLD CAPTURE ROUTE V1: PASS\n");
