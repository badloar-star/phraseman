import assert from "node:assert/strict";

import { LEARNING_V2_ENGLISH_BLUEPRINT_APPROVAL_REGISTRY_V2 } from "../modules/learning-v2/curriculum/en/blueprint_approval_registry_en_v2";
import {
  LEARNING_V2_ENGLISH_COURSE_BLUEPRINT_V2,
  LEARNING_V2_ENGLISH_OWNER_APPROVED_BLUEPRINT_FINGERPRINT_V2,
} from "../modules/learning-v2/curriculum/en/course_blueprint_en_v2";
import { LEARNING_V2_ENGLISH_COURSE_BLUEPRINT_V1 } from "../modules/learning-v2/curriculum/en/course_blueprint_en_v1";

const OLD_OWNER_APPROVED_FINGERPRINT =
  "013e742080c20d6a71fc731dc55ac26aaeb0e1fda2d3e6fd59712b65fdc1695a";
const PREREQUISITE_UNSAFE_FINGERPRINT =
  "ce1163d02a965e843e56a17c306ff4f14d55033ba21e75d7fbb082557fb61c1a";
const CURRENT_AMENDED_FINGERPRINT =
  "3a4ca1422a6125bb317121c312c0166fdb595ee90111f297c480c8a82b7716e4";
const PREVIOUS_OWNER_APPROVED_FINGERPRINT =
  "bb53181a104f8476761eef548949b0f978a0fd2f0caacdb239ad70c5cbb1845c";
const PREVIOUS_OWNER_APPROVED_FINGERPRINT_2026_10_04 =
  "f776cf32cd9a46df28ce54ff548c29abd1b9722a76e243fedc30cf5109a418b0";
const CURRENT_OWNER_APPROVED_FINGERPRINT =
  "d956442e0946194e3de8105601ae993fe6f7932e7904cc3e4e972fc8444875da";

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
    status: "SUPERSEDED",
    reason: "SUPERSEDED_BY_LEXICAL_DENSITY_RECONCILIATION_2026_09_02",
  },
  "amended_blueprint_historical_state_must_match_registry",
);

assert.deepEqual(
  LEARNING_V2_ENGLISH_BLUEPRINT_APPROVAL_REGISTRY_V2[PREVIOUS_OWNER_APPROVED_FINGERPRINT],
  {
    status: "SUPERSEDED",
    reason: "SUPERSEDED_BY_OWNER_APPROVED_LESSON_4_CONTRACT_2026_10_04",
  },
  "previous_owner_approved_blueprint_must_be_superseded",
);

assert.deepEqual(
  LEARNING_V2_ENGLISH_BLUEPRINT_APPROVAL_REGISTRY_V2[PREVIOUS_OWNER_APPROVED_FINGERPRINT_2026_10_04],
  {
    status: "SUPERSEDED",
    reason: "SUPERSEDED_BY_EXACT_CURRENT_BLUEPRINT_OWNER_APPROVAL_2026_10_14",
  },
  "previous_lesson_four_blueprint_approval_must_not_authorize_changed_bytes",
);

assert.deepEqual(
  LEARNING_V2_ENGLISH_BLUEPRINT_APPROVAL_REGISTRY_V2[CURRENT_OWNER_APPROVED_FINGERPRINT],
  {
    status: "APPROVED",
    reason: "OWNER_EXPLICIT_EXACT_BLUEPRINT_APPROVAL_2026_10_14",
  },
  "current_blueprint_requires_exact_owner_evidence",
);

assert.equal(
  LEARNING_V2_ENGLISH_OWNER_APPROVED_BLUEPRINT_FINGERPRINT_V2,
  CURRENT_OWNER_APPROVED_FINGERPRINT,
  "approval_constant_must_bind_the_exact_owner_approved_current_hash",
);

assert.equal(
  LEARNING_V2_ENGLISH_COURSE_BLUEPRINT_V2.blueprintFingerprint,
  CURRENT_OWNER_APPROVED_FINGERPRINT,
  "current_blueprint_body_must_match_the_exact_owner_approved_hash",
);

assert.equal(
  LEARNING_V2_ENGLISH_COURSE_BLUEPRINT_V2.ownerApproval,
  "APPROVED",
  "exact_current_blueprint_owner_approval_must_be_effective",
);

process.stdout.write(
  "LEARNING V2 ENGLISH COURSE BLUEPRINT OWNER APPROVAL GATE: PASS\n",
);
