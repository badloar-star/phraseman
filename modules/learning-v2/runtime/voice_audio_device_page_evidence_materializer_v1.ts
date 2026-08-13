import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from "../policies/decision_registry";
import {
  LEARNING_V2_VOICE_AUDIO_DEVICE_PAGE_EVIDENCE_MAX_BYTES_V1,
  LEARNING_V2_VOICE_AUDIO_DEVICE_PAGE_EVIDENCE_SCHEMA_V1,
  type LearningV2VoiceAudioDevicePageEvidenceV1,
} from "./voice_audio_device_page_evidence_v1";
import { type LearningV2VoiceAudioDevicePageV1 } from "./voice_audio_device_page_v1";
import {
  resolveLearningV2VoiceAudioPageRunMaterialV1,
  type LearningV2VoiceAudioPageRunV1,
} from "./voice_audio_manifest_page_runner_v1";

const handles = new WeakSet<object>();

function fail(): never {
  throw new Error("learning_v2_voice_audio_device_page_evidence_invalid");
}

export function materializeLearningV2VoiceAudioDevicePageEvidenceV1(input: {
  readonly page: LearningV2VoiceAudioDevicePageV1;
  readonly run: LearningV2VoiceAudioPageRunV1;
}): LearningV2VoiceAudioDevicePageEvidenceV1 {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype ||
    Object.keys(input).sort().join("|") !== "page|run" ||
    input.page.pageStartIndex !== input.run.pageStartIndex ||
    input.page.pageItemCount !== input.run.pageItemCount ||
    input.page.rows.length !== input.run.rows.length ||
    input.page.rows.some(
      (row, index) =>
        row.itemIndex !== input.run.rows[index]?.itemIndex ||
        row.generationTargetFingerprint !==
          input.run.rows[index]?.generationTargetFingerprint ||
        row.entryFingerprint !== input.run.rows[index]?.entryFingerprint,
    )
  )
    fail();
  let material;
  try {
    material = resolveLearningV2VoiceAudioPageRunMaterialV1({ run: input.run });
  } catch {
    fail();
  }
  if (
    material.nativeDecoderObservations.length !== input.page.pageItemCount ||
    material.pcmSignalObservations.length !== input.page.pageItemCount
  )
    fail();
  for (let index = 0; index < input.page.pageItemCount; index += 1) {
    const pageRow = input.page.rows[index]!;
    const decoder = material.nativeDecoderObservations[index]!;
    const pcm = material.pcmSignalObservations[index]!;
    if (
      decoder.itemIndex !== pageRow.itemIndex ||
      decoder.generationTargetFingerprint !==
        pageRow.generationTargetFingerprint ||
      decoder.entryFingerprint !== pageRow.entryFingerprint ||
      decoder.objectPath !== pageRow.objectPath ||
      decoder.contentHash !== pageRow.contentHash ||
      decoder.objectGeneration !== pageRow.objectGeneration ||
      decoder.byteSize !== pageRow.byteSize ||
      pcm.itemIndex !== decoder.itemIndex ||
      pcm.entryFingerprint !== decoder.entryFingerprint ||
      pcm.generationTargetFingerprint !== decoder.generationTargetFingerprint ||
      pcm.decoderStatusSequenceFingerprint !== decoder.statusSequenceFingerprint
    )
      fail();
  }
  const body = {
    schemaVersion: LEARNING_V2_VOICE_AUDIO_DEVICE_PAGE_EVIDENCE_SCHEMA_V1,
    manifestFingerprint: input.page.manifestFingerprint,
    audioEpisodeReceiptFingerprint: input.page.episodeReceiptFingerprint,
    audioPageReceiptFingerprint: input.page.pageReceiptFingerprint,
    stableProjectionFingerprint: input.page.stableProjectionFingerprint,
    pageRunFingerprint: input.run.pageRunFingerprint,
    pageStartIndex: input.page.pageStartIndex,
    pageItemCount: input.page.pageItemCount,
    nextPageStartIndex: input.page.nextPageStartIndex,
    platform: input.run.platform,
    deviceClass: input.run.deviceClass,
    osVersion: input.run.osVersion,
    appBuildFingerprint: input.run.appBuildFingerprint,
    nativeDecoderObservations: material.nativeDecoderObservations,
    pcmSignalObservations: material.pcmSignalObservations,
    orderedNativeObservationAggregateFingerprint: hashCanonicalBody(
      material.nativeDecoderObservations.map((observation) =>
        hashCanonicalBody(observation),
      ),
    ),
    orderedPcmObservationAggregateFingerprint: hashCanonicalBody(
      material.pcmSignalObservations.map(
        (observation) => observation.observationFingerprint,
      ),
    ),
    uploadPurpose: "private_qa_receipt_assembly_only" as const,
    transportUrlRetention: "forbidden" as const,
    rawAudioRetention: "forbidden" as const,
    rawPcmRetention: "forbidden" as const,
    learnerDataRetention: "forbidden" as const,
    repositoryOriginAuthority: "none" as const,
    decoderEvidenceAuthority:
      "unverified_serialized_device_observation" as const,
    signalMetricAuthority: "deterministic_pcm16_metrics_only" as const,
    listeningEvidenceAuthority: "none" as const,
    deviceEvidenceAuthority: "none" as const,
    humanApprovalAuthority: "none" as const,
    publicationAuthority: "none" as const,
    runtimeConsumer: false as const,
    releaseEligible: false as const,
    releaseAuthority: false as const,
  };
  const result = Object.freeze({
    ...body,
    evidenceFingerprint: hashCanonicalBody(body),
  });
  const raw = canonicalJsonV1(result);
  if (
    utf8ByteLengthV1(raw) >
      LEARNING_V2_VOICE_AUDIO_DEVICE_PAGE_EVIDENCE_MAX_BYTES_V1 ||
    raw.includes("https://") ||
    raw.includes("file://")
  )
    fail();
  handles.add(result);
  return result;
}

export function encodeLearningV2VoiceAudioDevicePageEvidenceV1(
  value: LearningV2VoiceAudioDevicePageEvidenceV1,
): string {
  if (!handles.has(value)) fail();
  return canonicalJsonV1(value);
}
