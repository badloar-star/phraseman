import assert from "node:assert/strict";
import {
  LEARNING_V2_STATIC_OWNER_REVIEW_BUNDLE_SCHEMA_V1,
  buildLearningV2StaticOwnerReviewBundleV1,
} from "../modules/learning-v2/preview/static_owner_review_bundle_v1";
import { LESSON1_AUTHORING_REGISTRY_V1 } from "../modules/learning-v2/content/source/lesson1_authoring_registry_v1";

const bundle = buildLearningV2StaticOwnerReviewBundleV1();

assert.equal(
  bundle.schemaVersion,
  LEARNING_V2_STATIC_OWNER_REVIEW_BUNDLE_SCHEMA_V1,
);
assert.equal(bundle.targetLanguage, "en");
assert.equal(bundle.lessonOrdinal, 1);
assert.deepEqual(bundle.interfaceLocales, [
  "ru",
  "uk",
  "es",
  "pt-BR",
  "vi",
  "id",
  "tr",
  "pl",
]);
const firstUnlockedIndex = LESSON1_AUTHORING_REGISTRY_V1.findIndex(
  (entry) => entry.status !== "LOCKED",
);
const expectedVisibleEntries = LESSON1_AUTHORING_REGISTRY_V1
  .slice(0, firstUnlockedIndex === -1 ? undefined : firstUnlockedIndex + 1)
  .map((entry) => [entry.sessionOrdinal, entry.status]);
assert.deepEqual(
  bundle.sessions.map((session) => [session.sessionOrdinal, session.status]),
  expectedVisibleEntries,
  "the static owner review must never expose forbidden future ordinals",
);

for (const session of bundle.sessions) {
  assert.match(session.sourceFingerprint, /^[a-f0-9]{64}$/u);
  assert.equal(Object.keys(session.localeProjections).length, 8);
  assert.equal(session.interactions.length, session.practiceInteractionCount);
  assert.equal(session.auxiliaryEntries.length, session.interactions.length + 3);
  assert.equal(session.introAnswerKeys.length, 3);

  for (const locale of bundle.interfaceLocales) {
    const projection = session.localeProjections[locale];
    assert.equal(projection.introPages.length, 3);
    assert.equal(projection.practice.length, session.interactions.length);
    projection.introPages.forEach((page, pageIndex) => {
      assert.equal(page.choices.length, 3);
      assert.equal(page.pageOrdinal, pageIndex + 1);
      assert.ok(page.title.trim().length > 0);
      assert.ok(page.body.trim().length > 0);
      assert.ok(page.prompt.trim().length > 0);
    });
    session.introAnswerKeys.forEach((answer) => {
      assert.ok([0, 1, 2].includes(answer.correctChoiceIndex));
      assert.ok(answer.explanationByLocale[locale].trim().length > 0);
    });
  }

  assert.deepEqual(
    [...new Set(session.interactions.map((entry) => entry.family))].sort(),
    [
      "context_gap_grammar",
      "listen_build_dictation",
      "listen_choose",
      "phrase_builder",
      "scripted_repeat_compare",
      "speed_match",
    ],
  );
  assert.ok(
    session.auxiliaryEntries.some((entry) => entry.newWordEncounter),
    `session ${session.sessionOrdinal} must preserve its word-first overlays`,
  );
}

process.stdout.write("LEARNING V2 STATIC OWNER REVIEW BUNDLE: PASS\n");
