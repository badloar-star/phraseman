import assert from "node:assert/strict";

import {
  getLearningV2CourseTargetPolicyV1,
} from "../modules/learning-v2/curriculum/contracts/course_target_policy_v1";

const english = getLearningV2CourseTargetPolicyV1("en");
const german = getLearningV2CourseTargetPolicyV1("de");

assert.deepEqual(
  english.interfaceLocales,
  ["ru", "uk", "es", "pt-BR", "vi", "id", "tr", "pl"],
  "english_locale_contract_must_remain_byte_order_stable",
);
assert.equal(english.targetLanguage, "en");
assert.equal(english.baseline, "en-general");

assert.deepEqual(german.interfaceLocales, ["ru", "uk"]);
assert.equal(german.targetLanguage, "de");
assert.equal(german.baseline, "de-DE-standard");

assert.throws(
  () => getLearningV2CourseTargetPolicyV1("xx" as never),
  /learning_v2_target_policy_unknown:xx/u,
);

process.stdout.write("LEARNING V2 TARGET POLICY GATE: PASS\n");
