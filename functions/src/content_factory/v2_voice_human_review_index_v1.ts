import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
  type V2RepositoryImmutableObjectPinV1,
} from "./v2_firebase_repository_persistence_v1";
import { type V2VoiceHumanReviewerRoleV1 } from "./v2_voice_human_review_contract_v1";

export const V2_VOICE_HUMAN_REVIEW_INDEX_SCHEMA_V1 =
  "v2-voice-human-review-index.v1" as const;
export const V2_VOICE_HUMAN_REVIEW_INDEX_COLLECTION_V1 =
  "content_v2_voice_human_reviews" as const;
export const V2_VOICE_HUMAN_REVIEW_INDEX_MAX_BYTES_V1 = 32 * 1024;

export interface V2VoiceHumanReviewIndexV1 {
  readonly schemaVersion: typeof V2_VOICE_HUMAN_REVIEW_INDEX_SCHEMA_V1;
  readonly planFingerprint: string;
  readonly stageId: string;
  readonly episodeId: string;
  readonly manifestFingerprint: string;
  readonly audioEpisodeReceiptFingerprint: string;
  readonly deviceEpisodeReceiptFingerprint: string;
  readonly reviewerRole: V2VoiceHumanReviewerRoleV1;
  readonly reviewerIdentityFingerprint: string;
  readonly reviewerCredentialFingerprint: string;
  readonly pageStartIndex: number;
  readonly pageItemCount: number;
  readonly nextPageStartIndex: number | null;
  readonly reviewFingerprint: string;
  readonly reviewPin: V2RepositoryImmutableObjectPinV1;
  readonly reviewerAuthentication: "firebase_admin_revocation_checked_id_token";
  readonly reviewerRoleAuthority: "authenticated_exact_voice_review_role_claim";
  readonly indexAuthority: "firebase_admin_direct_key_create_or_exact_replay";
  readonly publicationAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly indexFingerprint: string;
}

export type V2VoiceHumanReviewIndexDecisionV1 =
  | Readonly<{
      kind: "create";
      documentPath: string;
      canonicalRaw: string;
      next: V2VoiceHumanReviewIndexV1;
    }>
  | Readonly<{
      kind: "exact_replay";
      documentPath: string;
      committed: V2VoiceHumanReviewIndexV1;
    }>
  | Readonly<{ kind: "conflict"; documentPath: string }>;

const HASH_RE = /^[a-f0-9]{64}$/u;
const STAGE_RE = /^[A-Za-z0-9._:-]{1,160}$/u;
const GENERATION_RE = /^[1-9][0-9]{0,30}$/u;

function fail(): never {
  throw new Error("v2_voice_human_review_index_invalid");
}

function exactPin(value: V2RepositoryImmutableObjectPinV1) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Object.keys(value).sort().join("|") !==
      [
        "byteSize",
        "contentHash",
        "contentType",
        "objectGeneration",
        "objectPath",
      ]
        .sort()
        .join("|") ||
    typeof value.objectPath !== "string" ||
    !value.objectPath.startsWith("learning-v2/voice-human-reviews/") ||
    value.objectPath.length > 1_000 ||
    value.objectPath.includes("..") ||
    !HASH_RE.test(value.contentHash) ||
    !GENERATION_RE.test(value.objectGeneration) ||
    !Number.isSafeInteger(value.byteSize) ||
    value.byteSize < 1 ||
    value.byteSize > 128 * 1024 ||
    value.contentType !== V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1
  )
    fail();
  return Object.freeze({ ...value });
}

function preflight(value: unknown): void {
  const stack: (readonly [unknown, number])[] = [[value, 0]];
  let nodes = 0;
  while (stack.length > 0) {
    const [current, depth] = stack.pop()!;
    nodes += 1;
    if (nodes > 2_000 || depth > 16) fail();
    if (
      current === null ||
      typeof current === "string" ||
      typeof current === "boolean"
    )
      continue;
    if (typeof current === "number") {
      if (!Number.isSafeInteger(current) || Object.is(current, -0)) fail();
      continue;
    }
    if (typeof current !== "object") fail();
    if (Array.isArray(current)) {
      if (current.length > 32) fail();
      for (const item of current) stack.push([item, depth + 1]);
      continue;
    }
    if (Object.getPrototypeOf(current) !== Object.prototype) fail();
    const keys = Object.keys(current as Record<string, unknown>);
    if (keys.length > 32) fail();
    for (const key of keys) {
      if (["__proto__", "prototype", "constructor"].includes(key)) fail();
      stack.push([(current as Record<string, unknown>)[key], depth + 1]);
    }
  }
}

export function v2VoiceHumanReviewIndexDocumentPathV1(input: {
  readonly planFingerprint: string;
  readonly stageId: string;
  readonly manifestFingerprint: string;
  readonly reviewerRole: V2VoiceHumanReviewerRoleV1;
  readonly pageStartIndex: number;
}): string {
  if (
    !HASH_RE.test(input.planFingerprint) ||
    !STAGE_RE.test(input.stageId) ||
    !HASH_RE.test(input.manifestFingerprint) ||
    !["human_listening_specialist", "target_language_linguist"].includes(
      input.reviewerRole,
    ) ||
    !Number.isSafeInteger(input.pageStartIndex) ||
    input.pageStartIndex < 0
  )
    fail();
  return `${V2_VOICE_HUMAN_REVIEW_INDEX_COLLECTION_V1}/${hashCanonicalBody({
    planFingerprint: input.planFingerprint,
    stageId: input.stageId,
    manifestFingerprint: input.manifestFingerprint,
    reviewerRole: input.reviewerRole,
    pageStartIndex: input.pageStartIndex,
  })}`;
}

export function materializeV2VoiceHumanReviewIndexV1(input: {
  readonly planFingerprint: string;
  readonly stageId: string;
  readonly episodeId: string;
  readonly manifestFingerprint: string;
  readonly audioEpisodeReceiptFingerprint: string;
  readonly deviceEpisodeReceiptFingerprint: string;
  readonly reviewerRole: V2VoiceHumanReviewerRoleV1;
  readonly reviewerIdentityFingerprint: string;
  readonly reviewerCredentialFingerprint: string;
  readonly pageStartIndex: number;
  readonly pageItemCount: number;
  readonly nextPageStartIndex: number | null;
  readonly reviewFingerprint: string;
  readonly reviewPin: V2RepositoryImmutableObjectPinV1;
}): V2VoiceHumanReviewIndexV1 {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype ||
    !HASH_RE.test(input.planFingerprint) ||
    !STAGE_RE.test(input.stageId) ||
    !STAGE_RE.test(input.episodeId) ||
    !HASH_RE.test(input.manifestFingerprint) ||
    !HASH_RE.test(input.audioEpisodeReceiptFingerprint) ||
    !HASH_RE.test(input.deviceEpisodeReceiptFingerprint) ||
    !["human_listening_specialist", "target_language_linguist"].includes(
      input.reviewerRole,
    ) ||
    !HASH_RE.test(input.reviewerIdentityFingerprint) ||
    !HASH_RE.test(input.reviewerCredentialFingerprint) ||
    !Number.isSafeInteger(input.pageStartIndex) ||
    input.pageStartIndex < 0 ||
    !Number.isSafeInteger(input.pageItemCount) ||
    input.pageItemCount < 1 ||
    input.pageItemCount > 32 ||
    (input.nextPageStartIndex !== null &&
      input.nextPageStartIndex !==
        input.pageStartIndex + input.pageItemCount) ||
    !HASH_RE.test(input.reviewFingerprint)
  )
    fail();
  const body = {
    schemaVersion: V2_VOICE_HUMAN_REVIEW_INDEX_SCHEMA_V1,
    planFingerprint: input.planFingerprint,
    stageId: input.stageId,
    episodeId: input.episodeId,
    manifestFingerprint: input.manifestFingerprint,
    audioEpisodeReceiptFingerprint: input.audioEpisodeReceiptFingerprint,
    deviceEpisodeReceiptFingerprint: input.deviceEpisodeReceiptFingerprint,
    reviewerRole: input.reviewerRole,
    reviewerIdentityFingerprint: input.reviewerIdentityFingerprint,
    reviewerCredentialFingerprint: input.reviewerCredentialFingerprint,
    pageStartIndex: input.pageStartIndex,
    pageItemCount: input.pageItemCount,
    nextPageStartIndex: input.nextPageStartIndex,
    reviewFingerprint: input.reviewFingerprint,
    reviewPin: exactPin(input.reviewPin),
    reviewerAuthentication:
      "firebase_admin_revocation_checked_id_token" as const,
    reviewerRoleAuthority:
      "authenticated_exact_voice_review_role_claim" as const,
    indexAuthority: "firebase_admin_direct_key_create_or_exact_replay" as const,
    publicationAuthority: "none" as const,
    runtimeConsumer: false as const,
    releaseEligible: false as const,
    releaseAuthority: false as const,
  };
  const result = Object.freeze({
    ...body,
    indexFingerprint: hashCanonicalBody(body),
  });
  if (
    utf8ByteLengthV1(canonicalJsonV1(result)) >
    V2_VOICE_HUMAN_REVIEW_INDEX_MAX_BYTES_V1
  )
    fail();
  return result;
}

export function parseV2VoiceHumanReviewIndexV1(
  raw: string,
): V2VoiceHumanReviewIndexV1 {
  if (
    typeof raw !== "string" ||
    raw.length < 2 ||
    raw.length > V2_VOICE_HUMAN_REVIEW_INDEX_MAX_BYTES_V1 ||
    utf8ByteLengthV1(raw) > V2_VOICE_HUMAN_REVIEW_INDEX_MAX_BYTES_V1
  )
    fail();
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    fail();
  }
  preflight(value);
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    canonicalJsonV1(value) !== raw
  )
    fail();
  const candidate = value as V2VoiceHumanReviewIndexV1;
  const rebuilt = materializeV2VoiceHumanReviewIndexV1({
    planFingerprint: candidate.planFingerprint,
    stageId: candidate.stageId,
    episodeId: candidate.episodeId,
    manifestFingerprint: candidate.manifestFingerprint,
    audioEpisodeReceiptFingerprint: candidate.audioEpisodeReceiptFingerprint,
    deviceEpisodeReceiptFingerprint: candidate.deviceEpisodeReceiptFingerprint,
    reviewerRole: candidate.reviewerRole,
    reviewerIdentityFingerprint: candidate.reviewerIdentityFingerprint,
    reviewerCredentialFingerprint: candidate.reviewerCredentialFingerprint,
    pageStartIndex: candidate.pageStartIndex,
    pageItemCount: candidate.pageItemCount,
    nextPageStartIndex: candidate.nextPageStartIndex,
    reviewFingerprint: candidate.reviewFingerprint,
    reviewPin: candidate.reviewPin,
  });
  if (canonicalJsonV1(rebuilt) !== raw) fail();
  return rebuilt;
}

export function decideV2VoiceHumanReviewIndexV1(input: {
  readonly currentRaw: string | null;
  readonly proposed: V2VoiceHumanReviewIndexV1;
}): V2VoiceHumanReviewIndexDecisionV1 {
  const documentPath = v2VoiceHumanReviewIndexDocumentPathV1(input.proposed);
  const canonicalRaw = canonicalJsonV1(input.proposed);
  if (input.currentRaw === null)
    return Object.freeze({
      kind: "create" as const,
      documentPath,
      canonicalRaw,
      next: input.proposed,
    });
  let current: V2VoiceHumanReviewIndexV1;
  try {
    current = parseV2VoiceHumanReviewIndexV1(input.currentRaw);
  } catch {
    return Object.freeze({ kind: "conflict" as const, documentPath });
  }
  return canonicalJsonV1(current) === canonicalRaw
    ? Object.freeze({
        kind: "exact_replay" as const,
        documentPath,
        committed: current,
      })
    : Object.freeze({ kind: "conflict" as const, documentPath });
}
