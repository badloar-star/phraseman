import { createHash } from "node:crypto";

import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  materializeLearningV2VoiceAudioDeviceEpisodeUploadAckV1,
  type LearningV2VoiceAudioDeviceEpisodeUploadAckV1,
} from "../../../modules/learning-v2/runtime/voice_audio_device_episode_upload_ack_v1";
import {
  materializeLearningV2VoiceAudioDevicePageUploadAckV1,
  type LearningV2VoiceAudioDevicePageUploadAckV1,
} from "../../../modules/learning-v2/runtime/voice_audio_device_page_upload_ack_v1";
import {
  isV2CanonicalSeasonPlanV2,
  type V2CanonicalSeasonPlanV2,
} from "./v2_canonical_generation_plan_v2";
import { createV2FirebaseAdminRepositoryIoV1 } from "./v2_firebase_admin_repository_io_v1";
import {
  resolveV2FirebaseVoiceAudioEpisodeReceiptMaterialV1,
  type V2FirebaseVoiceAudioEpisodeReceiptHandleV1,
} from "./v2_firebase_voice_audio_episode_receipt_adapter_v1";
import {
  V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
  persistV2ImmutableRepositoryObjectV1,
  type V2RepositoryImmutableObjectPinV1,
} from "./v2_firebase_repository_persistence_v1";
import {
  V2_VOICE_NATIVE_DECODER_EPISODE_MAX_BYTES_V1,
  materializeV2VoiceNativeDecoderEpisodeReceiptV1,
  parseV2VoiceNativeDecoderEpisodeReceiptV1,
  type V2VoiceNativeDecoderEpisodeReceiptV1,
} from "./v2_voice_native_decoder_episode_receipt_v1";
import {
  V2_VOICE_NATIVE_DECODER_PAGE_MAX_BYTES_V1,
  parseV2VoiceNativeDecoderPageReceiptV1,
  type V2VoiceNativeDecoderPageReceiptV1,
} from "./v2_voice_native_decoder_page_receipt_v1";
import {
  isV2VoiceAudioManifestV1,
  type V2VoiceAudioManifestV1,
} from "./v2_voice_audio_manifest_v1";
import { type V2VoiceAudioEpisodeReceiptV1 } from "./v2_voice_audio_episode_receipt_v1";
import {
  V2_VOICE_PCM_SIGNAL_EPISODE_MAX_BYTES_V1,
  materializeV2VoicePcmSignalEpisodeReceiptV1,
  parseV2VoicePcmSignalEpisodeReceiptV1,
  type V2VoicePcmSignalEpisodeReceiptV1,
} from "./v2_voice_pcm_signal_episode_receipt_v1";
import {
  V2_VOICE_PCM_SIGNAL_PAGE_MAX_BYTES_V1,
  parseV2VoicePcmSignalPageReceiptV1,
  type V2VoicePcmSignalPageReceiptV1,
} from "./v2_voice_pcm_signal_page_receipt_v1";
import {
  assembleV2VoiceDeviceObservationEpisodeV1,
  ingestV2VoiceDeviceObservationPageV1,
  type V2VoiceDeviceObservationPageIngestV1,
} from "./v2_voice_device_observation_ingest_v1";
import {
  V2_VOICE_DEVICE_PAGE_COMMIT_MAX_BYTES_V1,
  materializeV2VoiceDevicePageCommitV1,
  parseV2VoiceDevicePageCommitV1,
  type V2VoiceDevicePageCommitV1,
} from "./v2_voice_device_page_commit_v1";

export const V2_FIREBASE_VOICE_DEVICE_PAGE_RECEIPT_SUMMARY_SCHEMA_V1 =
  "v2-firebase-voice-device-page-receipt-summary.v1" as const;
export const V2_FIREBASE_VOICE_DEVICE_EPISODE_RECEIPT_SUMMARY_SCHEMA_V1 =
  "v2-firebase-voice-device-episode-receipt-summary.v1" as const;
export const V2_FIREBASE_VOICE_DEVICE_RECEIPT_PREFIX_V1 =
  "learning-v2/voice-device-receipts" as const;

export interface V2FirebaseVoiceDevicePageReceiptSummaryV1 {
  readonly schemaVersion: typeof V2_FIREBASE_VOICE_DEVICE_PAGE_RECEIPT_SUMMARY_SCHEMA_V1;
  readonly planFingerprint: string;
  readonly stageId: string;
  readonly episodeId: string;
  readonly manifestFingerprint: string;
  readonly audioEpisodeReceiptFingerprint: string;
  readonly pageStartIndex: number;
  readonly pageItemCount: number;
  readonly nextPageStartIndex: number | null;
  readonly platform: "ios" | "android";
  readonly deviceClass: "physical_device" | "simulator_or_emulator";
  readonly osVersion: string;
  readonly appBuildFingerprint: string;
  readonly decoderPageReceiptFingerprint: string;
  readonly decoderPageReceiptPin: V2RepositoryImmutableObjectPinV1;
  readonly pcmPageReceiptFingerprint: string;
  readonly pcmPageReceiptPin: V2RepositoryImmutableObjectPinV1;
  readonly pageCommitFingerprint: string;
  readonly pageCommitPin: V2RepositoryImmutableObjectPinV1;
  readonly pcmPageDisposition:
    | "candidate_for_human_listening"
    | "blocked_signal_quality"
    | "blocked_nonphysical_device";
  readonly persistenceAuthority: "firebase_admin_generation_pinned_receipt_readback";
  readonly ingestAuthority: "structural_serialized_observation_checks_only";
  readonly listeningEvidenceAuthority: "none";
  readonly deviceEvidenceAuthority: "none";
  readonly publicationAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly summaryFingerprint: string;
}

export interface V2FirebaseVoiceDeviceEpisodeReceiptSummaryV1 {
  readonly schemaVersion: typeof V2_FIREBASE_VOICE_DEVICE_EPISODE_RECEIPT_SUMMARY_SCHEMA_V1;
  readonly planFingerprint: string;
  readonly stageId: string;
  readonly episodeId: string;
  readonly manifestFingerprint: string;
  readonly audioEpisodeReceiptFingerprint: string;
  readonly platform: "ios" | "android";
  readonly deviceClass: "physical_device" | "simulator_or_emulator";
  readonly osVersion: string;
  readonly appBuildFingerprint: string;
  readonly audioObjectCount: number;
  readonly pageCount: number;
  readonly orderedPageCommitAggregateFingerprint: string;
  readonly decoderEpisodeReceiptFingerprint: string;
  readonly decoderEpisodeReceiptPin: V2RepositoryImmutableObjectPinV1;
  readonly pcmEpisodeReceiptFingerprint: string;
  readonly pcmEpisodeReceiptPin: V2RepositoryImmutableObjectPinV1;
  readonly pcmEpisodeDisposition:
    | "candidate_for_human_listening"
    | "blocked_signal_quality"
    | "blocked_nonphysical_device";
  readonly persistenceAuthority: "firebase_admin_generation_pinned_receipt_readback";
  readonly ingestAuthority: "structural_serialized_observation_checks_only";
  readonly listeningEvidenceAuthority: "none";
  readonly deviceEvidenceAuthority: "none";
  readonly publicationAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly summaryFingerprint: string;
}

export interface V2FirebaseVoiceDevicePageReceiptHandleV1 {
  readonly __opaqueV2FirebaseVoiceDevicePageReceiptHandleV1: unique symbol;
}

export interface V2FirebaseVoiceDeviceEpisodeReceiptHandleV1 {
  readonly __opaqueV2FirebaseVoiceDeviceEpisodeReceiptHandleV1: unique symbol;
}

interface PageMaterial {
  readonly plan: V2CanonicalSeasonPlanV2;
  readonly manifest: V2VoiceAudioManifestV1;
  readonly audioEpisodeReceiptHandle: V2FirebaseVoiceAudioEpisodeReceiptHandleV1;
  readonly ingest: V2VoiceDeviceObservationPageIngestV1;
  readonly decoderPageReceipt: V2VoiceNativeDecoderPageReceiptV1;
  readonly pcmPageReceipt: V2VoicePcmSignalPageReceiptV1;
  readonly pageCommit: V2VoiceDevicePageCommitV1;
  readonly summary: V2FirebaseVoiceDevicePageReceiptSummaryV1;
}

interface EpisodeMaterial {
  readonly plan: V2CanonicalSeasonPlanV2;
  readonly manifest: V2VoiceAudioManifestV1;
  readonly pageCommitPins: readonly V2RepositoryImmutableObjectPinV1[];
  readonly decoderEpisodeReceipt: V2VoiceNativeDecoderEpisodeReceiptV1;
  readonly pcmEpisodeReceipt: V2VoicePcmSignalEpisodeReceiptV1;
  readonly summary: V2FirebaseVoiceDeviceEpisodeReceiptSummaryV1;
}

export interface V2FirebaseVoiceDeviceEpisodeReceiptMaterialV1 {
  readonly plan: V2CanonicalSeasonPlanV2;
  readonly manifest: V2VoiceAudioManifestV1;
  readonly pageCommitPins: readonly V2RepositoryImmutableObjectPinV1[];
  readonly decoderEpisodeReceipt: V2VoiceNativeDecoderEpisodeReceiptV1;
  readonly pcmEpisodeReceipt: V2VoicePcmSignalEpisodeReceiptV1;
  readonly summary: V2FirebaseVoiceDeviceEpisodeReceiptSummaryV1;
}

export interface V2FirebaseVoiceDeviceObservationReceiptAdapterV1 {
  persistPage(input: {
    readonly plan: V2CanonicalSeasonPlanV2;
    readonly stageId: string;
    readonly manifest: V2VoiceAudioManifestV1;
    readonly audioEpisodeReceiptHandle: V2FirebaseVoiceAudioEpisodeReceiptHandleV1;
    readonly evidenceRaw: string;
  }): Promise<V2FirebaseVoiceDevicePageReceiptHandleV1>;
  persistEpisode(input: {
    readonly plan: V2CanonicalSeasonPlanV2;
    readonly stageId: string;
    readonly manifest: V2VoiceAudioManifestV1;
    readonly audioEpisodeReceiptHandle: V2FirebaseVoiceAudioEpisodeReceiptHandleV1;
    readonly pageHandles: readonly V2FirebaseVoiceDevicePageReceiptHandleV1[];
  }): Promise<V2FirebaseVoiceDeviceEpisodeReceiptHandleV1>;
  persistEpisodeFromPageCommits(input: {
    readonly plan: V2CanonicalSeasonPlanV2;
    readonly stageId: string;
    readonly manifest: V2VoiceAudioManifestV1;
    readonly audioEpisodeReceiptHandle: V2FirebaseVoiceAudioEpisodeReceiptHandleV1;
    readonly pageCommitPins: readonly V2RepositoryImmutableObjectPinV1[];
  }): Promise<V2FirebaseVoiceDeviceEpisodeReceiptHandleV1>;
}

const pageHandles = new WeakSet<object>();
const pageMetadata = new WeakMap<object, PageMaterial>();
const episodeHandles = new WeakSet<object>();
const episodeMetadata = new WeakMap<object, EpisodeMaterial>();
const encoder = new TextEncoder();

function fail(): never {
  throw new Error("v2_firebase_voice_device_observation_receipt_invalid");
}

function sha256Bytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function receiptObjectPath(input: {
  readonly planFingerprint: string;
  readonly stageId: string;
  readonly manifestFingerprint: string;
  readonly receiptKind:
    | "decoder-page"
    | "pcm-page"
    | "page-commit"
    | "decoder-episode"
    | "pcm-episode";
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
    fail();
  return `${V2_FIREBASE_VOICE_DEVICE_RECEIPT_PREFIX_V1}/${input.planFingerprint}/${hashCanonicalBody({ stageId: input.stageId })}/${input.manifestFingerprint}/${input.receiptKind}/${input.receiptFingerprint}/${input.rawHash}.json`;
}

async function persistAndReadRaw(input: {
  readonly storage: ReturnType<
    typeof createV2FirebaseAdminRepositoryIoV1
  >["storage"];
  readonly objectPath: string;
  readonly raw: string;
  readonly maximumBytes: number;
}): Promise<Readonly<{ raw: string; pin: V2RepositoryImmutableObjectPinV1 }>> {
  const bytes = encoder.encode(input.raw);
  const rawHash = sha256Utf8(input.raw);
  const persisted = await persistV2ImmutableRepositoryObjectV1({
    storage: input.storage,
    objectPath: input.objectPath,
    bytes,
    maximumBytes: input.maximumBytes,
    contentType: V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
    contentHash: rawHash,
  });
  const metadata = await input.storage.readMetadataExact(
    persisted.pin.objectPath,
  );
  const readback = await input.storage.downloadGenerationExact({
    objectPath: persisted.pin.objectPath,
    ifGenerationMatch: persisted.pin.objectGeneration,
    maximumBytes: input.maximumBytes,
  });
  if (
    metadata === null ||
    metadata.generation !== persisted.pin.objectGeneration ||
    metadata.contentHash !== rawHash ||
    metadata.byteSize !== bytes.byteLength ||
    metadata.contentType !== V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1 ||
    readback.kind !== "downloaded" ||
    sha256Bytes(readback.bytes) !== rawHash
  )
    fail();
  let raw: string;
  try {
    raw = new TextDecoder("utf-8", { fatal: true }).decode(readback.bytes);
  } catch {
    fail();
  }
  if (raw !== input.raw) fail();
  return Object.freeze({ raw, pin: persisted.pin });
}

async function readPinnedRaw(input: {
  readonly storage: ReturnType<
    typeof createV2FirebaseAdminRepositoryIoV1
  >["storage"];
  readonly pin: V2RepositoryImmutableObjectPinV1;
  readonly maximumBytes: number;
}): Promise<string> {
  const pin = input.pin;
  if (
    !pin ||
    typeof pin !== "object" ||
    Array.isArray(pin) ||
    Object.getPrototypeOf(pin) !== Object.prototype ||
    Object.keys(pin).sort().join("|") !==
      [
        "byteSize",
        "contentHash",
        "contentType",
        "objectGeneration",
        "objectPath",
      ]
        .sort()
        .join("|") ||
    !/^[a-f0-9]{64}$/u.test(pin.contentHash) ||
    !/^[1-9][0-9]{0,30}$/u.test(pin.objectGeneration) ||
    !Number.isSafeInteger(pin.byteSize) ||
    pin.byteSize < 2 ||
    pin.byteSize > input.maximumBytes ||
    pin.contentType !== V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1
  )
    fail();
  const metadata = await input.storage.readMetadataExact(pin.objectPath);
  if (
    metadata === null ||
    metadata.generation !== pin.objectGeneration ||
    metadata.contentHash !== pin.contentHash ||
    metadata.byteSize !== pin.byteSize ||
    metadata.contentType !== pin.contentType
  )
    fail();
  const readback = await input.storage.downloadGenerationExact({
    objectPath: pin.objectPath,
    ifGenerationMatch: pin.objectGeneration,
    maximumBytes: input.maximumBytes,
  });
  if (
    readback.kind !== "downloaded" ||
    readback.bytes.byteLength !== pin.byteSize ||
    sha256Bytes(readback.bytes) !== pin.contentHash
  )
    fail();
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(readback.bytes);
  } catch {
    fail();
  }
}

export function createFirebaseAdminV2VoiceDeviceObservationReceiptAdapterV1(): V2FirebaseVoiceDeviceObservationReceiptAdapterV1 {
  const io = createV2FirebaseAdminRepositoryIoV1();
  const persistEpisodeReceipts = async (input: {
    readonly plan: V2CanonicalSeasonPlanV2;
    readonly stageId: string;
    readonly manifest: V2VoiceAudioManifestV1;
    readonly audioEpisodeReceipt: V2VoiceAudioEpisodeReceiptV1;
    readonly decoderPages: readonly V2VoiceNativeDecoderPageReceiptV1[];
    readonly pcmPages: readonly V2VoicePcmSignalPageReceiptV1[];
    readonly pageCommitFingerprints: readonly string[];
    readonly pageCommitPins: readonly V2RepositoryImmutableObjectPinV1[];
  }): Promise<V2FirebaseVoiceDeviceEpisodeReceiptHandleV1> => {
    if (
      input.pageCommitFingerprints.length !== input.decoderPages.length ||
      input.pageCommitPins.length !== input.decoderPages.length ||
      input.pageCommitFingerprints.some(
        (value) => !/^[a-f0-9]{64}$/u.test(value),
      )
    )
      fail();
    const expectedDecoder = materializeV2VoiceNativeDecoderEpisodeReceiptV1({
      manifest: input.manifest,
      audioEpisodeReceipt: input.audioEpisodeReceipt,
      pages: input.decoderPages,
    });
    const decoderRaw = canonicalJsonV1(expectedDecoder);
    const decoderPersisted = await persistAndReadRaw({
      storage: io.storage,
      objectPath: receiptObjectPath({
        planFingerprint: input.plan.planFingerprint,
        stageId: input.stageId,
        manifestFingerprint: input.manifest.manifestFingerprint,
        receiptKind: "decoder-episode",
        receiptFingerprint: expectedDecoder.receiptFingerprint,
        rawHash: sha256Utf8(decoderRaw),
      }),
      raw: decoderRaw,
      maximumBytes: V2_VOICE_NATIVE_DECODER_EPISODE_MAX_BYTES_V1,
    });
    const decoderEpisodeReceipt = parseV2VoiceNativeDecoderEpisodeReceiptV1({
      raw: decoderPersisted.raw,
      manifest: input.manifest,
      audioEpisodeReceipt: input.audioEpisodeReceipt,
      pages: input.decoderPages,
    });
    const expectedPcm = materializeV2VoicePcmSignalEpisodeReceiptV1({
      manifest: input.manifest,
      audioEpisodeReceipt: input.audioEpisodeReceipt,
      decoderEpisodeReceipt,
      signalPages: input.pcmPages,
    });
    const pcmRaw = canonicalJsonV1(expectedPcm);
    const pcmPersisted = await persistAndReadRaw({
      storage: io.storage,
      objectPath: receiptObjectPath({
        planFingerprint: input.plan.planFingerprint,
        stageId: input.stageId,
        manifestFingerprint: input.manifest.manifestFingerprint,
        receiptKind: "pcm-episode",
        receiptFingerprint: expectedPcm.receiptFingerprint,
        rawHash: sha256Utf8(pcmRaw),
      }),
      raw: pcmRaw,
      maximumBytes: V2_VOICE_PCM_SIGNAL_EPISODE_MAX_BYTES_V1,
    });
    const pcmEpisodeReceipt = parseV2VoicePcmSignalEpisodeReceiptV1({
      raw: pcmPersisted.raw,
      manifest: input.manifest,
      audioEpisodeReceipt: input.audioEpisodeReceipt,
      decoderEpisodeReceipt,
      signalPages: input.pcmPages,
    });
    const first = input.decoderPages[0]!;
    const firstRow = first.rows[0]!;
    const body = {
      schemaVersion: V2_FIREBASE_VOICE_DEVICE_EPISODE_RECEIPT_SUMMARY_SCHEMA_V1,
      planFingerprint: input.plan.planFingerprint,
      stageId: input.stageId,
      episodeId: input.manifest.episodeId,
      manifestFingerprint: input.manifest.manifestFingerprint,
      audioEpisodeReceiptFingerprint:
        input.audioEpisodeReceipt.receiptFingerprint,
      platform: first.platform,
      deviceClass: first.deviceClass,
      osVersion: firstRow.osVersion,
      appBuildFingerprint: firstRow.appBuildFingerprint,
      audioObjectCount: input.manifest.audioObjectCount,
      pageCount: input.decoderPages.length,
      orderedPageCommitAggregateFingerprint: hashCanonicalBody(
        input.pageCommitFingerprints,
      ),
      decoderEpisodeReceiptFingerprint:
        decoderEpisodeReceipt.receiptFingerprint,
      decoderEpisodeReceiptPin: decoderPersisted.pin,
      pcmEpisodeReceiptFingerprint: pcmEpisodeReceipt.receiptFingerprint,
      pcmEpisodeReceiptPin: pcmPersisted.pin,
      pcmEpisodeDisposition: pcmEpisodeReceipt.episodeDisposition,
      persistenceAuthority:
        "firebase_admin_generation_pinned_receipt_readback" as const,
      ingestAuthority: "structural_serialized_observation_checks_only" as const,
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
    ) as V2FirebaseVoiceDeviceEpisodeReceiptHandleV1;
    episodeHandles.add(handle);
    episodeMetadata.set(
      handle,
      Object.freeze({
        plan: input.plan,
        manifest: input.manifest,
        pageCommitPins: Object.freeze(
          input.pageCommitPins.map((pin) => Object.freeze({ ...pin })),
        ),
        decoderEpisodeReceipt,
        pcmEpisodeReceipt,
        summary,
      }),
    );
    return handle;
  };
  return Object.freeze({
    persistPage: async (
      input: Parameters<
        V2FirebaseVoiceDeviceObservationReceiptAdapterV1["persistPage"]
      >[0],
    ) => {
      const ingest = ingestV2VoiceDeviceObservationPageV1(input);
      const audioMaterial = resolveV2FirebaseVoiceAudioEpisodeReceiptMaterialV1(
        {
          handle: input.audioEpisodeReceiptHandle,
          plan: input.plan,
          stageId: input.stageId,
          manifest: input.manifest,
        },
      );
      const decoderRaw = canonicalJsonV1(ingest.decoderPageReceipt);
      const pcmRaw = canonicalJsonV1(ingest.pcmPageReceipt);
      const decoderPersisted = await persistAndReadRaw({
        storage: io.storage,
        objectPath: receiptObjectPath({
          planFingerprint: input.plan.planFingerprint,
          stageId: input.stageId,
          manifestFingerprint: input.manifest.manifestFingerprint,
          receiptKind: "decoder-page",
          receiptFingerprint: ingest.decoderPageReceipt.receiptFingerprint,
          rawHash: sha256Utf8(decoderRaw),
        }),
        raw: decoderRaw,
        maximumBytes: V2_VOICE_NATIVE_DECODER_PAGE_MAX_BYTES_V1,
      });
      const decoderPageReceipt = parseV2VoiceNativeDecoderPageReceiptV1({
        raw: decoderPersisted.raw,
        manifest: input.manifest,
        audioEpisodeReceipt: audioMaterial.receipt,
      });
      const pcmPersisted = await persistAndReadRaw({
        storage: io.storage,
        objectPath: receiptObjectPath({
          planFingerprint: input.plan.planFingerprint,
          stageId: input.stageId,
          manifestFingerprint: input.manifest.manifestFingerprint,
          receiptKind: "pcm-page",
          receiptFingerprint: ingest.pcmPageReceipt.receiptFingerprint,
          rawHash: sha256Utf8(pcmRaw),
        }),
        raw: pcmRaw,
        maximumBytes: V2_VOICE_PCM_SIGNAL_PAGE_MAX_BYTES_V1,
      });
      const pcmPageReceipt = parseV2VoicePcmSignalPageReceiptV1({
        raw: pcmPersisted.raw,
        manifest: input.manifest,
        audioEpisodeReceipt: audioMaterial.receipt,
        decoderPage: decoderPageReceipt,
      });
      const pageCommit = materializeV2VoiceDevicePageCommitV1({
        planFingerprint: input.plan.planFingerprint,
        stageId: input.stageId,
        episodeId: input.manifest.episodeId,
        manifestFingerprint: input.manifest.manifestFingerprint,
        audioEpisodeReceiptFingerprint:
          audioMaterial.receipt.receiptFingerprint,
        stableProjectionFingerprint:
          ingest.evidence.stableProjectionFingerprint,
        evidenceFingerprint: ingest.evidence.evidenceFingerprint,
        pageRunFingerprint: ingest.evidence.pageRunFingerprint,
        pageStartIndex: decoderPageReceipt.pageStartIndex,
        pageItemCount: decoderPageReceipt.pageItemCount,
        nextPageStartIndex: decoderPageReceipt.nextPageStartIndex,
        platform: decoderPageReceipt.platform,
        deviceClass: decoderPageReceipt.deviceClass,
        osVersion: decoderPageReceipt.rows[0]!.osVersion,
        appBuildFingerprint: decoderPageReceipt.rows[0]!.appBuildFingerprint,
        decoderPageReceiptFingerprint: decoderPageReceipt.receiptFingerprint,
        decoderPageReceiptPin: decoderPersisted.pin,
        pcmPageReceiptFingerprint: pcmPageReceipt.receiptFingerprint,
        pcmPageReceiptPin: pcmPersisted.pin,
        pcmPageDisposition: pcmPageReceipt.pageDisposition,
      });
      const pageCommitRaw = canonicalJsonV1(pageCommit);
      const pageCommitPersisted = await persistAndReadRaw({
        storage: io.storage,
        objectPath: receiptObjectPath({
          planFingerprint: input.plan.planFingerprint,
          stageId: input.stageId,
          manifestFingerprint: input.manifest.manifestFingerprint,
          receiptKind: "page-commit",
          receiptFingerprint: pageCommit.commitFingerprint,
          rawHash: sha256Utf8(pageCommitRaw),
        }),
        raw: pageCommitRaw,
        maximumBytes: V2_VOICE_DEVICE_PAGE_COMMIT_MAX_BYTES_V1,
      });
      const coldPageCommit = parseV2VoiceDevicePageCommitV1(
        pageCommitPersisted.raw,
      );
      const body = {
        schemaVersion: V2_FIREBASE_VOICE_DEVICE_PAGE_RECEIPT_SUMMARY_SCHEMA_V1,
        planFingerprint: input.plan.planFingerprint,
        stageId: input.stageId,
        episodeId: input.manifest.episodeId,
        manifestFingerprint: input.manifest.manifestFingerprint,
        audioEpisodeReceiptFingerprint:
          audioMaterial.receipt.receiptFingerprint,
        pageStartIndex: decoderPageReceipt.pageStartIndex,
        pageItemCount: decoderPageReceipt.pageItemCount,
        nextPageStartIndex: decoderPageReceipt.nextPageStartIndex,
        platform: decoderPageReceipt.platform,
        deviceClass: decoderPageReceipt.deviceClass,
        osVersion: decoderPageReceipt.rows[0]!.osVersion,
        appBuildFingerprint: decoderPageReceipt.rows[0]!.appBuildFingerprint,
        decoderPageReceiptFingerprint: decoderPageReceipt.receiptFingerprint,
        decoderPageReceiptPin: decoderPersisted.pin,
        pcmPageReceiptFingerprint: pcmPageReceipt.receiptFingerprint,
        pcmPageReceiptPin: pcmPersisted.pin,
        pageCommitFingerprint: coldPageCommit.commitFingerprint,
        pageCommitPin: pageCommitPersisted.pin,
        pcmPageDisposition: pcmPageReceipt.pageDisposition,
        persistenceAuthority:
          "firebase_admin_generation_pinned_receipt_readback" as const,
        ingestAuthority:
          "structural_serialized_observation_checks_only" as const,
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
      ) as V2FirebaseVoiceDevicePageReceiptHandleV1;
      pageHandles.add(handle);
      pageMetadata.set(
        handle,
        Object.freeze({
          plan: input.plan,
          manifest: input.manifest,
          audioEpisodeReceiptHandle: input.audioEpisodeReceiptHandle,
          ingest,
          decoderPageReceipt,
          pcmPageReceipt,
          pageCommit: coldPageCommit,
          summary,
        }),
      );
      return handle;
    },
    persistEpisode: async (
      input: Parameters<
        V2FirebaseVoiceDeviceObservationReceiptAdapterV1["persistEpisode"]
      >[0],
    ) => {
      if (
        !isV2CanonicalSeasonPlanV2(input.plan) ||
        !isV2VoiceAudioManifestV1(input.manifest) ||
        input.manifest.planFingerprint !== input.plan.planFingerprint ||
        input.manifest.stageId !== input.stageId ||
        !Array.isArray(input.pageHandles) ||
        input.pageHandles.length < 1
      )
        fail();
      const audioMaterial = resolveV2FirebaseVoiceAudioEpisodeReceiptMaterialV1(
        {
          handle: input.audioEpisodeReceiptHandle,
          plan: input.plan,
          stageId: input.stageId,
          manifest: input.manifest,
        },
      );
      const pages: PageMaterial[] = input.pageHandles.map((handle) => {
        const value = pageMetadata.get(handle);
        if (
          !value ||
          value.plan !== input.plan ||
          value.manifest !== input.manifest ||
          value.audioEpisodeReceiptHandle !== input.audioEpisodeReceiptHandle
        )
          fail();
        return value;
      });
      assembleV2VoiceDeviceObservationEpisodeV1({
        manifest: input.manifest,
        audioEpisodeReceipt: audioMaterial.receipt,
        pages: pages.map((page) => page.ingest),
      });
      return persistEpisodeReceipts({
        plan: input.plan,
        stageId: input.stageId,
        manifest: input.manifest,
        audioEpisodeReceipt: audioMaterial.receipt,
        decoderPages: pages.map((page) => page.decoderPageReceipt),
        pcmPages: pages.map((page) => page.pcmPageReceipt),
        pageCommitFingerprints: pages.map(
          (page) => page.pageCommit.commitFingerprint,
        ),
        pageCommitPins: pages.map((page) => page.summary.pageCommitPin),
      });
    },
    persistEpisodeFromPageCommits: async (
      input: Parameters<
        V2FirebaseVoiceDeviceObservationReceiptAdapterV1["persistEpisodeFromPageCommits"]
      >[0],
    ) => {
      if (
        !isV2CanonicalSeasonPlanV2(input.plan) ||
        !isV2VoiceAudioManifestV1(input.manifest) ||
        input.manifest.planFingerprint !== input.plan.planFingerprint ||
        input.manifest.stageId !== input.stageId ||
        !Array.isArray(input.pageCommitPins) ||
        input.pageCommitPins.length < 1
      )
        fail();
      const audioMaterial = resolveV2FirebaseVoiceAudioEpisodeReceiptMaterialV1(
        {
          handle: input.audioEpisodeReceiptHandle,
          plan: input.plan,
          stageId: input.stageId,
          manifest: input.manifest,
        },
      );
      const commits: V2VoiceDevicePageCommitV1[] = [];
      const decoderPages: V2VoiceNativeDecoderPageReceiptV1[] = [];
      const pcmPages: V2VoicePcmSignalPageReceiptV1[] = [];
      for (const pin of input.pageCommitPins) {
        const raw = await readPinnedRaw({
          storage: io.storage,
          pin,
          maximumBytes: V2_VOICE_DEVICE_PAGE_COMMIT_MAX_BYTES_V1,
        });
        const commit = parseV2VoiceDevicePageCommitV1(raw);
        if (
          commit.planFingerprint !== input.plan.planFingerprint ||
          commit.stageId !== input.stageId ||
          commit.episodeId !== input.manifest.episodeId ||
          commit.manifestFingerprint !== input.manifest.manifestFingerprint ||
          commit.audioEpisodeReceiptFingerprint !==
            audioMaterial.receipt.receiptFingerprint ||
          pin.objectPath !==
            receiptObjectPath({
              planFingerprint: input.plan.planFingerprint,
              stageId: input.stageId,
              manifestFingerprint: input.manifest.manifestFingerprint,
              receiptKind: "page-commit",
              receiptFingerprint: commit.commitFingerprint,
              rawHash: pin.contentHash,
            })
        )
          fail();
        const decoderRaw = await readPinnedRaw({
          storage: io.storage,
          pin: commit.decoderPageReceiptPin,
          maximumBytes: V2_VOICE_NATIVE_DECODER_PAGE_MAX_BYTES_V1,
        });
        const decoderPage = parseV2VoiceNativeDecoderPageReceiptV1({
          raw: decoderRaw,
          manifest: input.manifest,
          audioEpisodeReceipt: audioMaterial.receipt,
        });
        if (
          decoderPage.receiptFingerprint !==
          commit.decoderPageReceiptFingerprint
        )
          fail();
        const pcmRaw = await readPinnedRaw({
          storage: io.storage,
          pin: commit.pcmPageReceiptPin,
          maximumBytes: V2_VOICE_PCM_SIGNAL_PAGE_MAX_BYTES_V1,
        });
        const pcmPage = parseV2VoicePcmSignalPageReceiptV1({
          raw: pcmRaw,
          manifest: input.manifest,
          audioEpisodeReceipt: audioMaterial.receipt,
          decoderPage,
        });
        if (
          pcmPage.receiptFingerprint !== commit.pcmPageReceiptFingerprint ||
          pcmPage.pageDisposition !== commit.pcmPageDisposition ||
          commits.some(
            (existing) =>
              existing.commitFingerprint === commit.commitFingerprint ||
              existing.pageStartIndex === commit.pageStartIndex,
          )
        )
          fail();
        commits.push(commit);
        decoderPages.push(decoderPage);
        pcmPages.push(pcmPage);
      }
      const order = decoderPages
        .map((page, index) => ({ index, pageStartIndex: page.pageStartIndex }))
        .sort((a, b) => a.pageStartIndex - b.pageStartIndex);
      return persistEpisodeReceipts({
        plan: input.plan,
        stageId: input.stageId,
        manifest: input.manifest,
        audioEpisodeReceipt: audioMaterial.receipt,
        decoderPages: order.map((entry) => decoderPages[entry.index]!),
        pcmPages: order.map((entry) => pcmPages[entry.index]!),
        pageCommitFingerprints: order.map(
          (entry) => commits[entry.index]!.commitFingerprint,
        ),
        pageCommitPins: order.map(
          (entry) => input.pageCommitPins[entry.index]!,
        ),
      });
    },
  });
}

export function isV2FirebaseVoiceDevicePageReceiptHandleV1(
  value: unknown,
): value is V2FirebaseVoiceDevicePageReceiptHandleV1 {
  return typeof value === "object" && value !== null && pageHandles.has(value);
}

export function isV2FirebaseVoiceDeviceEpisodeReceiptHandleV1(
  value: unknown,
): value is V2FirebaseVoiceDeviceEpisodeReceiptHandleV1 {
  return (
    typeof value === "object" && value !== null && episodeHandles.has(value)
  );
}

export function getV2FirebaseVoiceDevicePageReceiptSummaryV1(
  handle: V2FirebaseVoiceDevicePageReceiptHandleV1,
): V2FirebaseVoiceDevicePageReceiptSummaryV1 {
  const value = pageMetadata.get(handle);
  if (!value) fail();
  return value.summary;
}

export function getV2FirebaseVoiceDeviceEpisodeReceiptSummaryV1(
  handle: V2FirebaseVoiceDeviceEpisodeReceiptHandleV1,
): V2FirebaseVoiceDeviceEpisodeReceiptSummaryV1 {
  const value = episodeMetadata.get(handle);
  if (!value) fail();
  return value.summary;
}

export function resolveV2FirebaseVoiceDeviceEpisodeReceiptMaterialV1(input: {
  readonly handle: V2FirebaseVoiceDeviceEpisodeReceiptHandleV1;
  readonly plan: V2CanonicalSeasonPlanV2;
  readonly stageId: string;
  readonly manifest: V2VoiceAudioManifestV1;
}): V2FirebaseVoiceDeviceEpisodeReceiptMaterialV1 {
  const value = episodeMetadata.get(input.handle);
  if (
    !value ||
    value.plan !== input.plan ||
    value.manifest !== input.manifest ||
    value.summary.stageId !== input.stageId
  )
    fail();
  return value;
}

export function createLearningV2VoiceDevicePageUploadAckV1(input: {
  readonly pageHandle: V2FirebaseVoiceDevicePageReceiptHandleV1;
}): LearningV2VoiceAudioDevicePageUploadAckV1 {
  const value = pageMetadata.get(input.pageHandle);
  if (!value) fail();
  return materializeLearningV2VoiceAudioDevicePageUploadAckV1({
    manifestFingerprint: value.summary.manifestFingerprint,
    audioEpisodeReceiptFingerprint:
      value.summary.audioEpisodeReceiptFingerprint,
    stableProjectionFingerprint:
      value.ingest.evidence.stableProjectionFingerprint,
    evidenceFingerprint: value.ingest.evidence.evidenceFingerprint,
    pageRunFingerprint: value.ingest.evidence.pageRunFingerprint,
    pageStartIndex: value.summary.pageStartIndex,
    pageItemCount: value.summary.pageItemCount,
    nextPageStartIndex: value.summary.nextPageStartIndex,
    platform: value.summary.platform,
    deviceClass: value.summary.deviceClass,
    osVersion: value.summary.osVersion,
    appBuildFingerprint: value.summary.appBuildFingerprint,
    decoderPageReceiptFingerprint: value.summary.decoderPageReceiptFingerprint,
    pcmPageReceiptFingerprint: value.summary.pcmPageReceiptFingerprint,
    pageCommitFingerprint: value.summary.pageCommitFingerprint,
    pageCommitPin: {
      ...value.summary.pageCommitPin,
      contentType: V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
    },
  });
}

export function createLearningV2VoiceDeviceEpisodeUploadAckV1(input: {
  readonly episodeHandle: V2FirebaseVoiceDeviceEpisodeReceiptHandleV1;
}): LearningV2VoiceAudioDeviceEpisodeUploadAckV1 {
  const value = episodeMetadata.get(input.episodeHandle);
  if (!value) fail();
  return materializeLearningV2VoiceAudioDeviceEpisodeUploadAckV1({
    manifestFingerprint: value.summary.manifestFingerprint,
    audioEpisodeReceiptFingerprint:
      value.summary.audioEpisodeReceiptFingerprint,
    platform: value.summary.platform,
    deviceClass: value.summary.deviceClass,
    osVersion: value.summary.osVersion,
    appBuildFingerprint: value.summary.appBuildFingerprint,
    audioObjectCount: value.summary.audioObjectCount,
    pageCount: value.summary.pageCount,
    orderedPageCommitAggregateFingerprint:
      value.summary.orderedPageCommitAggregateFingerprint,
    decoderEpisodeReceiptFingerprint:
      value.summary.decoderEpisodeReceiptFingerprint,
    pcmEpisodeReceiptFingerprint: value.summary.pcmEpisodeReceiptFingerprint,
    pcmEpisodeDisposition: value.summary.pcmEpisodeDisposition,
  });
}
