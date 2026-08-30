import assert from "node:assert/strict";

import {
  LEARNING_V2_ENGLISH_COURSE_BLUEPRINT_BODY_V2,
  LEARNING_V2_ENGLISH_COURSE_BLUEPRINT_V2,
  hashLearningV2EnglishCourseBlueprintBodyV2,
} from "../modules/learning-v2/curriculum/en/course_blueprint_en_v2";
import { LEARNING_V2_ENGLISH_COURSE_BLUEPRINT_MANIFEST_V2 } from "../modules/learning-v2/curriculum/en/course_blueprint_manifest_en_v2";

const blueprint = LEARNING_V2_ENGLISH_COURSE_BLUEPRINT_V2;
const manifest = LEARNING_V2_ENGLISH_COURSE_BLUEPRINT_MANIFEST_V2;

assert.equal(blueprint.scope.lessons.length, 32, "lesson_count");
assert.equal(blueprint.chapters.length, 224, "chapter_count");
assert.equal(blueprint.sessionPackets.length, 1_792, "session_packet_count");
assert.equal(blueprint.ownerApproval, "APPROVED", "exact_owner_approved_fingerprint");
assert.match(blueprint.blueprintFingerprint, /^[a-f0-9]{64}$/, "fingerprint_shape");
assert.equal(
  hashLearningV2EnglishCourseBlueprintBodyV2(LEARNING_V2_ENGLISH_COURSE_BLUEPRINT_BODY_V2),
  blueprint.blueprintFingerprint,
  "fingerprint_recomputes",
);

const mutatedBody = {
  ...LEARNING_V2_ENGLISH_COURSE_BLUEPRINT_BODY_V2,
  targetLanguage: "en-mutated",
};
assert.notEqual(
  hashLearningV2EnglishCourseBlueprintBodyV2(mutatedBody),
  blueprint.blueprintFingerprint,
  "one_field_mutation_changes_fingerprint",
);

assert.deepEqual(manifest, {
  schemaVersion: "learning-v2-english-course-blueprint.v2",
  fingerprint: blueprint.blueprintFingerprint,
  ownerApproval: "APPROVED",
  lessonCount: 32,
  chapterCount: 224,
  sessionPacketCount: 1_792,
  introPlanItemCount: 5_376,
  activityPlanItemCount: 30_464,
});

process.stdout.write(
  `LEARNING V2 BLUEPRINT ARTIFACT INTEGRITY GATE V2: PASS owner=${manifest.ownerApproval} fingerprint=${manifest.fingerprint}\n`,
);
