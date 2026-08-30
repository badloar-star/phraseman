import assert from "node:assert/strict";

import { LEARNING_V2_ENGLISH_BLUEPRINT_APPROVAL_REGISTRY_V2 } from "../modules/learning-v2/curriculum/en/blueprint_approval_registry_en_v2";
import { LEARNING_V2_ENGLISH_COURSE_BLUEPRINT_V1 } from "../modules/learning-v2/curriculum/en/course_blueprint_en_v1";

const OLD_OWNER_APPROVED_FINGERPRINT =
  "013e742080c20d6a71fc731dc55ac26aaeb0e1fda2d3e6fd59712b65fdc1695a";

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

process.stdout.write(
  "LEARNING V2 ENGLISH COURSE BLUEPRINT OWNER APPROVAL GATE: PASS\n",
);
