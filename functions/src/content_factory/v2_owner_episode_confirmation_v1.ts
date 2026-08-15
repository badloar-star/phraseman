import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from "../../../modules/learning-v2/policies/decision_registry";

export const V2_OWNER_EPISODE_CONFIRMATION_SCHEMA_V1 =
  "v2-owner-episode-confirmation.v1" as const;
export const V2_OWNER_EPISODE_CONFIRMATION_MAX_BYTES_V1 = 64 * 1024;

export interface V2OwnerEpisodeConfirmationV1 {
  readonly schemaVersion: typeof V2_OWNER_EPISODE_CONFIRMATION_SCHEMA_V1;
  readonly planFingerprint: string;
  readonly courseContractFingerprint: string;
  readonly stageId: string;
  readonly episodeId: string;
  readonly ownerInputFingerprint: string;
  readonly activityAssemblyFingerprint: string;
  readonly stageReviewFingerprint: string;
  readonly ownerIdentityFingerprint: string;
  readonly confirmedAtIso: string;
  readonly reason: string;
  readonly contentClass: "production_candidate";
  readonly confirmationMode: "single_owner_explicit_two_step_confirmation";
  readonly planReadbackEvidence: "exact_generation_hash_size_content_type";
  readonly ownerInputReadbackEvidence: "exact_generation_hash_size_content_type";
  readonly ownerAuthenticationAuthority: "unverified_structural_claim_server_adapter_required";
  readonly humanConfirmationAuthority: "unverified_structural_confirmation_claim";
  readonly makerCheckerAuthority: "none_single_owner_mode";
  readonly specialistEvidenceAuthority: "none";
  readonly publicationDecisionAuthority: "none";
  readonly executionAuthority: "none";
  readonly publicationPolicy: "draft_only_no_consumer";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly confirmationFingerprint: string;
}

const HASH_RE = /^[a-f0-9]{64}$/u;
const STAGE_ID_RE = /^[A-Za-z0-9._:-]{1,500}$/u;
const handles = new WeakSet<object>();

function fail(): never {
  throw new Error("v2_owner_episode_confirmation_invalid");
}

function exactReason(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length < 5 ||
    value.length > 500 ||
    value !== value.trim() ||
    value.normalize("NFC") !== value ||
    /[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2060-\u206f]/u.test(value)
  )
    fail();
  return value;
}

function exactIso(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value) ||
    new Date(value).toISOString() !== value
  )
    fail();
  return value;
}

function exactHash(value: unknown): string {
  if (typeof value !== "string" || !HASH_RE.test(value)) fail();
  return value;
}

export function materializeV2OwnerEpisodeConfirmationV1(input: {
  readonly planFingerprint: string;
  readonly courseContractFingerprint: string;
  readonly stageId: string;
  readonly episodeId: string;
  readonly ownerInputFingerprint: string;
  readonly activityAssemblyFingerprint: string;
  readonly stageReviewFingerprint: string;
  readonly ownerIdentityFingerprint: string;
  readonly confirmedAtIso: string;
  readonly reason: string;
  readonly contentClass: "production_candidate" | "neutral_test_fixture";
}): V2OwnerEpisodeConfirmationV1 {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype ||
    Object.keys(input).sort().join("|") !==
      [
        "activityAssemblyFingerprint",
        "confirmedAtIso",
        "contentClass",
        "courseContractFingerprint",
        "episodeId",
        "ownerIdentityFingerprint",
        "ownerInputFingerprint",
        "planFingerprint",
        "reason",
        "stageId",
        "stageReviewFingerprint",
      ]
        .sort()
        .join("|") ||
    input.contentClass !== "production_candidate" ||
    typeof input.stageId !== "string" ||
    !STAGE_ID_RE.test(input.stageId) ||
    typeof input.episodeId !== "string" ||
    !/^[a-z0-9][a-z0-9._-]{0,127}$/u.test(input.episodeId)
  )
    fail();
  const body = Object.freeze({
    schemaVersion: V2_OWNER_EPISODE_CONFIRMATION_SCHEMA_V1,
    planFingerprint: exactHash(input.planFingerprint),
    courseContractFingerprint: exactHash(input.courseContractFingerprint),
    stageId: input.stageId,
    episodeId: input.episodeId,
    ownerInputFingerprint: exactHash(input.ownerInputFingerprint),
    activityAssemblyFingerprint: exactHash(input.activityAssemblyFingerprint),
    stageReviewFingerprint: exactHash(input.stageReviewFingerprint),
    ownerIdentityFingerprint: exactHash(input.ownerIdentityFingerprint),
    confirmedAtIso: exactIso(input.confirmedAtIso),
    reason: exactReason(input.reason),
    contentClass: "production_candidate" as const,
    confirmationMode: "single_owner_explicit_two_step_confirmation" as const,
    planReadbackEvidence: "exact_generation_hash_size_content_type" as const,
    ownerInputReadbackEvidence:
      "exact_generation_hash_size_content_type" as const,
    ownerAuthenticationAuthority:
      "unverified_structural_claim_server_adapter_required" as const,
    humanConfirmationAuthority:
      "unverified_structural_confirmation_claim" as const,
    makerCheckerAuthority: "none_single_owner_mode" as const,
    specialistEvidenceAuthority: "none" as const,
    publicationDecisionAuthority: "none" as const,
    executionAuthority: "none" as const,
    publicationPolicy: "draft_only_no_consumer" as const,
    runtimeConsumer: false as const,
    releaseEligible: false as const,
    releaseAuthority: false as const,
  });
  const result = Object.freeze({
    ...body,
    confirmationFingerprint: hashCanonicalBody(body),
  });
  if (
    utf8ByteLengthV1(canonicalJsonV1(result)) >
    V2_OWNER_EPISODE_CONFIRMATION_MAX_BYTES_V1
  )
    fail();
  handles.add(result);
  return result;
}

export function isV2OwnerEpisodeConfirmationV1(
  value: unknown,
): value is V2OwnerEpisodeConfirmationV1 {
  return typeof value === "object" && value !== null && handles.has(value);
}

export function parseV2OwnerEpisodeConfirmationV1(
  raw: string,
  expected: Parameters<typeof materializeV2OwnerEpisodeConfirmationV1>[0],
): V2OwnerEpisodeConfirmationV1 {
  if (
    typeof raw !== "string" ||
    raw.length < 2 ||
    raw.length > V2_OWNER_EPISODE_CONFIRMATION_MAX_BYTES_V1 ||
    utf8ByteLengthV1(raw) > V2_OWNER_EPISODE_CONFIRMATION_MAX_BYTES_V1
  )
    fail();
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    fail();
  }
  if (canonicalJsonV1(decoded) !== raw) fail();
  const rebuilt = materializeV2OwnerEpisodeConfirmationV1(expected);
  if (canonicalJsonV1(rebuilt) !== raw) fail();
  return rebuilt;
}
