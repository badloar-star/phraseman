import assert from "node:assert/strict";

import {
  learningV2SessionBaseXpV1,
  learningV2SessionXpEventIdV1,
} from "../modules/learning-v2/progress/session_xp_reward_v1";

assert.equal(learningV2SessionBaseXpV1(12, 3), 45);
assert.equal(learningV2SessionBaseXpV1(3, 3), 0);
assert.throws(() => learningV2SessionBaseXpV1(2, 3));
assert.equal(
  learningV2SessionXpEventIdV1("learning-v2:en:l02:s56"),
  "learning-v2:en:l02:s56:xp:v1",
);
assert.equal(
  learningV2SessionXpEventIdV1("learning-v2:en:l02:s56"),
  learningV2SessionXpEventIdV1("learning-v2:en:l02:s56"),
);
assert.throws(() => learningV2SessionXpEventIdV1("lesson-2:session:56"));

console.log("Learning V2 session XP reward gate: PASS");
