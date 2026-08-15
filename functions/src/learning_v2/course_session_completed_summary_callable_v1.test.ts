import { HttpsError } from "firebase-functions/v2/https";
import {
  parseLearningV2CourseSessionCompletedSummaryV1,
  type LearningV2CourseSessionCompletedSummaryV1,
} from "../../../modules/learning-v2/runtime/course_session_device_run_v1";
import {
  createLearningV2CourseSessionCompletedHandlerV1,
  LEARNING_V2_COURSE_SESSION_COMPLETED_CALLABLE_OPTIONS_V1,
} from "./course_session_completed_summary_callable_v1";

jest.mock(
  "../../../modules/learning-v2/runtime/course_session_device_run_v1",
  () => ({
    parseLearningV2CourseSessionCompletedSummaryV1: jest.fn(),
  }),
);

const h = (character: string) => character.repeat(64);
const completion = Object.freeze({
  completionFingerprint: h("a"),
  releaseId: "release-1",
  lessonId: "lesson-1",
  courseSessionId: "lesson-1-session-1",
  sessionRunId: "run-1",
  answerPayload: "absent",
  perAnswerTransport: "none",
  serverEvaluationAuthority: "none_server_must_not_return_correct_or_wrong",
}) as unknown as LearningV2CourseSessionCompletedSummaryV1;

describe("Learning V2 course session completed summary callable", () => {
  beforeEach(() => {
    jest
      .mocked(parseLearningV2CourseSessionCompletedSummaryV1)
      .mockReturnValue(completion);
  });

  test("stores only a completed answer-free summary and returns no verdict", async () => {
    expect(
      LEARNING_V2_COURSE_SESSION_COMPLETED_CALLABLE_OPTIONS_V1.enforceAppCheck,
    ).toBe(true);
    const putIfAbsent = jest.fn(async () => "created" as const);
    const handler = createLearningV2CourseSessionCompletedHandlerV1({
      authorize: async (authUid) => {
        expect(authUid).toBe("auth-1");
        return Object.freeze({ stableUid: "stable-1", accountGeneration: 4 });
      },
      inboxStore: { putIfAbsent },
    });
    const receipt = await handler({
      data: { completion },
      auth: { uid: "auth-1" },
    });
    expect(putIfAbsent).toHaveBeenCalledWith(
      expect.objectContaining({
        authUid: "auth-1",
        stableUid: "stable-1",
        accountGeneration: 4,
        record: expect.objectContaining({
          answerPayload: "absent",
          serverEvaluationAuthority:
            "none_server_only_stores_completed_summary",
          walletAuthority: "none",
          masteryAuthority: "none",
          evidenceAuthority: "none",
        }),
      }),
    );
    expect(receipt).toMatchObject({
      localCompletionFingerprint: h("a"),
      duplicate: false,
      answerPayload: "absent",
      serverEvaluationAuthority: "none_server_must_not_return_correct_or_wrong",
      completionAuthority:
        "accepted_completed_summary_for_background_storage_only",
      walletAuthority: "none",
      masteryAuthority: "none",
      evidenceAuthority: "none",
      releaseAuthority: false,
    });
    expect(Object.keys(receipt)).not.toEqual(
      expect.arrayContaining(["correct", "wrong", "answer", "verdict"]),
    );
  });

  test("fails closed for unauthenticated, extra request data and conflict", async () => {
    const base = {
      authorize: async () => ({ stableUid: "stable-1", accountGeneration: 4 }),
    };
    const handler = createLearningV2CourseSessionCompletedHandlerV1({
      ...base,
      inboxStore: { putIfAbsent: async () => "existing" },
    });
    await expect(handler({ data: { completion } })).rejects.toMatchObject({
      code: "unauthenticated",
    });
    await expect(
      handler({
        data: { completion, answer: "forbidden" },
        auth: { uid: "auth-1" },
      }),
    ).rejects.toMatchObject({ code: "invalid-argument" });
    await expect(
      handler({ data: { completion }, auth: { uid: "auth-1" } }),
    ).resolves.toMatchObject({ duplicate: true, answerPayload: "absent" });

    const conflict = createLearningV2CourseSessionCompletedHandlerV1({
      ...base,
      inboxStore: {
        putIfAbsent: async () => {
          throw new Error("course_session_completed_conflict");
        },
      },
    });
    await expect(
      conflict({ data: { completion }, auth: { uid: "auth-1" } }),
    ).rejects.toBeInstanceOf(HttpsError);
  });
});
