import * as admin from "firebase-admin";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { resolveLearningV2ReleaseRolloutV1 } from "../../../modules/learning-v2/content/release_rollout_v1";
import {
  parseLearningV2CourseSessionAuxiliaryChildV1,
  parseLearningV2CourseSessionIntroChildV1,
  parseLearningV2CourseSessionLearnerChildV1,
} from "../../../modules/learning-v2/runtime/course_session_client_children_v1";
import { parseLearningV2CourseSessionEvaluatorCapsuleChildV1 } from "../../../modules/learning-v2/runtime/course_session_evaluator_capsule_child_v1";
import { parseLearningV2CourseSessionAudioChildV1 } from "../../../modules/learning-v2/runtime/course_session_audio_child_v1";
import {
  learningV2CourseLessonIdV1,
  learningV2CourseSessionIdV1,
} from "../../../modules/learning-v2/content/course_topology_v1";
import { resolveStableUidForAuth } from "../auth_identity";
import {
  createFirebaseAdminV2CourseReleasedSessionAdapterV3,
  resolveV2CourseReleasedSessionLearnerMaterialV3,
  type V2CourseReleasedSessionSummaryV3,
} from "./v2_course_released_session_adapter_v3";
import {
  parseV2CourseReleasedSessionRequestV2,
  resolveV2CourseReleasedServerEnvironmentV2,
  type V2CourseReleasedSessionRequestV2,
} from "./v2_course_released_session_callable_v2";
import { createFirebaseAdminV2UnifiedCourseReleaseRepositoryV3 } from "./v2_unified_course_release_repository_v3";

export const V2_COURSE_RELEASED_SESSION_RESPONSE_SCHEMA_V3 =
  "v2-course-released-session-response.v3" as const;

export const V2_COURSE_RELEASED_SESSION_CALLABLE_OPTIONS_V3 = Object.freeze({
  region: "us-central1",
  enforceAppCheck: !(
    process.env.FUNCTIONS_EMULATOR === "true" &&
    process.env.GCLOUD_PROJECT?.startsWith("demo-") === true &&
    process.env.V2_COURSE_RELEASE_ALLOW_INSECURE_APP_CHECK_EMULATOR === "true"
  ),
  timeoutSeconds: 30,
  memory: "512MiB" as const,
  maxInstances: 40,
});

export interface V2CourseReleasedSessionResponseV3 {
  readonly schemaVersion: typeof V2_COURSE_RELEASED_SESSION_RESPONSE_SCHEMA_V3;
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
  readonly learnerFingerprint: string;
  readonly auxiliaryFingerprint: string;
  readonly evaluatorCapsuleSetFingerprint: string;
  readonly audioExtensionFingerprint: string;
  readonly audioFingerprint: string;
  readonly canonicalIntroRaw: string;
  readonly canonicalLearnerRaw: string;
  readonly canonicalEvaluatorCapsuleRaw: string;
  readonly canonicalAuxiliaryRaw: string;
  readonly canonicalAudioChildRaw: string;
  readonly transportAuthority: "firebase_callable_auth_and_app_check_boundary";
  readonly repositoryOriginProjection: "active_v3_composite_text_audio_exact_session_join";
  readonly learnerProjection: "intro_learner_capsule_auxiliary_audio_child_only";
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

export type V2CourseReleasedSessionResolvedV3 = Readonly<{
  summary: V2CourseReleasedSessionSummaryV3;
  canonicalIntroRaw: string;
  canonicalLearnerRaw: string;
  canonicalEvaluatorCapsuleRaw: string;
  canonicalAuxiliaryRaw: string;
  canonicalAudioChildRaw: string;
}>;

export type V2CourseReleasedSessionResolverV3 = (
  input: V2CourseReleasedSessionRequestV2,
  stableAccountId: string,
) => Promise<V2CourseReleasedSessionResolvedV3>;

const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;

export async function resolveV2CourseReleasedSessionFromAuthenticatedRepositoryV3(
  input: V2CourseReleasedSessionRequestV2,
  stableAccountId: string,
): Promise<V2CourseReleasedSessionResolvedV3> {
  if (input.environment !== resolveV2CourseReleasedServerEnvironmentV2())
    throw new HttpsError("failed-precondition", "release_environment_mismatch");
  const repository = createFirebaseAdminV2UnifiedCourseReleaseRepositoryV3();
  const active = await repository.readActive({
    environment: input.environment,
    seasonId: input.seasonId,
    targetLanguage: input.targetLanguage,
    studyTarget: input.studyTarget,
    learnerSourceLocale: input.learnerSourceLocale,
  });
  const rollout = resolveLearningV2ReleaseRolloutV1({
    pointer: { rollout: active.root.rollout },
    stableAccountId,
  });
  if (!rollout.eligible)
    throw new HttpsError("permission-denied", "release_cohort_ineligible");
  if (
    input.expectedActiveRootFingerprint !== null &&
    input.expectedActiveRootFingerprint !== active.root.rootFingerprint
  )
    throw new HttpsError("failed-precondition", "active_release_changed");
  const adapter = createFirebaseAdminV2CourseReleasedSessionAdapterV3();
  const handle = await adapter.load({
    activeHandle: active.activeHandle,
    lessonOrdinal: input.lessonOrdinal,
    sessionOrdinal: input.sessionOrdinal,
  });
  const material = resolveV2CourseReleasedSessionLearnerMaterialV3(handle);
  return Object.freeze({
    summary: material.summary,
    canonicalIntroRaw: material.base.learner.introRaw,
    canonicalLearnerRaw: material.base.learner.learnerRaw,
    canonicalEvaluatorCapsuleRaw: material.base.learner.evaluatorCapsuleRaw,
    canonicalAuxiliaryRaw: material.base.learner.auxiliaryRaw,
    canonicalAudioChildRaw: material.canonicalAudioChildRaw,
  });
}

function exactResolved(
  input: V2CourseReleasedSessionRequestV2,
  resolved: V2CourseReleasedSessionResolvedV3,
) {
  let intro;
  let learner;
  let evaluatorCapsule;
  let auxiliary;
  let audio;
  try {
    intro = parseLearningV2CourseSessionIntroChildV1(
      resolved.canonicalIntroRaw,
    );
    learner = parseLearningV2CourseSessionLearnerChildV1(
      resolved.canonicalLearnerRaw,
    );
    evaluatorCapsule = parseLearningV2CourseSessionEvaluatorCapsuleChildV1(
      resolved.canonicalEvaluatorCapsuleRaw,
    );
    auxiliary = parseLearningV2CourseSessionAuxiliaryChildV1(
      resolved.canonicalAuxiliaryRaw,
    );
    audio = parseLearningV2CourseSessionAudioChildV1(
      resolved.canonicalAudioChildRaw,
      learner,
    );
  } catch {
    throw new HttpsError("data-loss", "course_session_projection_invalid");
  }
  const summary = resolved.summary;
  const lessonId = learningV2CourseLessonIdV1(input.lessonOrdinal);
  const courseSessionId = learningV2CourseSessionIdV1(
    input.lessonOrdinal,
    input.sessionOrdinal,
  );
  const hashes = [
    summary.activeRootFingerprint,
    summary.activeBaseRootFingerprint,
    summary.activeHeadFingerprint,
    summary.topologyFingerprint,
    summary.baseLessonIndexFingerprint,
    summary.audioLessonIndexFingerprint,
    summary.packageFingerprint,
    summary.childSetFingerprint,
    summary.audioExtensionFingerprint,
    summary.audioFingerprint,
  ];
  if (
    hashes.some((value) => !HASH_RE.test(value)) ||
    summary.lessonId !== lessonId ||
    summary.lessonOrdinal !== input.lessonOrdinal ||
    summary.courseSessionId !== courseSessionId ||
    summary.sessionOrdinal !== input.sessionOrdinal ||
    summary.learnerProjection !==
      "intro_learner_capsule_auxiliary_audio_child_only" ||
    summary.evaluatorIsolation !== "server_sidecar_not_exposed" ||
    summary.answerPayload !== "absent" ||
    summary.correctnessAuthority !== "local_device_only" ||
    summary.serverAnswerAuthority !==
      "none_answers_never_transported_or_rechecked" ||
    summary.serverRequestPerPlayback !== false ||
    (input.expectedActiveRootFingerprint !== null &&
      summary.activeRootFingerprint !== input.expectedActiveRootFingerprint) ||
    intro.courseSessionId !== courseSessionId ||
    learner.courseSessionId !== courseSessionId ||
    evaluatorCapsule.courseSessionId !== courseSessionId ||
    auxiliary.courseSessionId !== courseSessionId ||
    audio.courseSessionId !== courseSessionId ||
    audio.learnerFingerprint !== learner.learnerFingerprint ||
    audio.audioFingerprint !== summary.audioFingerprint
  )
    throw new HttpsError("data-loss", "course_session_projection_mismatch");
  return Object.freeze({
    summary,
    intro,
    learner,
    evaluatorCapsule,
    auxiliary,
    audio,
  });
}

export function createV2CourseReleasedSessionHandlerV3(
  resolve: V2CourseReleasedSessionResolverV3 = resolveV2CourseReleasedSessionFromAuthenticatedRepositoryV3,
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
  ): Promise<V2CourseReleasedSessionResponseV3> => {
    if (
      typeof request.auth?.uid !== "string" ||
      request.auth.uid.length < 1 ||
      request.auth.uid.length > 128
    )
      throw new HttpsError("unauthenticated", "authentication_required");
    const input = parseV2CourseReleasedSessionRequestV2(request.data);
    let stableAccountId: string;
    try {
      stableAccountId = await resolveStableAccountId(request.auth.uid);
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      throw new HttpsError(
        "failed-precondition",
        "stable_identity_unavailable",
      );
    }
    if (!ID_RE.test(stableAccountId))
      throw new HttpsError(
        "failed-precondition",
        "stable_identity_unavailable",
      );
    let resolved: V2CourseReleasedSessionResolvedV3;
    try {
      resolved = await resolve(input, stableAccountId);
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("unavailable", "course_session_unavailable");
    }
    const checked = exactResolved(input, resolved);
    return Object.freeze({
      schemaVersion: V2_COURSE_RELEASED_SESSION_RESPONSE_SCHEMA_V3,
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
      learnerFingerprint: checked.learner.learnerFingerprint,
      auxiliaryFingerprint: checked.auxiliary.auxiliaryFingerprint,
      evaluatorCapsuleSetFingerprint:
        checked.evaluatorCapsule.capsuleSetFingerprint,
      audioExtensionFingerprint: checked.summary.audioExtensionFingerprint,
      audioFingerprint: checked.audio.audioFingerprint,
      canonicalIntroRaw: resolved.canonicalIntroRaw,
      canonicalLearnerRaw: resolved.canonicalLearnerRaw,
      canonicalEvaluatorCapsuleRaw: resolved.canonicalEvaluatorCapsuleRaw,
      canonicalAuxiliaryRaw: resolved.canonicalAuxiliaryRaw,
      canonicalAudioChildRaw: resolved.canonicalAudioChildRaw,
      transportAuthority:
        "firebase_callable_auth_and_app_check_boundary" as const,
      repositoryOriginProjection:
        "active_v3_composite_text_audio_exact_session_join" as const,
      learnerProjection:
        "intro_learner_capsule_auxiliary_audio_child_only" as const,
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

export const learningV2CourseReleasedSessionGetV3 = onCall(
  V2_COURSE_RELEASED_SESSION_CALLABLE_OPTIONS_V3,
  createV2CourseReleasedSessionHandlerV3(),
);
