import { hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";
import {
  resolveV2FirebaseUnifiedCourseReleaseActivationPreflightMaterialV1,
  type V2FirebaseUnifiedCourseReleaseActivationPreflightHandleV1,
} from "./v2_firebase_unified_course_release_activation_preflight_adapter_v1";
import {
  createFirebaseAdminV2UnifiedCourseReleaseRepositoryV1,
  type V2UnifiedCourseReleaseActiveHandleV1,
} from "./v2_unified_course_release_repository_v1";
import {
  isV2UnifiedCourseReleaseRootV1,
  type V2UnifiedCourseReleaseRootV1,
} from "./v2_unified_course_release_v1";

export const V2_FIREBASE_UNIFIED_COURSE_RELEASE_ACTIVATION_SUMMARY_SCHEMA_V1 =
  "v2-firebase-unified-course-release-activation-summary.v1" as const;

export interface V2FirebaseUnifiedCourseReleaseActivationHandleV1 {
  readonly kind: "v2_firebase_unified_course_release_activation_handle";
}

export interface V2FirebaseUnifiedCourseReleaseActivationSummaryV1 {
  readonly schemaVersion: typeof V2_FIREBASE_UNIFIED_COURSE_RELEASE_ACTIVATION_SUMMARY_SCHEMA_V1;
  readonly action: "activate" | "rollback";
  readonly releaseId: string;
  readonly rootFingerprint: string;
  readonly preflightFingerprint: string;
  readonly leafReadbackFingerprint: string;
  readonly ownerIdentityFingerprint: string;
  readonly activeRootFingerprint: string;
  readonly operationRevision: number;
  readonly state: "live" | "rolled_back";
  readonly persistenceKind: "created" | "exact_replay";
  readonly headDecision: "commit" | "exact_replay";
  readonly ownerAuthenticationAuthority: "firebase_auth_explicit_owner_role_and_server_configured_uid_hash";
  readonly leafInventoryAuthority: "firebase_admin_exact_224_leaf_generation_hash_size_content_type_snapshot";
  readonly activationAuthority: "firebase_admin_single_unified_head_transaction_and_cold_readback";
  readonly candidateOriginAuthority: "none_owner_authored_input_pin_only";
  readonly humanApprovalAuthority: "single_owner_explicit_confirmation_readback";
  readonly publicationAuthority: "unified_head_only";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly summaryFingerprint: string;
}

export interface V2FirebaseUnifiedCourseReleaseActivationAdapterV1 {
  advance(input: {
    readonly preflightHandle: V2FirebaseUnifiedCourseReleaseActivationPreflightHandleV1;
    readonly root: V2UnifiedCourseReleaseRootV1;
    readonly action: "activate" | "rollback";
    readonly expectedRevision: number;
    readonly operationId: string;
    readonly updatedAtIso: string;
  }): Promise<V2FirebaseUnifiedCourseReleaseActivationHandleV1>;
}

interface Material {
  readonly summary: V2FirebaseUnifiedCourseReleaseActivationSummaryV1;
  readonly activeHandle: V2UnifiedCourseReleaseActiveHandleV1;
  readonly root: V2UnifiedCourseReleaseRootV1;
}

const handles = new WeakSet<object>();
const materials = new WeakMap<object, Material>();

function fail(code: string): never {
  throw new Error(`v2_firebase_unified_course_release_activation_${code}`);
}

export function createFirebaseAdminV2UnifiedCourseReleaseActivationAdapterV1(): V2FirebaseUnifiedCourseReleaseActivationAdapterV1 {
  const repository = createFirebaseAdminV2UnifiedCourseReleaseRepositoryV1();
  return Object.freeze({
    async advance(
      input: Parameters<
        V2FirebaseUnifiedCourseReleaseActivationAdapterV1["advance"]
      >[0],
    ) {
      if (
        !input ||
        typeof input !== "object" ||
        Array.isArray(input) ||
        Object.getPrototypeOf(input) !== Object.prototype ||
        Object.keys(input).sort().join("|") !==
          "action|expectedRevision|operationId|preflightHandle|root|updatedAtIso" ||
        !isV2UnifiedCourseReleaseRootV1(input.root) ||
        !["activate", "rollback"].includes(input.action)
      )
        fail("input_invalid");
      const preflight =
        resolveV2FirebaseUnifiedCourseReleaseActivationPreflightMaterialV1({
          handle: input.preflightHandle,
          root: input.root,
        });
      if (
        preflight.preflight.rootFingerprint !== input.root.rootFingerprint ||
        preflight.leafReadback.rootFingerprint !== input.root.rootFingerprint ||
        preflight.leafReadback.totalLeafReadbackCount !== 224 ||
        preflight.leafReadback.classification !==
          "eligible_for_private_root_owner_activation_adapter_only"
      )
        fail("preflight_mismatch");
      const committed = await repository.persistAndAdvance({
        target: input.root,
        action: input.action,
        expectedRevision: input.expectedRevision,
        operationId: input.operationId,
        updatedAtIso: input.updatedAtIso,
      });
      if (
        committed.root !== input.root ||
        committed.head.activeReleaseId !== input.root.releaseId ||
        committed.head.activeRootFingerprint !== input.root.rootFingerprint
      )
        fail("commit_mismatch");
      const body = Object.freeze({
        schemaVersion:
          V2_FIREBASE_UNIFIED_COURSE_RELEASE_ACTIVATION_SUMMARY_SCHEMA_V1,
        action: input.action,
        releaseId: input.root.releaseId,
        rootFingerprint: input.root.rootFingerprint,
        preflightFingerprint: preflight.preflight.preflightFingerprint,
        leafReadbackFingerprint: preflight.leafReadback.readbackFingerprint,
        ownerIdentityFingerprint: preflight.owner.ownerIdentityFingerprint,
        activeRootFingerprint: committed.head.activeRootFingerprint,
        operationRevision: committed.head.operationRevision,
        state: committed.head.state,
        persistenceKind: committed.persistenceKind,
        headDecision: committed.headDecision,
        ownerAuthenticationAuthority:
          "firebase_auth_explicit_owner_role_and_server_configured_uid_hash" as const,
        leafInventoryAuthority:
          "firebase_admin_exact_224_leaf_generation_hash_size_content_type_snapshot" as const,
        activationAuthority:
          "firebase_admin_single_unified_head_transaction_and_cold_readback" as const,
        candidateOriginAuthority: "none_owner_authored_input_pin_only" as const,
        humanApprovalAuthority:
          "single_owner_explicit_confirmation_readback" as const,
        publicationAuthority: "unified_head_only" as const,
        runtimeConsumer: false as const,
        releaseEligible: false as const,
        releaseAuthority: false as const,
      });
      const summary = Object.freeze({
        ...body,
        summaryFingerprint: hashCanonicalBody(body),
      });
      const handle = Object.freeze({
        kind: "v2_firebase_unified_course_release_activation_handle" as const,
      });
      handles.add(handle);
      materials.set(
        handle,
        Object.freeze({
          summary,
          activeHandle: committed.activeHandle,
          root: input.root,
        }),
      );
      return handle;
    },
  });
}

export function isV2FirebaseUnifiedCourseReleaseActivationHandleV1(
  value: unknown,
): value is V2FirebaseUnifiedCourseReleaseActivationHandleV1 {
  return typeof value === "object" && value !== null && handles.has(value);
}

export function getV2FirebaseUnifiedCourseReleaseActivationSummaryV1(
  handle: V2FirebaseUnifiedCourseReleaseActivationHandleV1,
): V2FirebaseUnifiedCourseReleaseActivationSummaryV1 {
  const material = materials.get(handle);
  if (!material || !handles.has(handle)) fail("handle_invalid");
  return material.summary;
}

export function resolveV2FirebaseUnifiedCourseReleaseActivationMaterialV1(input: {
  readonly handle: V2FirebaseUnifiedCourseReleaseActivationHandleV1;
  readonly root: V2UnifiedCourseReleaseRootV1;
}): Readonly<{ activeHandle: V2UnifiedCourseReleaseActiveHandleV1 }> {
  const material = materials.get(input.handle);
  if (
    !material ||
    !handles.has(input.handle) ||
    material.root !== input.root ||
    !isV2UnifiedCourseReleaseRootV1(input.root)
  )
    fail("handle_invalid");
  return Object.freeze({ activeHandle: material.activeHandle });
}
