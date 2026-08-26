import assert from "node:assert/strict";

import {
  buildLearningV2AuthoringDevicePreviewV1,
  resolveLearningV2AuthoringPreviewSpeechTextV1,
} from "../modules/learning-v2/preview/authoring_device_preview_v1";

const preview = buildLearningV2AuthoringDevicePreviewV1(1, "ru");
const audioFamilies = new Set([
  "listen_choose",
  "listen_build_dictation",
  "scripted_repeat_compare",
]);
const audioInteractions = preview.learnerChild.interactions.filter((entry) =>
  audioFamilies.has(entry.family),
);

assert.ok(audioInteractions.length > 0, "session 1 must contain audio interactions");
for (const interaction of audioInteractions) {
  const text = resolveLearningV2AuthoringPreviewSpeechTextV1(interaction);
  assert.ok(
    typeof text === "string" && text.trim().length > 0,
    `DEV phone preview has no speakable fallback for ${interaction.interactionId}`,
  );
}

assert.equal(
  resolveLearningV2AuthoringPreviewSpeechTextV1(audioInteractions[0]!),
  "I",
  "the first listening task must pronounce the exact target word",
);

process.stdout.write("LEARNING V2 AUTHORING DEVICE PREVIEW AUDIO: PASS\n");
