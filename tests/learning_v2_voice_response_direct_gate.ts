import assert from "node:assert/strict";

import { learningV2CourseSessionVoiceResponseV1 } from "../modules/learning-v2/runtime/course_session_voice_response_v1";
import type { LearningV2CourseSessionPracticeInteractionV1 } from "../modules/learning-v2/runtime/course_session_client_children_v1";

const voiceInteraction = {
  interactionId: "voice-1",
  ordinal: 4,
  purpose: "supported_practice",
  family: "scripted_repeat_compare",
  inputMode: "tap_record_compare",
  prompt: "Скажите вслух",
  responseOptions: [],
  mediaIds: [],
  audioTargetIds: ["voice-1:audio"],
  accessibilityLabel: "Скажите вслух",
  modePayload: null,
  scriptedAlternate: null,
} as const satisfies LearningV2CourseSessionPracticeInteractionV1;

assert.deepEqual(
  learningV2CourseSessionVoiceResponseV1(
    voiceInteraction,
    "  This hat, please.  ",
    "en-US",
  ),
  { kind: "transcript", value: "This hat, please." },
  "tap_record_compare must deliver a transcript to its transcript evaluator",
);

assert.deepEqual(
  learningV2CourseSessionVoiceResponseV1(voiceInteraction, "   ", "en-US"),
  { kind: "transcript", value: null },
  "an empty voice attempt must preserve the transcript response kind",
);

console.log("LEARNING V2 VOICE RESPONSE DIRECT GATE: PASS");
