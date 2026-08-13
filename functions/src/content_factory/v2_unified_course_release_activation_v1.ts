import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from "../../../modules/learning-v2/policies/decision_registry";
import type { V2RepositoryImmutableObjectPinV1 } from "./v2_firebase_repository_persistence_v1";
import {
  isV2OwnerEpisodeConfirmationV1,
  type V2OwnerEpisodeConfirmationV1,
} from "./v2_owner_episode_confirmation_v1";
import {
  isV2UnifiedCourseReleaseRootV1,
  type V2UnifiedCourseReleaseRootV1,
} from "./v2_unified_course_release_v1";

export const V2_UNIFIED_COURSE_RELEASE_ACTIVATION_PREFLIGHT_SCHEMA_V1 =
  "v2-unified-course-release-activation-preflight.v1" as const;
export const V2_UNIFIED_COURSE_RELEASE_ACTIVATION_PREFLIGHT_MAX_BYTES_V1 =
  256 * 1024;

export interface V2UnifiedCourseReleaseConfirmationReadbackV1 {
  readonly episodeOrdinal: number;
  readonly confirmation: V2OwnerEpisodeConfirmationV1;
  readonly confirmationObject: V2RepositoryImmutableObjectPinV1;
}

export interface V2UnifiedCourseReleaseActivationPreflightV1 {
  readonly schemaVersion: typeof V2_UNIFIED_COURSE_RELEASE_ACTIVATION_PREFLIGHT_SCHEMA_V1;
  readonly releaseId: string;
  readonly rootFingerprint: string;
  readonly planFingerprint: string;
  readonly courseContractFingerprint: string;
  readonly episodeCount: 32;
  readonly ownerConfirmationAggregate: string;
  readonly confirmationReadbackCount: 32;
  readonly confirmationReadbackAggregate: string;
  readonly classification: "eligible_for_server_exact_leaf_readback_only";
  readonly ownerAuthenticationAuthority: "none";
  readonly ownerConfirmationAuthority: "none_structural_brands_only";
  readonly artifactStorageAuthority: "none";
  readonly humanApprovalAuthority: "none";
  readonly publicationDecisionAuthority: "none";
  readonly executionAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly preflightFingerprint: string;
}

const preflightHandles = new WeakSet<object>();

function fail(code: string): never {
  throw new Error(`v2_unified_course_release_activation_${code}`);
}

function exactPin(
  left: V2RepositoryImmutableObjectPinV1,
  right: V2RepositoryImmutableObjectPinV1,
): boolean {
  return canonicalJsonV1(left) === canonicalJsonV1(right);
}

export function materializeV2UnifiedCourseReleaseActivationPreflightV1(input: {
  readonly root: V2UnifiedCourseReleaseRootV1;
  readonly confirmations: readonly V2UnifiedCourseReleaseConfirmationReadbackV1[];
}): V2UnifiedCourseReleaseActivationPreflightV1 {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype ||
    Object.keys(input).sort().join("|") !== "confirmations|root" ||
    !isV2UnifiedCourseReleaseRootV1(input.root) ||
    input.root.environment !== "production" ||
    input.root.releaseScope !== "full_season" ||
    input.root.contentClass !== "production_candidate" ||
    input.root.episodeCount !== 32 ||
    !Array.isArray(input.confirmations) ||
    input.confirmations.length !== 32
  )
    fail("input_invalid");

  const confirmationRows = input.confirmations.map((entry, index) => {
    if (
      !entry ||
      typeof entry !== "object" ||
      Array.isArray(entry) ||
      Object.getPrototypeOf(entry) !== Object.prototype ||
      Object.keys(entry).sort().join("|") !==
        "confirmation|confirmationObject|episodeOrdinal" ||
      entry.episodeOrdinal !== index + 1 ||
      !isV2OwnerEpisodeConfirmationV1(entry.confirmation)
    )
      fail("confirmation_invalid");
    const episode = input.root.episodes[index];
    if (
      !episode ||
      episode.episodeOrdinal !== entry.episodeOrdinal ||
      entry.confirmation.planFingerprint !== input.root.planFingerprint ||
      entry.confirmation.courseContractFingerprint !==
        input.root.courseContractFingerprint ||
      entry.confirmation.stageId !== episode.stageId ||
      entry.confirmation.episodeId !== episode.episodeId ||
      entry.confirmation.ownerInputFingerprint !==
        episode.ownerInputFingerprint ||
      entry.confirmation.activityAssemblyFingerprint !==
        episode.activityAssemblyFingerprint ||
      entry.confirmation.confirmationFingerprint !==
        episode.ownerConfirmationFingerprint ||
      entry.confirmation.contentClass !== "production_candidate" ||
      entry.confirmation.confirmationMode !==
        "single_owner_explicit_two_step_confirmation" ||
      entry.confirmation.releaseAuthority !== false ||
      !exactPin(entry.confirmationObject, episode.ownerConfirmationObject)
    )
      fail("confirmation_subject_mismatch");
    return Object.freeze({
      episodeOrdinal: entry.episodeOrdinal,
      episodeId: episode.episodeId,
      stageId: episode.stageId,
      ownerInputFingerprint: episode.ownerInputFingerprint,
      activityAssemblyFingerprint: episode.activityAssemblyFingerprint,
      ownerConfirmationFingerprint: episode.ownerConfirmationFingerprint,
      ownerConfirmationObject: episode.ownerConfirmationObject,
    });
  });

  const body = Object.freeze({
    schemaVersion: V2_UNIFIED_COURSE_RELEASE_ACTIVATION_PREFLIGHT_SCHEMA_V1,
    releaseId: input.root.releaseId,
    rootFingerprint: input.root.rootFingerprint,
    planFingerprint: input.root.planFingerprint,
    courseContractFingerprint: input.root.courseContractFingerprint,
    episodeCount: 32 as const,
    ownerConfirmationAggregate: input.root.ownerConfirmationAggregate,
    confirmationReadbackCount: 32 as const,
    confirmationReadbackAggregate: hashCanonicalBody(confirmationRows),
    classification: "eligible_for_server_exact_leaf_readback_only" as const,
    ownerAuthenticationAuthority: "none" as const,
    ownerConfirmationAuthority: "none_structural_brands_only" as const,
    artifactStorageAuthority: "none" as const,
    humanApprovalAuthority: "none" as const,
    publicationDecisionAuthority: "none" as const,
    executionAuthority: "none" as const,
    runtimeConsumer: false as const,
    releaseEligible: false as const,
    releaseAuthority: false as const,
  });
  const result = Object.freeze({
    ...body,
    preflightFingerprint: hashCanonicalBody(body),
  });
  if (
    utf8ByteLengthV1(canonicalJsonV1(result)) >
    V2_UNIFIED_COURSE_RELEASE_ACTIVATION_PREFLIGHT_MAX_BYTES_V1
  )
    fail("oversize");
  preflightHandles.add(result);
  return result;
}

export function isV2UnifiedCourseReleaseActivationPreflightV1(
  value: unknown,
): value is V2UnifiedCourseReleaseActivationPreflightV1 {
  return (
    typeof value === "object" && value !== null && preflightHandles.has(value)
  );
}
