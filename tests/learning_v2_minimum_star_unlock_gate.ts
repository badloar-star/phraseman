import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { learningV2SessionUnlocksNextV1 } from "../app/learning_v2_session_unlock_policy_v1";

assert.equal(learningV2SessionUnlocksNextV1(0), false, "zero stars must keep the next session locked");
assert.equal(learningV2SessionUnlocksNextV1(1), true, "one star must unlock the next session");
assert.equal(learningV2SessionUnlocksNextV1(2), true, "two stars must unlock the next session");
assert.equal(learningV2SessionUnlocksNextV1(3), true, "three stars must unlock the next session");

const player = readFileSync(
  resolve(process.cwd(), "app/learning_v2_direct_session_player_v1.tsx"),
  "utf8",
);
assert.match(
  player,
  /const passedSession = learningV2SessionUnlocksNextV1\(earned\);/u,
  "direct player must derive access from the shared one-star policy",
);
assert.match(
  player,
  /if \(passedSession\) \{\s*const commitLocalProgress[\s\S]*?createLearningV2CourseLocalProgressStoreV1\(AsyncStorage\)\.complete\(/u,
  "canonical local completion must be written only after the one-star gate passes",
);
assert.match(
  player,
  /if \(passedSession\) \{\s*const appendCompletionForBackgroundSync[\s\S]*?createLearningV2CourseSessionCompletedSpoolV1\(AsyncStorage\)\.append\(/u,
  "completion synchronization must not publish a zero-star attempt as passed",
);

const map = readFileSync(
  resolve(process.cwd(), "components/learning-v2/LearningV2PulseCourse.tsx"),
  "utf8",
);
assert.match(
  map,
  /row\.state === 'completed'\s*\?\s*Math\.max\(1, props\.stars\[row\.id\] \?\? 1\)\s*:\s*0/u,
  "completed legacy sessions must render at least one compatibility star",
);
assert.match(
  map,
  /testID=\{`learning-v2-pulse-session-\$\{row\.sessionOrdinal\}-stars`\}/u,
  "completed-session stars need a stable visible map affordance",
);

console.log("LEARNING V2 MINIMUM STAR UNLOCK GATE: PASS");
