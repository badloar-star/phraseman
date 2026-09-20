import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const player = readFileSync(
  "app/learning_v2_direct_session_player_v1.tsx",
  "utf8",
);
const runtime = readFileSync(
  "app/learning_v2_owner_repository_runtime.ts",
  "utf8",
);
const composite = readFileSync(
  "modules/learning-v2/progress/learning_session_rune_reward_composite_v1.ts",
  "utf8",
);

assert.match(
  composite,
  /createLearningV2SessionRuneRewardPreparedIntentV1/,
  "a genuine ready-handle token must bind the durable intent",
);
assert.match(
  composite,
  /resolveLearningV2CourseSessionPublicationAdmissionV3\(admission\)/,
  "restart recovery must require an opaque admission from the live factory module",
);
assert.match(
  composite,
  /assertPublicationEvidence\(intent\.candidate, admittedEvidence\)[\s\S]{0,160}!same\(intent\.publicationEvidence, admittedEvidence\)/,
  "persisted intent evidence must be compared with independently admitted material",
);

const persist = runtime.indexOf(
  "await persistLearningV2SessionRuneRewardPreparedIntentV1",
);
const commitPrepared = runtime.indexOf(
  "return commitPreparedLearningV2SessionRuneRewardIntentV1",
  persist,
);
assert.ok(persist >= 0, "verified rune intent persistence is missing");
assert.ok(
  commitPrepared > persist,
  "rune intent must be durable before repository commit can mount storage",
);
assert.match(
  runtime,
  /commitPreparedLearningV2SessionRuneRewardIntentV1[\s\S]{0,2200}await mountLearningV2OwnerRepository/,
  "the prepared commit path must use the owner repository",
);
assert.match(
  runtime,
  /recoverPendingLearningV2SessionRuneRewardIntentsV1/,
  "durable rune intents need a bounded restart recovery path",
);
assert.match(
  runtime,
  /admitCurrentLearningV2CourseSessionPublicationV3\([\s\S]{0,700}restoreLearningV2SessionRuneRewardPublicationTokenV1\([\s\S]{0,100}admission/,
  "recovery must re-derive factory admission before restoring provenance",
);
assert.match(
  runtime,
  /require\('expo-secure-store'\)/,
  "the anti-tamper receipt must live outside attacker-editable AsyncStorage",
);
const protectedRead = runtime.indexOf(
  "await readLearningV2SessionRuneRewardProtectedIntentReceiptV1",
  runtime.indexOf("recoverPendingLearningV2SessionRuneRewardIntentsV1"),
);
const liveAdmission = runtime.indexOf(
  "admitCurrentLearningV2CourseSessionPublicationV3",
  runtime.indexOf("recoverPendingLearningV2SessionRuneRewardIntentsV1"),
);
assert.ok(
  protectedRead >= 0 && liveAdmission > protectedRead,
  "recovery must require the protected receipt before live factory admission",
);
assert.match(
  composite,
  /createLearningV2SessionRuneRewardProtectedIntentReceiptV1[\s\S]{0,600}createLearningV2SessionRuneRewardPreparedIntentV1\([\s\S]{0,100}publicationToken/,
  "raw intent bytes must not be able to mint their own protected receipt",
);
assert.match(
  runtime,
  /result\.status === 'applied' \|\| result\.status === 'replayed'/,
  "intent cleanup must require an applied or replayed receipt",
);
assert.match(
  player,
  /recoverPendingLearningV2SessionRuneRewardIntentsV1/,
  "opening a production Learning V2 player must resume earlier rune intents",
);
assert.match(
  player,
  /retryLearningV2LocalCompletionV1\(\{[\s\S]{0,700}commit:\s*async \(\) => \{[\s\S]{0,160}await commitSessionRuneReward\(\)/,
  "a transient local commit failure must retry without blocking the finale",
);

console.log("Learning V2 durable rune reward intent gate: PASS");
