import assert from "node:assert/strict";

import { LEARNING_V2_ENGLISH_BLUEPRINT_APPROVAL_REGISTRY_V2 } from "../modules/learning-v2/curriculum/en/blueprint_approval_registry_en_v2";
import { LEARNING_V2_ENGLISH_COURSE_BLUEPRINT_V1 } from "../modules/learning-v2/curriculum/en/course_blueprint_en_v1";

const OLD_OWNER_APPROVED_FINGERPRINT =
  "013e742080c20d6a71fc731dc55ac26aaeb0e1fda2d3e6fd59712b65fdc1695a";
const PREREQUISITE_UNSAFE_FINGERPRINT =
  "ce1163d02a965e843e56a17c306ff4f14d55033ba21e75d7fbb082557fb61c1a";
const CURRENT_AMENDED_FINGERPRINT =
  "3a4ca1422a6125bb317121c312c0166fdb595ee90111f297c480c8a82b7716e4";

assert.equal(
  LEARNING_V2_ENGLISH_COURSE_BLUEPRINT_V1.blueprintFingerprint,
  OLD_OWNER_APPROVED_FINGERPRINT,
  "learning_v2_english_historical_blueprint_fingerprint_drift",
);

assert.equal(
  LEARNING_V2_ENGLISH_COURSE_BLUEPRINT_V1.ownerApproval,
  "SUPERSEDED",
  "learning_v2_english_historical_blueprint_must_be_superseded",
);

assert.deepEqual(
  LEARNING_V2_ENGLISH_BLUEPRINT_APPROVAL_REGISTRY_V2[
    OLD_OWNER_APPROVED_FINGERPRINT
  ],
  {
    status: "SUPERSEDED",
    reason: "OWNER_DECISION_FULL_B1_GRAMMAR_FIRST_REBUILD_2026_08_30",
  },
  "learning_v2_english_historical_blueprint_registry_status_invalid",
);

assert.deepEqual(
  LEARNING_V2_ENGLISH_BLUEPRINT_APPROVAL_REGISTRY_V2[
    PREREQUISITE_UNSAFE_FINGERPRINT
  ],
  {
    status: "SUPERSEDED",
    reason: "COURSE_START_PREREQUISITE_AND_LEXICAL_GROUNDING_DEFECT_2026_08_30",
  },
  "prerequisite_unsafe_blueprint_must_not_authorize_session_authoring",
);

assert.deepEqual(
  LEARNING_V2_ENGLISH_BLUEPRINT_APPROVAL_REGISTRY_V2[
    CURRENT_AMENDED_FINGERPRINT
  ],
  {
    status: "PENDING",
    reason: "OWNER_REVIEW_REQUIRED_AFTER_COURSE_START_PREREQUISITE_AMENDMENT_2026_08_30",
  },
  "amended_blueprint_requires_exact_owner_approval",
);

process.stdout.write(
  "LEARNING V2 ENGLISH COURSE BLUEPRINT OWNER APPROVAL GATE: PASS\n",
);
