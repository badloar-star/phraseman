import { HttpsError } from "firebase-functions/v2/https";
import { parseLearningV2CourseSessionAudioChildV1 } from "../../../modules/learning-v2/runtime/course_session_audio_child_v1";
import {
  parseLearningV2CourseSessionAuxiliaryChildV1,
  parseLearningV2CourseSessionIntroChildV1,
  parseLearningV2CourseSessionLearnerChildV1,
} from "../../../modules/learning-v2/runtime/course_session_client_children_v1";
import { parseLearningV2CourseSessionEvaluatorCapsuleChildV1 } from "../../../modules/learning-v2/runtime/course_session_evaluator_capsule_child_v1";
import { projectLearningV2CourseSessionTransportV2 } from "../../../modules/learning-v2/runtime/course_session_learner_transport_projection_v1";
import { createV2CourseReleasedSessionHandlerV4 } from "./v2_course_released_session_callable_v4";

jest.mock("../../../modules/learning-v2/runtime/course_session_client_children_v1", () => ({
  parseLearningV2CourseSessionAuxiliaryChildV1: jest.fn(),
  parseLearningV2CourseSessionIntroChildV1: jest.fn(),
  parseLearningV2CourseSessionLearnerChildV1: jest.fn(),
}));
jest.mock("../../../modules/learning-v2/runtime/course_session_evaluator_capsule_child_v1", () => ({
  parseLearningV2CourseSessionEvaluatorCapsuleChildV1: jest.fn(),
}));
jest.mock("../../../modules/learning-v2/runtime/course_session_audio_child_v1", () => ({
  parseLearningV2CourseSessionAudioChildV1: jest.fn(),
}));
jest.mock("../../../modules/learning-v2/runtime/course_session_learner_transport_projection_v1", () => ({
  projectLearningV2CourseSessionTransportV2: jest.fn(),
}));

const h = (character: string) => character.repeat(64);
const courseSessionId = "lesson-02:session:56";
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
const summary = Object.freeze({
  releaseId: "release-1",
  activeRootFingerprint: h("a"), activeBaseRootFingerprint: h("b"),
  activeHeadFingerprint: h("c"), topologyFingerprint: h("d"),
  lessonId: "lesson-02", lessonOrdinal: 2,
  baseLessonIndexFingerprint: h("e"), audioLessonIndexFingerprint: h("f"),
  courseSessionId, sessionOrdinal: 56, packageFingerprint: h("1"),
  childSetFingerprint: h("2"), audioExtensionFingerprint: h("3"),
  audioFingerprint: h("4"),
  learnerProjection: "intro_learner_capsule_auxiliary_audio_child_only",
  evaluatorIsolation: "server_sidecar_not_exposed", answerPayload: "absent",
  correctnessAuthority: "local_device_only",
  serverAnswerAuthority: "none_answers_never_transported_or_rechecked",
  serverRequestPerPlayback: false,
});
const resolved = () => Object.freeze({
  summary: summary as never,
  canonicalIntroRaw: '{"intro":true}',
  canonicalLearnerRaw: '{"choiceFeedback":[{"correct":true}]}',
  canonicalEvaluatorCapsuleRaw: '{"capsule":true}',
  canonicalAuxiliaryRaw: '{"auxiliary":true}',
  canonicalAudioChildRaw: '{"audio":true}',
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(parseLearningV2CourseSessionIntroChildV1).mockReturnValue({ courseSessionId, introFingerprint: h("5") } as never);
  jest.mocked(parseLearningV2CourseSessionLearnerChildV1).mockReturnValue({ courseSessionId, learnerFingerprint: h("6") } as never);
  jest.mocked(parseLearningV2CourseSessionEvaluatorCapsuleChildV1).mockReturnValue({ courseSessionId, capsuleSetFingerprint: h("8") } as never);
  jest.mocked(parseLearningV2CourseSessionAuxiliaryChildV1).mockReturnValue({ courseSessionId, auxiliaryFingerprint: h("7") } as never);
  jest.mocked(parseLearningV2CourseSessionAudioChildV1).mockReturnValue({ courseSessionId, learnerFingerprint: h("6"), audioFingerprint: h("4") } as never);
  jest.mocked(projectLearningV2CourseSessionTransportV2).mockReturnValue({
    schemaVersion: "learning-v2-course-session-transport-projection.v2",
    sourceLearnerFingerprint: h("6"),
    learnerProjectionFingerprint: h("9"),
    canonicalLearnerProjectionRaw: '{"learnerFingerprint":"' + h("9") + '"}',
    sourceAuxiliaryFingerprint: h("7"),
    auxiliaryProjectionFingerprint: h("0"),
    canonicalAuxiliaryProjectionRaw: '{"auxiliaryFingerprint":"' + h("0") + '"}',
  });
});

test("v4 returns only marker-free learner and auxiliary projections with source/projection hash joins", async () => {
  const handler = createV2CourseReleasedSessionHandlerV4(async () => resolved(), async () => "stable-1");
  const response = await handler({ data: request, auth: { uid: "auth-1" } });
  expect(response).toMatchObject({
    schemaVersion: "v2-course-released-session-response.v4",
    sourceLearnerFingerprint: h("6"),
    learnerProjectionFingerprint: h("9"),
    sourceAuxiliaryFingerprint: h("7"),
    auxiliaryProjectionFingerprint: h("0"),
    learnerProjection: "canonical_learner_and_auxiliary_wire_projection_v2",
    transportAuthority: "authenticated_callable_only",
  });
  expect(response).not.toHaveProperty("canonicalLearnerRaw");
  expect(response).not.toHaveProperty("learnerFingerprint");
  expect(response).not.toHaveProperty("canonicalAuxiliaryRaw");
  expect(response).not.toHaveProperty("auxiliaryFingerprint");
  expect(response.canonicalLearnerProjectionRaw).not.toContain("correct");
  expect(projectLearningV2CourseSessionTransportV2).toHaveBeenCalledWith({
    canonicalIntroSourceRaw: resolved().canonicalIntroRaw,
    canonicalLearnerSourceRaw: resolved().canonicalLearnerRaw,
    canonicalEvaluatorCapsuleRaw: resolved().canonicalEvaluatorCapsuleRaw,
    canonicalAuxiliarySourceRaw: resolved().canonicalAuxiliaryRaw,
  });
});

test("v4 fails closed on auth, request drift, and source/projection hash mismatch", async () => {
  const handler = createV2CourseReleasedSessionHandlerV4(async () => resolved(), async () => "stable-1");
  await expect(handler({ data: request })).rejects.toMatchObject({ code: "unauthenticated" });
  await expect(handler({ data: { ...request, answer: "forbidden" }, auth: { uid: "auth-1" } }))
    .rejects.toBeInstanceOf(HttpsError);
  jest.mocked(projectLearningV2CourseSessionTransportV2).mockReturnValue({
    schemaVersion: "learning-v2-course-session-transport-projection.v2",
    sourceLearnerFingerprint: h("0"),
    learnerProjectionFingerprint: h("9"),
    canonicalLearnerProjectionRaw: "{}",
    sourceAuxiliaryFingerprint: h("7"),
    auxiliaryProjectionFingerprint: h("0"),
    canonicalAuxiliaryProjectionRaw: "{}",
  });
  await expect(handler({ data: request, auth: { uid: "auth-1" } }))
    .rejects.toMatchObject({ code: "data-loss" });

  jest.mocked(projectLearningV2CourseSessionTransportV2).mockReturnValue({
    schemaVersion: "learning-v2-course-session-transport-projection.v2",
    sourceLearnerFingerprint: h("6"),
    learnerProjectionFingerprint: h("9"),
    canonicalLearnerProjectionRaw: "{}",
    sourceAuxiliaryFingerprint: h("1"),
    auxiliaryProjectionFingerprint: h("0"),
    canonicalAuxiliaryProjectionRaw: "{}",
  });
  await expect(handler({ data: request, auth: { uid: "auth-1" } }))
    .rejects.toMatchObject({ code: "data-loss" });
});
