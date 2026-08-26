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
const compositeContract = readFileSync(
  "modules/learning-v2/progress/learning_session_rune_reward_composite_v1.ts",
  "utf8",
);
const releasedSessionClient = readFileSync(
  "app/learning_v2_course_released_session_client_v3.ts",
  "utf8",
);

assert.match(player, /createLearningV2SessionRuneRewardCompositeV1/);
assert.match(player, /commitLearningV2SessionRuneRewardCompositeV1/);
const durableCommit = player.indexOf(
  "await commitLearningV2SessionRuneRewardCompositeV1",
);
const durableEvidence = player.indexOf(
  "await createLearningV2CourseSessionCompletedSpoolV1(AsyncStorage).append",
);
const progressComplete = player.indexOf(
  "await createLearningV2CourseLocalProgressStoreV1(AsyncStorage).complete",
);
assert.ok(durableCommit >= 0, "durable rune composite commit is missing");
assert.ok(durableEvidence >= 0, "durable completion evidence is missing");
assert.ok(progressComplete >= 0, "local progress completion is missing");
assert.ok(
  durableEvidence < durableCommit,
  "immutable completion evidence must be durable before wallet credit",
);
assert.ok(
  durableCommit < progressComplete,
  "progress must not complete before the durable rune composite is confirmed",
);
assert.match(
  runtime,
  /createLearningV2SessionRuneRewardCompositeAuthorityV1/,
);
assert.match(
  runtime,
  /commitLearningV2SessionRuneRewardCompositeV1/,
);
assert.match(runtime, /alias_repair_required/);
assert.match(runtime, /learning_v2_session_rune_reward_commit_unconfirmed/);
assert.match(player, /run,\s*completion,/);
assert.match(player, /publicationToken:/);
assert.match(player, /resolveLearningV2SessionRuneRewardPublicationTokenV1/);
assert.match(runtime, /publicationToken/);
assert.match(
  compositeContract,
  /WeakMap<object,\s*InternalPublicationEvidenceV1>/,
);
assert.match(compositeContract, /resolveLearningV2CourseSessionReadyMaterialV3/);
assert.match(compositeContract, /ready\.learnerSourceLocale/);
assert.match(
  releasedSessionClient,
  /learnerSourceLocale:\s*locator\.learnerSourceLocale/,
);
assert.doesNotMatch(
  compositeContract,
  /buildSessionChildBodiesFromShard\([\s\S]{0,120}?"ru"/,
);
assert.doesNotMatch(
  compositeContract,
  /export interface LearningV2SessionRuneRewardPublicationEvidenceV1/,
);
assert.doesNotMatch(
  compositeContract,
  /export function materializeLearningV2SessionRuneRewardPublicationEvidenceV1/,
);
assert.doesNotMatch(
  compositeContract,
  /export function assertLearningV2SessionRuneRewardPublicationEvidenceV1/,
);
assert.doesNotMatch(player, /sessionContentFingerprint:/);

console.log("Learning V2 session 1 rune reward integration gate: PASS");
