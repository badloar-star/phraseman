import assert from "node:assert/strict";

import { authoredLearningV2SessionSource } from "../modules/learning-v2/content/source/authored_sessions_v1";
import { buildSessionShardFromSource } from "../modules/learning-v2/content/source/session_shard_from_source_v1";
import { LESSON1_SESSION_02_MODE_NATIVE_PLAN_ID_V1 } from "../modules/learning-v2/content/source/lesson1_session_choreography_v1";

const source = authoredLearningV2SessionSource(2);

assert.ok(source, "English lesson 1 session 2 source must exist");
assert.equal(
  LESSON1_SESSION_02_MODE_NATIVE_PLAN_ID_V1,
  "en-e01-s02-mode-native-v1",
  "session 2 must have a stable mode-native plan id",
);
assert.equal(
  source.modeNativePlanId,
  LESSON1_SESSION_02_MODE_NATIVE_PLAN_ID_V1,
  "session 2 source must bind to its exact mode-native choreography",
);

const shard = buildSessionShardFromSource(source);
assert.equal(shard.modeNativePlanId, LESSON1_SESSION_02_MODE_NATIVE_PLAN_ID_V1);
assert.equal(shard.cards.length, 20, "3 intros + 17 authored contacts");

process.stdout.write("LEARNING V2 SESSION 02 MODE NATIVE PLAN: PASS\n");
