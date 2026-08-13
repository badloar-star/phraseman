import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  isV2VoiceAudioManifestV1,
  type V2VoiceAudioManifestV1,
} from "./v2_voice_audio_manifest_v1";
import {
  isV2VoiceHumanReviewV1,
  type V2VoiceHumanReviewV1,
} from "./v2_voice_human_review_contract_v1";
import {
  isV2VoicePcmSignalEpisodeReceiptV1,
  type V2VoicePcmSignalEpisodeReceiptV1,
} from "./v2_voice_pcm_signal_episode_receipt_v1";

export const V2_VOICE_HUMAN_EPISODE_REVIEW_RECEIPT_SCHEMA_V1 =
  "v2-voice-human-episode-review-receipt.v1" as const;
export const V2_VOICE_HUMAN_EPISODE_REVIEW_RECEIPT_MAX_BYTES_V1 = 512 * 1024;

export interface V2VoiceHumanEpisodeReviewRoleRowV1 {
  readonly reviewerRole:
    | "human_listening_specialist"
    | "target_language_linguist";
  readonly reviewerIdentityFingerprint: string;
  readonly pageCount: number;
  readonly reviewedItemCount: number;
  readonly changedItemCount: number;
  readonly pageReviewFingerprints: readonly string[];
  readonly orderedPageReviewAggregateFingerprint: string;
  readonly roleDecision: "approved" | "changes_requested";
  readonly roleFingerprint: string;
}

export interface V2VoiceHumanEpisodeReviewReceiptV1 {
  readonly schemaVersion: typeof V2_VOICE_HUMAN_EPISODE_REVIEW_RECEIPT_SCHEMA_V1;
  readonly planFingerprint: string;
  readonly stageId: string;
  readonly episodeId: string;
  readonly manifestFingerprint: string;
  readonly deviceEpisodeReceiptFingerprint: string;
  readonly audioObjectCount: number;
  readonly expectedPageCount: number;
  readonly roles: readonly [
    V2VoiceHumanEpisodeReviewRoleRowV1,
    V2VoiceHumanEpisodeReviewRoleRowV1,
  ];
  readonly makerCheckerState: "distinct_reviewers";
  readonly episodeDecision: "approved" | "changes_requested";
  readonly reviewAuthority: "none_structural_two_role_receipt";
  readonly publicationAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly receiptFingerprint: string;
}

const handles = new WeakSet<object>();

function fail(): never {
  throw new Error("v2_voice_human_episode_review_receipt_invalid");
}

function preflightJson(value: unknown): void {
  const stack: (readonly [unknown, number])[] = [[value, 0]];
  let nodes = 0;
  while (stack.length > 0) {
    const [current, depth] = stack.pop()!;
    nodes += 1;
    if (nodes > 80_000 || depth > 32) fail();
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
      if (current.length > 1_404) fail();
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

export function materializeV2VoiceHumanEpisodeReviewReceiptV1(input: {
  readonly manifest: V2VoiceAudioManifestV1;
  readonly deviceEpisodeReceipt: V2VoicePcmSignalEpisodeReceiptV1;
  readonly listeningReviews: readonly V2VoiceHumanReviewV1[];
  readonly linguistReviews: readonly V2VoiceHumanReviewV1[];
}): V2VoiceHumanEpisodeReviewReceiptV1 {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype ||
    Object.keys(input).sort().join("|") !==
      [
        "deviceEpisodeReceipt",
        "linguistReviews",
        "listeningReviews",
        "manifest",
      ]
        .sort()
        .join("|") ||
    !isV2VoiceAudioManifestV1(input.manifest) ||
    !isV2VoicePcmSignalEpisodeReceiptV1(input.deviceEpisodeReceipt) ||
    input.deviceEpisodeReceipt.planFingerprint !==
      input.manifest.planFingerprint ||
    input.deviceEpisodeReceipt.stageId !== input.manifest.stageId ||
    input.deviceEpisodeReceipt.episodeId !== input.manifest.episodeId ||
    input.deviceEpisodeReceipt.manifestFingerprint !==
      input.manifest.manifestFingerprint ||
    input.deviceEpisodeReceipt.audioObjectCount !==
      input.manifest.audioObjectCount ||
    input.deviceEpisodeReceipt.episodeDisposition !==
      "candidate_for_human_listening"
  )
    fail();
  const expectedPages = input.deviceEpisodeReceipt.pages;
  const buildRole = (
    reviewerRole: "human_listening_specialist" | "target_language_linguist",
    reviews: readonly V2VoiceHumanReviewV1[],
  ): V2VoiceHumanEpisodeReviewRoleRowV1 => {
    if (
      !Array.isArray(reviews) ||
      reviews.length !== expectedPages.length ||
      reviews.length < 1 ||
      reviews.some((review) => !isV2VoiceHumanReviewV1(review))
    )
      fail();
    let reviewedItemCount = 0;
    let changedItemCount = 0;
    let reviewerIdentityFingerprint: string | null = null;
    const pageReviewFingerprints = Object.freeze(
      reviews.map((review, index) => {
        const expected = expectedPages[index]!;
        if (
          review.reviewerRole !== reviewerRole ||
          review.planFingerprint !== input.manifest.planFingerprint ||
          review.stageId !== input.manifest.stageId ||
          review.episodeId !== input.manifest.episodeId ||
          review.manifestFingerprint !== input.manifest.manifestFingerprint ||
          review.deviceEpisodeReceiptFingerprint !==
            input.deviceEpisodeReceipt.receiptFingerprint ||
          review.audioEpisodeReceiptFingerprint !==
            input.deviceEpisodeReceipt.audioEpisodeReceiptFingerprint ||
          review.pageStartIndex !== expected.pageStartIndex ||
          review.pageItemCount !== expected.pageItemCount ||
          review.nextPageStartIndex !== expected.nextPageStartIndex ||
          (reviewerIdentityFingerprint !== null &&
            reviewerIdentityFingerprint !== review.reviewerIdentityFingerprint)
        )
          fail();
        reviewerIdentityFingerprint = review.reviewerIdentityFingerprint;
        reviewedItemCount += review.pageItemCount;
        changedItemCount += review.items.filter(
          (item: V2VoiceHumanReviewV1["items"][number]) =>
            item.decision === "changes_requested",
        ).length;
        return review.reviewFingerprint;
      }),
    );
    if (
      reviewedItemCount !== input.manifest.audioObjectCount ||
      reviewerIdentityFingerprint === null
    )
      fail();
    const body = {
      reviewerRole,
      reviewerIdentityFingerprint,
      pageCount: reviews.length,
      reviewedItemCount,
      changedItemCount,
      pageReviewFingerprints,
      orderedPageReviewAggregateFingerprint: hashCanonicalBody(
        pageReviewFingerprints,
      ),
      roleDecision:
        changedItemCount === 0
          ? ("approved" as const)
          : ("changes_requested" as const),
    };
    return Object.freeze({ ...body, roleFingerprint: hashCanonicalBody(body) });
  };
  const listening = buildRole(
    "human_listening_specialist",
    input.listeningReviews,
  );
  const linguist = buildRole("target_language_linguist", input.linguistReviews);
  if (
    listening.reviewerIdentityFingerprint ===
    linguist.reviewerIdentityFingerprint
  )
    fail();
  const roles = Object.freeze([listening, linguist]) as readonly [
    V2VoiceHumanEpisodeReviewRoleRowV1,
    V2VoiceHumanEpisodeReviewRoleRowV1,
  ];
  const body = {
    schemaVersion: V2_VOICE_HUMAN_EPISODE_REVIEW_RECEIPT_SCHEMA_V1,
    planFingerprint: input.manifest.planFingerprint,
    stageId: input.manifest.stageId,
    episodeId: input.manifest.episodeId,
    manifestFingerprint: input.manifest.manifestFingerprint,
    deviceEpisodeReceiptFingerprint:
      input.deviceEpisodeReceipt.receiptFingerprint,
    audioObjectCount: input.manifest.audioObjectCount,
    expectedPageCount: expectedPages.length,
    roles,
    makerCheckerState: "distinct_reviewers" as const,
    episodeDecision:
      listening.roleDecision === "approved" &&
      linguist.roleDecision === "approved"
        ? ("approved" as const)
        : ("changes_requested" as const),
    reviewAuthority: "none_structural_two_role_receipt" as const,
    publicationAuthority: "none" as const,
    runtimeConsumer: false as const,
    releaseEligible: false as const,
    releaseAuthority: false as const,
  };
  const result = Object.freeze({
    ...body,
    receiptFingerprint: hashCanonicalBody(body),
  });
  if (
    utf8ByteLengthV1(canonicalJsonV1(result)) >
    V2_VOICE_HUMAN_EPISODE_REVIEW_RECEIPT_MAX_BYTES_V1
  )
    fail();
  handles.add(result);
  return result;
}

export function isV2VoiceHumanEpisodeReviewReceiptV1(
  value: unknown,
): value is V2VoiceHumanEpisodeReviewReceiptV1 {
  return typeof value === "object" && value !== null && handles.has(value);
}

export function parseV2VoiceHumanEpisodeReviewReceiptV1(input: {
  readonly raw: string;
  readonly manifest: V2VoiceAudioManifestV1;
  readonly deviceEpisodeReceipt: V2VoicePcmSignalEpisodeReceiptV1;
  readonly listeningReviews: readonly V2VoiceHumanReviewV1[];
  readonly linguistReviews: readonly V2VoiceHumanReviewV1[];
}): V2VoiceHumanEpisodeReviewReceiptV1 {
  if (
    typeof input.raw !== "string" ||
    input.raw.length < 2 ||
    input.raw.length > V2_VOICE_HUMAN_EPISODE_REVIEW_RECEIPT_MAX_BYTES_V1 ||
    utf8ByteLengthV1(input.raw) >
      V2_VOICE_HUMAN_EPISODE_REVIEW_RECEIPT_MAX_BYTES_V1
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
  const rebuilt = materializeV2VoiceHumanEpisodeReviewReceiptV1({
    manifest: input.manifest,
    deviceEpisodeReceipt: input.deviceEpisodeReceipt,
    listeningReviews: input.listeningReviews,
    linguistReviews: input.linguistReviews,
  });
  if (canonicalJsonV1(rebuilt) !== input.raw) fail();
  return rebuilt;
}
