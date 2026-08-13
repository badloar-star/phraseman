import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  isV2VoiceAudioEpisodeReceiptV1,
  type V2VoiceAudioEpisodeReceiptV1,
} from "./v2_voice_audio_episode_receipt_v1";
import {
  isV2VoiceAudioManifestV1,
  type V2VoiceAudioManifestV1,
} from "./v2_voice_audio_manifest_v1";
import {
  isV2VoicePcmSignalEpisodeReceiptV1,
  type V2VoicePcmSignalEpisodeReceiptV1,
} from "./v2_voice_pcm_signal_episode_receipt_v1";

export const V2_VOICE_HUMAN_REVIEW_SCHEMA_V1 =
  "v2-voice-human-review.v1" as const;
export const V2_VOICE_HUMAN_REVIEW_MAX_BYTES_V1 = 128 * 1024;
export const V2_VOICE_HUMAN_REVIEW_MAX_ITEMS_V1 = 32;

export type V2VoiceHumanReviewerRoleV1 =
  | "human_listening_specialist"
  | "target_language_linguist";

export interface V2VoiceHumanReviewItemV1 {
  readonly itemIndex: number;
  readonly generationTargetFingerprint: string;
  readonly entryFingerprint: string;
  readonly objectContentHash: string;
  readonly objectGeneration: string;
  readonly decision: "approved" | "changes_requested";
  readonly issueCodes: readonly string[];
  readonly itemFingerprint: string;
}

export interface V2VoiceHumanReviewV1 {
  readonly schemaVersion: typeof V2_VOICE_HUMAN_REVIEW_SCHEMA_V1;
  readonly planFingerprint: string;
  readonly stageId: string;
  readonly episodeId: string;
  readonly manifestFingerprint: string;
  readonly audioEpisodeReceiptFingerprint: string;
  readonly deviceEpisodeReceiptFingerprint: string;
  readonly reviewerRole: V2VoiceHumanReviewerRoleV1;
  readonly reviewerIdentityFingerprint: string;
  readonly reviewerCredentialFingerprint: string;
  readonly reviewOperationId: string;
  readonly reviewedAtMs: number;
  readonly pageStartIndex: number;
  readonly pageItemCount: number;
  readonly nextPageStartIndex: number | null;
  readonly items: readonly V2VoiceHumanReviewItemV1[];
  readonly orderedItemAggregateFingerprint: string;
  readonly pageDecision: "approved" | "changes_requested";
  readonly identitySource: "caller_supplied_unverified_review_claim";
  readonly reviewAuthority: "none";
  readonly repositoryOriginAuthority: "none";
  readonly contentOriginAuthority: "none";
  readonly publicationAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly reviewFingerprint: string;
}

const HASH_RE = /^[a-f0-9]{64}$/u;
const STAGE_RE = /^[A-Za-z0-9._:-]{1,160}$/u;
const OPERATION_RE = /^[A-Za-z0-9._:-]{1,128}$/u;
const ISSUE_RE = /^[a-z0-9._:-]{1,128}$/u;
const GENERATION_RE = /^[1-9][0-9]{0,30}$/u;
const handles = new WeakSet<object>();

function fail(): never {
  throw new Error("v2_voice_human_review_invalid");
}

function exactIssueCodes(value: readonly string[], decision: string) {
  if (
    !Array.isArray(value) ||
    value.length > 16 ||
    value.some((code) => !ISSUE_RE.test(code)) ||
    new Set(value).size !== value.length ||
    value.some((code, index) => index > 0 && code <= value[index - 1]!) ||
    (decision === "approved" ? value.length !== 0 : value.length < 1)
  )
    fail();
  return Object.freeze([...value]);
}

export function materializeV2VoiceHumanReviewV1(input: {
  readonly manifest: V2VoiceAudioManifestV1;
  readonly audioEpisodeReceipt: V2VoiceAudioEpisodeReceiptV1;
  readonly deviceEpisodeReceipt: V2VoicePcmSignalEpisodeReceiptV1;
  readonly reviewerRole: V2VoiceHumanReviewerRoleV1;
  readonly reviewerIdentityFingerprint: string;
  readonly reviewerCredentialFingerprint: string;
  readonly reviewOperationId: string;
  readonly reviewedAtMs: number;
  readonly pageStartIndex: number;
  readonly nextPageStartIndex: number | null;
  readonly decisions: readonly Readonly<{
    readonly itemIndex: number;
    readonly decision: "approved" | "changes_requested";
    readonly issueCodes: readonly string[];
  }>[];
}): V2VoiceHumanReviewV1 {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype ||
    !isV2VoiceAudioManifestV1(input.manifest) ||
    !isV2VoiceAudioEpisodeReceiptV1(input.audioEpisodeReceipt) ||
    !isV2VoicePcmSignalEpisodeReceiptV1(input.deviceEpisodeReceipt) ||
    input.audioEpisodeReceipt.manifestFingerprint !==
      input.manifest.manifestFingerprint ||
    input.deviceEpisodeReceipt.manifestFingerprint !==
      input.manifest.manifestFingerprint ||
    input.deviceEpisodeReceipt.audioEpisodeReceiptFingerprint !==
      input.audioEpisodeReceipt.receiptFingerprint ||
    input.deviceEpisodeReceipt.episodeDisposition !==
      "candidate_for_human_listening" ||
    !HASH_RE.test(input.manifest.planFingerprint) ||
    !STAGE_RE.test(input.manifest.stageId) ||
    !STAGE_RE.test(input.manifest.episodeId) ||
    !["human_listening_specialist", "target_language_linguist"].includes(
      input.reviewerRole,
    ) ||
    !HASH_RE.test(input.reviewerIdentityFingerprint) ||
    !HASH_RE.test(input.reviewerCredentialFingerprint) ||
    !OPERATION_RE.test(input.reviewOperationId) ||
    !Number.isSafeInteger(input.reviewedAtMs) ||
    input.reviewedAtMs < 0 ||
    !Number.isSafeInteger(input.pageStartIndex) ||
    input.pageStartIndex < 0 ||
    !Array.isArray(input.decisions) ||
    input.decisions.length < 1 ||
    input.decisions.length > V2_VOICE_HUMAN_REVIEW_MAX_ITEMS_V1 ||
    (input.nextPageStartIndex !== null &&
      input.nextPageStartIndex !==
        input.pageStartIndex + input.decisions.length)
  )
    fail();
  const manifestEntries = input.manifest.sessionManifests.flatMap(
    (session) => session.entries,
  );
  const devicePage = input.deviceEpisodeReceipt.pages.find(
    (page) => page.pageStartIndex === input.pageStartIndex,
  );
  if (
    manifestEntries.length !== input.manifest.audioObjectCount ||
    !devicePage ||
    devicePage.pageDisposition !== "candidate_for_human_listening" ||
    devicePage.pageItemCount !== input.decisions.length ||
    devicePage.nextPageStartIndex !== input.nextPageStartIndex
  )
    fail();
  const items = Object.freeze(
    input.decisions.map((decision, offset) => {
      const entry = manifestEntries[input.pageStartIndex + offset];
      if (
        !entry ||
        !decision ||
        typeof decision !== "object" ||
        Array.isArray(decision) ||
        Object.getPrototypeOf(decision) !== Object.prototype ||
        Object.keys(decision).sort().join("|") !==
          ["decision", "issueCodes", "itemIndex"].sort().join("|") ||
        decision.itemIndex !== input.pageStartIndex + offset ||
        !HASH_RE.test(entry.generationTargetFingerprint) ||
        !HASH_RE.test(entry.entryFingerprint) ||
        !HASH_RE.test(entry.contentHash) ||
        !GENERATION_RE.test(entry.objectGeneration) ||
        !["approved", "changes_requested"].includes(decision.decision)
      )
        fail();
      const body = {
        itemIndex: decision.itemIndex,
        generationTargetFingerprint: entry.generationTargetFingerprint,
        entryFingerprint: entry.entryFingerprint,
        objectContentHash: entry.contentHash,
        objectGeneration: entry.objectGeneration,
        decision: decision.decision,
        issueCodes: exactIssueCodes(decision.issueCodes, decision.decision),
      };
      return Object.freeze({
        ...body,
        itemFingerprint: hashCanonicalBody(body),
      });
    }),
  );
  const pageDecision = items.some(
    (item) => item.decision === "changes_requested",
  )
    ? ("changes_requested" as const)
    : ("approved" as const);
  const body = {
    schemaVersion: V2_VOICE_HUMAN_REVIEW_SCHEMA_V1,
    planFingerprint: input.manifest.planFingerprint,
    stageId: input.manifest.stageId,
    episodeId: input.manifest.episodeId,
    manifestFingerprint: input.manifest.manifestFingerprint,
    audioEpisodeReceiptFingerprint:
      input.audioEpisodeReceipt.receiptFingerprint,
    deviceEpisodeReceiptFingerprint:
      input.deviceEpisodeReceipt.receiptFingerprint,
    reviewerRole: input.reviewerRole,
    reviewerIdentityFingerprint: input.reviewerIdentityFingerprint,
    reviewerCredentialFingerprint: input.reviewerCredentialFingerprint,
    reviewOperationId: input.reviewOperationId,
    reviewedAtMs: input.reviewedAtMs,
    pageStartIndex: input.pageStartIndex,
    pageItemCount: items.length,
    nextPageStartIndex: input.nextPageStartIndex,
    items,
    orderedItemAggregateFingerprint: hashCanonicalBody(
      items.map((item) => item.itemFingerprint),
    ),
    pageDecision,
    identitySource: "caller_supplied_unverified_review_claim" as const,
    reviewAuthority: "none" as const,
    repositoryOriginAuthority: "none" as const,
    contentOriginAuthority: "none" as const,
    publicationAuthority: "none" as const,
    runtimeConsumer: false as const,
    releaseEligible: false as const,
    releaseAuthority: false as const,
  };
  const result = Object.freeze({
    ...body,
    reviewFingerprint: hashCanonicalBody(body),
  });
  if (
    utf8ByteLengthV1(canonicalJsonV1(result)) >
    V2_VOICE_HUMAN_REVIEW_MAX_BYTES_V1
  )
    fail();
  handles.add(result);
  return result;
}

export function isV2VoiceHumanReviewV1(
  value: unknown,
): value is V2VoiceHumanReviewV1 {
  return typeof value === "object" && value !== null && handles.has(value);
}

function preflightJson(value: unknown): void {
  const stack: (readonly [unknown, number])[] = [[value, 0]];
  let nodes = 0;
  while (stack.length > 0) {
    const [current, depth] = stack.pop()!;
    nodes += 1;
    if (nodes > 20_000 || depth > 32) fail();
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
      if (current.length > V2_VOICE_HUMAN_REVIEW_MAX_ITEMS_V1) fail();
      for (const item of current) stack.push([item, depth + 1]);
      continue;
    }
    if (Object.getPrototypeOf(current) !== Object.prototype) fail();
    const keys = Object.keys(current as Record<string, unknown>);
    if (keys.length > 40) fail();
    for (const key of keys) {
      if (key === "__proto__" || key === "prototype" || key === "constructor")
        fail();
      stack.push([(current as Record<string, unknown>)[key], depth + 1]);
    }
  }
}

export function parseV2VoiceHumanReviewV1(input: {
  readonly raw: string;
  readonly manifest: V2VoiceAudioManifestV1;
  readonly audioEpisodeReceipt: V2VoiceAudioEpisodeReceiptV1;
  readonly deviceEpisodeReceipt: V2VoicePcmSignalEpisodeReceiptV1;
}): V2VoiceHumanReviewV1 {
  if (
    typeof input.raw !== "string" ||
    input.raw.length < 2 ||
    input.raw.length > V2_VOICE_HUMAN_REVIEW_MAX_BYTES_V1 ||
    utf8ByteLengthV1(input.raw) > V2_VOICE_HUMAN_REVIEW_MAX_BYTES_V1
  )
    fail();
  let decoded: unknown;
  try {
    decoded = JSON.parse(input.raw);
  } catch {
    fail();
  }
  preflightJson(decoded);
  if (
    !decoded ||
    typeof decoded !== "object" ||
    Array.isArray(decoded) ||
    canonicalJsonV1(decoded) !== input.raw
  )
    fail();
  const candidate = decoded as V2VoiceHumanReviewV1;
  if (
    candidate.schemaVersion !== V2_VOICE_HUMAN_REVIEW_SCHEMA_V1 ||
    !Array.isArray(candidate.items)
  )
    fail();
  const rebuilt = materializeV2VoiceHumanReviewV1({
    manifest: input.manifest,
    audioEpisodeReceipt: input.audioEpisodeReceipt,
    deviceEpisodeReceipt: input.deviceEpisodeReceipt,
    reviewerRole: candidate.reviewerRole,
    reviewerIdentityFingerprint: candidate.reviewerIdentityFingerprint,
    reviewerCredentialFingerprint: candidate.reviewerCredentialFingerprint,
    reviewOperationId: candidate.reviewOperationId,
    reviewedAtMs: candidate.reviewedAtMs,
    pageStartIndex: candidate.pageStartIndex,
    nextPageStartIndex: candidate.nextPageStartIndex,
    decisions: candidate.items.map((item) => ({
      itemIndex: item.itemIndex,
      decision: item.decision,
      issueCodes: item.issueCodes,
    })),
  });
  if (canonicalJsonV1(rebuilt) !== input.raw) fail();
  return rebuilt;
}
