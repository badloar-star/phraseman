import assert from "node:assert/strict";

import { buildLearningV2AuthoringDevicePreviewV1 } from "../modules/learning-v2/preview/authoring_device_preview_v1";

const preview = buildLearningV2AuthoringDevicePreviewV1(1, "ru");
const explanations = preview.auxiliaryChild.entries
  .slice(0, 3)
  .map((entry) => entry.secondErrorExplanationByLocale.ru);

assert.deepEqual(explanations, [
  "Верно: того, кто сейчас говорит. I путешествует вместе с воображаемым микрофоном.",
  "Am строит нужный мост после I. An заканчивается другим звуком, а m остаётся одной буквой.",
  "I am here собрано полностью: I называет говорящего, а am удерживает связь.",
]);

for (const explanation of explanations) {
  assert.ok(explanation.length <= 160, "intro feedback must stay short and editorial");
  assert.ok(
    !/really|reading|готового говорящего|строчная буква L/iu.test(explanation),
    "intro feedback must not concatenate distractor essays from practice cards",
  );
}

process.stdout.write("LEARNING V2 SESSION 1 INTRO FEEDBACK EDITORIAL GATE: PASS\n");
