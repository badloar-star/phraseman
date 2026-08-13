import * as admin from "firebase-admin";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import type { V2ReleaseEnvironment } from "../../../modules/learning-v2/content/release_manifest";
import { resolveLearningV2ReleaseRolloutV1 } from "../../../modules/learning-v2/content/release_rollout_v1";
import {
  getLearningV2ActivityReleasedSessionPackageSummaryV1,
  materializeLearningV2ActivityReleasedSessionPackageV1,
  parseLearningV2ActivityReleasedSessionPackageV1,
} from "../../../modules/learning-v2/runtime/activity_released_session_package_v1";
import { parseLearningV2ActivityAuxiliaryClientDescriptorV1 } from "../../../modules/learning-v2/runtime/activity_auxiliary_client_descriptor_v1";
import { resolveStableUidForAuth } from "../auth_identity";
import {
  createFirebaseAdminV2ActivityAuxiliaryReleaseAdapterV1,
  getV2FirebaseActivityAuxiliaryReleaseSummaryV1,
} from "./v2_firebase_activity_auxiliary_release_adapter_v1";
import {
  createFirebaseAdminV2ActivityLearnerCoreReleaseAdapterV1,
  getV2FirebaseActivityLearnerCoreReleaseSummaryV1,
} from "./v2_firebase_activity_learner_core_release_adapter_v1";
import {
  createFirebaseAdminV2ActivityServerEvaluatorReleaseAdapterV1,
  getV2FirebaseActivityServerEvaluatorReleaseSummaryV1,
} from "./v2_firebase_activity_server_evaluator_release_adapter_v1";
import {
  createFirebaseAdminV2UnifiedCourseReleaseRepositoryV1,
  type V2UnifiedCourseReleaseActiveHandleV1,
} from "./v2_unified_course_release_repository_v1";

export const V2_ACTIVITY_RELEASED_SESSION_RESPONSE_SCHEMA_V1 =
  "v2-activity-released-session-response.v1" as const;

export const V2_ACTIVITY_RELEASED_SESSION_CALLABLE_OPTIONS_V1 = Object.freeze({
  region: "us-central1",
  enforceAppCheck: !(
    process.env.FUNCTIONS_EMULATOR === "true" &&
    process.env.GCLOUD_PROJECT?.startsWith("demo-") === true &&
    process.env.V2_ACTIVITY_AUXILIARY_ALLOW_INSECURE_APP_CHECK_EMULATOR ===
      "true"
  ),
  timeoutSeconds: 30,
  memory: "512MiB" as const,
  maxInstances: 40,
});

export interface V2ActivityReleasedSessionRequestV1 {
  readonly environment: V2ReleaseEnvironment;
  readonly studyTarget: string;
  readonly learnerSourceLocale: string;
  readonly seasonId: string;
  readonly expectedActiveManifestHash: string | null;
  readonly episodeId: string;
  readonly sessionOrdinal: number;
}

export interface V2ActivityReleasedSessionResponseV1 {
  readonly schemaVersion: typeof V2_ACTIVITY_RELEASED_SESSION_RESPONSE_SCHEMA_V1;
  readonly activeManifestHash: string;
  readonly unifiedReleaseId: string;
  readonly unifiedRootFingerprint: string;
  readonly episodeId: string;
  readonly sessionId: string;
  readonly sessionOrdinal: number;
  readonly activityPackageFingerprint: string;
  readonly auxiliaryIndexFingerprint: string;
  readonly descriptorFingerprint: string;
  readonly sourceFingerprint: string;
  readonly renderFingerprint: string;
  readonly capsuleEnvelopeFingerprint: string;
  readonly packageFingerprint: string;
  readonly canonicalPackageRaw: string;
  readonly transportAuthority: "firebase_callable_auth_and_app_check_boundary";
  readonly repositoryOriginProjection: "joined_unified_active_release_learner_evaluator_auxiliary";
  readonly localFeedbackAuthority: "local_provisional_only";
  readonly walletAuthority: "none";
  readonly masteryAuthority: "none";
  readonly evidenceAuthority: "none";
  readonly completionAuthority: "none";
  readonly releaseAuthority: false;
}

export type V2ActivityReleasedSessionResolvedV1 = Readonly<{
  activeManifestHash: string;
  unifiedReleaseId: string;
  unifiedRootFingerprint: string;
  auxiliaryIndexFingerprint: string;
  canonicalPackageRaw: string;
}>;

export type V2ActivityReleasedSessionResolverV1 = (
  input: V2ActivityReleasedSessionRequestV1,
  stableAccountId: string,
) => Promise<V2ActivityReleasedSessionResolvedV1>;

export function assertV2UnifiedActivityReleaseJoinV1(input: {
  readonly unifiedReleaseId: string;
  readonly unifiedEpisode: Readonly<{
    episodeId: string;
    stageId: string;
    activityPackageFingerprint: string;
    learnerCoreIndexFingerprint: string;
    serverEvaluatorIndexFingerprint: string;
    auxiliaryIndexFingerprint: string;
  }>;
  readonly learnerCore: Readonly<{
    environment: V2ReleaseEnvironment;
    releaseId: string;
    activeManifestHash: string;
    seasonId: string;
    episodeId: string;
    stageId: string;
    activityPackageFingerprint: string;
    indexFingerprint: string;
  }>;
  readonly evaluator: Readonly<{
    environment: V2ReleaseEnvironment;
    releaseId: string;
    activeManifestHash: string;
    seasonId: string;
    episodeId: string;
    stageId: string;
    activityPackageFingerprint: string;
    indexFingerprint: string;
  }>;
  readonly auxiliary: Readonly<{
    environment: V2ReleaseEnvironment;
    releaseId: string;
    activeManifestHash: string;
    seasonId: string;
    episodeId: string;
    stageId: string;
    activityPackageFingerprint: string;
    indexFingerprint: string;
  }>;
}): void {
  const { learnerCore, evaluator, auxiliary, unifiedEpisode } = input;
  if (
    auxiliary.environment !== learnerCore.environment ||
    auxiliary.releaseId !== learnerCore.releaseId ||
    auxiliary.activeManifestHash !== learnerCore.activeManifestHash ||
    auxiliary.seasonId !== learnerCore.seasonId ||
    auxiliary.episodeId !== learnerCore.episodeId ||
    auxiliary.stageId !== learnerCore.stageId ||
    auxiliary.activityPackageFingerprint !==
      learnerCore.activityPackageFingerprint ||
    evaluator.environment !== learnerCore.environment ||
    evaluator.releaseId !== learnerCore.releaseId ||
    evaluator.activeManifestHash !== learnerCore.activeManifestHash ||
    evaluator.seasonId !== learnerCore.seasonId ||
    evaluator.episodeId !== learnerCore.episodeId ||
    evaluator.stageId !== learnerCore.stageId ||
    evaluator.activityPackageFingerprint !==
      learnerCore.activityPackageFingerprint ||
    input.unifiedReleaseId !== learnerCore.releaseId ||
    unifiedEpisode.episodeId !== learnerCore.episodeId ||
    unifiedEpisode.stageId !== learnerCore.stageId ||
    unifiedEpisode.activityPackageFingerprint !==
      learnerCore.activityPackageFingerprint ||
    unifiedEpisode.learnerCoreIndexFingerprint !==
      learnerCore.indexFingerprint ||
    unifiedEpisode.serverEvaluatorIndexFingerprint !==
      evaluator.indexFingerprint ||
    unifiedEpisode.auxiliaryIndexFingerprint !== auxiliary.indexFingerprint
  )
    throw new HttpsError("data-loss", "activity_release_join_mismatch");
}

export async function loadV2ActivityReleaseHandlesFromUnifiedRootV1(input: {
  readonly activeHandle: V2UnifiedCourseReleaseActiveHandleV1;
  readonly episodeId: string;
  readonly auxiliary: Pick<
    ReturnType<typeof createFirebaseAdminV2ActivityAuxiliaryReleaseAdapterV1>,
    "load" | "loadPinned"
  >;
  readonly learnerCore: Pick<
    ReturnType<typeof createFirebaseAdminV2ActivityLearnerCoreReleaseAdapterV1>,
    "load" | "loadPinned"
  >;
  readonly evaluator: Pick<
    ReturnType<
      typeof createFirebaseAdminV2ActivityServerEvaluatorReleaseAdapterV1
    >,
    "load" | "loadPinned"
  >;
}) {
  const [auxiliaryHandle, learnerCoreHandle, evaluatorHandle] =
    await Promise.all([
      input.auxiliary.loadPinned(input.activeHandle, input.episodeId),
      input.learnerCore.loadPinned(input.activeHandle, input.episodeId),
      input.evaluator.loadPinned(input.activeHandle, input.episodeId),
    ]);
  return Object.freeze({ auxiliaryHandle, learnerCoreHandle, evaluatorHandle });
}

const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const CODE_RE = /^[a-z]{2,12}(?:-[A-Z]{2})?$/u;

function invalidArgument(): never {
  throw new HttpsError("invalid-argument", "activity_session_request_invalid");
}

function parseRequest(value: unknown): V2ActivityReleasedSessionRequestV1 {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  )
    invalidArgument();
  const row = value as Record<string, unknown>;
  if (
    Object.keys(row).sort().join("|") !==
      "environment|episodeId|expectedActiveManifestHash|learnerSourceLocale|seasonId|sessionOrdinal|studyTarget" ||
    !["lab", "staging", "production"].includes(String(row.environment)) ||
    typeof row.studyTarget !== "string" ||
    !CODE_RE.test(row.studyTarget) ||
    typeof row.learnerSourceLocale !== "string" ||
    !CODE_RE.test(row.learnerSourceLocale) ||
    typeof row.seasonId !== "string" ||
    !ID_RE.test(row.seasonId) ||
    typeof row.episodeId !== "string" ||
    !ID_RE.test(row.episodeId) ||
    !(
      row.expectedActiveManifestHash === null ||
      (typeof row.expectedActiveManifestHash === "string" &&
        HASH_RE.test(row.expectedActiveManifestHash))
    ) ||
    !Number.isSafeInteger(row.sessionOrdinal) ||
    Number(row.sessionOrdinal) < 1 ||
    Number(row.sessionOrdinal) > 12
  )
    invalidArgument();
  return Object.freeze({
    environment: row.environment as V2ReleaseEnvironment,
    studyTarget: row.studyTarget,
    learnerSourceLocale: row.learnerSourceLocale,
    seasonId: row.seasonId,
    expectedActiveManifestHash: row.expectedActiveManifestHash,
    episodeId: row.episodeId,
    sessionOrdinal: Number(row.sessionOrdinal),
  });
}

export function resolveV2ActivityReleasedServerEnvironmentV1(): V2ReleaseEnvironment {
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

export async function resolveV2ActivityReleasedSessionFromAuthenticatedRepositoryV1(
  input: V2ActivityReleasedSessionRequestV1,
  stableAccountId: string,
): Promise<V2ActivityReleasedSessionResolvedV1> {
  if (input.environment !== resolveV2ActivityReleasedServerEnvironmentV1()) {
    throw new HttpsError("failed-precondition", "release_environment_mismatch");
  }
  const unifiedRepository =
    createFirebaseAdminV2UnifiedCourseReleaseRepositoryV1();
  const unified = await unifiedRepository.readActive({
    environment: input.environment,
    seasonId: input.seasonId,
    studyTarget: input.studyTarget,
    learnerSourceLocale: input.learnerSourceLocale,
  });
  const unifiedEpisode = unified.root.episodes.find(
    (episode) => episode.episodeId === input.episodeId,
  );
  if (!unifiedEpisode)
    throw new HttpsError("not-found", "activity_release_episode_missing");
  const auxiliaryAdapter =
    createFirebaseAdminV2ActivityAuxiliaryReleaseAdapterV1();
  const learnerCoreAdapter =
    createFirebaseAdminV2ActivityLearnerCoreReleaseAdapterV1();
  const evaluatorAdapter =
    createFirebaseAdminV2ActivityServerEvaluatorReleaseAdapterV1();
  const { auxiliaryHandle, learnerCoreHandle, evaluatorHandle } =
    await loadV2ActivityReleaseHandlesFromUnifiedRootV1({
      activeHandle: unified.activeHandle,
      episodeId: input.episodeId,
      auxiliary: auxiliaryAdapter,
      learnerCore: learnerCoreAdapter,
      evaluator: evaluatorAdapter,
    });
  const auxiliarySummary =
    getV2FirebaseActivityAuxiliaryReleaseSummaryV1(auxiliaryHandle);
  const learnerCoreSummary =
    getV2FirebaseActivityLearnerCoreReleaseSummaryV1(learnerCoreHandle);
  const evaluatorSummary =
    getV2FirebaseActivityServerEvaluatorReleaseSummaryV1(evaluatorHandle);
  assertV2UnifiedActivityReleaseJoinV1({
    unifiedReleaseId: unified.root.releaseId,
    unifiedEpisode,
    learnerCore: learnerCoreSummary,
    evaluator: evaluatorSummary,
    auxiliary: auxiliarySummary,
  });
  const rollout = resolveLearningV2ReleaseRolloutV1({
    pointer: {
      rollout: unified.root.rollout,
    },
    stableAccountId,
  });
  if (!rollout.eligible) {
    throw new HttpsError("permission-denied", "release_cohort_ineligible");
  }
  if (
    input.expectedActiveManifestHash !== null &&
    auxiliarySummary.activeManifestHash !== input.expectedActiveManifestHash
  ) {
    throw new HttpsError("failed-precondition", "active_release_changed");
  }
  const [canonicalDescriptorRaw, learnerCoreSession] = await Promise.all([
    auxiliaryAdapter.projectSessionDescriptor(
      auxiliaryHandle,
      input.sessionOrdinal,
    ),
    learnerCoreAdapter.resolveSession(learnerCoreHandle, input.sessionOrdinal),
  ]);
  const descriptor = parseLearningV2ActivityAuxiliaryClientDescriptorV1(
    canonicalDescriptorRaw,
  );
  if (
    descriptor.environment !== input.environment ||
    descriptor.studyTarget !== input.studyTarget ||
    descriptor.learnerSourceLocale !== input.learnerSourceLocale ||
    descriptor.seasonId !== input.seasonId ||
    descriptor.activeManifestHash !== auxiliarySummary.activeManifestHash ||
    descriptor.episodeId !== input.episodeId ||
    descriptor.sessionId !== learnerCoreSession.sessionId ||
    descriptor.sessionOrdinal !== input.sessionOrdinal ||
    descriptor.activityPackageFingerprint !==
      learnerCoreSession.activityPackageFingerprint ||
    descriptor.activityPackageFingerprint !==
      auxiliarySummary.activityPackageFingerprint ||
    descriptor.auxiliaryIndexFingerprint !==
      auxiliarySummary.indexFingerprint ||
    descriptor.sourceFingerprint !== learnerCoreSession.sourceFingerprint ||
    descriptor.renderFingerprint !== learnerCoreSession.renderFingerprint
  )
    throw new HttpsError("data-loss", "activity_release_session_mismatch");
  const canonicalPackageRaw =
    materializeLearningV2ActivityReleasedSessionPackageV1({
      descriptor,
      renderRaw: learnerCoreSession.renderRaw,
      capsuleEnvelopeRaw: learnerCoreSession.capsuleEnvelopeRaw,
    });
  return Object.freeze({
    activeManifestHash: auxiliarySummary.activeManifestHash,
    unifiedReleaseId: unified.root.releaseId,
    unifiedRootFingerprint: unified.root.rootFingerprint,
    auxiliaryIndexFingerprint: auxiliarySummary.indexFingerprint,
    canonicalPackageRaw,
  });
}

function exactResolved(
  input: V2ActivityReleasedSessionRequestV1,
  resolved: V2ActivityReleasedSessionResolvedV1,
) {
  let handle;
  let descriptor;
  try {
    handle = parseLearningV2ActivityReleasedSessionPackageV1(
      resolved.canonicalPackageRaw,
    );
    const packageBody = JSON.parse(resolved.canonicalPackageRaw) as {
      auxiliaryDescriptorRaw?: unknown;
    };
    if (typeof packageBody.auxiliaryDescriptorRaw !== "string")
      throw new Error("descriptor_missing");
    descriptor = parseLearningV2ActivityAuxiliaryClientDescriptorV1(
      packageBody.auxiliaryDescriptorRaw,
    );
  } catch {
    throw new HttpsError("data-loss", "activity_released_package_invalid");
  }
  const summary = getLearningV2ActivityReleasedSessionPackageSummaryV1(handle);
  if (
    !HASH_RE.test(resolved.activeManifestHash) ||
    !ID_RE.test(resolved.unifiedReleaseId) ||
    !HASH_RE.test(resolved.unifiedRootFingerprint) ||
    !HASH_RE.test(resolved.auxiliaryIndexFingerprint) ||
    (input.expectedActiveManifestHash !== null &&
      resolved.activeManifestHash !== input.expectedActiveManifestHash) ||
    descriptor.environment !== input.environment ||
    descriptor.studyTarget !== input.studyTarget ||
    descriptor.learnerSourceLocale !== input.learnerSourceLocale ||
    descriptor.seasonId !== input.seasonId ||
    descriptor.activeManifestHash !== resolved.activeManifestHash ||
    descriptor.episodeId !== input.episodeId ||
    descriptor.sessionOrdinal !== input.sessionOrdinal ||
    descriptor.auxiliaryIndexFingerprint !==
      resolved.auxiliaryIndexFingerprint ||
    summary.episodeId !== input.episodeId ||
    summary.sessionOrdinal !== input.sessionOrdinal ||
    summary.auxiliaryDescriptorFingerprint !==
      descriptor.descriptorFingerprint ||
    !HASH_RE.test(summary.auxiliaryDescriptorFingerprint)
  )
    throw new HttpsError("data-loss", "activity_released_package_mismatch");
  return summary;
}

export function createV2ActivityReleasedSessionHandlerV1(
  resolve: V2ActivityReleasedSessionResolverV1 = resolveV2ActivityReleasedSessionFromAuthenticatedRepositoryV1,
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
  ): Promise<V2ActivityReleasedSessionResponseV1> => {
    if (
      typeof request.auth?.uid !== "string" ||
      request.auth.uid.length < 1 ||
      request.auth.uid.length > 128
    )
      throw new HttpsError("unauthenticated", "authentication_required");
    const input = parseRequest(request.data);
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
    if (!ID_RE.test(stableAccountId)) {
      throw new HttpsError(
        "failed-precondition",
        "stable_identity_unavailable",
      );
    }
    let resolved: V2ActivityReleasedSessionResolvedV1;
    try {
      resolved = await resolve(input, stableAccountId);
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("unavailable", "activity_session_unavailable");
    }
    const summary = exactResolved(input, resolved);
    return Object.freeze({
      schemaVersion: V2_ACTIVITY_RELEASED_SESSION_RESPONSE_SCHEMA_V1,
      activeManifestHash: resolved.activeManifestHash,
      unifiedReleaseId: resolved.unifiedReleaseId,
      unifiedRootFingerprint: resolved.unifiedRootFingerprint,
      episodeId: summary.episodeId,
      sessionId: summary.sessionId,
      sessionOrdinal: summary.sessionOrdinal,
      activityPackageFingerprint: summary.activityPackageFingerprint,
      auxiliaryIndexFingerprint: resolved.auxiliaryIndexFingerprint,
      descriptorFingerprint: summary.auxiliaryDescriptorFingerprint,
      sourceFingerprint: summary.sourceFingerprint,
      renderFingerprint: summary.renderFingerprint,
      capsuleEnvelopeFingerprint: summary.capsuleEnvelopeFingerprint,
      packageFingerprint: summary.packageFingerprint,
      canonicalPackageRaw: resolved.canonicalPackageRaw,
      transportAuthority:
        "firebase_callable_auth_and_app_check_boundary" as const,
      repositoryOriginProjection:
        "joined_unified_active_release_learner_evaluator_auxiliary" as const,
      localFeedbackAuthority: "local_provisional_only" as const,
      walletAuthority: "none" as const,
      masteryAuthority: "none" as const,
      evidenceAuthority: "none" as const,
      completionAuthority: "none" as const,
      releaseAuthority: false as const,
    });
  };
}

export const learningV2ActivityReleasedSessionGetV1 = onCall(
  V2_ACTIVITY_RELEASED_SESSION_CALLABLE_OPTIONS_V1,
  createV2ActivityReleasedSessionHandlerV1(),
);
