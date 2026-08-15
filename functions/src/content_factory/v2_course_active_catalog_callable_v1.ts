import * as admin from "firebase-admin";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { resolveLearningV2ReleaseRolloutV1 } from "../../../modules/learning-v2/content/release_rollout_v1";
import { parseV2ExactLanguageTagV1 } from "../../../modules/learning-v2/contracts/language_tag_v1";
import {
  LEARNING_V2_INTERFACE_LOCALES,
  type LearningV2InterfaceLocale,
} from "../../../modules/learning-v2/content/generator_course_contract";
import { parseLearningV2ActiveCourseCatalogV1 } from "../../../modules/learning-v2/runtime/course_active_catalog_v1";
import { resolveStableUidForAuth } from "../auth_identity";
import {
  createFirebaseAdminV2CourseActiveCatalogAdapterV1,
  resolveV2CourseActiveCatalogLearnerRawV1,
} from "./v2_course_active_catalog_adapter_v1";
import { resolveV2CourseReleasedServerEnvironmentV2 } from "./v2_course_released_session_callable_v2";
import { createFirebaseAdminV2UnifiedCourseReleaseRepositoryV2 } from "./v2_unified_course_release_repository_v2";

export const V2_COURSE_ACTIVE_CATALOG_RESPONSE_SCHEMA_V1 =
  "v2-course-active-catalog-response.v1" as const;

export const V2_COURSE_ACTIVE_CATALOG_CALLABLE_OPTIONS_V1 = Object.freeze({
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

export interface V2CourseActiveCatalogRequestV1 {
  readonly environment: "lab" | "staging" | "production";
  readonly targetLanguage: string;
  readonly studyTarget: string;
  readonly learnerSourceLocale: string;
  readonly interfaceLocale: LearningV2InterfaceLocale;
  readonly seasonId: string;
}

export interface V2CourseActiveCatalogResponseV1 {
  readonly schemaVersion: typeof V2_COURSE_ACTIVE_CATALOG_RESPONSE_SCHEMA_V1;
  readonly canonicalCatalogRaw: string;
  readonly catalogFingerprint: string;
  readonly activeRootFingerprint: string;
  readonly activeHeadFingerprint: string;
  readonly transportAuthority: "firebase_callable_auth_and_app_check_boundary";
  readonly learnerProjection: "titles_can_do_and_session_learning_outcomes_only";
  readonly correctnessAuthority: "local_device_only";
  readonly serverAnswerAuthority: "none_answers_never_transported";
  readonly progressWriteAuthority: "completed_session_summary_only";
  readonly releaseAuthority: false;
}

export type V2CourseActiveCatalogResolverV1 = (
  input: V2CourseActiveCatalogRequestV1,
  stableAccountId: string,
) => Promise<string>;

const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:\-]{0,159}$/u;
const REQUEST_KEYS = Object.freeze([
  "environment",
  "interfaceLocale",
  "learnerSourceLocale",
  "seasonId",
  "studyTarget",
  "targetLanguage",
] as const);

function plain(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function invalid(): never {
  throw new HttpsError("invalid-argument", "course_catalog_request_invalid");
}

function parseRequest(value: unknown): V2CourseActiveCatalogRequestV1 {
  if (!plain(value)) invalid();
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
    !LEARNING_V2_INTERFACE_LOCALES.includes(
      value.interfaceLocale as LearningV2InterfaceLocale,
    ) ||
    typeof value.seasonId !== "string" ||
    !ID_RE.test(value.seasonId)
  )
    invalid();
  return Object.freeze({
    environment:
      value.environment as V2CourseActiveCatalogRequestV1["environment"],
    targetLanguage: value.targetLanguage,
    studyTarget: value.studyTarget,
    learnerSourceLocale: value.learnerSourceLocale,
    interfaceLocale: value.interfaceLocale as LearningV2InterfaceLocale,
    seasonId: value.seasonId,
  });
}

export async function resolveV2CourseActiveCatalogFromAuthenticatedRepositoryV1(
  input: V2CourseActiveCatalogRequestV1,
  stableAccountId: string,
): Promise<string> {
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
  const adapter = createFirebaseAdminV2CourseActiveCatalogAdapterV1();
  const handle = await adapter.load({
    activeHandle: active.activeHandle,
    interfaceLocale: input.interfaceLocale,
  });
  return resolveV2CourseActiveCatalogLearnerRawV1(handle);
}

export function createV2CourseActiveCatalogHandlerV1(
  resolve: V2CourseActiveCatalogResolverV1 = resolveV2CourseActiveCatalogFromAuthenticatedRepositoryV1,
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
  ): Promise<V2CourseActiveCatalogResponseV1> => {
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
    if (!ID_RE.test(stableAccountId))
      throw new HttpsError(
        "failed-precondition",
        "stable_identity_unavailable",
      );
    let raw: string;
    try {
      raw = await resolve(input, stableAccountId);
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("unavailable", "course_catalog_unavailable");
    }
    let catalog;
    try {
      catalog = parseLearningV2ActiveCourseCatalogV1(raw);
    } catch {
      throw new HttpsError("data-loss", "course_catalog_projection_invalid");
    }
    if (
      catalog.environment !== input.environment ||
      catalog.targetLanguage !== input.targetLanguage ||
      catalog.studyTarget !== input.studyTarget ||
      catalog.learnerSourceLocale !== input.learnerSourceLocale ||
      catalog.interfaceLocale !== input.interfaceLocale ||
      catalog.seasonId !== input.seasonId
    )
      throw new HttpsError("data-loss", "course_catalog_scope_mismatch");
    return Object.freeze({
      schemaVersion: V2_COURSE_ACTIVE_CATALOG_RESPONSE_SCHEMA_V1,
      canonicalCatalogRaw: raw,
      catalogFingerprint: catalog.catalogFingerprint,
      activeRootFingerprint: catalog.activeRootFingerprint,
      activeHeadFingerprint: catalog.activeHeadFingerprint,
      transportAuthority:
        "firebase_callable_auth_and_app_check_boundary" as const,
      learnerProjection: catalog.learnerProjection,
      correctnessAuthority: catalog.correctnessAuthority,
      serverAnswerAuthority: catalog.serverAnswerAuthority,
      progressWriteAuthority: catalog.progressWriteAuthority,
      releaseAuthority: false as const,
    });
  };
}

export const learningV2CourseActiveCatalogGetV1 = onCall(
  V2_COURSE_ACTIVE_CATALOG_CALLABLE_OPTIONS_V1,
  createV2CourseActiveCatalogHandlerV1(),
);
