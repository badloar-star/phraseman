import { createHash } from "node:crypto";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  isV2CanonicalSeasonPlanV2,
  type V2CanonicalSeasonPlanV2,
} from "./v2_canonical_generation_plan_v2";
import { createV2FirebaseAdminRepositoryIoV1 } from "./v2_firebase_admin_repository_io_v1";
import {
  V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
  persistV2ImmutableRepositoryObjectV1,
  type V2RepositoryImmutableObjectPinV1,
} from "./v2_firebase_repository_persistence_v1";
import {
  resolveV2FirebaseVoiceAudioPageReceiptMaterialV1,
  type V2FirebaseVoiceAudioPageReceiptHandleV1,
} from "./v2_firebase_voice_audio_page_receipt_adapter_v1";
import {
  V2_VOICE_AUDIO_EPISODE_RECEIPT_MAX_BYTES_V1,
  V2_VOICE_AUDIO_EPISODE_RECEIPT_MAX_PAGES_V1,
  materializeV2VoiceAudioEpisodeReceiptV1,
  parseV2VoiceAudioEpisodeReceiptV1,
  type V2VoiceAudioEpisodeReceiptV1,
} from "./v2_voice_audio_episode_receipt_v1";
import {
  isV2VoiceAudioManifestV1,
  type V2VoiceAudioManifestV1,
} from "./v2_voice_audio_manifest_v1";
import { V2_VOICE_AUDIO_PAGE_RECEIPT_MAX_ITEMS_V1 } from "./v2_voice_audio_page_receipt_v1";

export const V2_FIREBASE_VOICE_AUDIO_EPISODE_RECEIPT_SUMMARY_SCHEMA_V1 =
  "v2-firebase-voice-audio-episode-receipt-summary.v1" as const;
export const V2_FIREBASE_VOICE_AUDIO_EPISODE_RECEIPT_PREFIX_V1 =
  "learning-v2/voice-audio-episode-receipts" as const;

export interface V2FirebaseVoiceAudioEpisodeReceiptSummaryV1 {
  readonly schemaVersion: typeof V2_FIREBASE_VOICE_AUDIO_EPISODE_RECEIPT_SUMMARY_SCHEMA_V1;
  readonly planFingerprint: string;
  readonly stageId: string;
  readonly episodeId: string;
  readonly manifestFingerprint: string;
  readonly audioObjectCount: number;
  readonly pageCount: number;
  readonly orderedPageAggregateFingerprint: string;
  readonly receiptFingerprint: string;
  readonly receiptPin: V2RepositoryImmutableObjectPinV1;
  readonly repositoryOriginAuthority: "none";
  readonly profileLifecycleAuthority: "none";
  readonly providerExecutionAuthority: "none";
  readonly audioByteAuthority: "firebase_admin_generation_pinned_all_pages_bound_to_episode_receipt";
  readonly codecEvidenceAuthority: "structural_mpeg_layer_iii_all_pages_revalidated";
  readonly decoderEvidenceAuthority: "none";
  readonly artifactStorageAuthority: "firebase_admin_generation_pinned_episode_receipt_readback";
  readonly listeningEvidenceAuthority: "none";
  readonly deviceEvidenceAuthority: "none";
  readonly publicationAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly summaryFingerprint: string;
}

export interface V2FirebaseVoiceAudioEpisodeReceiptHandleV1 {
  readonly __opaqueV2FirebaseVoiceAudioEpisodeReceiptHandleV1: unique symbol;
}

export interface V2FirebaseVoiceAudioEpisodeReceiptMaterialV1 {
  readonly plan: V2CanonicalSeasonPlanV2;
  readonly manifest: V2VoiceAudioManifestV1;
  readonly receipt: V2VoiceAudioEpisodeReceiptV1;
  readonly summary: V2FirebaseVoiceAudioEpisodeReceiptSummaryV1;
}

export interface V2FirebaseVoiceAudioEpisodeReceiptAdapterV1 {
  commitAndColdReadEpisodeReceipt(input: {
    readonly plan: V2CanonicalSeasonPlanV2;
    readonly stageId: string;
    readonly manifest: V2VoiceAudioManifestV1;
    readonly pageHandles: readonly V2FirebaseVoiceAudioPageReceiptHandleV1[];
  }): Promise<V2FirebaseVoiceAudioEpisodeReceiptHandleV1>;
}

const handles = new WeakSet<object>();
const metadata = new WeakMap<
  object,
  V2FirebaseVoiceAudioEpisodeReceiptMaterialV1
>();
const encoder = new TextEncoder();

function fail(code: string): never {
  throw new Error(code);
}

function sha256Bytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function v2FirebaseVoiceAudioEpisodeReceiptObjectPathV1(input: {
  readonly planFingerprint: string;
  readonly stageId: string;
  readonly manifestFingerprint: string;
  readonly receiptFingerprint: string;
  readonly rawHash: string;
}): string {
  if (
    !/^[a-f0-9]{64}$/u.test(input.planFingerprint) ||
    !/^[A-Za-z0-9._:-]{1,160}$/u.test(input.stageId) ||
    !/^[a-f0-9]{64}$/u.test(input.manifestFingerprint) ||
    !/^[a-f0-9]{64}$/u.test(input.receiptFingerprint) ||
    !/^[a-f0-9]{64}$/u.test(input.rawHash)
  )
    fail("v2_firebase_voice_audio_episode_receipt_path_invalid");
  return `${V2_FIREBASE_VOICE_AUDIO_EPISODE_RECEIPT_PREFIX_V1}/${input.planFingerprint}/${hashCanonicalBody({ stageId: input.stageId })}/${input.manifestFingerprint}/${input.receiptFingerprint}/${input.rawHash}.json`;
}

export function createFirebaseAdminV2VoiceAudioEpisodeReceiptAdapterV1(): V2FirebaseVoiceAudioEpisodeReceiptAdapterV1 {
  const io = createV2FirebaseAdminRepositoryIoV1();
  return Object.freeze({
    commitAndColdReadEpisodeReceipt: async (input: {
      readonly plan: V2CanonicalSeasonPlanV2;
      readonly stageId: string;
      readonly manifest: V2VoiceAudioManifestV1;
      readonly pageHandles: readonly V2FirebaseVoiceAudioPageReceiptHandleV1[];
    }) => {
      const expectedPageCount = Math.ceil(
        input.manifest?.audioObjectCount /
          V2_VOICE_AUDIO_PAGE_RECEIPT_MAX_ITEMS_V1,
      );
      if (
        !isV2CanonicalSeasonPlanV2(input.plan) ||
        !isV2VoiceAudioManifestV1(input.manifest) ||
        input.manifest.planFingerprint !== input.plan.planFingerprint ||
        input.manifest.stageId !== input.stageId ||
        !Array.isArray(input.pageHandles) ||
        expectedPageCount < 1 ||
        expectedPageCount > V2_VOICE_AUDIO_EPISODE_RECEIPT_MAX_PAGES_V1 ||
        input.pageHandles.length !== expectedPageCount
      )
        fail("v2_firebase_voice_audio_episode_receipt_input_invalid");

      const pageMaterials = input.pageHandles.map((handle) =>
        resolveV2FirebaseVoiceAudioPageReceiptMaterialV1({
          handle,
          plan: input.plan,
          stageId: input.stageId,
          manifest: input.manifest,
        }),
      );
      const receipt = materializeV2VoiceAudioEpisodeReceiptV1({
        manifest: input.manifest,
        pages: Object.freeze(
          pageMaterials.map((page) =>
            Object.freeze({
              receipt: page.receipt,
              receiptPin: page.summary.receiptPin,
              audioReadbackAggregateFingerprint:
                page.summary.orderedAudioReadbackAggregateFingerprint,
            }),
          ),
        ),
      });
      const raw = canonicalJsonV1(receipt);
      const bytes = encoder.encode(raw);
      const rawHash = sha256Utf8(raw);
      const persisted = await persistV2ImmutableRepositoryObjectV1({
        storage: io.storage,
        objectPath: v2FirebaseVoiceAudioEpisodeReceiptObjectPathV1({
          planFingerprint: input.plan.planFingerprint,
          stageId: input.stageId,
          manifestFingerprint: input.manifest.manifestFingerprint,
          receiptFingerprint: receipt.receiptFingerprint,
          rawHash,
        }),
        bytes,
        maximumBytes: V2_VOICE_AUDIO_EPISODE_RECEIPT_MAX_BYTES_V1,
        contentType: V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
        contentHash: rawHash,
      });
      const receiptMetadata = await io.storage.readMetadataExact(
        persisted.pin.objectPath,
      );
      const receiptDownload = await io.storage.downloadGenerationExact({
        objectPath: persisted.pin.objectPath,
        ifGenerationMatch: persisted.pin.objectGeneration,
        maximumBytes: V2_VOICE_AUDIO_EPISODE_RECEIPT_MAX_BYTES_V1,
      });
      if (
        receiptMetadata === null ||
        receiptMetadata.generation !== persisted.pin.objectGeneration ||
        receiptMetadata.contentHash !== rawHash ||
        receiptMetadata.byteSize !== bytes.byteLength ||
        receiptMetadata.contentType !==
          V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1 ||
        receiptDownload.kind !== "downloaded" ||
        receiptDownload.bytes.byteLength !== bytes.byteLength ||
        sha256Bytes(receiptDownload.bytes) !== rawHash
      )
        fail("v2_firebase_voice_audio_episode_receipt_readback_mismatch");
      let receiptRaw: string;
      try {
        receiptRaw = new TextDecoder("utf-8", { fatal: true }).decode(
          receiptDownload.bytes,
        );
      } catch {
        fail("v2_firebase_voice_audio_episode_receipt_utf8_invalid");
      }
      const coldReceipt = parseV2VoiceAudioEpisodeReceiptV1({
        raw: receiptRaw,
        manifest: input.manifest,
        pageReceipts: Object.freeze(pageMaterials.map((page) => page.receipt)),
      });
      if (coldReceipt.receiptFingerprint !== receipt.receiptFingerprint)
        fail("v2_firebase_voice_audio_episode_receipt_readback_mismatch");

      const body = {
        schemaVersion:
          V2_FIREBASE_VOICE_AUDIO_EPISODE_RECEIPT_SUMMARY_SCHEMA_V1,
        planFingerprint: input.manifest.planFingerprint,
        stageId: input.manifest.stageId,
        episodeId: input.manifest.episodeId,
        manifestFingerprint: input.manifest.manifestFingerprint,
        audioObjectCount: coldReceipt.audioObjectCount,
        pageCount: coldReceipt.pageCount,
        orderedPageAggregateFingerprint:
          coldReceipt.orderedPageAggregateFingerprint,
        receiptFingerprint: coldReceipt.receiptFingerprint,
        receiptPin: persisted.pin,
        repositoryOriginAuthority: "none" as const,
        profileLifecycleAuthority: "none" as const,
        providerExecutionAuthority: "none" as const,
        audioByteAuthority:
          "firebase_admin_generation_pinned_all_pages_bound_to_episode_receipt" as const,
        codecEvidenceAuthority:
          "structural_mpeg_layer_iii_all_pages_revalidated" as const,
        decoderEvidenceAuthority: "none" as const,
        artifactStorageAuthority:
          "firebase_admin_generation_pinned_episode_receipt_readback" as const,
        listeningEvidenceAuthority: "none" as const,
        deviceEvidenceAuthority: "none" as const,
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
      ) as V2FirebaseVoiceAudioEpisodeReceiptHandleV1;
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
    },
  });
}

export function isV2FirebaseVoiceAudioEpisodeReceiptHandleV1(
  value: unknown,
): value is V2FirebaseVoiceAudioEpisodeReceiptHandleV1 {
  return typeof value === "object" && value !== null && handles.has(value);
}

export function getV2FirebaseVoiceAudioEpisodeReceiptSummaryV1(
  handle: V2FirebaseVoiceAudioEpisodeReceiptHandleV1,
): V2FirebaseVoiceAudioEpisodeReceiptSummaryV1 {
  const value = metadata.get(handle);
  if (!value) fail("v2_firebase_voice_audio_episode_receipt_handle_invalid");
  return value.summary;
}

export function resolveV2FirebaseVoiceAudioEpisodeReceiptMaterialV1(input: {
  readonly handle: V2FirebaseVoiceAudioEpisodeReceiptHandleV1;
  readonly plan: V2CanonicalSeasonPlanV2;
  readonly stageId: string;
  readonly manifest: V2VoiceAudioManifestV1;
}): V2FirebaseVoiceAudioEpisodeReceiptMaterialV1 {
  const value = metadata.get(input.handle);
  if (
    !value ||
    value.plan !== input.plan ||
    value.manifest !== input.manifest ||
    value.summary.stageId !== input.stageId
  )
    fail("v2_firebase_voice_audio_episode_receipt_handle_invalid");
  return value;
}
