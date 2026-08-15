import { HttpsError } from "firebase-functions/v2/https";
import {
  parseLearningV2CourseSessionAuxiliaryChildV1,
  parseLearningV2CourseSessionIntroChildV1,
  parseLearningV2CourseSessionLearnerChildV1,
} from "../../../modules/learning-v2/runtime/course_session_client_children_v1";
import { parseLearningV2CourseSessionEvaluatorCapsuleChildV1 } from "../../../modules/learning-v2/runtime/course_session_evaluator_capsule_child_v1";
import {
  createV2CourseReleasedSessionHandlerV2,
  V2_COURSE_RELEASED_SESSION_CALLABLE_OPTIONS_V2,
} from "./v2_course_released_session_callable_v2";

jest.mock(
  "../../../modules/learning-v2/runtime/course_session_client_children_v1",
  () => ({
    parseLearningV2CourseSessionAuxiliaryChildV1: jest.fn(),
    parseLearningV2CourseSessionIntroChildV1: jest.fn(),
    parseLearningV2CourseSessionLearnerChildV1: jest.fn(),
  }),
);
jest.mock(
  "../../../modules/learning-v2/runtime/course_session_evaluator_capsule_child_v1",
  () => ({ parseLearningV2CourseSessionEvaluatorCapsuleChildV1: jest.fn() }),
);

const h = (character: string) => character.repeat(64);
const request = Object.freeze({
  environment: "lab" as const,
  targetLanguage: "en",
  studyTarget: "en",
  learnerSourceLocale: "ru",
  seasonId: "season-1",
  expectedActiveRootFingerprint: h("a"),
  lessonOrdinal: 2,
  sessionOrdinal: 56,
});
const courseSessionId = "lesson-02:session:56";
const summary = Object.freeze({
  releaseId: "release-1",
  activeRootFingerprint: h("a"),
  activeHeadFingerprint: h("b"),
  topologyFingerprint: h("c"),
  lessonId: "lesson-02",
  lessonOrdinal: 2,
  lessonIndexFingerprint: h("d"),
  courseSessionId,
  sessionOrdinal: 56,
  packageFingerprint: h("e"),
  childSetFingerprint: h("f"),
  learnerProjection: "intro_learner_capsule_auxiliary_only",
  evaluatorIsolation: "server_sidecar_not_exposed",
});

describe("Learning V2 direct 32x56 released session callable", () => {
  beforeEach(() => {
    jest.mocked(parseLearningV2CourseSessionIntroChildV1).mockReturnValue({
      courseSessionId,
      introFingerprint: h("1"),
    } as never);
    jest.mocked(parseLearningV2CourseSessionLearnerChildV1).mockReturnValue({
      courseSessionId,
      learnerFingerprint: h("2"),
    } as never);
    jest.mocked(parseLearningV2CourseSessionAuxiliaryChildV1).mockReturnValue({
      courseSessionId,
      auxiliaryFingerprint: h("3"),
    } as never);
    jest
      .mocked(parseLearningV2CourseSessionEvaluatorCapsuleChildV1)
      .mockReturnValue({
        courseSessionId,
        capsuleSetFingerprint: h("4"),
      } as never);
  });

  test("requires authentication and returns only the three learner-safe children", async () => {
    expect(V2_COURSE_RELEASED_SESSION_CALLABLE_OPTIONS_V2.enforceAppCheck).toBe(
      true,
    );
    const handler = createV2CourseReleasedSessionHandlerV2(
      async (_input, stableAccountId) => {
        expect(stableAccountId).toBe("stable-1");
        return Object.freeze({
          summary: summary as never,
          canonicalIntroRaw: '{"intro":true}',
          canonicalLearnerRaw: '{"learner":true}',
          canonicalEvaluatorCapsuleRaw: '{"capsule":true}',
          canonicalAuxiliaryRaw: '{"auxiliary":true}',
        });
      },
      async () => "stable-1",
    );
    await expect(handler({ data: request })).rejects.toMatchObject({
      code: "unauthenticated",
    });
    const response = await handler({
      data: request,
      auth: { uid: "auth-1" },
    });
    expect(response).toMatchObject({
      schemaVersion: "v2-course-released-session-response.v2",
      lessonOrdinal: 2,
      sessionOrdinal: 56,
      introFingerprint: h("1"),
      learnerFingerprint: h("2"),
      auxiliaryFingerprint: h("3"),
      evaluatorCapsuleSetFingerprint: h("4"),
      learnerProjection: "intro_learner_capsule_auxiliary_only",
      evaluatorIsolation: "server_sidecar_not_exposed",
      releaseAuthority: false,
    });
    expect(JSON.stringify(response)).not.toMatch(
      /evaluatorRaw|correctResponse|acceptedResponses|serverSidecar|salt/u,
    );
  });

  test("accepts the full 1..32 by 1..56 coordinate boundary", async () => {
    const handler = createV2CourseReleasedSessionHandlerV2(
      async (input) => ({
        summary: {
          ...summary,
          lessonId: `lesson-${String(input.lessonOrdinal).padStart(2, "0")}`,
          lessonOrdinal: input.lessonOrdinal,
          courseSessionId: `lesson-${String(input.lessonOrdinal).padStart(2, "0")}:session:${String(input.sessionOrdinal).padStart(2, "0")}`,
          sessionOrdinal: input.sessionOrdinal,
        } as never,
        canonicalIntroRaw: "{}",
        canonicalLearnerRaw: "{}",
        canonicalEvaluatorCapsuleRaw: "{}",
        canonicalAuxiliaryRaw: "{}",
      }),
      async () => "stable-1",
    );
    for (const [lessonOrdinal, sessionOrdinal] of [
      [1, 1],
      [32, 56],
    ] as const) {
      const id = `lesson-${String(lessonOrdinal).padStart(2, "0")}:session:${String(sessionOrdinal).padStart(2, "0")}`;
      jest.mocked(parseLearningV2CourseSessionIntroChildV1).mockReturnValue({
        courseSessionId: id,
        introFingerprint: h("1"),
      } as never);
      jest.mocked(parseLearningV2CourseSessionLearnerChildV1).mockReturnValue({
        courseSessionId: id,
        learnerFingerprint: h("2"),
      } as never);
      jest
        .mocked(parseLearningV2CourseSessionAuxiliaryChildV1)
        .mockReturnValue({
          courseSessionId: id,
          auxiliaryFingerprint: h("3"),
        } as never);
      jest
        .mocked(parseLearningV2CourseSessionEvaluatorCapsuleChildV1)
        .mockReturnValue({
          courseSessionId: id,
          capsuleSetFingerprint: h("4"),
        } as never);
      await expect(
        handler({
          data: {
            ...request,
            lessonOrdinal,
            sessionOrdinal,
            expectedActiveRootFingerprint: null,
          },
          auth: { uid: "auth-1" },
        }),
      ).resolves.toMatchObject({ lessonOrdinal, sessionOrdinal });
    }
  });

  test("fails closed on unknown fields, invalid coordinate, release drift and child substitution", async () => {
    const handler = createV2CourseReleasedSessionHandlerV2(
      async () => ({
        summary: summary as never,
        canonicalIntroRaw: "{}",
        canonicalLearnerRaw: "{}",
        canonicalEvaluatorCapsuleRaw: "{}",
        canonicalAuxiliaryRaw: "{}",
      }),
      async () => "stable-1",
    );
    for (const bad of [
      { ...request, extra: true },
      { ...request, lessonOrdinal: 33 },
      { ...request, sessionOrdinal: 57 },
      { ...request, targetLanguage: "en-us" },
    ]) {
      await expect(
        handler({ data: bad, auth: { uid: "auth-1" } }),
      ).rejects.toBeInstanceOf(HttpsError);
    }
    await expect(
      handler({
        data: { ...request, expectedActiveRootFingerprint: h("9") },
        auth: { uid: "auth-1" },
      }),
    ).rejects.toMatchObject({ code: "data-loss" });
    jest.mocked(parseLearningV2CourseSessionLearnerChildV1).mockReturnValue({
      courseSessionId: "lesson-02:session:55",
      learnerFingerprint: h("2"),
    } as never);
    await expect(
      handler({ data: request, auth: { uid: "auth-1" } }),
    ).rejects.toMatchObject({ code: "data-loss" });
  });
});
