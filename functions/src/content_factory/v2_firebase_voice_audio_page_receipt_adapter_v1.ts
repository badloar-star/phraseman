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
  V2_VOICE_AUDIO_PAGE_RECEIPT_MAX_BYTES_V1,
  V2_VOICE_AUDIO_PAGE_RECEIPT_MAX_ITEMS_V1,
  materializeV2VoiceAudioPageReceiptV1,
  parseV2VoiceAudioPageReceiptV1,
  type V2VoiceAudioPageReceiptV1,
} from "./v2_voice_audio_page_receipt_v1";
import {
  isV2VoiceAudioManifestV1,
  type V2VoiceAudioManifestV1,
} from "./v2_voice_audio_manifest_v1";
import { validateV2VoiceMp3CodecV1 } from "./v2_voice_mp3_codec_v1";

export const V2_FIREBASE_VOICE_AUDIO_PAGE_RECEIPT_SUMMARY_SCHEMA_V1 =
  "v2-firebase-voice-audio-page-receipt-summary.v1" as const;
export const V2_FIREBASE_VOICE_AUDIO_PAGE_RECEIPT_PREFIX_V1 =
  "learning-v2/voice-audio-page-receipts" as const;

export interface V2FirebaseVoiceAudioPageReceiptSummaryV1 {
  readonly schemaVersion: typeof V2_FIREBASE_VOICE_AUDIO_PAGE_RECEIPT_SUMMARY_SCHEMA_V1;
  readonly planFingerprint: string;
  readonly stageId: string;
  readonly episodeId: string;
  readonly manifestFingerprint: string;
  readonly pageStartIndex: number;
  readonly pageItemCount: number;
  readonly nextPageStartIndex: number | null;
  readonly receiptFingerprint: string;
  readonly receiptPin: V2RepositoryImmutableObjectPinV1;
  readonly orderedAudioReadbackAggregateFingerprint: string;
  readonly repositoryOriginAuthority: "none";
  readonly profileLifecycleAuthority: "none";
  readonly providerExecutionAuthority: "none";
  readonly audioByteAuthority: "firebase_admin_generation_pinned_page_readback";
  readonly codecEvidenceAuthority: "structural_mpeg_layer_iii_frames_revalidated";
  readonly decoderEvidenceAuthority: "none";
  readonly artifactStorageAuthority: "firebase_admin_generation_pinned_receipt_readback";
  readonly listeningEvidenceAuthority: "none";
  readonly deviceEvidenceAuthority: "none";
  readonly publicationAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly summaryFingerprint: string;
}

export interface V2FirebaseVoiceAudioPageReceiptHandleV1 {
  readonly __opaqueV2FirebaseVoiceAudioPageReceiptHandleV1: unique symbol;
}

export interface V2FirebaseVoiceAudioPageReceiptMaterialV1 {
  readonly plan: V2CanonicalSeasonPlanV2;
  readonly manifest: V2VoiceAudioManifestV1;
  readonly receipt: V2VoiceAudioPageReceiptV1;
  readonly summary: V2FirebaseVoiceAudioPageReceiptSummaryV1;
}

export interface V2FirebaseVoiceAudioPageReceiptAdapterV1 {
  readbackAndPersistPage(input: {
    readonly plan: V2CanonicalSeasonPlanV2;
    readonly stageId: string;
    readonly manifest: V2VoiceAudioManifestV1;
    readonly pageStartIndex: number;
  }): Promise<V2FirebaseVoiceAudioPageReceiptHandleV1>;
}

const handles = new WeakSet<object>();
const metadata = new WeakMap<
  object,
  V2FirebaseVoiceAudioPageReceiptMaterialV1
>();
const encoder = new TextEncoder();

function fail(code: string): never {
  throw new Error(code);
}

function sha256Bytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function v2FirebaseVoiceAudioPageReceiptObjectPathV1(input: {
  readonly planFingerprint: string;
  readonly stageId: string;
  readonly manifestFingerprint: string;
  readonly pageStartIndex: number;
  readonly receiptFingerprint: string;
  readonly rawHash: string;
}): string {
  if (
    !/^[a-f0-9]{64}$/u.test(input.planFingerprint) ||
    !/^[A-Za-z0-9._:-]{1,160}$/u.test(input.stageId) ||
    !/^[a-f0-9]{64}$/u.test(input.manifestFingerprint) ||
    !Number.isSafeInteger(input.pageStartIndex) ||
    input.pageStartIndex < 0 ||
    !/^[a-f0-9]{64}$/u.test(input.receiptFingerprint) ||
    !/^[a-f0-9]{64}$/u.test(input.rawHash)
  )
    fail("v2_firebase_voice_audio_page_receipt_path_invalid");
  return `${V2_FIREBASE_VOICE_AUDIO_PAGE_RECEIPT_PREFIX_V1}/${input.planFingerprint}/${hashCanonicalBody({ stageId: input.stageId })}/${input.manifestFingerprint}/${input.pageStartIndex}/${input.receiptFingerprint}/${input.rawHash}.json`;
}

export function createFirebaseAdminV2VoiceAudioPageReceiptAdapterV1(): V2FirebaseVoiceAudioPageReceiptAdapterV1 {
  const io = createV2FirebaseAdminRepositoryIoV1();
  return Object.freeze({
    readbackAndPersistPage: async (input: {
      readonly plan: V2CanonicalSeasonPlanV2;
      readonly stageId: string;
      readonly manifest: V2VoiceAudioManifestV1;
      readonly pageStartIndex: number;
    }) => {
      if (
        !isV2CanonicalSeasonPlanV2(input.plan) ||
        !isV2VoiceAudioManifestV1(input.manifest) ||
        input.manifest.planFingerprint !== input.plan.planFingerprint ||
        input.manifest.stageId !== input.stageId ||
        !Number.isSafeInteger(input.pageStartIndex) ||
        input.pageStartIndex < 0
      )
        fail("v2_firebase_voice_audio_page_receipt_input_invalid");
      const entries = input.manifest.sessionManifests.flatMap(
        (session) => session.entries,
      );
      if (
        entries.length !== input.manifest.audioObjectCount ||
        input.pageStartIndex >= entries.length
      )
        fail("v2_firebase_voice_audio_page_receipt_input_invalid");
      const pageEntries = entries.slice(
        input.pageStartIndex,
        input.pageStartIndex + V2_VOICE_AUDIO_PAGE_RECEIPT_MAX_ITEMS_V1,
      );
      const observations = [];
      const readbackRows = [];
      for (let offset = 0; offset < pageEntries.length; offset += 1) {
        const entry = pageEntries[offset]!;
        const objectMetadata = await io.storage.readMetadataExact(
          entry.objectPath,
        );
        if (
          objectMetadata === null ||
          objectMetadata.generation !== entry.objectGeneration ||
          objectMetadata.contentHash !== entry.contentHash ||
          objectMetadata.byteSize !== entry.byteSize ||
          objectMetadata.contentType !== "audio/mpeg"
        )
          fail("v2_firebase_voice_audio_page_metadata_mismatch");
        const download = await io.storage.downloadGenerationExact({
          objectPath: entry.objectPath,
          ifGenerationMatch: entry.objectGeneration,
          maximumBytes: entry.byteSize,
        });
        if (
          download.kind !== "downloaded" ||
          download.bytes.byteLength !== entry.byteSize ||
          sha256Bytes(download.bytes) !== entry.contentHash
        )
          fail("v2_firebase_voice_audio_page_readback_mismatch");
        const codec = validateV2VoiceMp3CodecV1(download.bytes);
        if (
          codec.rulesFingerprint !== entry.codecRulesFingerprint ||
          codec.resultFingerprint !== entry.codecResultFingerprint
        )
          fail("v2_firebase_voice_audio_page_codec_mismatch");
        const itemIndex = input.pageStartIndex + offset;
        observations.push(
          Object.freeze({
            itemIndex,
            generationTargetFingerprint: entry.generationTargetFingerprint,
            entryFingerprint: entry.entryFingerprint,
            objectPath: entry.objectPath,
            contentHash: entry.contentHash,
            objectGeneration: entry.objectGeneration,
            byteSize: entry.byteSize,
            contentType: "audio/mpeg" as const,
            codecRulesFingerprint: codec.rulesFingerprint,
            codecResultFingerprint: codec.resultFingerprint,
          }),
        );
        readbackRows.push(
          Object.freeze({
            itemIndex,
            entryFingerprint: entry.entryFingerprint,
            contentHash: entry.contentHash,
            objectGeneration: entry.objectGeneration,
            byteSize: entry.byteSize,
            codecResultFingerprint: codec.resultFingerprint,
          }),
        );
      }
      const receipt = materializeV2VoiceAudioPageReceiptV1({
        manifest: input.manifest,
        pageStartIndex: input.pageStartIndex,
        observations: Object.freeze(observations),
      });
      const raw = canonicalJsonV1(receipt);
      const rawHash = sha256Utf8(raw);
      const persisted = await persistV2ImmutableRepositoryObjectV1({
        storage: io.storage,
        objectPath: v2FirebaseVoiceAudioPageReceiptObjectPathV1({
          planFingerprint: input.plan.planFingerprint,
          stageId: input.stageId,
          manifestFingerprint: input.manifest.manifestFingerprint,
          pageStartIndex: input.pageStartIndex,
          receiptFingerprint: receipt.receiptFingerprint,
          rawHash,
        }),
        bytes: encoder.encode(raw),
        maximumBytes: V2_VOICE_AUDIO_PAGE_RECEIPT_MAX_BYTES_V1,
        contentType: V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
        contentHash: rawHash,
      });
      const receiptMetadata = await io.storage.readMetadataExact(
        persisted.pin.objectPath,
      );
      const receiptDownload = await io.storage.downloadGenerationExact({
        objectPath: persisted.pin.objectPath,
        ifGenerationMatch: persisted.pin.objectGeneration,
        maximumBytes: V2_VOICE_AUDIO_PAGE_RECEIPT_MAX_BYTES_V1,
      });
      if (
        receiptMetadata === null ||
        receiptMetadata.generation !== persisted.pin.objectGeneration ||
        receiptMetadata.contentHash !== rawHash ||
        receiptMetadata.byteSize !== encoder.encode(raw).byteLength ||
        receiptMetadata.contentType !==
          V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1 ||
        receiptDownload.kind !== "downloaded" ||
        sha256Bytes(receiptDownload.bytes) !== rawHash
      )
        fail("v2_firebase_voice_audio_page_receipt_readback_mismatch");
      let receiptRaw: string;
      try {
        receiptRaw = new TextDecoder("utf-8", { fatal: true }).decode(
          receiptDownload.bytes,
        );
      } catch {
        fail("v2_firebase_voice_audio_page_receipt_utf8_invalid");
      }
      const coldReceipt = parseV2VoiceAudioPageReceiptV1({
        raw: receiptRaw,
        manifest: input.manifest,
      });
      if (coldReceipt.receiptFingerprint !== receipt.receiptFingerprint)
        fail("v2_firebase_voice_audio_page_receipt_readback_mismatch");
      const body = {
        schemaVersion: V2_FIREBASE_VOICE_AUDIO_PAGE_RECEIPT_SUMMARY_SCHEMA_V1,
        planFingerprint: input.manifest.planFingerprint,
        stageId: input.manifest.stageId,
        episodeId: input.manifest.episodeId,
        manifestFingerprint: input.manifest.manifestFingerprint,
        pageStartIndex: coldReceipt.pageStartIndex,
        pageItemCount: coldReceipt.pageItemCount,
        nextPageStartIndex: coldReceipt.nextPageStartIndex,
        receiptFingerprint: coldReceipt.receiptFingerprint,
        receiptPin: persisted.pin,
        orderedAudioReadbackAggregateFingerprint:
          hashCanonicalBody(readbackRows),
        repositoryOriginAuthority: "none" as const,
        profileLifecycleAuthority: "none" as const,
        providerExecutionAuthority: "none" as const,
        audioByteAuthority:
          "firebase_admin_generation_pinned_page_readback" as const,
        codecEvidenceAuthority:
          "structural_mpeg_layer_iii_frames_revalidated" as const,
        decoderEvidenceAuthority: "none" as const,
        artifactStorageAuthority:
          "firebase_admin_generation_pinned_receipt_readback" as const,
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
      ) as V2FirebaseVoiceAudioPageReceiptHandleV1;
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

export function isV2FirebaseVoiceAudioPageReceiptHandleV1(
  value: unknown,
): value is V2FirebaseVoiceAudioPageReceiptHandleV1 {
  return typeof value === "object" && value !== null && handles.has(value);
}

export function getV2FirebaseVoiceAudioPageReceiptSummaryV1(
  handle: V2FirebaseVoiceAudioPageReceiptHandleV1,
): V2FirebaseVoiceAudioPageReceiptSummaryV1 {
  const value = metadata.get(handle);
  if (!value) fail("v2_firebase_voice_audio_page_receipt_handle_invalid");
  return value.summary;
}

export function resolveV2FirebaseVoiceAudioPageReceiptMaterialV1(input: {
  readonly handle: V2FirebaseVoiceAudioPageReceiptHandleV1;
  readonly plan: V2CanonicalSeasonPlanV2;
  readonly stageId: string;
  readonly manifest: V2VoiceAudioManifestV1;
}): V2FirebaseVoiceAudioPageReceiptMaterialV1 {
  const value = metadata.get(input.handle);
  if (
    !value ||
    value.plan !== input.plan ||
    value.manifest !== input.manifest ||
    value.summary.stageId !== input.stageId
  )
    fail("v2_firebase_voice_audio_page_receipt_handle_invalid");
  return value;
}
