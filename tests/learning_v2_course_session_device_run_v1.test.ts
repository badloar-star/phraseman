import {
  createLearningV2CourseSessionDeviceRunV1,
  evaluateLearningV2CourseSessionDeviceInteractionV1,
  getLearningV2CourseSessionDeviceRunSummaryV1,
  getLearningV2CourseSessionNewWordEncountersV1,
  isLearningV2CourseSessionDeviceRunHandleV1,
  materializeLearningV2CourseSessionCompletedSummaryV1,
} from "../modules/learning-v2/runtime/course_session_device_run_v1";
import {
  materializeLearningV2CourseSessionAuxiliaryChildV1,
  materializeLearningV2CourseSessionIntroChildV1,
  materializeLearningV2CourseSessionLearnerChildV1,
  materializeLearningV2CourseSessionSavablePhraseV1,
} from "../modules/learning-v2/runtime/course_session_client_children_v1";
import { materializeLearningV2CourseSessionEvaluatorCapsuleChildV1 } from "../modules/learning-v2/runtime/course_session_evaluator_capsule_child_v1";

const locales = [
  "ru",
  "uk",
  "es",
  "en",
  "pt-BR",
  "vi",
  "id",
  "tr",
  "pl",
] as const;
const localized = (text: string) =>
  Object.freeze(
    Object.fromEntries(locales.map((locale) => [locale, text])),
  ) as any;
const interactionIds = Array.from(
  { length: 10 },
  (_, index) => `interaction-${index + 1}`,
);

function children() {
  const introChild = materializeLearningV2CourseSessionIntroChildV1({
    courseSessionId: "lesson-01:session:01",
    learningOutcomeByLocale: localized("Introduce yourself confidently"),
    pages: [1, 2, 3].map((ordinal) => ({
      pageOrdinal: ordinal as 1 | 2 | 3,
      pageId: `page-${ordinal}`,
      kind:
        ordinal === 1
          ? ("concept" as const)
          : ordinal === 2
            ? ("formula" as const)
            : ("example" as const),
      titleByLocale: localized(`Title ${ordinal}`),
      bodyByLocale: localized(`Body ${ordinal}`),
      question: {
        interactionId: interactionIds[ordinal - 1]!,
        promptByLocale: localized(`Question ${ordinal}`),
        choicesByLocale: Object.freeze(
          Object.fromEntries(
            locales.map((locale) => [
              locale,
              [`answer${ordinal}`, `wrong${ordinal}`],
            ]),
          ),
        ) as any,
        accessibilityLabelByLocale: localized(`Question ${ordinal}`),
      },
    })) as any,
  });
  const learnerChild = materializeLearningV2CourseSessionLearnerChildV1({
    courseSessionId: "lesson-01:session:01",
    targetLanguage: "en-US",
    interactionProfile: "standard",
    interactions: interactionIds.slice(3).map((interactionId, index) => ({
      interactionId,
      ordinal: index + 4,
      purpose:
        index < 4
          ? ("supported_practice" as const)
          : ("retrieval_practice" as const),
      family: "phrase_builder" as const,
      inputMode: "ordered_tokens" as const,
      prompt: `Build phrase ${index + 1}`,
      responseOptions: [
        { responseId: `word-${index + 1}`, text: `word${index + 1}` },
      ],
      mediaIds: [],
      audioTargetIds: [],
      accessibilityLabel: `Build phrase ${index + 1}`,
      scriptedAlternate: null,
    })),
  });
  const evaluatorCapsuleChild =
    materializeLearningV2CourseSessionEvaluatorCapsuleChildV1({
      courseSessionId: "lesson-01:session:01",
      entries: interactionIds.map((interactionId, index) => ({
        interactionId,
        activityId: `activity-${index + 1}`,
        capsuleId: `capsule-${index + 1}`,
        family: "phrase_builder" as const,
        normalizationLocale: "en-US",
        salt: `${"0".repeat(63)}${index}`,
        acceptedResponses: [
          index < 3 ? `answer${index + 1}` : `word${index - 2}`,
        ],
      })),
    });
  const auxiliaryChild = materializeLearningV2CourseSessionAuxiliaryChildV1({
    courseSessionId: "lesson-01:session:01",
    entries: interactionIds.map((interactionId, index) => ({
      interactionId,
      report: {
        available: true as const,
        reportContextRef: `report-${index}`,
        screen: "learning_v2_session" as const,
      },
      save: materializeLearningV2CourseSessionSavablePhraseV1({
        targetLanguage: "en-US",
        targetText: `phrase ${index + 1}`,
        meaningByLocale: localized(`Meaning ${index + 1}`),
      }),
      voice: {
        available: true,
        tapToRecordAllowed: true as const,
        holdToTalkAllowed: true as const,
      },
      secondErrorExplanationRef: `explanation-${index}`,
      secondErrorExplanationByLocale: localized(`Explanation ${index}`),
      ...(index === 3
        ? {
            newWordEncounter: {
              lexicalItemId: "e01-s01-word-i",
              transcription: "/aɪ/",
              playfulMeaningByLocale: localized("The speaker takes the stage."),
              motionVariant: "lesson_hero_b" as const,
              presentation: "blocking_task_overlay" as const,
              dismissal: "continue_only" as const,
              saveControl: "bookmark_icon" as const,
              orderWithinSession: 1,
              save: materializeLearningV2CourseSessionSavablePhraseV1({
                targetLanguage: "en-US",
                targetText: `phrase ${index + 1}`,
                meaningByLocale: localized(`Meaning ${index + 1}`),
              }),
            },
          }
        : {}),
    })),
  });
  return { introChild, learnerChild, evaluatorCapsuleChild, auxiliaryChild };
}

function run() {
  return createLearningV2CourseSessionDeviceRunV1({
    environment: "production",
    targetLanguage: "en-US",
    studyTarget: "en-US",
    learnerSourceLocale: "ru",
    seasonId: "learning-v2",
    releaseId: "release-1",
    activeRootFingerprint: "a".repeat(64),
    activeHeadFingerprint: "b".repeat(64),
    lessonId: "lesson-01",
    lessonOrdinal: 1,
    courseSessionId: "lesson-01:session:01",
    sessionOrdinal: 1,
    packageFingerprint: "c".repeat(64),
    childSetFingerprint: "d".repeat(64),
    ...children(),
  });
}

describe("Learning V2 direct device session run", () => {
  test("exposes the ordered new-word encounter queue without parsing intent ids in UI", () => {
    expect(getLearningV2CourseSessionNewWordEncountersV1(run())).toMatchObject([
      {
        lexicalItemId: "e01-s01-word-i",
        orderWithinSession: 1,
        motionVariant: "lesson_hero_b",
      },
    ]);
  });

  test("owns correctness locally and exposes no server recheck path", () => {
    const handle = run();
    expect(isLearningV2CourseSessionDeviceRunHandleV1(handle)).toBe(true);
    expect(isLearningV2CourseSessionDeviceRunHandleV1({ ...handle })).toBe(
      false,
    );
    expect(getLearningV2CourseSessionDeviceRunSummaryV1(handle)).toMatchObject({
      interactionCount: 10,
      correctnessAuthority: "local_device_only",
      serverAnswerAuthority: "none_answers_never_transported_or_rechecked",
      interruptedSessionPolicy: "restart_from_first_intro_with_new_run_id",
      partialRunPersistence: "none",
    });
    expect(
      evaluateLearningV2CourseSessionDeviceInteractionV1(
        handle,
        "interaction-1",
        { kind: "text", value: "ANSWER1" },
      ).resultCode,
    ).toBe("provisional_correct");
    expect(
      evaluateLearningV2CourseSessionDeviceInteractionV1(
        handle,
        "interaction-1",
        { kind: "text", value: "wrong" },
      ).resultCode,
    ).toBe("provisional_wrong");
  });

  test("creates only a completed answer-free background-storage summary", () => {
    const completed = materializeLearningV2CourseSessionCompletedSummaryV1({
      run: run(),
      sessionRunId: "run-1",
      interactionCompletions: interactionIds.map((interactionId) => ({
        interactionId,
        disposition: "completed" as const,
        learnerAttempts: 1,
        hintUsed: false,
      })),
    });
    expect(completed).toMatchObject({
      answerPayload: "absent",
      perAnswerTransport: "none",
      serverEvaluationAuthority: "none_server_must_not_return_correct_or_wrong",
      completionAuthority:
        "completed_session_summary_for_background_storage_only",
      partialRunPersistence: "none",
    });
    expect(JSON.stringify(completed)).not.toMatch(
      /submittedAnswer|answerText|responseValue|resultCode|acceptedResponses/u,
    );
    expect(() =>
      materializeLearningV2CourseSessionCompletedSummaryV1({
        run: run(),
        sessionRunId: "run-2",
        interactionCompletions: [],
      }),
    ).toThrow("learning_v2_course_session_device_run_invalid");
  });

  test("rejects cross-session and reordered learner/evaluator/auxiliary joins", () => {
    const value = children();
    const reorderedAuxiliary =
      materializeLearningV2CourseSessionAuxiliaryChildV1({
        courseSessionId: "lesson-01:session:01",
        entries: [...value.auxiliaryChild.entries].reverse(),
      });
    expect(() =>
      createLearningV2CourseSessionDeviceRunV1({
        environment: "production",
        targetLanguage: "en-US",
        studyTarget: "en-US",
        learnerSourceLocale: "ru",
        seasonId: "learning-v2",
        releaseId: "release-1",
        activeRootFingerprint: "a".repeat(64),
        activeHeadFingerprint: "b".repeat(64),
        lessonId: "lesson-01",
        lessonOrdinal: 1,
        courseSessionId: "lesson-01:session:01",
        sessionOrdinal: 1,
        packageFingerprint: "c".repeat(64),
        childSetFingerprint: "d".repeat(64),
        ...value,
        auxiliaryChild: reorderedAuxiliary,
      }),
    ).toThrow("learning_v2_course_session_device_run_invalid");

    expect(() =>
      createLearningV2CourseSessionDeviceRunV1({
        environment: "production",
        targetLanguage: "en-US",
        studyTarget: "en-US",
        learnerSourceLocale: "ru",
        seasonId: "learning-v2",
        releaseId: "release-1",
        activeRootFingerprint: "a".repeat(64),
        activeHeadFingerprint: "b".repeat(64),
        lessonId: "lesson-01",
        lessonOrdinal: 1,
        courseSessionId: "lesson-01:session:01",
        sessionOrdinal: 1,
        packageFingerprint: "c".repeat(64),
        childSetFingerprint: "d".repeat(64),
        ...value,
        introChild: { ...value.introChild },
      }),
    ).toThrow("learning_v2_course_session_device_run_invalid");
  });
});
