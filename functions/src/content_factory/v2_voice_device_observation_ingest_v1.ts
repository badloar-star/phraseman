import {
  hashCanonicalBody,
  sha256Utf8,
  utf8ByteLengthV1,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  LEARNING_V2_VOICE_AUDIO_DEVICE_PAGE_EVIDENCE_MAX_BYTES_V1,
  parseLearningV2VoiceAudioDevicePageEvidenceV1,
  type LearningV2VoiceAudioDevicePageEvidenceV1,
} from "../../../modules/learning-v2/runtime/voice_audio_device_page_evidence_v1";
import { learningV2VoiceAudioDeviceStableProjectionFingerprintV1 } from "../../../modules/learning-v2/runtime/voice_audio_device_page_v1";
import {
  isV2CanonicalSeasonPlanV2,
  type V2CanonicalSeasonPlanV2,
} from "./v2_canonical_generation_plan_v2";
import {
  resolveV2FirebaseVoiceAudioEpisodeReceiptMaterialV1,
  type V2FirebaseVoiceAudioEpisodeReceiptHandleV1,
} from "./v2_firebase_voice_audio_episode_receipt_adapter_v1";
import {
  materializeV2VoiceNativeDecoderEpisodeReceiptV1,
  type V2VoiceNativeDecoderEpisodeReceiptV1,
} from "./v2_voice_native_decoder_episode_receipt_v1";
import {
  materializeV2VoiceNativeDecoderPageReceiptV1,
  type V2VoiceNativeDecoderPageReceiptV1,
} from "./v2_voice_native_decoder_page_receipt_v1";
import {
  isV2VoiceAudioManifestV1,
  type V2VoiceAudioManifestV1,
} from "./v2_voice_audio_manifest_v1";
import {
  materializeV2VoicePcmSignalEpisodeReceiptV1,
  type V2VoicePcmSignalEpisodeReceiptV1,
} from "./v2_voice_pcm_signal_episode_receipt_v1";
import {
  materializeV2VoicePcmSignalPageReceiptV1,
  type V2VoicePcmSignalPageReceiptV1,
} from "./v2_voice_pcm_signal_page_receipt_v1";

export const V2_VOICE_DEVICE_OBSERVATION_PAGE_INGEST_SCHEMA_V1 =
  "v2-voice-device-observation-page-ingest.v1" as const;
export const V2_VOICE_DEVICE_OBSERVATION_EPISODE_INGEST_SCHEMA_V1 =
  "v2-voice-device-observation-episode-ingest.v1" as const;

export interface V2VoiceDeviceObservationPageIngestV1 {
  readonly schemaVersion: typeof V2_VOICE_DEVICE_OBSERVATION_PAGE_INGEST_SCHEMA_V1;
  readonly evidenceFingerprint: string;
  readonly evidenceRawHash: string;
  readonly evidenceByteSize: number;
  readonly evidence: LearningV2VoiceAudioDevicePageEvidenceV1;
  readonly decoderPageReceipt: V2VoiceNativeDecoderPageReceiptV1;
  readonly pcmPageReceipt: V2VoicePcmSignalPageReceiptV1;
  readonly ingestAuthority: "structural_serialized_observation_checks_only";
  readonly artifactStorageAuthority: "none";
  readonly deviceEvidenceAuthority: "none";
  readonly listeningEvidenceAuthority: "none";
  readonly publicationAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly ingestFingerprint: string;
}

export interface V2VoiceDeviceObservationEpisodeIngestV1 {
  readonly schemaVersion: typeof V2_VOICE_DEVICE_OBSERVATION_EPISODE_INGEST_SCHEMA_V1;
  readonly pageCount: number;
  readonly audioObjectCount: number;
  readonly pages: readonly V2VoiceDeviceObservationPageIngestV1[];
  readonly decoderEpisodeReceipt: V2VoiceNativeDecoderEpisodeReceiptV1;
  readonly pcmEpisodeReceipt: V2VoicePcmSignalEpisodeReceiptV1;
  readonly orderedPageIngestAggregateFingerprint: string;
  readonly ingestAuthority: "structural_serialized_observation_checks_only";
  readonly artifactStorageAuthority: "none";
  readonly deviceEvidenceAuthority: "none";
  readonly listeningEvidenceAuthority: "none";
  readonly publicationAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly ingestFingerprint: string;
}

const pageHandles = new WeakSet<object>();
const episodeHandles = new WeakSet<object>();

function fail(): never {
  throw new Error("v2_voice_device_observation_ingest_invalid");
}

function expectedStableProjectionFingerprint(input: {
  readonly manifest: V2VoiceAudioManifestV1;
  readonly audioEpisodeReceipt: {
    readonly receiptFingerprint: string;
    readonly pages: readonly {
      readonly pageStartIndex: number;
      readonly pageItemCount: number;
      readonly nextPageStartIndex: number | null;
      readonly pageReceiptFingerprint: string;
      readonly pageAudioReadbackAggregateFingerprint: string;
    }[];
  };
  readonly evidence: LearningV2VoiceAudioDevicePageEvidenceV1;
}): string {
  const receiptPage = input.audioEpisodeReceipt.pages.find(
    (page) => page.pageStartIndex === input.evidence.pageStartIndex,
  );
  if (
    !receiptPage ||
    receiptPage.pageItemCount !== input.evidence.pageItemCount ||
    receiptPage.nextPageStartIndex !== input.evidence.nextPageStartIndex ||
    receiptPage.pageReceiptFingerprint !==
      input.evidence.audioPageReceiptFingerprint
  )
    fail();
  const entries = input.manifest.sessionManifests.flatMap(
    (session) => session.entries,
  );
  const pageEntries = entries.slice(
    receiptPage.pageStartIndex,
    receiptPage.pageStartIndex + receiptPage.pageItemCount,
  );
  if (pageEntries.length !== receiptPage.pageItemCount) fail();
  return learningV2VoiceAudioDeviceStableProjectionFingerprintV1({
    manifestFingerprint: input.manifest.manifestFingerprint,
    episodeReceiptFingerprint: input.audioEpisodeReceipt.receiptFingerprint,
    pageReceiptFingerprint: receiptPage.pageReceiptFingerprint,
    pageAudioReadbackAggregateFingerprint:
      receiptPage.pageAudioReadbackAggregateFingerprint,
    audioObjectCount: input.manifest.audioObjectCount,
    pageStartIndex: receiptPage.pageStartIndex,
    nextPageStartIndex: receiptPage.nextPageStartIndex,
    rows: Object.freeze(
      pageEntries.map((entry, offset) =>
        Object.freeze({
          itemIndex: receiptPage.pageStartIndex + offset,
          generationTargetFingerprint: entry.generationTargetFingerprint,
          entryFingerprint: entry.entryFingerprint,
          objectPath: entry.objectPath,
          contentHash: entry.contentHash,
          objectGeneration: entry.objectGeneration,
          byteSize: entry.byteSize,
        }),
      ),
    ),
  });
}

export function ingestV2VoiceDeviceObservationPageV1(input: {
  readonly plan: V2CanonicalSeasonPlanV2;
  readonly stageId: string;
  readonly manifest: V2VoiceAudioManifestV1;
  readonly audioEpisodeReceiptHandle: V2FirebaseVoiceAudioEpisodeReceiptHandleV1;
  readonly evidenceRaw: string;
}): V2VoiceDeviceObservationPageIngestV1 {
  if (
    !isV2CanonicalSeasonPlanV2(input.plan) ||
    !isV2VoiceAudioManifestV1(input.manifest) ||
    input.manifest.planFingerprint !== input.plan.planFingerprint ||
    input.manifest.stageId !== input.stageId ||
    typeof input.evidenceRaw !== "string" ||
    input.evidenceRaw.length >
      LEARNING_V2_VOICE_AUDIO_DEVICE_PAGE_EVIDENCE_MAX_BYTES_V1
  )
    fail();
  let material;
  let evidence: LearningV2VoiceAudioDevicePageEvidenceV1;
  try {
    material = resolveV2FirebaseVoiceAudioEpisodeReceiptMaterialV1({
      handle: input.audioEpisodeReceiptHandle,
      plan: input.plan,
      stageId: input.stageId,
      manifest: input.manifest,
    });
    evidence = parseLearningV2VoiceAudioDevicePageEvidenceV1(input.evidenceRaw);
  } catch {
    fail();
  }
  if (
    evidence.manifestFingerprint !== input.manifest.manifestFingerprint ||
    evidence.audioEpisodeReceiptFingerprint !==
      material.receipt.receiptFingerprint ||
    evidence.stableProjectionFingerprint !==
      expectedStableProjectionFingerprint({
        manifest: input.manifest,
        audioEpisodeReceipt: material.receipt,
        evidence,
      })
  )
    fail();
  let decoderPageReceipt: V2VoiceNativeDecoderPageReceiptV1;
  let pcmPageReceipt: V2VoicePcmSignalPageReceiptV1;
  try {
    decoderPageReceipt = materializeV2VoiceNativeDecoderPageReceiptV1({
      manifest: input.manifest,
      audioEpisodeReceipt: material.receipt,
      platform: evidence.platform,
      deviceClass: evidence.deviceClass,
      pageStartIndex: evidence.pageStartIndex,
      observations: evidence.nativeDecoderObservations,
    });
    pcmPageReceipt = materializeV2VoicePcmSignalPageReceiptV1({
      manifest: input.manifest,
      audioEpisodeReceipt: material.receipt,
      decoderPage: decoderPageReceipt,
      observations: evidence.pcmSignalObservations,
    });
  } catch {
    fail();
  }
  const evidenceRawHash = sha256Utf8(input.evidenceRaw);
  const body = {
    schemaVersion: V2_VOICE_DEVICE_OBSERVATION_PAGE_INGEST_SCHEMA_V1,
    evidenceFingerprint: evidence.evidenceFingerprint,
    evidenceRawHash,
    evidenceByteSize: utf8ByteLengthV1(input.evidenceRaw),
    evidence,
    decoderPageReceipt,
    pcmPageReceipt,
    ingestAuthority: "structural_serialized_observation_checks_only" as const,
    artifactStorageAuthority: "none" as const,
    deviceEvidenceAuthority: "none" as const,
    listeningEvidenceAuthority: "none" as const,
    publicationAuthority: "none" as const,
    runtimeConsumer: false as const,
    releaseEligible: false as const,
    releaseAuthority: false as const,
  };
  const result = Object.freeze({
    ...body,
    ingestFingerprint: hashCanonicalBody(body),
  });
  pageHandles.add(result);
  return result;
}

export function assembleV2VoiceDeviceObservationEpisodeV1(input: {
  readonly manifest: V2VoiceAudioManifestV1;
  readonly audioEpisodeReceipt: Parameters<
    typeof materializeV2VoiceNativeDecoderEpisodeReceiptV1
  >[0]["audioEpisodeReceipt"];
  readonly pages: readonly V2VoiceDeviceObservationPageIngestV1[];
}): V2VoiceDeviceObservationEpisodeIngestV1 {
  if (
    !isV2VoiceAudioManifestV1(input.manifest) ||
    !input.audioEpisodeReceipt ||
    input.audioEpisodeReceipt.manifestFingerprint !==
      input.manifest.manifestFingerprint ||
    input.audioEpisodeReceipt.audioObjectCount !==
      input.manifest.audioObjectCount ||
    !Array.isArray(input.pages) ||
    input.pages.length < 1 ||
    input.pages.some((page) => !pageHandles.has(page)) ||
    input.pages.some(
      (page, index) =>
        page.evidence.manifestFingerprint !==
          input.manifest.manifestFingerprint ||
        page.evidence.audioEpisodeReceiptFingerprint !==
          input.audioEpisodeReceipt.receiptFingerprint ||
        (index > 0 &&
          page.evidence.pageStartIndex !==
            input.pages[index - 1]!.evidence.pageStartIndex +
              input.pages[index - 1]!.evidence.pageItemCount),
    )
  )
    fail();
  const decoderPages = input.pages.map((page) => page.decoderPageReceipt);
  const pcmPages = input.pages.map((page) => page.pcmPageReceipt);
  let decoderEpisodeReceipt: V2VoiceNativeDecoderEpisodeReceiptV1;
  let pcmEpisodeReceipt: V2VoicePcmSignalEpisodeReceiptV1;
  try {
    decoderEpisodeReceipt = materializeV2VoiceNativeDecoderEpisodeReceiptV1({
      manifest: input.manifest,
      audioEpisodeReceipt: input.audioEpisodeReceipt,
      pages: decoderPages,
    });
    pcmEpisodeReceipt = materializeV2VoicePcmSignalEpisodeReceiptV1({
      manifest: input.manifest,
      audioEpisodeReceipt: input.audioEpisodeReceipt,
      decoderEpisodeReceipt,
      signalPages: pcmPages,
    });
  } catch {
    fail();
  }
  const body = {
    schemaVersion: V2_VOICE_DEVICE_OBSERVATION_EPISODE_INGEST_SCHEMA_V1,
    pageCount: input.pages.length,
    audioObjectCount: input.manifest.audioObjectCount,
    pages: Object.freeze([...input.pages]),
    decoderEpisodeReceipt,
    pcmEpisodeReceipt,
    orderedPageIngestAggregateFingerprint: hashCanonicalBody(
      input.pages.map((page) => page.ingestFingerprint),
    ),
    ingestAuthority: "structural_serialized_observation_checks_only" as const,
    artifactStorageAuthority: "none" as const,
    deviceEvidenceAuthority: "none" as const,
    listeningEvidenceAuthority: "none" as const,
    publicationAuthority: "none" as const,
    runtimeConsumer: false as const,
    releaseEligible: false as const,
    releaseAuthority: false as const,
  };
  const result = Object.freeze({
    ...body,
    ingestFingerprint: hashCanonicalBody(body),
  });
  episodeHandles.add(result);
  return result;
}

export function isV2VoiceDeviceObservationPageIngestV1(
  value: unknown,
): value is V2VoiceDeviceObservationPageIngestV1 {
  return typeof value === "object" && value !== null && pageHandles.has(value);
}

export function isV2VoiceDeviceObservationEpisodeIngestV1(
  value: unknown,
): value is V2VoiceDeviceObservationEpisodeIngestV1 {
  return (
    typeof value === "object" && value !== null && episodeHandles.has(value)
  );
}
