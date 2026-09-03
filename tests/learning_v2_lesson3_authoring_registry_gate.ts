import assert from "node:assert/strict";
import { LESSON3_AUTHORING_REGISTRY_V1, lesson3AuthoringPreflightV1 } from "../modules/learning-v2/content/source/lesson3_authoring_registry_v1";
import { authoredLearningV2Episode03SessionSource } from "../modules/learning-v2/content/source/authored_episode_03_sessions_v1";
import { learningV2SessionContentFingerprint } from "../modules/learning-v2/content/source/learning_content_quality_gate_v1";

const actual = Object.freeze(Object.fromEntries(LESSON3_AUTHORING_REGISTRY_V1.map((entry) => {
  const source = authoredLearningV2Episode03SessionSource(entry.sessionOrdinal);
  return [entry.sessionOrdinal, source ? learningV2SessionContentFingerprint(source) : null];
})));
const preflight = lesson3AuthoringPreflightV1(42, actual);
assert.equal(preflight.currentSessionOrdinal, 42);
assert.equal(preflight.lockedThrough, 41);
assert.equal(preflight.forbiddenFrom, 43);
assert.throws(() => lesson3AuthoringPreflightV1(41, actual), /lesson3_authoring_out_of_order/);
process.stdout.write("LEARNING V2 LESSON 3 AUTHORING REGISTRY GATE: PASS\n");
