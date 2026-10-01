import assert from "node:assert/strict";
import {
  buildLearningV2AuthoringDevicePreviewV1,
  learningV2AuthoringDevicePreviewRowsV1,
} from "../modules/learning-v2/preview/authoring_device_preview_v1";
import { LESSON1_AUTHORING_REGISTRY_V1 } from "../modules/learning-v2/content/source/lesson1_authoring_registry_v1";
import {
  createLearningV2CourseSessionDeviceRunV1,
  getLearningV2CourseSessionDeviceRunSummaryV1,
} from "../modules/learning-v2/runtime/course_session_device_run_v1";

// зачем (координатор §47, 2026-10-01): файл был сценарием из голых assert без единого
// test() — jest помечал его «must contain at least one test» и НИ ОДНА проверка не
// исполнялась. Тело обёрнуто в один test; вне jest (npx tsx) оно запускается напрямую.
async function main(): Promise<void> {
// зачем (координатор §47, 2026-10-01): набор не исполнялся с рождения и зашил
// состояние реестра «s1 LOCKED, s2 DRAFT». После переделки D149/D150 урок 1 снова
// в черновике (s1 DRAFT). Инвариант прежний — видны закрытый префикс и ОДНО текущее
// занятие, следующее за ним открыть нельзя, — но ожидания берём из реестра.
const rows = learningV2AuthoringDevicePreviewRowsV1();
const currentIndex = LESSON1_AUTHORING_REGISTRY_V1.findIndex((entry) => entry.status !== "LOCKED");
const expectedRows = LESSON1_AUTHORING_REGISTRY_V1
  .slice(0, (currentIndex === -1 ? LESSON1_AUTHORING_REGISTRY_V1.length - 1 : currentIndex) + 1)
  .map((entry) => [entry.sessionOrdinal, entry.status, true]);
assert.ok(expectedRows.length >= 1);
assert.deepEqual(
  rows.map((row) => [row.sessionOrdinal, row.status, row.openable]),
  expectedRows,
  "the phone preview must expose only the locked prefix plus current session",
);

const firstForbidden = rows.length + 1;
assert.throws(
  () => buildLearningV2AuthoringDevicePreviewV1(firstForbidden, "ru"),
  new RegExp(`learning_v2_authoring_device_preview_forbidden:session=${firstForbidden}`, "u"),
  "a forbidden future session must never be previewable",
);

const preview = buildLearningV2AuthoringDevicePreviewV1(1, "ru");
assert.equal(preview.schemaVersion, "learning-v2-authoring-device-preview.v1");
assert.equal(preview.targetLanguage, "en");
assert.equal(preview.lessonOrdinal, 1);
assert.equal(preview.sessionOrdinal, 1);
assert.equal(preview.status, rows[0]!.status);
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

const lastRow = rows[rows.length - 1]!;
const lastPreview = buildLearningV2AuthoringDevicePreviewV1(lastRow.sessionOrdinal, "ru");
assert.equal(lastPreview.sessionOrdinal, lastRow.sessionOrdinal);
assert.equal(lastPreview.status, lastRow.status);
assert.equal(lastPreview.introChild.pages.length, 3);
assert.ok(lastPreview.learnerChild.interactions.length > 0);

process.stdout.write("LEARNING V2 AUTHORING DEVICE PREVIEW: PASS\n");
}

if (typeof test === "function") {
  test("learning_v2_authoring_device_preview_v1", main);
} else {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
