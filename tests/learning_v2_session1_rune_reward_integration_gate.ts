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
const factoryProjection = readFileSync(
  "modules/learning-v2/content/factory_native/factory_native_course_v1.ts",
  "utf8",
);

assert.match(player, /createLearningV2SessionRuneRewardCompositeV1/);
assert.match(player, /commitLearningV2SessionRuneRewardCompositeV1/);
const durableCommit = player.indexOf(
  "await commitLearningV2SessionRuneRewardCompositeV1",
);
const durableEvidence = player.indexOf(
  "createLearningV2CourseSessionCompletedSpoolV1(AsyncStorage)",
);
const progressComplete = player.indexOf(
  "await createLearningV2CourseLocalProgressStoreV1(AsyncStorage).complete",
);
assert.ok(durableCommit >= 0, "durable rune composite commit is missing");
assert.ok(durableEvidence >= 0, "durable completion evidence is missing");
assert.ok(progressComplete >= 0, "local progress completion is missing");
assert.ok(
  progressComplete < durableEvidence,
  "device-owned progress must commit before the background synchronization journal",
);
assert.ok(
  progressComplete < durableCommit,
  "local rune credit must not own or delay device-owned progress",
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
assert.match(
  compositeContract,
  /material\.factorySourceFingerprint === null[\s\S]{0,120}material\.audioDelivery !== "device_speech"/,
);
assert.match(
  compositeContract,
  /material\.introChild\.pages\.map[\s\S]{0,180}material\.learnerChild\.interactions\.map/,
);
assert.match(
  releasedSessionClient,
  /requestedLocale[\s\S]{0,240}materializeFactoryNativeLearningV2SessionV1/,
);
assert.match(
  factoryProjection,
  /FACTORY_NATIVE_DISPLAY_LOCALE_FALLBACK_V1/,
);
assert.doesNotMatch(
  compositeContract,
  /authored_sessions_v1|buildSessionChildBodiesFromShard/,
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
