import * as admin from "firebase-admin";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { resolveLearningV2ReleaseRolloutV1 } from "../../../modules/learning-v2/content/release_rollout_v1";
import { resolveStableUidForAuth } from "../auth_identity";
import {
  parseLearningV2ActivityAuxiliaryClientDescriptorV1,
  type LearningV2ActivityAuxiliaryClientDescriptorV1,
} from "../../../modules/learning-v2/runtime/activity_auxiliary_client_descriptor_v1";
import type { V2ReleaseEnvironment } from "../../../modules/learning-v2/content/release_manifest";
import {
  createFirebaseAdminV2ActivityAuxiliaryReleaseAdapterV1,
  getV2FirebaseActivityAuxiliaryReleaseSummaryV1,
  resolveV2FirebaseActivityAuxiliaryReleaseMaterialV1,
} from "./v2_firebase_activity_auxiliary_release_adapter_v1";

export const V2_ACTIVITY_AUXILIARY_SESSION_RESPONSE_SCHEMA_V1 =
  "v2-activity-auxiliary-session-response.v1" as const;

export const V2_ACTIVITY_AUXILIARY_SESSION_CALLABLE_OPTIONS_V1 = Object.freeze({
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

export interface V2ActivityAuxiliarySessionRequestV1 {
  readonly environment: V2ReleaseEnvironment;
  readonly studyTarget: string;
  readonly learnerSourceLocale: string;
  readonly seasonId: string;
  readonly expectedActiveManifestHash: string | null;
  readonly episodeId: string;
  readonly sessionOrdinal: number;
}

export interface V2ActivityAuxiliarySessionResponseV1 {
  readonly schemaVersion: typeof V2_ACTIVITY_AUXILIARY_SESSION_RESPONSE_SCHEMA_V1;
  readonly activeManifestHash: string;
  readonly episodeId: string;
  readonly sessionId: string;
  readonly sessionOrdinal: number;
  readonly activityPackageFingerprint: string;
  readonly auxiliaryIndexFingerprint: string;
  readonly descriptorFingerprint: string;
  readonly canonicalDescriptorRaw: string;
  readonly transportAuthority: "firebase_callable_auth_and_app_check_boundary";
  readonly repositoryOriginProjection: "server_private_release_handle_projection";
  readonly walletAuthority: "none";
  readonly masteryAuthority: "none";
  readonly evidenceAuthority: "none";
  readonly releaseAuthority: false;
}

type ResolvedSession = Readonly<{
  activeManifestHash: string;
  activityPackageFingerprint: string;
  auxiliaryIndexFingerprint: string;
  canonicalDescriptorRaw: string;
}>;

export type V2ActivityAuxiliarySessionResolverV1 = (
  input: V2ActivityAuxiliarySessionRequestV1,
  stableAccountId: string,
) => Promise<ResolvedSession>;

const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const CODE_RE = /^[a-z]{2,12}(?:-[A-Z]{2})?$/u;

function invalidArgument(): never {
  throw new HttpsError("invalid-argument", "activity_session_request_invalid");
}

function parseRequest(value: unknown): V2ActivityAuxiliarySessionRequestV1 {
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

async function resolveFromAuthenticatedRepository(
  input: V2ActivityAuxiliarySessionRequestV1,
  stableAccountId: string,
): Promise<ResolvedSession> {
  const projectId = String(process.env.GCLOUD_PROJECT ?? "");
  const serverEnvironment: V2ReleaseEnvironment =
    process.env.FUNCTIONS_EMULATOR === "true" && projectId.startsWith("demo-")
      ? "lab"
      : projectId === "phraseman-ea0b3"
        ? "production"
        : (() => {
            throw new HttpsError(
              "failed-precondition",
              "release_environment_unavailable",
            );
          })();
  if (input.environment !== serverEnvironment) {
    throw new HttpsError("failed-precondition", "release_environment_mismatch");
  }
  const adapter = createFirebaseAdminV2ActivityAuxiliaryReleaseAdapterV1();
  const handle = await adapter.load({
    environment: input.environment,
    studyTarget: input.studyTarget,
    learnerSourceLocale: input.learnerSourceLocale,
    seasonId: input.seasonId,
    episodeId: input.episodeId,
  });
  const summary = getV2FirebaseActivityAuxiliaryReleaseSummaryV1(handle);
  const rollout = resolveLearningV2ReleaseRolloutV1({
    pointer:
      resolveV2FirebaseActivityAuxiliaryReleaseMaterialV1(handle).seasonPointer,
    stableAccountId,
  });
  if (!rollout.eligible) {
    throw new HttpsError("permission-denied", "release_cohort_ineligible");
  }
  if (
    input.expectedActiveManifestHash !== null &&
    summary.activeManifestHash !== input.expectedActiveManifestHash
  ) {
    throw new HttpsError("failed-precondition", "active_release_changed");
  }
  return Object.freeze({
    activeManifestHash: summary.activeManifestHash,
    activityPackageFingerprint: summary.activityPackageFingerprint,
    auxiliaryIndexFingerprint: summary.indexFingerprint,
    canonicalDescriptorRaw: await adapter.projectSessionDescriptor(
      handle,
      input.sessionOrdinal,
    ),
  });
}

function exactDescriptor(
  raw: string,
  request: V2ActivityAuxiliarySessionRequestV1,
  resolved: ResolvedSession,
): LearningV2ActivityAuxiliaryClientDescriptorV1 {
  let descriptor: LearningV2ActivityAuxiliaryClientDescriptorV1;
  try {
    descriptor = parseLearningV2ActivityAuxiliaryClientDescriptorV1(raw);
  } catch {
    throw new HttpsError("data-loss", "activity_session_descriptor_invalid");
  }
  if (
    descriptor.environment !== request.environment ||
    descriptor.studyTarget !== request.studyTarget ||
    descriptor.learnerSourceLocale !== request.learnerSourceLocale ||
    descriptor.seasonId !== request.seasonId ||
    (request.expectedActiveManifestHash !== null &&
      descriptor.activeManifestHash !== request.expectedActiveManifestHash) ||
    descriptor.activeManifestHash !== resolved.activeManifestHash ||
    descriptor.episodeId !== request.episodeId ||
    descriptor.sessionOrdinal !== request.sessionOrdinal ||
    descriptor.activityPackageFingerprint !==
      resolved.activityPackageFingerprint ||
    descriptor.auxiliaryIndexFingerprint !== resolved.auxiliaryIndexFingerprint
  )
    throw new HttpsError("data-loss", "activity_session_descriptor_mismatch");
  return descriptor;
}

export function createV2ActivityAuxiliarySessionHandlerV1(
  resolve: V2ActivityAuxiliarySessionResolverV1 = resolveFromAuthenticatedRepository,
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
  ) => {
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
    let resolved: ResolvedSession;
    try {
      resolved = await resolve(input, stableAccountId);
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("unavailable", "activity_session_unavailable");
    }
    if (
      input.expectedActiveManifestHash !== null &&
      resolved.activeManifestHash !== input.expectedActiveManifestHash
    ) {
      throw new HttpsError("failed-precondition", "active_release_changed");
    }
    const descriptor = exactDescriptor(
      resolved.canonicalDescriptorRaw,
      input,
      resolved,
    );
    return Object.freeze({
      schemaVersion: V2_ACTIVITY_AUXILIARY_SESSION_RESPONSE_SCHEMA_V1,
      activeManifestHash: descriptor.activeManifestHash,
      episodeId: descriptor.episodeId,
      sessionId: descriptor.sessionId,
      sessionOrdinal: descriptor.sessionOrdinal,
      activityPackageFingerprint: descriptor.activityPackageFingerprint,
      auxiliaryIndexFingerprint: descriptor.auxiliaryIndexFingerprint,
      descriptorFingerprint: descriptor.descriptorFingerprint,
      canonicalDescriptorRaw: resolved.canonicalDescriptorRaw,
      transportAuthority:
        "firebase_callable_auth_and_app_check_boundary" as const,
      repositoryOriginProjection:
        "server_private_release_handle_projection" as const,
      walletAuthority: "none" as const,
      masteryAuthority: "none" as const,
      evidenceAuthority: "none" as const,
      releaseAuthority: false as const,
    });
  };
}

export const learningV2ActivityAuxiliarySessionGetV1 = onCall(
  V2_ACTIVITY_AUXILIARY_SESSION_CALLABLE_OPTIONS_V1,
  createV2ActivityAuxiliarySessionHandlerV1(),
);
