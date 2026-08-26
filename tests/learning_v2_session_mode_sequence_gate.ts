import assert from "node:assert/strict";

import { buildLearningV2AuthoringDevicePreviewV1 } from "../modules/learning-v2/preview/authoring_device_preview_v1";
import { LEARNING_V2_MODE_NATIVE_FAMILIES_V1 } from "../modules/learning-v2/contracts/mode_native_authoring_contract_v1";

const preview = buildLearningV2AuthoringDevicePreviewV1(1, "ru");
const families = preview.learnerChild.interactions.map(
  (interaction) => interaction.family,
);

assert.equal(
  preview.introChild.pages.length,
  3,
  "practice must start after exactly three intro pages",
);
assert.deepEqual(
  [...new Set(families)].sort(),
  [...LEARNING_V2_MODE_NATIVE_FAMILIES_V1].sort(),
  "every ordinary Learning V2 session must use all six active approved families",
);
for (let index = 1; index < families.length; index += 1) {
  assert.notEqual(
    families[index],
    families[index - 1],
    `adjacent practice interactions ${index - 1}/${index} repeat ${families[index]}`,
  );
}

process.stdout.write("LEARNING V2 SESSION MODE SEQUENCE GATE: PASS\n");
