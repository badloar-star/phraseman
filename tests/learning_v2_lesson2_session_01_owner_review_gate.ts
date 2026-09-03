import assert from "node:assert/strict";

import { LESSON2_AUTHORING_REGISTRY_V1 } from "../modules/learning-v2/content/source/lesson2_authoring_registry_v1";
import { buildLearningV2StaticOwnerReviewLesson2BundleV1 } from "../modules/learning-v2/preview/static_owner_review_lesson2_bundle_v1";
import { renderLearningV2StaticOwnerReviewHtmlV1 } from "../scripts/learning-v2-static-owner-review/template_v1";

const bundle = buildLearningV2StaticOwnerReviewLesson2BundleV1();
assert.equal(bundle.lessonOrdinal, 2);
assert.deepEqual(bundle.interfaceLocales, ["ru", "uk", "es", "pt-BR", "vi", "id", "tr", "pl"]);
assert.deepEqual(bundle.sessions.map((session) => session.sessionOrdinal), [1, 2, 3, 4]);
for (const session of bundle.sessions) {
  assert.equal(session.status, LESSON2_AUTHORING_REGISTRY_V1[session.sessionOrdinal - 1]!.status);
  assert.equal(session.courseSessionId, `lesson-02:session:${String(session.sessionOrdinal).padStart(2, "0")}`);
  assert.equal(session.practiceInteractionCount, 6);
  assert.equal(session.interactions.length, 6);
  assert.equal(Object.keys(session.localeProjections).length, 8);
  for (const projection of Object.values(session.localeProjections)) {
    assert.equal(projection.introPages.length, 3);
    assert.equal(projection.practice.length, 6);
  }
}
const html = renderLearningV2StaticOwnerReviewHtmlV1(bundle);
assert.match(html, /"lessonOrdinal":2/);
assert.match(html, /lesson-02:session:01/);
assert.match(html, /lesson-02:session:04/);

process.stdout.write("LEARNING V2 LESSON 2 OWNER REVIEW GATE: PASS sessions=1,2,3,4\n");
