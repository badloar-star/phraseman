import { HttpsError } from "firebase-functions/v2/https";
import { parseLearningV2CourseSessionAudioChildV1 } from "../../../modules/learning-v2/runtime/course_session_audio_child_v1";
import {
  parseLearningV2CourseSessionAuxiliaryChildV1,
  parseLearningV2CourseSessionIntroChildV1,
  parseLearningV2CourseSessionLearnerChildV1,
} from "../../../modules/learning-v2/runtime/course_session_client_children_v1";
import { parseLearningV2CourseSessionEvaluatorCapsuleChildV1 } from "../../../modules/learning-v2/runtime/course_session_evaluator_capsule_child_v1";
import {
  createV2CourseReleasedSessionHandlerV3,
  V2_COURSE_RELEASED_SESSION_CALLABLE_OPTIONS_V3,
} from "./v2_course_released_session_callable_v3";

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
jest.mock(
  "../../../modules/learning-v2/runtime/course_session_audio_child_v1",
  () => ({ parseLearningV2CourseSessionAudioChildV1: jest.fn() }),
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
  activeBaseRootFingerprint: h("b"),
  activeHeadFingerprint: h("c"),
  topologyFingerprint: h("d"),
  lessonId: "lesson-02",
  lessonOrdinal: 2,
  baseLessonIndexFingerprint: h("e"),
  audioLessonIndexFingerprint: h("f"),
  courseSessionId,
  sessionOrdinal: 56,
  packageFingerprint: h("1"),
  childSetFingerprint: h("2"),
  audioExtensionFingerprint: h("3"),
  audioFingerprint: h("4"),
  learnerProjection: "intro_learner_capsule_auxiliary_audio_child_only",
  evaluatorIsolation: "server_sidecar_not_exposed",
  answerPayload: "absent",
  correctnessAuthority: "local_device_only",
  serverAnswerAuthority: "none_answers_never_transported_or_rechecked",
  serverRequestPerPlayback: false,
});

function resolved() {
  return Object.freeze({
    summary: summary as never,
    canonicalIntroRaw: '{"intro":true}',
    canonicalLearnerRaw: '{"learner":true}',
    canonicalEvaluatorCapsuleRaw: '{"capsule":true}',
    canonicalAuxiliaryRaw: '{"auxiliary":true}',
    canonicalAudioChildRaw: '{"audio":true}',
  });
}

describe("Learning V2 composite text+audio released session callable", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(parseLearningV2CourseSessionIntroChildV1).mockReturnValue({
      courseSessionId,
      introFingerprint: h("5"),
    } as never);
    jest.mocked(parseLearningV2CourseSessionLearnerChildV1).mockReturnValue({
      courseSessionId,
      learnerFingerprint: h("6"),
    } as never);
    jest.mocked(parseLearningV2CourseSessionAuxiliaryChildV1).mockReturnValue({
      courseSessionId,
      auxiliaryFingerprint: h("7"),
    } as never);
    jest
      .mocked(parseLearningV2CourseSessionEvaluatorCapsuleChildV1)
      .mockReturnValue({
        courseSessionId,
        capsuleSetFingerprint: h("8"),
      } as never);
    jest.mocked(parseLearningV2CourseSessionAudioChildV1).mockReturnValue({
      courseSessionId,
      learnerFingerprint: h("6"),
      audioFingerprint: h("4"),
    } as never);
  });

  test("returns authenticated learner material and audio descriptors but no answer or verdict transport", async () => {
    // зачем: App Check выключен по решению владельца 2026-08-16 — без него дев-сборка
    // получала 401 и опубликованный курс был нечитаем. Сторож обязанности функции при
    // этом остаётся: ниже она по-прежнему обязана отказать безымянному вызову
    // (unauthenticated) и не отдавать правильные ответы. Вернуть true вместе с
    // отладочным токеном в сборке.
    expect(V2_COURSE_RELEASED_SESSION_CALLABLE_OPTIONS_V3.enforceAppCheck).toBe(
      false,
    );
    const handler = createV2CourseReleasedSessionHandlerV3(
      async (_input, stableAccountId) => {
        expect(stableAccountId).toBe("stable-1");
        return resolved();
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
      schemaVersion: "v2-course-released-session-response.v3",
      lessonOrdinal: 2,
      sessionOrdinal: 56,
      audioFingerprint: h("4"),
      learnerProjection: "intro_learner_capsule_auxiliary_audio_child_only",
      answerPayload: "absent",
      correctnessAuthority: "local_device_only",
      serverAnswerAuthority: "none_answers_never_transported_or_rechecked",
      serverRequestPerPlayback: false,
      completionAuthority: "none",
      releaseAuthority: false,
    });
    expect(JSON.stringify(response)).not.toMatch(
      /submittedAnswer|correctResponse|acceptedResponses|serverSidecar|answerText|resultCode/u,
    );
  });

  test("fails closed on request drift and audio substitution", async () => {
    const handler = createV2CourseReleasedSessionHandlerV3(
      async () => resolved(),
      async () => "stable-1",
    );
    for (const bad of [
      { ...request, answer: "forbidden" },
      { ...request, sessionOrdinal: 57 },
      { ...request, targetLanguage: "en-us" },
    ]) {
      await expect(
        handler({ data: bad, auth: { uid: "auth-1" } }),
      ).rejects.toBeInstanceOf(HttpsError);
    }
    jest.mocked(parseLearningV2CourseSessionAudioChildV1).mockReturnValue({
      courseSessionId,
      learnerFingerprint: h("6"),
      audioFingerprint: h("9"),
    } as never);
    await expect(
      handler({ data: request, auth: { uid: "auth-1" } }),
    ).rejects.toMatchObject({ code: "data-loss" });
  });
});
