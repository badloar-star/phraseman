import assert from "node:assert/strict";

import {
  buildLearningV2AuthoringDevicePreviewV1,
  resolveLearningV2AuthoringPreviewSpeechTextV1,
} from "../modules/learning-v2/preview/authoring_device_preview_v1";

// зачем (координатор §47, 2026-10-01): файл был сценарием из голых assert без единого
// test() — jest помечал его «must contain at least one test» и НИ ОДНА проверка не
// исполнялась. Тело обёрнуто в один test; вне jest (npx tsx) оно запускается напрямую.
async function main(): Promise<void> {
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
}

if (typeof test === "function") {
  test("learning_v2_authoring_device_preview_audio_v1", main);
} else {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
