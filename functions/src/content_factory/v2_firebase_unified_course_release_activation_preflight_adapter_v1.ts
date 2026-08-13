import { createHash } from "node:crypto";
import {
  LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_CATALOG_MAX_BYTES_V1,
  LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_LEARNER_MAX_BYTES_V1,
} from "../../../modules/learning-v2/content/activity_error_explanation_catalog_v1";
import { hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";
import { createV2FirebaseAdminRepositoryIoV1 } from "./v2_firebase_admin_repository_io_v1";
import {
  V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
  type V2RepositoryImmutableObjectPinV1,
} from "./v2_firebase_repository_persistence_v1";
import type { V2ConfiguredRootOwnerV1 } from "./v2_root_owner_identity_v1";
import { requireV2ConfiguredRootOwnerV1 } from "./v2_root_owner_identity_v1";
import type { V2UnifiedCourseReleaseActivationPreflightV1 } from "./v2_unified_course_release_activation_v1";
import { isV2UnifiedCourseReleaseActivationPreflightV1 } from "./v2_unified_course_release_activation_v1";
import { readbackV2UnifiedCourseReleaseConfirmationsV1 } from "./v2_unified_course_release_confirmation_readback_v1";
import {
  isV2UnifiedCourseReleaseLeafReadbackV1,
  readbackV2UnifiedCourseReleaseLeavesV1,
  type V2UnifiedCourseReleaseLeafReadbackV1,
} from "./v2_unified_course_release_leaf_readback_v1";
import type { V2UnifiedCourseReleaseRootV1 } from "./v2_unified_course_release_v1";
import { isV2UnifiedCourseReleaseRootV1 } from "./v2_unified_course_release_v1";

export const V2_FIREBASE_UNIFIED_COURSE_RELEASE_ACTIVATION_PREFLIGHT_SUMMARY_SCHEMA_V1 =
  "v2-firebase-unified-course-release-activation-preflight-summary.v1" as const;
export const V2_FIREBASE_UNIFIED_COURSE_RELEASE_NESTED_READ_MAX_CONCURRENCY_V1 =
  4 as const;

export interface V2FirebaseUnifiedCourseReleaseActivationPreflightHandleV1 {
  readonly kind: "v2_firebase_unified_course_release_activation_preflight_handle";
}

export interface V2FirebaseUnifiedCourseReleaseActivationPreflightSummaryV1 {
  readonly schemaVersion: typeof V2_FIREBASE_UNIFIED_COURSE_RELEASE_ACTIVATION_PREFLIGHT_SUMMARY_SCHEMA_V1;
  readonly releaseId: string;
  readonly rootFingerprint: string;
  readonly planFingerprint: string;
  readonly courseContractFingerprint: string;
  readonly episodeCount: 32;
  readonly confirmationReadbackCount: 32;
  readonly preflightFingerprint: string;
  readonly ownerIdentityFingerprint: string;
  readonly ownerAuthenticationAuthority: "firebase_auth_explicit_owner_role_and_server_configured_uid_hash";
  readonly ownerConfirmationReadbackAuthority: "firebase_admin_exact_generation_hash_size_content_type_snapshot";
  readonly leafInventoryReadbackCount: 224;
  readonly leafInventoryReadbackFingerprint: string;
  readonly leafInventoryReadbackAuthority: "firebase_admin_exact_224_leaf_generation_hash_size_content_type_snapshot";
  readonly publicationDecisionAuthority: "none";
  readonly executionAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly summaryFingerprint: string;
}

export interface FirebaseAdminV2UnifiedCourseReleaseActivationPreflightAdapterV1 {
  prepare(input: {
    readonly auth?: {
      readonly uid?: string;
      readonly token?: Record<string, unknown>;
    };
    readonly root: V2UnifiedCourseReleaseRootV1;
  }): Promise<V2FirebaseUnifiedCourseReleaseActivationPreflightHandleV1>;
}

const handles = new WeakSet<object>();
const materials = new WeakMap<
  object,
  Readonly<{
    root: V2UnifiedCourseReleaseRootV1;
    preflight: V2UnifiedCourseReleaseActivationPreflightV1;
    leafReadback: V2UnifiedCourseReleaseLeafReadbackV1;
    owner: V2ConfiguredRootOwnerV1;
    summary: V2FirebaseUnifiedCourseReleaseActivationPreflightSummaryV1;
  }>
>();

function fail(code: string): never {
  throw new Error(`v2_firebase_unified_release_activation_${code}`);
}

function summary(input: {
  readonly root: V2UnifiedCourseReleaseRootV1;
  readonly preflight: V2UnifiedCourseReleaseActivationPreflightV1;
  readonly leafReadback: V2UnifiedCourseReleaseLeafReadbackV1;
  readonly owner: V2ConfiguredRootOwnerV1;
}): V2FirebaseUnifiedCourseReleaseActivationPreflightSummaryV1 {
  const body = Object.freeze({
    schemaVersion:
      V2_FIREBASE_UNIFIED_COURSE_RELEASE_ACTIVATION_PREFLIGHT_SUMMARY_SCHEMA_V1,
    releaseId: input.root.releaseId,
    rootFingerprint: input.root.rootFingerprint,
    planFingerprint: input.root.planFingerprint,
    courseContractFingerprint: input.root.courseContractFingerprint,
    episodeCount: 32 as const,
    confirmationReadbackCount: 32 as const,
    preflightFingerprint: input.preflight.preflightFingerprint,
    ownerIdentityFingerprint: input.owner.ownerIdentityFingerprint,
    ownerAuthenticationAuthority:
      "firebase_auth_explicit_owner_role_and_server_configured_uid_hash" as const,
    ownerConfirmationReadbackAuthority:
      "firebase_admin_exact_generation_hash_size_content_type_snapshot" as const,
    leafInventoryReadbackCount: 224 as const,
    leafInventoryReadbackFingerprint: input.leafReadback.readbackFingerprint,
    leafInventoryReadbackAuthority:
      "firebase_admin_exact_224_leaf_generation_hash_size_content_type_snapshot" as const,
    publicationDecisionAuthority: "none" as const,
    executionAuthority: "none" as const,
    runtimeConsumer: false as const,
    releaseEligible: false as const,
    releaseAuthority: false as const,
  });
  return Object.freeze({
    ...body,
    summaryFingerprint: hashCanonicalBody(body),
  });
}

export function createFirebaseAdminV2UnifiedCourseReleaseActivationPreflightAdapterV1(): FirebaseAdminV2UnifiedCourseReleaseActivationPreflightAdapterV1 {
  const io = createV2FirebaseAdminRepositoryIoV1();
  const exactNestedPin = (
    pin: unknown,
    maximumBytes: number,
  ): V2RepositoryImmutableObjectPinV1 => {
    if (
      !pin ||
      typeof pin !== "object" ||
      Array.isArray(pin) ||
      Object.getPrototypeOf(pin) !== Object.prototype ||
      Object.keys(pin).sort().join("|") !==
        "byteSize|contentHash|contentType|objectGeneration|objectPath"
    )
      fail("nested_pin_invalid");
    const exactPin = pin as V2RepositoryImmutableObjectPinV1;
    if (
      exactPin.contentType !== V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1 ||
      !Number.isSafeInteger(exactPin.byteSize) ||
      exactPin.byteSize < 2 ||
      exactPin.byteSize > maximumBytes ||
      typeof exactPin.objectPath !== "string" ||
      exactPin.objectPath.startsWith("/") ||
      exactPin.objectPath.includes("..") ||
      exactPin.objectPath.includes("\\") ||
      /%2f|%5c/iu.test(exactPin.objectPath) ||
      !/^[a-f0-9]{64}$/u.test(exactPin.contentHash) ||
      !/^[1-9][0-9]{0,30}$/u.test(exactPin.objectGeneration)
    )
      fail("nested_pin_invalid");
    return exactPin;
  };
  const readNestedRaw = async (
    pin: unknown,
    maximumBytes: number,
  ): Promise<string> => {
    const exactPin = exactNestedPin(pin, maximumBytes);
    const metadata = await io.storage.readMetadataExact(exactPin.objectPath);
    const download = await io.storage.downloadGenerationExact({
      objectPath: exactPin.objectPath,
      ifGenerationMatch: exactPin.objectGeneration,
      maximumBytes,
    });
    if (
      !metadata ||
      metadata.generation !== exactPin.objectGeneration ||
      metadata.contentHash !== exactPin.contentHash ||
      metadata.byteSize !== exactPin.byteSize ||
      metadata.contentType !== exactPin.contentType ||
      download.kind !== "downloaded" ||
      download.bytes.byteLength !== exactPin.byteSize ||
      createHash("sha256").update(download.bytes).digest("hex") !==
        exactPin.contentHash
    )
      fail("nested_readback_invalid");
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(download.bytes);
    } catch {
      fail("nested_utf8_invalid");
    }
  };
  const readNestedRows = async <T, R>(
    rows: readonly T[],
    read: (row: T, index: number) => Promise<R>,
  ): Promise<readonly R[]> => {
    const results = new Array<R>(rows.length);
    let cursor = 0;
    await Promise.all(
      Array.from(
        {
          length: Math.min(
            V2_FIREBASE_UNIFIED_COURSE_RELEASE_NESTED_READ_MAX_CONCURRENCY_V1,
            rows.length,
          ),
        },
        async () => {
          while (true) {
            const index = cursor++;
            if (index >= rows.length) return;
            results[index] = await read(rows[index]!, index);
          }
        },
      ),
    );
    return Object.freeze(results);
  };
  return Object.freeze({
    async prepare(
      input: Parameters<
        FirebaseAdminV2UnifiedCourseReleaseActivationPreflightAdapterV1["prepare"]
      >[0],
    ) {
      if (
        !input ||
        typeof input !== "object" ||
        Array.isArray(input) ||
        Object.getPrototypeOf(input) !== Object.prototype ||
        Object.keys(input).sort().join("|") !== "auth|root" ||
        !isV2UnifiedCourseReleaseRootV1(input.root)
      )
        fail("input_invalid");
      const owner = requireV2ConfiguredRootOwnerV1(input.auth);
      const preflight = await readbackV2UnifiedCourseReleaseConfirmationsV1({
        root: input.root,
        storage: io.storage,
      });
      if (!isV2UnifiedCourseReleaseActivationPreflightV1(preflight))
        fail("preflight_invalid");
      const leafReadback = await readbackV2UnifiedCourseReleaseLeavesV1({
        root: input.root,
        confirmationPreflight: preflight,
        storage: io.storage,
        loadNested: async ({ localizationIndexRaw, errorGuidanceIndexRaw }) => {
          let localization: unknown;
          let guidance: unknown;
          try {
            localization = JSON.parse(localizationIndexRaw);
            guidance = JSON.parse(errorGuidanceIndexRaw);
          } catch {
            fail("nested_index_invalid");
          }
          if (
            !localization ||
            typeof localization !== "object" ||
            !Array.isArray((localization as { locales?: unknown }).locales) ||
            !guidance ||
            typeof guidance !== "object"
          )
            fail("nested_index_invalid");
          const localeRows = (
            localization as {
              locales: readonly { localeIndexObject?: unknown }[];
            }
          ).locales;
          if (localeRows.length !== 8) fail("nested_index_invalid");
          const guidanceValue = guidance as {
            catalogObject?: unknown;
            learnerProjectionObject?: unknown;
          };
          const localePins = localeRows.map((row) =>
            exactNestedPin(row.localeIndexObject, 512 * 1024),
          );
          const catalogPin = exactNestedPin(
            guidanceValue.catalogObject,
            LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_CATALOG_MAX_BYTES_V1,
          );
          const learnerProjectionPin = exactNestedPin(
            guidanceValue.learnerProjectionObject,
            LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_LEARNER_MAX_BYTES_V1,
          );
          return Object.freeze({
            localeIndexRaws: await readNestedRows(localePins, (pin) =>
              readNestedRaw(pin, 512 * 1024),
            ),
            errorCatalogRaw: await readNestedRaw(
              catalogPin,
              LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_CATALOG_MAX_BYTES_V1,
            ),
            errorLearnerProjectionRaw: await readNestedRaw(
              learnerProjectionPin,
              LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_LEARNER_MAX_BYTES_V1,
            ),
          });
        },
      });
      if (!isV2UnifiedCourseReleaseLeafReadbackV1(leafReadback))
        fail("leaf_readback_invalid");
      const safeSummary = summary({
        root: input.root,
        preflight,
        leafReadback,
        owner,
      });
      const handle = Object.freeze({
        kind: "v2_firebase_unified_course_release_activation_preflight_handle" as const,
      });
      handles.add(handle);
      materials.set(
        handle,
        Object.freeze({
          root: input.root,
          preflight,
          leafReadback,
          owner,
          summary: safeSummary,
        }),
      );
      return handle;
    },
  });
}

export function isV2FirebaseUnifiedCourseReleaseActivationPreflightHandleV1(
  value: unknown,
): value is V2FirebaseUnifiedCourseReleaseActivationPreflightHandleV1 {
  return typeof value === "object" && value !== null && handles.has(value);
}

export function getV2FirebaseUnifiedCourseReleaseActivationPreflightSummaryV1(
  handle: V2FirebaseUnifiedCourseReleaseActivationPreflightHandleV1,
): V2FirebaseUnifiedCourseReleaseActivationPreflightSummaryV1 {
  const material = materials.get(handle);
  if (!material || !handles.has(handle)) fail("handle_invalid");
  return material.summary;
}

export function resolveV2FirebaseUnifiedCourseReleaseActivationPreflightMaterialV1(input: {
  readonly handle: V2FirebaseUnifiedCourseReleaseActivationPreflightHandleV1;
  readonly root: V2UnifiedCourseReleaseRootV1;
}): Readonly<{
  root: V2UnifiedCourseReleaseRootV1;
  preflight: V2UnifiedCourseReleaseActivationPreflightV1;
  leafReadback: V2UnifiedCourseReleaseLeafReadbackV1;
  owner: V2ConfiguredRootOwnerV1;
}> {
  const material = materials.get(input.handle);
  if (
    !material ||
    !handles.has(input.handle) ||
    material.root !== input.root ||
    !isV2UnifiedCourseReleaseRootV1(input.root)
  )
    fail("handle_invalid");
  return Object.freeze({
    root: material.root,
    preflight: material.preflight,
    leafReadback: material.leafReadback,
    owner: material.owner,
  });
}
