import assert from "node:assert/strict";
import {
  buildLearningV2AuthoringDevicePreviewV1,
  learningV2AuthoringDevicePreviewRowsV1,
} from "../modules/learning-v2/preview/authoring_device_preview_v1";
import {
  createLearningV2CourseSessionDeviceRunV1,
  getLearningV2CourseSessionDeviceRunSummaryV1,
} from "../modules/learning-v2/runtime/course_session_device_run_v1";

const rows = learningV2AuthoringDevicePreviewRowsV1();

assert.deepEqual(
  rows.map((row) => [row.sessionOrdinal, row.status, row.openable]),
  [
    [1, "LOCKED", true],
    [2, "DRAFT", true],
  ],
  "the phone preview must expose only the locked prefix plus current session",
);

assert.throws(
  () => buildLearningV2AuthoringDevicePreviewV1(3, "ru"),
  /learning_v2_authoring_device_preview_forbidden:session=3/u,
  "a forbidden future session must never be previewable",
);

const preview = buildLearningV2AuthoringDevicePreviewV1(1, "ru");
assert.equal(preview.schemaVersion, "learning-v2-authoring-device-preview.v1");
assert.equal(preview.targetLanguage, "en");
assert.equal(preview.lessonOrdinal, 1);
assert.equal(preview.sessionOrdinal, 1);
assert.equal(preview.status, "LOCKED");
assert.equal(preview.introChild.pages.length, 3);
assert.equal(preview.learnerChild.interactions.length, 17);
assert.equal(
  preview.audioReadiness,
  "published_audio_or_device_tts_preview_fallback",
);
assert.equal(preview.sideEffectPolicy, "preview_only_no_learner_writes");
assert.ok(
  preview.auxiliaryChild.entries.every(
    (entry) =>
      entry.voice.available === true && entry.voice.holdToTalkAllowed === true,
  ),
  "every preview interaction must expose the real footer hold-to-talk path",
);
assert.deepEqual(
  preview.auxiliaryChild.entries
    .map((entry, index) =>
      entry.newWordEncounter
        ? [index - preview.introChild.pages.length, entry.newWordEncounter.lexicalItemId]
        : null,
    )
    .filter((entry) => entry !== null),
  [
    [0, "e01-s01-word-i"],
    [1, "e01-s01-word-am"],
    [2, "e01-s01-word-here"],
    [3, "e01-s01-word-ready"],
  ],
  "each new word card must appear once, immediately before that word's first required practice contact",
);

const interactions = preview.learnerChild.interactions;
assert.ok(interactions.every((interaction) => interaction.modePayload !== null));
assert.deepEqual(
  [...new Set(interactions.map((interaction) => interaction.family))].sort(),
  [
    "context_gap_grammar",
    "listen_build_dictation",
    "listen_choose",
    "phrase_builder",
    "scripted_repeat_compare",
    "speed_match",
  ],
);

const run = createLearningV2CourseSessionDeviceRunV1({
  environment: "lab",
  targetLanguage: "en",
  studyTarget: "en",
  learnerSourceLocale: "ru",
  seasonId: "learning-v2",
  releaseId: preview.releaseId,
  activeRootFingerprint: preview.activeRootFingerprint,
  activeHeadFingerprint: preview.activeHeadFingerprint,
  lessonId: preview.lessonId,
  lessonOrdinal: preview.lessonOrdinal,
  courseSessionId: preview.courseSessionId,
  sessionOrdinal: preview.sessionOrdinal,
  packageFingerprint: preview.packageFingerprint,
  childSetFingerprint: preview.childSetFingerprint,
  introChild: preview.introChild,
  learnerChild: preview.learnerChild,
  evaluatorCapsuleChild: preview.evaluatorCapsuleChild,
  auxiliaryChild: preview.auxiliaryChild,
});
const summary = getLearningV2CourseSessionDeviceRunSummaryV1(run);
assert.equal(summary.introInteractionCount, 3);
assert.equal(summary.practiceInteractionCount, 17);

const secondPreview = buildLearningV2AuthoringDevicePreviewV1(2, "ru");
assert.equal(secondPreview.sessionOrdinal, 2);
assert.equal(secondPreview.status, "DRAFT");
assert.equal(secondPreview.introChild.pages.length, 3);
assert.ok(secondPreview.learnerChild.interactions.length > 0);

process.stdout.write("LEARNING V2 AUTHORING DEVICE PREVIEW: PASS\n");
