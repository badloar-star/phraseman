import * as admin from "firebase-admin";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { projectLearningV2CourseSessionTransportV2 } from "../../../modules/learning-v2/runtime/course_session_learner_transport_projection_v1";
import { resolveStableUidForAuth } from "../auth_identity";
import {
  parseV2CourseReleasedSessionRequestV2,
  type V2CourseReleasedSessionRequestV2,
} from "./v2_course_released_session_callable_v2";
import {
  exactV2CourseReleasedSessionResolvedV3,
  resolveV2CourseReleasedSessionFromAuthenticatedRepositoryV3,
  V2_COURSE_RELEASED_SESSION_CALLABLE_OPTIONS_V3,
  type V2CourseReleasedSessionResolvedV3,
  type V2CourseReleasedSessionResolverV3,
} from "./v2_course_released_session_callable_v3";

export const V2_COURSE_RELEASED_SESSION_RESPONSE_SCHEMA_V4 =
  "v2-course-released-session-response.v4" as const;
export const V2_COURSE_RELEASED_SESSION_CALLABLE_OPTIONS_V4 =
  V2_COURSE_RELEASED_SESSION_CALLABLE_OPTIONS_V3;

export interface V2CourseReleasedSessionResponseV4 {
  readonly schemaVersion: typeof V2_COURSE_RELEASED_SESSION_RESPONSE_SCHEMA_V4;
  readonly releaseId: string;
  readonly activeRootFingerprint: string;
  readonly activeBaseRootFingerprint: string;
  readonly activeHeadFingerprint: string;
  readonly topologyFingerprint: string;
  readonly lessonId: string;
  readonly lessonOrdinal: number;
  readonly baseLessonIndexFingerprint: string;
  readonly audioLessonIndexFingerprint: string;
  readonly courseSessionId: string;
  readonly sessionOrdinal: number;
  readonly packageFingerprint: string;
  readonly childSetFingerprint: string;
  readonly introFingerprint: string;
  readonly sourceLearnerFingerprint: string;
  readonly learnerProjectionFingerprint: string;
  readonly sourceAuxiliaryFingerprint: string;
  readonly auxiliaryProjectionFingerprint: string;
  readonly evaluatorCapsuleSetFingerprint: string;
  readonly audioExtensionFingerprint: string;
  readonly audioFingerprint: string;
  readonly canonicalIntroRaw: string;
  readonly canonicalLearnerProjectionRaw: string;
  readonly canonicalEvaluatorCapsuleRaw: string;
  readonly canonicalAuxiliaryProjectionRaw: string;
  readonly canonicalAudioChildRaw: string;
  readonly transportAuthority: "authenticated_callable_only";
  readonly repositoryOriginProjection: "active_v3_composite_text_audio_exact_session_join";
  readonly learnerProjection: "canonical_learner_and_auxiliary_wire_projection_v2";
  readonly evaluatorIsolation: "server_sidecar_not_exposed";
  readonly answerPayload: "absent";
  readonly correctnessAuthority: "local_device_only";
  readonly serverAnswerAuthority: "none_answers_never_transported_or_rechecked";
  readonly cacheAuthority: "none_client_lkg_is_availability_only";
  readonly playbackPreparation: "client_generation_pinned_mp3_prefetch_required_before_session";
  readonly serverRequestPerPlayback: false;
  readonly walletAuthority: "none";
  readonly masteryAuthority: "none";
  readonly evidenceAuthority: "none";
  readonly completionAuthority: "none";
  readonly releaseAuthority: false;
}

const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;

export function createV2CourseReleasedSessionHandlerV4(
  resolve: V2CourseReleasedSessionResolverV3 =
    resolveV2CourseReleasedSessionFromAuthenticatedRepositoryV3,
  resolveStableAccountId: (authUid: string) => Promise<string> = async (
    authUid,
  ) =>
    resolveStableUidForAuth(admin.firestore(), authUid, undefined, {
      requireKnownIdentity: true,
      repairLinks: false,
    }),
) {
  return async (
    request: Readonly<{ data: unknown; auth?: { uid?: unknown } | null }>,
  ): Promise<V2CourseReleasedSessionResponseV4> => {
    if (
      typeof request.auth?.uid !== "string" ||
      request.auth.uid.length < 1 ||
      request.auth.uid.length > 128
    ) throw new HttpsError("unauthenticated", "authentication_required");
    const input: V2CourseReleasedSessionRequestV2 =
      parseV2CourseReleasedSessionRequestV2(request.data);
    let stableAccountId: string;
    try {
      stableAccountId = await resolveStableAccountId(request.auth.uid);
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("failed-precondition", "stable_identity_unavailable");
    }
    if (!ID_RE.test(stableAccountId))
      throw new HttpsError("failed-precondition", "stable_identity_unavailable");
    let resolved: V2CourseReleasedSessionResolvedV3;
    try {
      resolved = await resolve(input, stableAccountId);
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("unavailable", "course_session_unavailable");
    }
    const checked = exactV2CourseReleasedSessionResolvedV3(input, resolved);
    let projection;
    try {
      projection = projectLearningV2CourseSessionTransportV2({
        canonicalIntroSourceRaw: resolved.canonicalIntroRaw,
        canonicalLearnerSourceRaw: resolved.canonicalLearnerRaw,
        canonicalEvaluatorCapsuleRaw: resolved.canonicalEvaluatorCapsuleRaw,
        canonicalAuxiliarySourceRaw: resolved.canonicalAuxiliaryRaw,
      });
    } catch {
      throw new HttpsError("data-loss", "learner_transport_projection_invalid");
    }
    if (
      projection.sourceLearnerFingerprint !== checked.learner.learnerFingerprint ||
      projection.sourceAuxiliaryFingerprint !== checked.auxiliary.auxiliaryFingerprint
    ) throw new HttpsError("data-loss", "transport_projection_mismatch");
    return Object.freeze({
      schemaVersion: V2_COURSE_RELEASED_SESSION_RESPONSE_SCHEMA_V4,
      releaseId: checked.summary.releaseId,
      activeRootFingerprint: checked.summary.activeRootFingerprint,
      activeBaseRootFingerprint: checked.summary.activeBaseRootFingerprint,
      activeHeadFingerprint: checked.summary.activeHeadFingerprint,
      topologyFingerprint: checked.summary.topologyFingerprint,
      lessonId: checked.summary.lessonId,
      lessonOrdinal: checked.summary.lessonOrdinal,
      baseLessonIndexFingerprint: checked.summary.baseLessonIndexFingerprint,
      audioLessonIndexFingerprint: checked.summary.audioLessonIndexFingerprint,
      courseSessionId: checked.summary.courseSessionId,
      sessionOrdinal: checked.summary.sessionOrdinal,
      packageFingerprint: checked.summary.packageFingerprint,
      childSetFingerprint: checked.summary.childSetFingerprint,
      introFingerprint: checked.intro.introFingerprint,
      sourceLearnerFingerprint: projection.sourceLearnerFingerprint,
      learnerProjectionFingerprint: projection.learnerProjectionFingerprint,
      sourceAuxiliaryFingerprint: projection.sourceAuxiliaryFingerprint,
      auxiliaryProjectionFingerprint: projection.auxiliaryProjectionFingerprint,
      evaluatorCapsuleSetFingerprint:
        checked.evaluatorCapsule.capsuleSetFingerprint,
      audioExtensionFingerprint: checked.summary.audioExtensionFingerprint,
      audioFingerprint: checked.audio.audioFingerprint,
      canonicalIntroRaw: resolved.canonicalIntroRaw,
      canonicalLearnerProjectionRaw: projection.canonicalLearnerProjectionRaw,
      canonicalEvaluatorCapsuleRaw: resolved.canonicalEvaluatorCapsuleRaw,
      canonicalAuxiliaryProjectionRaw:
        projection.canonicalAuxiliaryProjectionRaw,
      canonicalAudioChildRaw: resolved.canonicalAudioChildRaw,
      transportAuthority:
        "authenticated_callable_only" as const,
      repositoryOriginProjection:
        "active_v3_composite_text_audio_exact_session_join" as const,
      learnerProjection:
        "canonical_learner_and_auxiliary_wire_projection_v2" as const,
      evaluatorIsolation: "server_sidecar_not_exposed" as const,
      answerPayload: "absent" as const,
      correctnessAuthority: "local_device_only" as const,
      serverAnswerAuthority:
        "none_answers_never_transported_or_rechecked" as const,
      cacheAuthority: "none_client_lkg_is_availability_only" as const,
      playbackPreparation:
        "client_generation_pinned_mp3_prefetch_required_before_session" as const,
      serverRequestPerPlayback: false as const,
      walletAuthority: "none" as const,
      masteryAuthority: "none" as const,
      evidenceAuthority: "none" as const,
      completionAuthority: "none" as const,
      releaseAuthority: false as const,
    });
  };
}

export const learningV2CourseReleasedSessionGetV4 = onCall(
  V2_COURSE_RELEASED_SESSION_CALLABLE_OPTIONS_V4,
  createV2CourseReleasedSessionHandlerV4(),
);
