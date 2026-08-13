import { createHash } from "node:crypto";

import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
} from "../../../modules/learning-v2/policies/decision_registry";
import { type V2CanonicalSeasonPlanV2 } from "./v2_canonical_generation_plan_v2";
import { createV2FirebaseAdminRepositoryIoV1 } from "./v2_firebase_admin_repository_io_v1";
import {
  V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
  persistV2ImmutableRepositoryObjectV1,
  type V2RepositoryImmutableObjectPinV1,
} from "./v2_firebase_repository_persistence_v1";
import { type V2FirebaseVoiceAudioEpisodeReceiptHandleV1 } from "./v2_firebase_voice_audio_episode_receipt_adapter_v1";
import {
  resolveV2FirebaseVoiceDeviceEpisodeReceiptMaterialV1,
  type V2FirebaseVoiceDeviceEpisodeReceiptHandleV1,
} from "./v2_firebase_voice_device_observation_receipt_adapter_v1";
import {
  createFirebaseAdminV2VoiceHumanReviewAdapterV1,
  resolveV2FirebaseVoiceHumanReviewMaterialV1,
  type V2FirebaseVoiceHumanReviewHandleV1,
  type V2FirebaseVoiceHumanReviewMaterialV1,
} from "./v2_firebase_voice_human_review_adapter_v1";
import { type V2VoiceAudioManifestV1 } from "./v2_voice_audio_manifest_v1";
import {
  V2_VOICE_HUMAN_EPISODE_REVIEW_RECEIPT_MAX_BYTES_V1,
  materializeV2VoiceHumanEpisodeReviewReceiptV1,
  parseV2VoiceHumanEpisodeReviewReceiptV1,
  type V2VoiceHumanEpisodeReviewReceiptV1,
} from "./v2_voice_human_episode_review_receipt_v1";

export const V2_FIREBASE_VOICE_HUMAN_EPISODE_REVIEW_SUMMARY_SCHEMA_V1 =
  "v2-firebase-voice-human-episode-review-summary.v1" as const;
export const V2_FIREBASE_VOICE_HUMAN_EPISODE_REVIEW_PREFIX_V1 =
  "learning-v2/voice-human-episode-reviews" as const;

export interface V2FirebaseVoiceHumanEpisodeReviewSummaryV1 {
  readonly schemaVersion: typeof V2_FIREBASE_VOICE_HUMAN_EPISODE_REVIEW_SUMMARY_SCHEMA_V1;
  readonly planFingerprint: string;
  readonly stageId: string;
  readonly episodeId: string;
  readonly manifestFingerprint: string;
  readonly deviceEpisodeReceiptFingerprint: string;
  readonly listeningReviewerIdentityFingerprint: string;
  readonly linguistReviewerIdentityFingerprint: string;
  readonly listeningReviewStorageAggregateFingerprint: string;
  readonly linguistReviewStorageAggregateFingerprint: string;
  readonly receiptFingerprint: string;
  readonly receiptPin: V2RepositoryImmutableObjectPinV1;
  readonly episodeDecision: "approved" | "changes_requested";
  readonly reviewerAuthentication: "firebase_admin_two_distinct_exact_role_review_handles";
  readonly reviewAuthority: "authenticated_in_process_two_role_exact_episode_review";
  readonly artifactStorageAuthority: "firebase_admin_generation_pinned_episode_review_readback";
  readonly publicationAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly summaryFingerprint: string;
}

export interface V2FirebaseVoiceHumanEpisodeReviewHandleV1 {
  readonly __opaqueV2FirebaseVoiceHumanEpisodeReviewHandleV1: unique symbol;
}

export interface V2FirebaseVoiceHumanEpisodeReviewMaterialV1 {
  readonly plan: V2CanonicalSeasonPlanV2;
  readonly manifest: V2VoiceAudioManifestV1;
  readonly receipt: V2VoiceHumanEpisodeReviewReceiptV1;
  readonly summary: V2FirebaseVoiceHumanEpisodeReviewSummaryV1;
}

export interface V2FirebaseVoiceHumanEpisodeReviewAdapterV1 {
  commitAndColdReadEpisodeReview(input: {
    readonly plan: V2CanonicalSeasonPlanV2;
    readonly stageId: string;
    readonly manifest: V2VoiceAudioManifestV1;
    readonly deviceEpisodeReceiptHandle: V2FirebaseVoiceDeviceEpisodeReceiptHandleV1;
    readonly listeningReviewHandles: readonly V2FirebaseVoiceHumanReviewHandleV1[];
    readonly linguistReviewHandles: readonly V2FirebaseVoiceHumanReviewHandleV1[];
  }): Promise<V2FirebaseVoiceHumanEpisodeReviewHandleV1>;
  coldLoadAndCommitEpisodeReview(input: {
    readonly plan: V2CanonicalSeasonPlanV2;
    readonly stageId: string;
    readonly manifest: V2VoiceAudioManifestV1;
    readonly audioEpisodeReceiptHandle: V2FirebaseVoiceAudioEpisodeReceiptHandleV1;
    readonly deviceEpisodeReceiptHandle: V2FirebaseVoiceDeviceEpisodeReceiptHandleV1;
  }): Promise<V2FirebaseVoiceHumanEpisodeReviewHandleV1>;
}

const handles = new WeakSet<object>();
const metadata = new WeakMap<
  object,
  V2FirebaseVoiceHumanEpisodeReviewMaterialV1
>();
const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

function fail(): never {
  throw new Error("v2_firebase_voice_human_episode_review_invalid");
}

function rawHash(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function resolveReviews(input: {
  readonly role: "human_listening_specialist" | "target_language_linguist";
  readonly handles: readonly V2FirebaseVoiceHumanReviewHandleV1[];
  readonly plan: V2CanonicalSeasonPlanV2;
  readonly stageId: string;
  readonly manifest: V2VoiceAudioManifestV1;
}): readonly V2FirebaseVoiceHumanReviewMaterialV1[] {
  if (!Array.isArray(input.handles) || input.handles.length < 1) fail();
  return Object.freeze(
    input.handles.map((handle) =>
      resolveV2FirebaseVoiceHumanReviewMaterialV1({
        handle,
        plan: input.plan,
        stageId: input.stageId,
        manifest: input.manifest,
        reviewerRole: input.role,
      }),
    ),
  );
}

export function createFirebaseAdminV2VoiceHumanEpisodeReviewAdapterV1(): V2FirebaseVoiceHumanEpisodeReviewAdapterV1 {
  const io = createV2FirebaseAdminRepositoryIoV1();
  const commit = async (input: {
    readonly plan: V2CanonicalSeasonPlanV2;
    readonly stageId: string;
    readonly manifest: V2VoiceAudioManifestV1;
    readonly deviceEpisodeReceiptHandle: V2FirebaseVoiceDeviceEpisodeReceiptHandleV1;
    readonly listeningReviewHandles: readonly V2FirebaseVoiceHumanReviewHandleV1[];
    readonly linguistReviewHandles: readonly V2FirebaseVoiceHumanReviewHandleV1[];
  }) => {
    const device = resolveV2FirebaseVoiceDeviceEpisodeReceiptMaterialV1({
      handle: input.deviceEpisodeReceiptHandle,
      plan: input.plan,
      stageId: input.stageId,
      manifest: input.manifest,
    });
    const listening = resolveReviews({
      role: "human_listening_specialist",
      handles: input.listeningReviewHandles,
      plan: input.plan,
      stageId: input.stageId,
      manifest: input.manifest,
    });
    const linguist = resolveReviews({
      role: "target_language_linguist",
      handles: input.linguistReviewHandles,
      plan: input.plan,
      stageId: input.stageId,
      manifest: input.manifest,
    });
    const receipt = materializeV2VoiceHumanEpisodeReviewReceiptV1({
      manifest: input.manifest,
      deviceEpisodeReceipt: device.pcmEpisodeReceipt,
      listeningReviews: listening.map((value) => value.review),
      linguistReviews: linguist.map((value) => value.review),
    });
    const receiptRaw = canonicalJsonV1(receipt);
    const receiptRawHash = sha256Utf8(receiptRaw);
    const stageHash = hashCanonicalBody({ stageId: input.stageId });
    const objectPath = `${V2_FIREBASE_VOICE_HUMAN_EPISODE_REVIEW_PREFIX_V1}/${input.plan.planFingerprint}/${stageHash}/${input.manifest.manifestFingerprint}/${receipt.receiptFingerprint}/${receiptRawHash}.json`;
    const persisted = await persistV2ImmutableRepositoryObjectV1({
      storage: io.storage,
      objectPath,
      bytes: encoder.encode(receiptRaw),
      maximumBytes: V2_VOICE_HUMAN_EPISODE_REVIEW_RECEIPT_MAX_BYTES_V1,
      contentType: V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
      contentHash: receiptRawHash,
    });
    const storedMetadata = await io.storage.readMetadataExact(
      persisted.pin.objectPath,
    );
    const stored = await io.storage.downloadGenerationExact({
      objectPath: persisted.pin.objectPath,
      ifGenerationMatch: persisted.pin.objectGeneration,
      maximumBytes: V2_VOICE_HUMAN_EPISODE_REVIEW_RECEIPT_MAX_BYTES_V1,
    });
    if (
      storedMetadata === null ||
      storedMetadata.generation !== persisted.pin.objectGeneration ||
      storedMetadata.byteSize !== persisted.pin.byteSize ||
      storedMetadata.contentHash !== persisted.pin.contentHash ||
      storedMetadata.contentType !==
        V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1 ||
      stored.kind !== "downloaded" ||
      stored.bytes.byteLength !== persisted.pin.byteSize ||
      rawHash(stored.bytes) !== persisted.pin.contentHash
    )
      fail();
    let coldRaw: string;
    try {
      coldRaw = decoder.decode(stored.bytes);
    } catch {
      fail();
    }
    const coldReceipt = parseV2VoiceHumanEpisodeReviewReceiptV1({
      raw: coldRaw,
      manifest: input.manifest,
      deviceEpisodeReceipt: device.pcmEpisodeReceipt,
      listeningReviews: listening.map((value) => value.review),
      linguistReviews: linguist.map((value) => value.review),
    });
    if (
      coldReceipt.receiptFingerprint !== receipt.receiptFingerprint ||
      coldReceipt.planFingerprint !== input.plan.planFingerprint ||
      coldReceipt.stageId !== input.stageId
    )
      fail();
    const listeningRole = coldReceipt.roles[0];
    const linguistRole = coldReceipt.roles[1];
    const body = {
      schemaVersion: V2_FIREBASE_VOICE_HUMAN_EPISODE_REVIEW_SUMMARY_SCHEMA_V1,
      planFingerprint: coldReceipt.planFingerprint,
      stageId: coldReceipt.stageId,
      episodeId: coldReceipt.episodeId,
      manifestFingerprint: coldReceipt.manifestFingerprint,
      deviceEpisodeReceiptFingerprint:
        coldReceipt.deviceEpisodeReceiptFingerprint,
      listeningReviewerIdentityFingerprint:
        listeningRole.reviewerIdentityFingerprint,
      linguistReviewerIdentityFingerprint:
        linguistRole.reviewerIdentityFingerprint,
      listeningReviewStorageAggregateFingerprint: hashCanonicalBody(
        listening.map((value) => value.summary.reviewPin),
      ),
      linguistReviewStorageAggregateFingerprint: hashCanonicalBody(
        linguist.map((value) => value.summary.reviewPin),
      ),
      receiptFingerprint: coldReceipt.receiptFingerprint,
      receiptPin: persisted.pin,
      episodeDecision: coldReceipt.episodeDecision,
      reviewerAuthentication:
        "firebase_admin_two_distinct_exact_role_review_handles" as const,
      reviewAuthority:
        "authenticated_in_process_two_role_exact_episode_review" as const,
      artifactStorageAuthority:
        "firebase_admin_generation_pinned_episode_review_readback" as const,
      publicationAuthority: "none" as const,
      runtimeConsumer: false as const,
      releaseEligible: false as const,
      releaseAuthority: false as const,
    };
    const summary = Object.freeze({
      ...body,
      summaryFingerprint: hashCanonicalBody(body),
    });
    const handle = Object.freeze(
      {},
    ) as V2FirebaseVoiceHumanEpisodeReviewHandleV1;
    handles.add(handle);
    metadata.set(
      handle,
      Object.freeze({
        plan: input.plan,
        manifest: input.manifest,
        receipt: coldReceipt,
        summary,
      }),
    );
    return handle;
  };
  return Object.freeze({
    commitAndColdReadEpisodeReview: async (
      input: Parameters<
        V2FirebaseVoiceHumanEpisodeReviewAdapterV1["commitAndColdReadEpisodeReview"]
      >[0],
    ) => {
      return commit(input);
    },
    coldLoadAndCommitEpisodeReview: async (
      input: Parameters<
        V2FirebaseVoiceHumanEpisodeReviewAdapterV1["coldLoadAndCommitEpisodeReview"]
      >[0],
    ) => {
      const device = resolveV2FirebaseVoiceDeviceEpisodeReceiptMaterialV1({
        handle: input.deviceEpisodeReceiptHandle,
        plan: input.plan,
        stageId: input.stageId,
        manifest: input.manifest,
      });
      const reviewer = createFirebaseAdminV2VoiceHumanReviewAdapterV1();
      const pageStarts = device.pcmEpisodeReceipt.pages.map(
        (page) => page.pageStartIndex,
      );
      const loadRole = async (
        reviewerRole: "human_listening_specialist" | "target_language_linguist",
      ) =>
        Promise.all(
          pageStarts.map((pageStartIndex) =>
            reviewer.coldLoadReviewPage({
              plan: input.plan,
              stageId: input.stageId,
              manifest: input.manifest,
              audioEpisodeReceiptHandle: input.audioEpisodeReceiptHandle,
              deviceEpisodeReceiptHandle: input.deviceEpisodeReceiptHandle,
              reviewerRole,
              pageStartIndex,
            }),
          ),
        );
      const listeningReviewHandles = await loadRole(
        "human_listening_specialist",
      );
      const linguistReviewHandles = await loadRole("target_language_linguist");
      return commit({
        plan: input.plan,
        stageId: input.stageId,
        manifest: input.manifest,
        deviceEpisodeReceiptHandle: input.deviceEpisodeReceiptHandle,
        listeningReviewHandles,
        linguistReviewHandles,
      });
    },
  });
}

export function isV2FirebaseVoiceHumanEpisodeReviewHandleV1(
  value: unknown,
): value is V2FirebaseVoiceHumanEpisodeReviewHandleV1 {
  return typeof value === "object" && value !== null && handles.has(value);
}

export function getV2FirebaseVoiceHumanEpisodeReviewSummaryV1(
  handle: V2FirebaseVoiceHumanEpisodeReviewHandleV1,
): V2FirebaseVoiceHumanEpisodeReviewSummaryV1 {
  const value = metadata.get(handle);
  if (!value) fail();
  return value.summary;
}

export function resolveV2FirebaseVoiceHumanEpisodeReviewMaterialV1(input: {
  readonly handle: V2FirebaseVoiceHumanEpisodeReviewHandleV1;
  readonly plan: V2CanonicalSeasonPlanV2;
  readonly stageId: string;
  readonly manifest: V2VoiceAudioManifestV1;
}): V2FirebaseVoiceHumanEpisodeReviewMaterialV1 {
  const value = metadata.get(input.handle);
  if (
    !value ||
    value.plan !== input.plan ||
    value.manifest !== input.manifest ||
    value.summary.stageId !== input.stageId
  )
    fail();
  return value;
}
