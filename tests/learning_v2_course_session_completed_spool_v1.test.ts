import {
  createLearningV2CourseSessionDeviceRunV1,
  materializeLearningV2CourseSessionCompletedSummaryV1,
} from "../modules/learning-v2/runtime/course_session_device_run_v1";
import {
  materializeLearningV2CourseSessionAuxiliaryChildV1,
  materializeLearningV2CourseSessionIntroChildV1,
  materializeLearningV2CourseSessionLearnerChildV1,
  materializeLearningV2CourseSessionSavablePhraseV1,
} from "../modules/learning-v2/runtime/course_session_client_children_v1";
import { materializeLearningV2CourseSessionEvaluatorCapsuleChildV1 } from "../modules/learning-v2/runtime/course_session_evaluator_capsule_child_v1";
import { createLearningV2CourseSessionCompletedSpoolV1 } from "../app/learning_v2_course_session_completed_spool_v1";

const locales = ["ru", "uk", "es", "pt-BR", "vi", "id", "tr", "pl"] as const;
const localized = (value: string) =>
  Object.freeze(
    Object.fromEntries(locales.map((locale) => [locale, value])),
  ) as any;
const ids = Array.from(
  { length: 10 },
  (_, index) => `interaction-${index + 1}`,
);

function completion() {
  const introChild = materializeLearningV2CourseSessionIntroChildV1({
    courseSessionId: "lesson-01:session:01",
    learningOutcomeByLocale: localized("Outcome"),
    pages: [1, 2, 3].map((ordinal) => ({
      pageOrdinal: ordinal as 1 | 2 | 3,
      pageId: `page-${ordinal}`,
      kind: "concept" as const,
      titleByLocale: localized(`Title ${ordinal}`),
      bodyByLocale: localized(`Body ${ordinal}`),
      question: {
        interactionId: ids[ordinal - 1]!,
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
    interactions: ids.slice(3).map((interactionId, index) => ({
      interactionId,
      ordinal: index + 4,
      purpose: "supported_practice" as const,
      family: "phrase_builder" as const,
      inputMode: "ordered_tokens" as const,
      prompt: `Prompt ${index}`,
      responseOptions: [{ responseId: `word-${index}`, text: `word${index}` }],
      mediaIds: [],
      audioTargetIds: [],
      accessibilityLabel: `Prompt ${index}`,
      scriptedAlternate: null,
    })),
  });
  const evaluatorCapsuleChild =
    materializeLearningV2CourseSessionEvaluatorCapsuleChildV1({
      courseSessionId: "lesson-01:session:01",
      entries: ids.map((interactionId, index) => ({
        interactionId,
        activityId: `activity-${index}`,
        capsuleId: `capsule-${index}`,
        family: "phrase_builder" as const,
        normalizationLocale: "en-US",
        salt: `${"0".repeat(63)}${index}`,
        acceptedResponses: [`answer${index}`],
      })),
    });
  const auxiliaryChild = materializeLearningV2CourseSessionAuxiliaryChildV1({
    courseSessionId: "lesson-01:session:01",
    entries: ids.map((interactionId, index) => ({
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
      secondErrorExplanationRef: `error-${index}`,
      secondErrorExplanationByLocale: localized(`Explanation ${index}`),
    })),
  });
  const run = createLearningV2CourseSessionDeviceRunV1({
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
    introChild,
    learnerChild,
    evaluatorCapsuleChild,
    auxiliaryChild,
  });
  return materializeLearningV2CourseSessionCompletedSummaryV1({
    run,
    sessionRunId: "run-1",
    interactionCompletions: ids.map((interactionId) => ({
      interactionId,
      disposition: "completed" as const,
      learnerAttempts: 1,
      hintUsed: false,
    })),
  });
}

function memoryStorage() {
  const rows = new Map<string, string>();
  return {
    rows,
    getItem: async (key: string) => rows.get(key) ?? null,
    setItem: async (key: string, value: string) => void rows.set(key, value),
    removeItem: async (key: string) => void rows.delete(key),
  };
}

describe("Learning V2 direct completed-session spool", () => {
  test("stores only a complete answer-free summary and replays idempotently", async () => {
    const storage = memoryStorage();
    const spool = createLearningV2CourseSessionCompletedSpoolV1(storage);
    const value = completion();
    await spool.append("e".repeat(64), value);
    await spool.append("e".repeat(64), value);
    const pending = await spool.list("e".repeat(64));
    expect(pending).toHaveLength(1);
    expect(pending[0]).toEqual(value);
    expect(JSON.stringify(pending)).not.toMatch(
      /answerText|responseValue|resultCode|acceptedResponses/u,
    );
    await spool.remove("e".repeat(64), value.completionFingerprint);
    expect(await spool.list("e".repeat(64))).toEqual([]);
  });

  test("fails closed on a same-fingerprint body conflict", async () => {
    const storage = memoryStorage();
    const spool = createLearningV2CourseSessionCompletedSpoolV1(storage);
    const value = completion();
    await spool.append("e".repeat(64), value);
    const entry = [...storage.rows.entries()].find(([key]) =>
      key.endsWith(value.completionFingerprint),
    );
    expect(entry).toBeDefined();
    storage.rows.set(entry![0], entry![1].replace("run-1", "run-x"));
    await expect(spool.list("e".repeat(64))).rejects.toThrow(
      "learning_v2_course_session_device_run_invalid",
    );
  });
});
