import assert from "node:assert/strict";

import { adaptLearningV2DirectSessionIntroV1 } from "../app/learning_v2_direct_session_intro_adapter_v1";
import { buildLearningV2AuthoringDevicePreviewV1 } from "../modules/learning-v2/preview/authoring_device_preview_v1";
import {
  createLearningV2CourseSessionDeviceRunV1,
} from "../modules/learning-v2/runtime/course_session_device_run_v1";
import { evaluateLearningV2CourseSessionInteractionV1 } from "../modules/learning-v2/runtime/course_session_evaluator_capsule_child_v1";
import { stableShuffleLearningV2OptionsV1 } from "../modules/learning-v2/runtime/stable_option_shuffle_v1";

const preview = buildLearningV2AuthoringDevicePreviewV1(1, "ru");
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

for (const screen of adaptLearningV2DirectSessionIntroV1(run)) {
  const question = screen.learningV2EmbeddedQuestion;
  assert.ok(question, `${screen.screenId}: intro question must exist`);
  assert.notEqual(
    question.correctChoiceIndex,
    0,
    `${screen.screenId}: accepted intro choice must not be displayed first`,
  );
}

for (const interaction of preview.learnerChild.interactions) {
  const visibleLabels = interaction.responseOptions.map((option) =>
    option.text.trim(),
  );
  assert.equal(
    new Set(visibleLabels).size,
    visibleLabels.length,
    `${interaction.interactionId}: visible options must not repeat`,
  );
  if (interaction.inputMode === "ordered_tokens") {
    const payload = interaction.modePayload;
    assert.ok(
      payload?.family === "phrase_builder" ||
        payload?.family === "listen_build_dictation",
      `${interaction.interactionId}: ordered-token task needs a native builder payload`,
    );
    const firstAttempt = stableShuffleLearningV2OptionsV1(
      interaction.interactionId,
      interaction.responseOptions,
    );
    assert.notEqual(
      firstAttempt[0]?.text,
      payload.orderedTokens[0],
      `${interaction.interactionId}: the first correct assembly token must not lead the bank`,
    );
    continue;
  }
  if (interaction.inputMode !== "single_choice") continue;
  const accepted = interaction.responseOptions.filter(
    (option) =>
      evaluateLearningV2CourseSessionInteractionV1(
        preview.evaluatorCapsuleChild,
        interaction.interactionId,
        { kind: "choice_token", value: option.responseId },
      ).resultCode === "provisional_correct",
  );
  assert.equal(
    accepted.length,
    1,
    `${interaction.interactionId}: exactly one visible option must be accepted`,
  );
  const firstAttempt = stableShuffleLearningV2OptionsV1(
    interaction.interactionId,
    interaction.responseOptions,
  );
  const retry = stableShuffleLearningV2OptionsV1(
    interaction.interactionId,
    interaction.responseOptions,
  );
  assert.deepEqual(
    firstAttempt,
    retry,
    `${interaction.interactionId}: retry must preserve answer positions`,
  );
  assert.notEqual(
    firstAttempt[0]?.responseId,
    accepted[0]?.responseId,
    `${interaction.interactionId}: accepted option must not be displayed first`,
  );
}

process.stdout.write("LEARNING V2 SESSION 1 ANSWER ORDER GATE: PASS\n");
