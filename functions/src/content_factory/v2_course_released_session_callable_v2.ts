import * as admin from "firebase-admin";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { resolveLearningV2ReleaseRolloutV1 } from "../../../modules/learning-v2/content/release_rollout_v1";
import { parseV2ExactLanguageTagV1 } from "../../../modules/learning-v2/contracts/language_tag_v1";
import {
  parseLearningV2CourseSessionAuxiliaryChildV1,
  parseLearningV2CourseSessionIntroChildV1,
  parseLearningV2CourseSessionLearnerChildV1,
} from "../../../modules/learning-v2/runtime/course_session_client_children_v1";
import { parseLearningV2CourseSessionEvaluatorCapsuleChildV1 } from "../../../modules/learning-v2/runtime/course_session_evaluator_capsule_child_v1";
import {
  LEARNING_V2_COURSE_LESSON_COUNT_V1,
  LEARNING_V2_LESSON_SESSION_COUNT_V1,
  learningV2CourseLessonIdV1,
  learningV2CourseSessionIdV1,
} from "../../../modules/learning-v2/content/course_topology_v1";
import { resolveStableUidForAuth } from "../auth_identity";
import {
  createFirebaseAdminV2CourseReleasedSessionAdapterV2,
  resolveV2CourseReleasedSessionLearnerMaterialV2,
  type V2CourseReleasedSessionSummaryV2,
} from "./v2_course_released_session_adapter_v2";
import { createFirebaseAdminV2UnifiedCourseReleaseRepositoryV2 } from "./v2_unified_course_release_repository_v2";

export const V2_COURSE_RELEASED_SESSION_RESPONSE_SCHEMA_V2 =
  "v2-course-released-session-response.v2" as const;

export const V2_COURSE_RELEASED_SESSION_CALLABLE_OPTIONS_V2 = Object.freeze({
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

export interface V2CourseReleasedSessionRequestV2 {
  readonly environment: "lab" | "staging" | "production";
  readonly targetLanguage: string;
  readonly studyTarget: string;
  readonly learnerSourceLocale: string;
  readonly seasonId: string;
  readonly expectedActiveRootFingerprint: string | null;
  readonly lessonOrdinal: number;
  readonly sessionOrdinal: number;
}

export interface V2CourseReleasedSessionResponseV2 {
  readonly schemaVersion: typeof V2_COURSE_RELEASED_SESSION_RESPONSE_SCHEMA_V2;
  readonly releaseId: string;
  readonly activeRootFingerprint: string;
  readonly activeHeadFingerprint: string;
  readonly topologyFingerprint: string;
  readonly lessonId: string;
  readonly lessonOrdinal: number;
  readonly lessonIndexFingerprint: string;
  readonly courseSessionId: string;
  readonly sessionOrdinal: number;
  readonly packageFingerprint: string;
  readonly childSetFingerprint: string;
  readonly introFingerprint: string;
  readonly learnerFingerprint: string;
  readonly auxiliaryFingerprint: string;
  readonly evaluatorCapsuleSetFingerprint: string;
  readonly canonicalIntroRaw: string;
  readonly canonicalLearnerRaw: string;
  readonly canonicalEvaluatorCapsuleRaw: string;
  readonly canonicalAuxiliaryRaw: string;
  readonly transportAuthority: "firebase_callable_auth_and_app_check_boundary";
  readonly repositoryOriginProjection: "active_v2_32x56_release_exact_session_join";
  readonly learnerProjection: "intro_learner_capsule_auxiliary_only";
  readonly evaluatorIsolation: "server_sidecar_not_exposed";
  readonly cacheAuthority: "none_client_lkg_is_availability_only";
  readonly walletAuthority: "none";
  readonly masteryAuthority: "none";
  readonly evidenceAuthority: "none";
  readonly completionAuthority: "none";
  readonly releaseAuthority: false;
}

export type V2CourseReleasedSessionResolvedV2 = Readonly<{
  summary: V2CourseReleasedSessionSummaryV2;
  canonicalIntroRaw: string;
  canonicalLearnerRaw: string;
  canonicalEvaluatorCapsuleRaw: string;
  canonicalAuxiliaryRaw: string;
}>;

export type V2CourseReleasedSessionResolverV2 = (
  input: V2CourseReleasedSessionRequestV2,
  stableAccountId: string,
) => Promise<V2CourseReleasedSessionResolvedV2>;

const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const REQUEST_KEYS = Object.freeze([
  "environment",
  "expectedActiveRootFingerprint",
  "learnerSourceLocale",
  "lessonOrdinal",
  "seasonId",
  "sessionOrdinal",
  "studyTarget",
  "targetLanguage",
] as const);

function exactPlainRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function invalidArgument(): never {
  throw new HttpsError("invalid-argument", "course_session_request_invalid");
}

export function parseV2CourseReleasedSessionRequestV2(
  value: unknown,
): V2CourseReleasedSessionRequestV2 {
  if (!exactPlainRecord(value)) invalidArgument();
  const keys = Object.keys(value).sort();
  const expected = [...REQUEST_KEYS].sort();
  if (
    keys.length !== expected.length ||
    keys.some((key, index) => key !== expected[index]) ||
    !["lab", "staging", "production"].includes(String(value.environment)) ||
    typeof value.targetLanguage !== "string" ||
    parseV2ExactLanguageTagV1(value.targetLanguage) === null ||
    typeof value.studyTarget !== "string" ||
    parseV2ExactLanguageTagV1(value.studyTarget) === null ||
    typeof value.learnerSourceLocale !== "string" ||
    parseV2ExactLanguageTagV1(value.learnerSourceLocale) === null ||
    typeof value.seasonId !== "string" ||
    !ID_RE.test(value.seasonId) ||
    !(
      value.expectedActiveRootFingerprint === null ||
      (typeof value.expectedActiveRootFingerprint === "string" &&
        HASH_RE.test(value.expectedActiveRootFingerprint))
    ) ||
    !Number.isSafeInteger(value.lessonOrdinal) ||
    Number(value.lessonOrdinal) < 1 ||
    Number(value.lessonOrdinal) > LEARNING_V2_COURSE_LESSON_COUNT_V1 ||
    !Number.isSafeInteger(value.sessionOrdinal) ||
    Number(value.sessionOrdinal) < 1 ||
    Number(value.sessionOrdinal) > LEARNING_V2_LESSON_SESSION_COUNT_V1
  )
    invalidArgument();
  return Object.freeze({
    environment:
      value.environment as V2CourseReleasedSessionRequestV2["environment"],
    targetLanguage: value.targetLanguage,
    studyTarget: value.studyTarget,
    learnerSourceLocale: value.learnerSourceLocale,
    seasonId: value.seasonId,
    expectedActiveRootFingerprint: value.expectedActiveRootFingerprint as
      | string
      | null,
    lessonOrdinal: Number(value.lessonOrdinal),
    sessionOrdinal: Number(value.sessionOrdinal),
  });
}

export function resolveV2CourseReleasedServerEnvironmentV2(): V2CourseReleasedSessionRequestV2["environment"] {
  const projectId = String(process.env.GCLOUD_PROJECT ?? "");
  if (
    process.env.FUNCTIONS_EMULATOR === "true" &&
    projectId.startsWith("demo-")
  )
    return "lab";
  if (projectId === "phraseman-ea0b3") return "production";
  throw new HttpsError(
    "failed-precondition",
    "release_environment_unavailable",
  );
}

export async function resolveV2CourseReleasedSessionFromAuthenticatedRepositoryV2(
  input: V2CourseReleasedSessionRequestV2,
  stableAccountId: string,
): Promise<V2CourseReleasedSessionResolvedV2> {
  if (input.environment !== resolveV2CourseReleasedServerEnvironmentV2())
    throw new HttpsError("failed-precondition", "release_environment_mismatch");
  const repository = createFirebaseAdminV2UnifiedCourseReleaseRepositoryV2();
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
  const adapter = createFirebaseAdminV2CourseReleasedSessionAdapterV2();
  const handle = await adapter.load({
    activeHandle: active.activeHandle,
    lessonOrdinal: input.lessonOrdinal,
    sessionOrdinal: input.sessionOrdinal,
  });
  const material = resolveV2CourseReleasedSessionLearnerMaterialV2(handle);
  return Object.freeze({
    summary: material.summary,
    canonicalIntroRaw: material.learner.introRaw,
    canonicalLearnerRaw: material.learner.learnerRaw,
    canonicalEvaluatorCapsuleRaw: material.learner.evaluatorCapsuleRaw,
    canonicalAuxiliaryRaw: material.learner.auxiliaryRaw,
  });
}

function exactResolved(
  input: V2CourseReleasedSessionRequestV2,
  resolved: V2CourseReleasedSessionResolvedV2,
) {
  let intro;
  let learner;
  let evaluatorCapsule;
  let auxiliary;
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
  } catch {
    throw new HttpsError("data-loss", "course_session_projection_invalid");
  }
  const summary = resolved.summary;
  const lessonId = learningV2CourseLessonIdV1(input.lessonOrdinal);
  const courseSessionId = learningV2CourseSessionIdV1(
    input.lessonOrdinal,
    input.sessionOrdinal,
  );
  if (
    !HASH_RE.test(summary.activeRootFingerprint) ||
    !HASH_RE.test(summary.activeHeadFingerprint) ||
    !HASH_RE.test(summary.topologyFingerprint) ||
    !HASH_RE.test(summary.lessonIndexFingerprint) ||
    !HASH_RE.test(summary.packageFingerprint) ||
    !HASH_RE.test(summary.childSetFingerprint) ||
    summary.lessonId !== lessonId ||
    summary.lessonOrdinal !== input.lessonOrdinal ||
    summary.courseSessionId !== courseSessionId ||
    summary.sessionOrdinal !== input.sessionOrdinal ||
    summary.learnerProjection !== "intro_learner_capsule_auxiliary_only" ||
    summary.evaluatorIsolation !== "server_sidecar_not_exposed" ||
    (input.expectedActiveRootFingerprint !== null &&
      summary.activeRootFingerprint !== input.expectedActiveRootFingerprint) ||
    intro.courseSessionId !== courseSessionId ||
    learner.courseSessionId !== courseSessionId ||
    evaluatorCapsule.courseSessionId !== courseSessionId ||
    auxiliary.courseSessionId !== courseSessionId
  )
    throw new HttpsError("data-loss", "course_session_projection_mismatch");
  return Object.freeze({
    summary,
    intro,
    learner,
    evaluatorCapsule,
    auxiliary,
  });
}

export function createV2CourseReleasedSessionHandlerV2(
  resolve: V2CourseReleasedSessionResolverV2 = resolveV2CourseReleasedSessionFromAuthenticatedRepositoryV2,
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
  ): Promise<V2CourseReleasedSessionResponseV2> => {
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
    let resolved: V2CourseReleasedSessionResolvedV2;
    try {
      resolved = await resolve(input, stableAccountId);
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("unavailable", "course_session_unavailable");
    }
    const checked = exactResolved(input, resolved);
    return Object.freeze({
      schemaVersion: V2_COURSE_RELEASED_SESSION_RESPONSE_SCHEMA_V2,
      releaseId: checked.summary.releaseId,
      activeRootFingerprint: checked.summary.activeRootFingerprint,
      activeHeadFingerprint: checked.summary.activeHeadFingerprint,
      topologyFingerprint: checked.summary.topologyFingerprint,
      lessonId: checked.summary.lessonId,
      lessonOrdinal: checked.summary.lessonOrdinal,
      lessonIndexFingerprint: checked.summary.lessonIndexFingerprint,
      courseSessionId: checked.summary.courseSessionId,
      sessionOrdinal: checked.summary.sessionOrdinal,
      packageFingerprint: checked.summary.packageFingerprint,
      childSetFingerprint: checked.summary.childSetFingerprint,
      introFingerprint: checked.intro.introFingerprint,
      learnerFingerprint: checked.learner.learnerFingerprint,
      auxiliaryFingerprint: checked.auxiliary.auxiliaryFingerprint,
      evaluatorCapsuleSetFingerprint:
        checked.evaluatorCapsule.capsuleSetFingerprint,
      canonicalIntroRaw: resolved.canonicalIntroRaw,
      canonicalLearnerRaw: resolved.canonicalLearnerRaw,
      canonicalEvaluatorCapsuleRaw: resolved.canonicalEvaluatorCapsuleRaw,
      canonicalAuxiliaryRaw: resolved.canonicalAuxiliaryRaw,
      transportAuthority:
        "firebase_callable_auth_and_app_check_boundary" as const,
      repositoryOriginProjection:
        "active_v2_32x56_release_exact_session_join" as const,
      learnerProjection: "intro_learner_capsule_auxiliary_only" as const,
      evaluatorIsolation: "server_sidecar_not_exposed" as const,
      cacheAuthority: "none_client_lkg_is_availability_only" as const,
      walletAuthority: "none" as const,
      masteryAuthority: "none" as const,
      evidenceAuthority: "none" as const,
      completionAuthority: "none" as const,
      releaseAuthority: false as const,
    });
  };
}

export const learningV2CourseReleasedSessionGetV2 = onCall(
  V2_COURSE_RELEASED_SESSION_CALLABLE_OPTIONS_V2,
  createV2CourseReleasedSessionHandlerV2(),
);
