import assert from "node:assert/strict";

import { AUTHORED_EPISODE_01_SESSIONS } from "../modules/learning-v2/content/source/authored_sessions_v1";
import {
  learningV2SessionContentFingerprint,
} from "../modules/learning-v2/content/source/learning_content_quality_gate_v1";
import {
  LESSON1_AUTHORING_REGISTRY_V1,
  lesson1AuthoringPreflightV1,
} from "../modules/learning-v2/content/source/lesson1_authoring_registry_v1";

const fingerprints = Object.fromEntries(
  Array.from({ length: 56 }, (_, index) => [index + 1, null as string | null]),
) as Record<number, string | null>;
for (const source of AUTHORED_EPISODE_01_SESSIONS) {
  fingerprints[source.requiredSessionOrdinal] =
    learningV2SessionContentFingerprint(source);
}

assert.equal(LESSON1_AUTHORING_REGISTRY_V1[0]?.status, "LOCKED");
assert.equal(LESSON1_AUTHORING_REGISTRY_V1[1]?.status, "LOCKED");
assert.equal(
  LESSON1_AUTHORING_REGISTRY_V1[1]?.lockedFingerprint,
  "ac55b9a5027a31f3089fe435cb1658cb3eefeb23cd1a834359371effff6ce4a0",
  "session_2_lock_must_bind_the_post_guardrail_source_fingerprint",
);
assert.equal(
  LESSON1_AUTHORING_REGISTRY_V1[1]?.ownerDecisionRef,
  "owner-approved-en-lesson-01-session-02-after-owner-review-2026-08-28",
);
assert.equal(LESSON1_AUTHORING_REGISTRY_V1[2]?.status, "DRAFT");
assert.deepEqual(
  lesson1AuthoringPreflightV1(3, fingerprints),
  { lockedThrough: 2, currentSessionOrdinal: 3, forbiddenFrom: 4 },
);

process.stdout.write(
  "LEARNING V2 SESSION 2 OWNER APPROVAL TRANSITION: PASS\n",
);
